import { Database } from "@/db";
import { invoices, clients, invoiceEvents, invoiceItems, settings, invoicePublicTokens, payments } from "@/db/schema";
import { createInvoiceSchema, invoiceFilterSchema, updateInvoiceSchema } from "@/lib/schema.type";

import { calculateInvoiceTotals, generateToken } from "@/lib/utils";
import { authMiddleware, } from "@/middlewares/dependencies";
import { apiRateLimiter,resourceIntensiveRateLimiter } from "@/middlewares/rate-limited";
import { Emailservice } from "@/services/email";
import { PDFService } from "@/services/pdf";
import { AnalyticsService } from "@/utils/analytics";
import { ValidationError } from "@/utils/error";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq, and, gte, lte, sql } from "drizzle-orm";
import z from "zod";

export function generateId(): string {
  return crypto.randomUUID();
}




// Get invoices list with pagination
export const getInvoicesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware,apiRateLimiter])
  .inputValidator(invoiceFilterSchema)
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { status, client_id, date_from, date_to, page, limit } = data;

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(invoices.userId, user.id)];

    if (status) {
      const validStatuses = ["draft", "pending", "paid", "void", "overdue"] as const;
      if (validStatuses.includes(status as any)) {
        conditions.push(eq(invoices.status, status as "draft" | "pending" | "paid" | "void" | "overdue"));
      }
    }
    if (client_id) {
      conditions.push(eq(invoices.clientId, client_id));
    }
    if (date_from) {
      conditions.push(gte(invoices.issueDate, new Date(date_from)));
    }
    if (date_to) {
      conditions.push(lte(invoices.issueDate, new Date(date_to)));
    }

    const whereClause = and(...conditions);

    // ✅ Count and data fetch are independent - both only need whereClause
    const [countResult, allInvoices] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(invoices)
        .where(whereClause)
        .then(rows => rows[0]),

      db
        .select({
          id: invoices.id,
          invoice_number: invoices.invoiceNumber,
          status: invoices.status,
          issue_date: invoices.issueDate,
          due_date: invoices.dueDate,
          total: invoices.total,
          currency: invoices.currency,
          notes: invoices.notes,
          created_at: invoices.createdAt,
          updated_at: invoices.updatedAt,
          client_id: invoices.clientId,
          client_name: clients.name,
          client_email: clients.email,
          client_company: clients.company,
          
        })
        .from(invoices)
        .leftJoin(clients, eq(invoices.clientId, clients.id))
        .where(whereClause)
        .orderBy(desc(invoices.createdAt))
        .limit(limit)
        .offset(offset),
    ]);

    const total = Number(countResult?.count || 0);

    return {
      data: allInvoices,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  });

// Get single invoice by ID with items
export const getInvoiceByIdFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware,apiRateLimiter])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const { db, user } = context;

    // Get invoice with all related data
    const invoice = await db
      .select()
      .from(invoices)
      .where(and(
        eq(invoices.id, data.id), 
        eq(invoices.userId, user.id)
      ))
      .limit(1)
      .then(rows => rows[0]);

    if (!invoice) {
      throw notFound();
    }

    // ✅ All these queries are independent - they only need invoice.id and invoice.clientId
    const [items, events, paymentRecords, client, publicToken] = await Promise.all([
      // Invoice items
      db.select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, data.id))
        .orderBy(invoiceItems.sortOrder),

      // Events (history)
      db.select()
        .from(invoiceEvents)
        .where(eq(invoiceEvents.invoiceId, data.id))
        .orderBy(desc(invoiceEvents.createdAt)),

      // Payments
      db.select()
        .from(payments)
        .where(eq(payments.invoiceId, data.id))
        .orderBy(desc(payments.createdAt)),

      // Client
      db.select()
        .from(clients)
        .where(and(
          eq(clients.id, invoice.clientId), 
          eq(clients.userId, user.id)
        ))
        .limit(1)
        .then(rows => rows[0]),

      // 🆕 Public token
      db.select()
        .from(invoicePublicTokens)
        .where(eq(invoicePublicTokens.invoiceId, data.id))
        .limit(1)
        .then(rows => rows[0])
    ]);

    return {
      ...invoice,
      items,
      events,
      payments: paymentRecords,
      client,
      publicToken  // 🆕 Include public token
    };
  });
// Create new invoice
export const createInvoiceFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware,apiRateLimiter])
  .inputValidator(createInvoiceSchema)
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const now = new Date();

    // ✅ Client verification and latest invoice number fetch are independent
    const [clientResult, latestInvoiceResult] = await Promise.all([
      db
        .select()
        .from(clients)
        .where(and(eq(clients.id, data.client_id), eq(clients.userId, user.id)))
        .limit(1),

      // Only fetch latest invoice number if not provided
      data.invoice_number?.trim()
        ? Promise.resolve([null])
        : db
            .select({ invoiceNumber: invoices.invoiceNumber })
            .from(invoices)
            .where(eq(invoices.userId, user.id))
            .orderBy(desc(invoices.createdAt))
            .limit(1),
    ]);

    const [client] = clientResult;
    if (!client) {
      throw new Error("Client not found");
    }

    // Calculate totals
    const totals = calculateInvoiceTotals(
      data.items,
      data.discount_type,
      data.discount_value
    );

    // Generate invoice number if not provided
    let invoiceNumber = data.invoice_number?.trim();
    if (!invoiceNumber) {
      const latestInvoice = latestInvoiceResult[0];
      const lastNumber = latestInvoice?.invoiceNumber
        ? parseInt(latestInvoice.invoiceNumber.replace(/\D/g, "")) || 0
        : 0;
      invoiceNumber = `INV-${String(lastNumber + 1).padStart(5, "0")}`;
    }

    // ❌ Insert invoice first - children depend on invoice.id
    const [invoice] = await db
      .insert(invoices)
      .values({
        id: generateId(),
        userId: user.id,
        clientId: data.client_id,
        invoiceNumber: invoiceNumber,
        status: "draft",
        issueDate: new Date(data.issue_date),
        dueDate: new Date(data.due_date),
        currency: data.currency,
        subtotal: totals.subtotal.toString(),
        taxTotal: totals.tax_total.toString(),
        discountType: data.discount_type,
        discountValue: data.discount_value?.toString(),
        discountAmount: totals.discount_amount.toString(),
        total: totals.total.toString(),
        notes: data.notes,
        paymentTerms: data.payment_terms,
        remindersEnabled: data.reminders_enabled,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // ✅ Public token, items, and event insert are all independent - they only need invoice.id
    const itemInserts = data.items.map((item, i) =>
      db.insert(invoiceItems).values({
        id: generateId(),
        invoiceId: invoice.id,
        description: item.description,
        quantity: item.quantity.toString(),
        unitPrice: item.unit_price.toString(),
        taxRate: item.tax_rate?.toString(),
        amount: totals.item_amounts[i].toString(),
        sortOrder: i,
      })
    );

    await Promise.all([
      // Public token
      db.insert(invoicePublicTokens).values({
        id: generateId(),
        invoiceId: invoice.id,
        token: crypto.randomUUID(),
        createdAt: now,
      }),

      // All items in parallel
      ...itemInserts,

      // Log event
      db.insert(invoiceEvents).values({
        id: generateId(),
        invoiceId: invoice.id,
        eventType: "created",
        createdAt: now,
      }),
    ]);

    return invoice;
  });

// Update existing invoice
export const updateInvoiceFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware,apiRateLimiter])
  .inputValidator(z.object({ id: z.string(), data: updateInvoiceSchema }))
  .handler(async ({ context, data: input }) => {
    const { db, user } = context;
    const { id, data } = input;
    const now = new Date();

    // ❌ Must fetch existing invoice first - needed for validation checks
    const [existingInvoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.userId, user.id)))
      .limit(1);

    if (!existingInvoice) {
      throw notFound();
    }

    // Handle items update
    if (data.items && existingInvoice.status !== "draft") {
      throw new ValidationError("Cannot modify items on a non-draft invoice");
    }

    let totals;
    if (data.items) {
      totals = calculateInvoiceTotals(
        data.items,
        data.discount_type ?? existingInvoice.discountType ?? undefined,
        data.discount_value ?? (existingInvoice.discountValue ? Number(existingInvoice.discountValue) : undefined)
      );

      // ❌ Must delete before inserting new items
      await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));

      // ✅ All new item inserts are independent of each other
      await Promise.all(
        data.items.map((item, i) =>
          db.insert(invoiceItems).values({
            id: generateId(),
            invoiceId: id,
            description: item.description,
            quantity: item.quantity.toString(),
            unitPrice: item.unit_price.toString(),
            taxRate: item.tax_rate?.toString(),
            amount: totals!.item_amounts[i].toString(),
            sortOrder: i,
          })
        )
      );
    }

    // Build update object
    const updateValues: any = { updatedAt: now };
    if (data.client_id !== undefined) updateValues.clientId = data.client_id;
    if (data.invoice_number !== undefined) updateValues.invoiceNumber = data.invoice_number;
    if (data.status !== undefined) updateValues.status = data.status;
    if (data.issue_date !== undefined) updateValues.issueDate = new Date(data.issue_date);
    if (data.due_date !== undefined) updateValues.dueDate = new Date(data.due_date);
    if (data.currency !== undefined) updateValues.currency = data.currency;
    if (data.notes !== undefined) updateValues.notes = data.notes;
    if (data.payment_terms !== undefined)
      updateValues.paymentTerms = data.payment_terms;
    if (data.reminders_enabled !== undefined)
      updateValues.remindersEnabled = data.reminders_enabled;
    if (data.discount_type !== undefined) updateValues.discountType = data.discount_type;
    if (data.discount_value !== undefined)
      updateValues.discountValue = data.discount_value?.toString();

    if (totals) {
      updateValues.subtotal = totals.subtotal.toString();
      updateValues.taxTotal = totals.tax_total.toString();
      updateValues.discountAmount = totals.discount_amount.toString();
      updateValues.total = totals.total.toString();
    }

    // ✅ Invoice update and event insert are independent
    const parallelOps: Promise<any>[] = [
      db
        .update(invoices)
        .set(updateValues)
        .where(eq(invoices.id, id)),
    ];

    if (data.status && data.status !== existingInvoice.status) {
      parallelOps.push(
        db.insert(invoiceEvents).values({
          id: generateId(),
          invoiceId: id,
          eventType: data.status === "void" ? "voided" : "updated",
          metadata: JSON.stringify({
            old_status: existingInvoice.status,
            new_status: data.status,
          }),
          createdAt: now,
        })
      );
    }

    await Promise.all(parallelOps);

    // ❌ Must wait for updates to complete before fetching final state
    const invoiceWithDetails = await getInvoiceWithDetails(db, id, user.id);

    return invoiceWithDetails;
  });




  export const sendInvoiceFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware,resourceIntensiveRateLimiter])
    .inputValidator(z.object({ invoiceId: z.string() }))
    .handler(async ({ context, data }) => {
      const { db, user } = context;
      const { invoiceId } = data;

      // ❌ Must fetch invoice first - needed for validation and clientId
      const [invoice] = await db
        .select()
        .from(invoices)
        .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, user.id)))
        .limit(1);

      if (!invoice) {
        throw notFound();
      }

      if (invoice.status === "paid" || invoice.status === "void") {
        throw new ValidationError("Cannot send a paid or void invoice");
      }

      // ✅ Client, settings, and public token fetches are independent - all IDs are known
      const [clientResult, settingResult, publicTokenList] = await Promise.all([
        db
          .select()
          .from(clients)
          .where(and(eq(clients.id, invoice.clientId), eq(clients.userId, user.id)))
          .limit(1),

        db
          .select()
          .from(settings)
          .where(eq(settings.userId, user.id))
          .limit(1),

        db
          .select()
          .from(invoicePublicTokens)
          .where(eq(invoicePublicTokens.invoiceId, invoiceId))
          .limit(1),
      ]);

      const [client] = clientResult;
      const [setting] = settingResult;

      if (!client) {
        throw notFound();
      }

      let publicToken = publicTokenList[0];
      if (!publicToken) {
        const token = generateToken(32);
        const [newToken] = await db
          .insert(invoicePublicTokens)
          .values({
            id: generateId(),
            invoiceId: invoiceId,
            token: token,
            createdAt: new Date(),
          })
          .returning();
        publicToken = newToken;
      }

      const publicUrl = `${context.env.BETTER_AUTH_URL}/invoice/${publicToken.token}`;
      const emailService = new Emailservice(
        context.env.RESEND_API_KEY,
        context.env.EMAIL_FROM
      );

      await emailService.sendInvoice(
        client.email,
        invoice.invoiceNumber,
        setting?.businessName || "invo",
        Number(invoice.total),
        invoice.currency as any,
        invoice.dueDate.toISOString().split("T")[0],
        publicUrl,
        setting?.emailFromName || undefined
      );
      

      // ✅ Status update and event insert are independent
      await Promise.all([
        db
          .update(invoices)
          .set({
            status: "sent",
            updatedAt: new Date(),
          })
          .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, user.id))),

        db.insert(invoiceEvents).values({
          id: generateId(),
          invoiceId: invoiceId,
          eventType: "sent",
          metadata: JSON.stringify({ email: client.email }),
          createdAt: new Date(),
        }),
      ]);

      const analytics = new AnalyticsService();
      analytics.trackInvoiceSent(user.id, invoiceId);

      // Schedule reminders if enabled
if (invoice.remindersEnabled) {
  const reminderDOId = context.env.REMINDER_SCHEDULER.idFromName(user.id);
  const reminderDO = context.env.REMINDER_SCHEDULER.get(reminderDOId);
  
  await reminderDO.fetch('http://internal/schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      invoice_id: invoiceId,
      due_date: invoice.dueDate.toISOString(),
    }),
  });
}

      return {
        data: {
          message: "Invoice sent successfully",
          public_url: publicUrl,
        },
      };
    });

  export const duplicateInvoiceFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware,apiRateLimiter])
    .inputValidator(z.object({ invoiceId: z.string() }))
    .handler(async ({ context, data }) => {
      const { db, user } = context;
      const { invoiceId } = data;
      const now = new Date();

      // ❌ Must fetch original invoice first - needed for validation
      const [original] = await db
        .select()
        .from(invoices)
        .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, user.id)))
        .limit(1);

      if (!original) {
        throw notFound();
      }

      // ✅ Items, settings, and latest invoice number are independent - all IDs known
      const [originalItems, settingResult, latestInvoiceResult] = await Promise.all([
        db
          .select()
          .from(invoiceItems)
          .where(eq(invoiceItems.invoiceId, invoiceId))
          .orderBy(invoiceItems.sortOrder),

        db
          .select()
          .from(settings)
          .where(eq(settings.userId, user.id))
          .limit(1),

        db
          .select({ invoiceNumber: invoices.invoiceNumber })
          .from(invoices)
          .where(eq(invoices.userId, user.id))
          .orderBy(desc(invoices.createdAt))
          .limit(1),
      ]);

      const newInvoiceId = generateId();
      const today = now.toISOString().split("T")[0];

      const latestInvoice = latestInvoiceResult[0];
      const lastNumber = latestInvoice?.invoiceNumber
        ? parseInt(latestInvoice.invoiceNumber.replace(/\D/g, "")) || 0
        : 0;
      const newInvoiceNumber = `INV-${String(lastNumber + 1).padStart(5, "0")}`;

      // ❌ Must create invoice first - items and event depend on it
      const [newInvoice] = await db
        .insert(invoices)
        .values({
          id: newInvoiceId,
          userId: user.id,
          clientId: original.clientId,
          invoiceNumber: newInvoiceNumber,
          status: "draft",
          issueDate: new Date(today),
          dueDate: original.dueDate,
          currency: original.currency,
          subtotal: original.subtotal,
          taxTotal: original.taxTotal,
          discountType: original.discountType,
          discountValue: original.discountValue,
          discountAmount: original.discountAmount,
          total: original.total,
          notes: original.notes,
          paymentTerms: original.paymentTerms,
          remindersEnabled: original.remindersEnabled,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // ✅ All item copies and event insert are independent
      await Promise.all([
        ...originalItems.map((item, i) =>
          db.insert(invoiceItems).values({
            id: generateId(),
            invoiceId: newInvoiceId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            amount: item.amount,
            sortOrder: i,
          })
        ),

        db.insert(invoiceEvents).values({
          id: generateId(),
          invoiceId: newInvoiceId,
          eventType: "created",
          metadata: JSON.stringify({ duplicated_from: invoiceId }),
          createdAt: now,
        }),
      ]);

      return newInvoice;
    });




// Helper function to get invoice with all details
async function getInvoiceWithDetails(
  database: Database,
  invoiceId: string,
  userId: string
) {
  // ❌ Must fetch invoice first - need clientId for client query
  const [invoice] = await database
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
    .limit(1);

  if (!invoice) return null;

  // ✅ Client and items are independent - both IDs are known
  const [clientResult, items] = await Promise.all([
    database
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        company: clients.company,
        address: clients.address,
      })
      .from(clients)
      .where(eq(clients.id, invoice.clientId))
      .limit(1),

    database
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId))
      .orderBy(invoiceItems.sortOrder),
  ]);

  const [client] = clientResult;
  if (!client) return null;

  return {
    ...invoice,
    client,
    items,
  };
}

export const generatePdfFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware,resourceIntensiveRateLimiter])
  .inputValidator(z.object({ invoiceId: z.string() }))
  .handler(async ({ context, data }) => {
    const { db, user, env } = context;

    const { invoiceId } = data;


    if (!env.STORAGE) {
      throw new Error('R2 STORAGE binding is missing. Check your wrangler.toml configuration.');
    }
    // ✅ Fetch data
    const [invoiceWithDetails, settingResult] = await Promise.all([
      getInvoiceWithDetails(db, invoiceId, user.id),
      db.select().from(settings).where(eq(settings.userId, user.id)).limit(1),
    ]);

    if (!invoiceWithDetails) {
      throw notFound();
    }

    const [setting] = settingResult;
    if (!setting) {
      throw new Error("Settings not found");
    }

    // Transform settings to snake_case
    const transformedSetting = {
      id: setting.id,
      user_id: setting.userId,
      business_name: setting.businessName,
      business_email: setting.businessEmail,
      business_address: setting.businessAddress,
      logo_url: setting.logoUrl,
      default_currency: setting.defaultCurrency,
      default_payment_terms: setting.defaultPaymentTerms,
      timezone: setting.timezone,
      email_from_name: setting.emailFromName,
      invoice_prefix: setting.invoicePrefix,
      next_invoice_number: setting.nextInvoiceNumber,
      created_at: setting.createdAt,
      updated_at: setting.updatedAt,
    };

    // Transform items to snake_case
    const transformedItems = invoiceWithDetails.items.map(item => ({
      id: item.id,
      invoice_id: item.invoiceId,
      description: item.description,
      quantity: Number(item.quantity),
      unit_price: Number(item.unitPrice),
      amount: Number(item.amount),
      sort_order: item.sortOrder,
      tax_rate: item.taxRate ? Number(item.taxRate) : null,
    }));

    // Transform client to snake_case
    const transformedClient = {
      id: invoiceWithDetails.client.id,
      name: invoiceWithDetails.client.name,
      email: invoiceWithDetails.client.email,
      company: invoiceWithDetails.client.company,
      address: invoiceWithDetails.client.address,
    };

    // Transform invoice to snake_case
    const transformedInvoice = {
      id: invoiceWithDetails.id,
      user_id: invoiceWithDetails.userId,
      client_id: invoiceWithDetails.clientId,
      invoice_number: invoiceWithDetails.invoiceNumber,
      status: invoiceWithDetails.status as "draft" | "paid" | "void" | "overdue" | "sent" | "pending",
      issue_date: invoiceWithDetails.issueDate,
      due_date: invoiceWithDetails.dueDate,
      currency: invoiceWithDetails.currency as "USD" | "EUR" | "GBP" | "CAD" | "AUD" | "CHF" | "JPY",
      subtotal: Number(invoiceWithDetails.subtotal),
      tax_total: Number(invoiceWithDetails.taxTotal),
      discount_type: invoiceWithDetails.discountType,
      discount_value: invoiceWithDetails.discountValue ? Number(invoiceWithDetails.discountValue) : null,
      discount_amount: invoiceWithDetails.discountAmount ? Number(invoiceWithDetails.discountAmount) : 0,
      total: Number(invoiceWithDetails.total),
      notes: invoiceWithDetails.notes,
      payment_terms: invoiceWithDetails.paymentTerms,
      reminders_enabled: invoiceWithDetails.remindersEnabled ?? true,
      pdf_generated_at: invoiceWithDetails.pdfGeneratedAt,
      created_at: invoiceWithDetails.createdAt,
      updated_at: invoiceWithDetails.updatedAt,
      client: transformedClient,
      items: transformedItems,
    };

    // ✅ Generate and store PDF
    const pdfService = new PDFService(env.STORAGE, env.CLOUDFLARE_ACCOUNT_ID, env.CLOUDFLARE_API_TOKEN);
    
    const { data: pdfData, isPdf } = await pdfService.generateInvoicePDF(
      transformedInvoice, 
      transformedSetting
    );
    
    const pdfKey = await pdfService.storePDF(
      user.id, 
      invoiceId, 
      invoiceWithDetails.invoiceNumber, 
      pdfData, 
      isPdf
    );

    const now = new Date();

    // ✅ Update invoice first (most important)
    await db
      .update(invoices)
      .set({
        pdfGeneratedAt: now,
        updatedAt: now,
      })
      .where(eq(invoices.id, invoiceId));

    // ✅ Insert event (less critical, do after invoice update)
    try {
      await db.insert(invoiceEvents).values({
        id: generateId(),
        invoiceId: invoiceId,
        eventType: "pdf_generated",
        createdAt: now,
      });
    } catch (eventError) {
      // Log but don't fail the whole operation
      console.error('Failed to insert event:', eventError);
    }

    return {
      data: {
        message: 'PDF generated successfully',
        pdf_key: pdfKey,
        format: isPdf ? 'pdf' : 'html',
      },
    };
  });
// Get PDF download
export const getInvoicePdfUrl = createServerFn({ method: "GET" })
  .middleware([authMiddleware,apiRateLimiter])
  .inputValidator(z.object({ invoiceId: z.string() }))
  .handler(async ({ context, data }) => {
    const { db, user, env } = context;
    const { invoiceId } = data;

    // Fetch invoice
    const [invoice] = await db
      .select({ invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, user.id)))
      .limit(1);

    if (!invoice) {
      throw notFound();
    }

    const pdfService = new PDFService(env.STORAGE, env.CLOUDFLARE_ACCOUNT_ID, env.CLOUDFLARE_API_TOKEN);
    const pdf = await pdfService.getPDF(user.id, invoiceId, invoice.invoiceNumber);

    if (!pdf) {
      throw new Error("PDF not found. Please generate the PDF first.");
    }



    return new Response(pdf.body, {
      headers:{
        'Content-Type': pdf.contentType,
        'Content-Disposition': `attachment; filename="${pdf.filename}"`,
      }
    })  // Return the PDF as a response
  });