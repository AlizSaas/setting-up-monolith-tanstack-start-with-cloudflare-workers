import { clients, invoiceEvents, invoiceItems, invoicePublicTokens, invoices, payments, settings } from "@/db/schema";
import { publicMiddleware } from "@/middlewares/dependencies";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {  eq } from "drizzle-orm";
import z from "zod";
import { generateId } from "../invoices/invoices";
import { StripeService } from "@/services/stripe";
import { publicInvoiceRateLimiter } from "@/middlewares/rate-limited";

// In your middlewares/dependencies.ts file, add:



// Then update your public invoice functions:

export const getPublicInvoiceFn = createServerFn({ method: "GET" })
  .middleware([publicMiddleware,publicInvoiceRateLimiter]) // Changed from authMiddleware
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ context, data }) => {
    const { db } = context;

    // 1) Find token
    const tokenRecord = await db
      .select()
      .from(invoicePublicTokens)
      .where(eq(invoicePublicTokens.token, data.token))
      .limit(1)
      .then(r => r[0]);

    if (!tokenRecord) throw notFound();

    // 2) Invoice
    const invoice = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, tokenRecord.invoiceId))
      .limit(1)
      .then(r => r[0]);

    if (!invoice) throw notFound();

    // 3) Related data (parallel)
    const [client, setting, items] = await Promise.all([
      db.select()
        .from(clients)
        .where(eq(clients.id, invoice.clientId))
        .limit(1)
        .then(r => r[0]),

      db.select()
        .from(settings)
        .where(eq(settings.userId, invoice.userId))
        .limit(1)
        .then(r => r[0]),

      db.select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, invoice.id))
        .orderBy(invoiceItems.sortOrder),
    ]);

    // mark viewed
    if (invoice.status === "sent") {
      await db.update(invoices)
        .set({ status: "viewed" })
        .where(eq(invoices.id, invoice.id));

      await db.insert(invoiceEvents).values({
        id: generateId(),
        invoiceId: invoice.id,
        eventType: "viewed",
        createdAt: new Date(),
      });
    }

    const canPay = ["sent", "viewed", "overdue"].includes(invoice.status);

    return {
      invoice,
      client,
      business: setting,
      items,
      canPay,
    };
  });



export const createPublicCheckoutFn = createServerFn({ method: "POST" })
  .middleware([publicMiddleware])
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ context, data }) => {
    const { db, env } = context;

    // 1. Get token and invoice
    const tokenRecord = await db
      .select()
      .from(invoicePublicTokens)
      .where(eq(invoicePublicTokens.token, data.token))
      .limit(1)
      .then(r => r[0]);

    if (!tokenRecord) throw notFound();

    const invoice = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, tokenRecord.invoiceId))
      .limit(1)
      .then(r => r[0]);

    if (!invoice) throw notFound();

    // 2. Check if invoice is payable
    if (!["sent", "viewed", "overdue"].includes(invoice.status)) {
      throw new Error("Invoice not payable");
    }

    // 3. Get client and business info
    const [client, businessSettings] = await Promise.all([
      db.select()
        .from(clients)
        .where(eq(clients.id, invoice.clientId))
        .limit(1)
        .then(r => r[0]),
      
      db.select()
        .from(settings)
        .where(eq(settings.userId, invoice.userId))
        .limit(1)
        .then(r => r[0]),
    ]);

    if (!client) throw new Error("Client not found");

    // 4. Create Stripe checkout session
    const stripeService = new StripeService(
      env.STRIPE_SECRET_KEY,
      env.STRIPE_WEBHOOK_SECRET
    );

    const baseUrl = env.BETTER_AUTH_URL
    
    const session = await stripeService.createCheckoutSession(
      invoice.id,
      invoice.invoiceNumber,
      Number(invoice.total), // Convert from string if needed
      invoice.currency as any,
      client.email,
      `${baseUrl}/invoice/${data.token}?payment=success`,
      `${baseUrl}/invoice/${data.token}?payment=cancelled`,
      businessSettings?.businessName ?? undefined
    );

    // 5. Create payment record in database
    await db.insert(payments).values({
      id: generateId(),
      invoiceId: invoice.id,
      stripeCheckoutSessionId: session.sessionId,
      amount: invoice.total,
      currency: invoice.currency,
      status: 'pending',
      createdAt: new Date(),
    });

    // 6. Return checkout URL
    return {
      checkout_url: session.url,
    };
  });
