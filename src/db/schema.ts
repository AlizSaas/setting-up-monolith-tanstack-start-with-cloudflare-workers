import { pgTable, text, timestamp, boolean, pgEnum, index, numeric, integer } from "drizzle-orm/pg-core";


// Better Auth required tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id,{ onDelete: "cascade"}),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});





// --- Enums ---
// It's best practice in Postgres to use Enums for fixed states
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "pending", 
  "paid", 
  "void", 
  "overdue",
  "sent",
  "viewed"
]);

export const discountTypeEnum = pgEnum("discount_type", ["percentage", "fixed"]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending", 
  "succeeded", 
  "failed", 
  "refunded"
]);

// --- Tables ---

export const clients = pgTable("clients", {
  id: text("id").primaryKey(), // You can use uuid() or keep text if using CUIDs
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  address: text("address"),
  notes: text("notes"),
  archived: boolean("archived").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_clients_user_id").on(table.userId),
  index("idx_clients_email").on(table.email),
  index("idx_clients_archived").on(table.userId, table.archived),
]);

export const invoices = pgTable("invoices", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  clientId: text("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "restrict" }),
  invoiceNumber: text("invoice_number").notNull(),
  status: invoiceStatusEnum("status").default("draft").notNull(),
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  currency: text("currency").default("USD").notNull(),
  
  // Using numeric for money avoids floating point errors (e.g. 0.1 + 0.2 != 0.3)
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).default("0").notNull(),
  taxTotal: numeric("tax_total", { precision: 12, scale: 2 }).default("0").notNull(),
  
  discountType: discountTypeEnum("discount_type"),
  discountValue: numeric("discount_value", { precision: 12, scale: 2 }),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).default("0"),
  
  total: numeric("total", { precision: 12, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  paymentTerms: text("payment_terms"),
  remindersEnabled: boolean("reminders_enabled").default(true),
  pdfGeneratedAt: timestamp("pdf_generated_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_invoices_user_id").on(table.userId),
  index("idx_invoices_client_id").on(table.clientId),
  index("idx_invoices_status").on(table.userId, table.status),
  index("idx_invoices_due_date").on(table.dueDate),
  index("idx_invoices_number").on(table.userId, table.invoiceNumber),
  index("idx_invoices_created").on(table.userId, table.createdAt),
]);

export const invoiceItems = pgTable("invoice_items", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).default("1").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).default("0").notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }),
  amount: numeric("amount", { precision: 12, scale: 2 }).default("0").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
}, (table) => [
  index("idx_invoice_items_invoice_id").on(table.invoiceId),
]);

export const invoiceEvents = pgTable("invoice_events", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  metadata: text("metadata"), // Consider using jsonb() if your postgres supports it
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_invoice_events_invoice_id").on(table.invoiceId),
  index("idx_invoice_events_type").on(table.invoiceId, table.eventType),
]);

export const invoicePublicTokens = pgTable("invoice_public_tokens", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id")
    .notNull()
    .unique()
    .references(() => invoices.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_invoice_public_tokens_token").on(table.token),
]);

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  status: paymentStatusEnum("status").default("pending").notNull(),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_payments_invoice_id").on(table.invoiceId),
  index("idx_payments_stripe_session").on(table.stripeCheckoutSessionId),
  index("idx_payments_stripe_intent").on(table.stripePaymentIntentId),
]);

export const settings = pgTable("settings", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  businessName: text("business_name"),
  businessEmail: text("business_email"),
  businessAddress: text("business_address"),
  logoUrl: text("logo_url"),
  defaultCurrency: text("default_currency").default("USD").notNull(),
  defaultPaymentTerms: text("default_payment_terms").default("net_30").notNull(),
  timezone: text("timezone").default("Europe/Amsterdam").notNull(),
  emailFromName: text("email_from_name"),
  invoicePrefix: text("invoice_prefix").default("INV").notNull(),
  nextInvoiceNumber: integer("next_invoice_number").default(1).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_settings_user_id").on(table.userId),
]);