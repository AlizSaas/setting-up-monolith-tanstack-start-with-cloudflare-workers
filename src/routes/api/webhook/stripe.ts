import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { 
  payments, 
  invoices, 
  invoiceEvents, 
  clients, 
  settings 
} from "@/db/schema"
import type Stripe from 'stripe'
import { createLogger } from '@/utils/logger'
import { StripeService } from '@/services/stripe'
import { generateId } from '@/data/invoices/invoices'
import { AnalyticsService } from '@/utils/analytics'
import { publicMiddleware } from '@/middlewares/dependencies'
import { Emailservice } from '@/services/email'

export const Route = createFileRoute('/api/webhook/stripe')({
  server: {
    middleware: [publicMiddleware],
    handlers: {
      POST: async ({ request, context }) => {
        const requestId = request.headers.get('cf-ray') || crypto.randomUUID()
        const logger = createLogger(requestId)
        const { db, env } = context

        // Top-level try/catch — prevents TanStack Start from
        // catching unhandled errors and returning its own 500
        try {
          const signature = request.headers.get('stripe-signature')
          if (!signature) {
            logger.warn('Missing Stripe signature')
            return new Response(
              JSON.stringify({ error: 'Missing signature' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const payload = await request.text()

          if (!payload) {
            logger.warn('Empty webhook payload')
            return new Response(
              JSON.stringify({ error: 'Empty payload' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const stripeService = new StripeService(
            env.STRIPE_SECRET_KEY,
            env.STRIPE_WEBHOOK_SECRET
          )

          let event: Stripe.Event
          try {
            event = await stripeService.verifyWebhook(payload, signature)
          } catch (error) {
            logger.error('Webhook verification failed', error as Error)
            return new Response(
              JSON.stringify({ error: 'Invalid signature' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          logger.info('Received Stripe webhook', { type: event.type, id: event.id })
          const now = new Date()

          switch (event.type) {
            case 'checkout.session.completed': {
              const session = event.data.object as Stripe.Checkout.Session
              const invoiceId = session.metadata?.invoice_id

              if (!invoiceId) {
                logger.warn('No invoice_id in session metadata')
                break
              }

              // Idempotency: skip if already paid
              const invoice = await db.query.invoices.findFirst({
                where: eq(invoices.id, invoiceId)
              })

              if (!invoice) {
                logger.warn('Invoice not found', { invoiceId })
                break
              }

              if (invoice.status === 'paid') {
                logger.info('Invoice already paid, skipping duplicate', { invoiceId })
                break
              }

              // === CRITICAL DB OPERATIONS ===
              await db.update(payments)
                .set({
                  stripePaymentIntentId: session.payment_intent as string,
                  status: 'succeeded',
                  paidAt: now,
                })
                .where(eq(payments.stripeCheckoutSessionId, session.id))

              await Promise.all([
                db.update(invoices)
                  .set({ status: 'paid', updatedAt: now })
                  .where(eq(invoices.id, invoiceId)),

                db.insert(invoiceEvents).values({
                  id: generateId(),
                  invoiceId: invoiceId,
                  eventType: 'paid',
                  metadata: JSON.stringify({
                    payment_intent: session.payment_intent,
                    amount: session.amount_total,
                  }),
                  createdAt: now,
                }),
              ])

              // === NON-CRITICAL: Each wrapped individually ===

              // Durable Object — cancel reminders
              try {
                const reminderDOId = env.REMINDER_SCHEDULER.idFromName(invoice.userId)
                const reminderDO = env.REMINDER_SCHEDULER.get(reminderDOId)
                await reminderDO.fetch('http://internal/cancel', {
                  method: 'POST',
                  body: JSON.stringify({ invoice_id: invoiceId }),
                })
              } catch (err) {
                logger.error('Failed to cancel reminders via DO', err as Error)
              }

              // Analytics
              try {
                const analytics = new AnalyticsService()
                analytics.trackInvoicePaid(
                  invoice.userId,
                  invoiceId,
                  Number(invoice.total),
                  invoice.currency
                )
              } catch (err) {
                logger.error('Analytics tracking failed', err as Error)
              }

              // Email receipt
              try {
                const [client, bizSettings] = await Promise.all([
                  db.query.clients.findFirst({
                    where: eq(clients.id, invoice.clientId),
                  }),
                  db.query.settings.findFirst({
                    where: eq(settings.userId, invoice.userId),
                  }),
                ])

                if (client?.email) {
                  const emailService = new Emailservice(
                    env.RESEND_API_KEY,
                    env.EMAIL_FROM
                  )
                  await emailService.sendPaymentReceipt(
                    client.email,
                    invoice.invoiceNumber,
                    bizSettings?.businessName || 'invo',
                    invoice.total,
                    invoice.currency as any,
                    now.toISOString(),
                    bizSettings?.emailFromName
                  )
                }
              } catch (err) {
                logger.error('Failed to send receipt email', err as Error)
              }

              logger.info('Invoice marked as paid', { invoiceId })
              break
            }

            case 'checkout.session.expired': {
              const session = event.data.object as Stripe.Checkout.Session
              await db.update(payments)
                .set({ status: 'failed' })
                .where(eq(payments.stripeCheckoutSessionId, session.id))
              break
            }

            case 'payment_intent.payment_failed': {
              const paymentIntent = event.data.object as Stripe.PaymentIntent

              const updatedPayment = await db.update(payments)
                .set({ status: 'failed' })
                .where(eq(payments.stripePaymentIntentId, paymentIntent.id))
                .returning({ invoiceId: payments.invoiceId })

              if (updatedPayment.length > 0) {
                await db.insert(invoiceEvents).values({
                  id: generateId(),
                  invoiceId: updatedPayment[0].invoiceId,
                  eventType: 'payment_failed',
                  metadata: JSON.stringify({
                    payment_intent: paymentIntent.id,
                    error: paymentIntent.last_payment_error?.message,
                  }),
                  createdAt: now,
                })
              }
              break
            }
          }

          // Stripe ALWAYS gets 200
          return new Response(
            JSON.stringify({ received: true }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )

        } catch (err) {
          // === THIS IS THE KEY FIX ===
          // Without this, any unhandled throw propagates to TanStack Start,
          // which wraps it as { status: 500, unhandled: true, message: "HTTPError" }
          // and Stripe sees a 500 and keeps retrying.
          logger.error('Unhandled webhook error', err as Error)
          return new Response(
            JSON.stringify({ received: true }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})