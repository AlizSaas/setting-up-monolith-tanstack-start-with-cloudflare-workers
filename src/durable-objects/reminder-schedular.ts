import { createDb, type Database } from "@/db";
import { checkReminderSent, getReminderData, recordReminderSent } from "./durable-utils/reminder-db";


function generateReminderIdempotencyKey(
  invoiceId: string,
  reminderType: string,
  scheduledDate: string
): string {
  return `${invoiceId}:${reminderType}:${scheduledDate}`;
} // retunr {invoiceId, reminderType, scheduledDate} for better debugging?

const DEFAULT_REMINDER_DAYS = {
  before_due: 3, 
  on_due: 0,
  after_due: 7,
};

const REMINDER_TYPES = ["before_due", "on_due", "after_due"] as const;

type ReminderType = (typeof REMINDER_TYPES)[number];

interface ReminderJob {
  invoice_id: string;
  reminder_type: ReminderType;
  scheduled_at: number;
  idempotency_key: string;  // This is used to ensure we don't send duplicate reminders if the alarm fires multiple times before we can update the state
  sent: boolean;
}

interface InvoiceReminders {
  invoice_id: string;
  due_date: string;
  reminders: ReminderJob[];
  cancelled: boolean;
}

interface ReminderState {
  invoices: Record<string, InvoiceReminders>;
}

export class ReminderScheduler implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private db: Database;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    // Create the Drizzle database instance — this is the ONLY db you need
    this.db = createDb(env.DATABASE_URL);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      switch (path) {
        case "/schedule":
          return await this.handleSchedule(request);
        case "/cancel":
          return await this.handleCancel(request);
        case "/process":
          return await this.handleProcess();
        case "/status":
          return await this.handleStatus(request);
        default:
          return new Response("Not found", { status: 404 });
      }
    } catch (error) {
      console.error("ReminderScheduler error:", error);
      return new Response(
        JSON.stringify({ error: (error as Error).message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

 private async handleSchedule(request: Request): Promise<Response> {
    const body = await request.json() as { invoice_id: string; due_date: string };
    const { invoice_id, due_date } = body;

    const dueDateTime = new Date(due_date).getTime();
    const now = Date.now();

    // Get existing state
    const state = await this.state.storage.get<ReminderState>('state') || { invoices: {} };

    // Calculate reminder times
    const reminders: ReminderJob[] = [];

    // Before due (3 days before)
    const beforeDueTime = dueDateTime - (DEFAULT_REMINDER_DAYS.before_due * 24 * 60 * 60 * 1000);
    if (beforeDueTime > now) {
      reminders.push({
        invoice_id,
        reminder_type: 'before_due',
        scheduled_at: beforeDueTime,
        idempotency_key: generateReminderIdempotencyKey(invoice_id, 'before_due', due_date),
        sent: false,
      });
    }

    // On due date
    const onDueTime = dueDateTime;
    if (onDueTime > now) {
      reminders.push({
        invoice_id,
        reminder_type: 'on_due',
        scheduled_at: onDueTime,
        idempotency_key: generateReminderIdempotencyKey(invoice_id, 'on_due', due_date),
        sent: false,
      });
    }

    // After due (7 days after)
    const afterDueTime = dueDateTime + (DEFAULT_REMINDER_DAYS.after_due * 24 * 60 * 60 * 1000);
    reminders.push({
      invoice_id,
      reminder_type: 'after_due',
      scheduled_at: afterDueTime,
      idempotency_key: generateReminderIdempotencyKey(invoice_id, 'after_due', due_date),
      sent: false,
    });

    // Store invoice reminders
    state.invoices[invoice_id] = {
      invoice_id,
      due_date,
      reminders,
      cancelled: false,
    };

    await this.state.storage.put('state', state);

    // Schedule alarm for earliest reminder
    const nextReminder = reminders.find(r => !r.sent && r.scheduled_at > now); // finds the next upcoming reminder that hasn't been sent yet
    if (nextReminder) {
      await this.state.storage.setAlarm(nextReminder.scheduled_at);
    } // Return scheduled reminders for debugging

    return new Response(JSON.stringify({ scheduled: reminders.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } // this is called when an invoice is created or updated to schedule reminders


  private async handleCancel(request: Request): Promise<Response> {
    const body = (await request.json()) as { invoice_id: string };
    const { invoice_id } = body;

    const state =
      (await this.state.storage.get<ReminderState>("state")) || {
        invoices: {},
      };

    if (state.invoices[invoice_id]) {
      state.invoices[invoice_id].cancelled = true;
      await this.state.storage.put("state", state);
    }

    return new Response(JSON.stringify({ cancelled: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  async alarm(): Promise<void> {
    await this.processReminders();
  }

  private async handleProcess(): Promise<Response> {
    const result = await this.processReminders();
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private async processReminders(): Promise<{
    processed: number;
    sent: number;
  }> {
    const state =
      (await this.state.storage.get<ReminderState>("state")) || {
        invoices: {},
      };
    const now = Date.now();
    let processed = 0;
    let sent = 0;

    for (const [invoiceId, invoiceData] of Object.entries(state.invoices)) {
      if (invoiceData.cancelled) continue;

      for (const reminder of invoiceData.reminders) {
        if (reminder.sent) continue;

        if (reminder.scheduled_at <= now) {
          processed++;

          // Use the Drizzle helper instead of this.env.DB
          const alreadySent = await checkReminderSent(
            this.db,
            invoiceId,
            reminder.idempotency_key
          );

          if (!alreadySent) {
            const success = await this.sendReminder(
              invoiceId,
              reminder.reminder_type
            );

            if (success) {
              sent++;
              reminder.sent = true;

              // Use the Drizzle helper instead of this.env.DB
              await recordReminderSent(
                this.db,
                invoiceId,
                reminder.reminder_type,
                reminder.idempotency_key
              );
            }
          } else {
            reminder.sent = true;
          }
        }
      }
    }

    await this.state.storage.put("state", state);
    await this.scheduleNextAlarm(state);

    return { processed, sent };
  }

  private async sendReminder(
    invoiceId: string,
    reminderType: ReminderType
  ): Promise<boolean> {
    try {
      // Use the Drizzle helper to get all reminder data in one call
      const data = await getReminderData(this.db, invoiceId);

      if (!data) return false;

      const { invoice, publicToken, settings: userSettings } = data;

      if (invoice.status === "paid" || invoice.status === "void") {
        return false;
      }

      const publicUrl = `${this.env.BETTER_AUTH_URL}/invoice/${publicToken}`;
      const fromEmail = this.env.EMAIL_FROM;

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: userSettings?.businessName
            ? `${userSettings.businessName} <${fromEmail}>`
            : fromEmail,
          to: invoice.clientEmail,
          subject: this.getReminderSubject(
            invoice.invoiceNumber,
            reminderType
          ),
          html: this.getReminderHTML(
            invoice,
            userSettings,
            publicUrl,
            reminderType
          ),
        }),
      });

      return response.ok;
    } catch (error) {
      console.error("Failed to send reminder:", error);
      return false;
    }
  }

  private getReminderSubject(
    invoiceNumber: string,
    reminderType: ReminderType
  ): string {
    switch (reminderType) {
      case "before_due":
        return `Reminder: Invoice ${invoiceNumber} is due soon`;
      case "on_due":
        return `Invoice ${invoiceNumber} is due today`;
      case "after_due":
        return `Overdue: Invoice ${invoiceNumber} requires attention`;
    }
  }

  private getReminderHTML(
    invoice: any,
    userSettings: any,
    publicUrl: string,
    reminderType: ReminderType
  ): string {
    const businessName = userSettings?.businessName || "Kivo";
    const isOverdue = reminderType === "after_due";

    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a;">${businessName}</h1>
        <div style="background: ${isOverdue ? "#fef2f2" : "#f9fafb"}; padding: 30px; border-radius: 8px;">
          <h2>Invoice ${invoice.invoiceNumber}</h2>
          <p>Amount: <strong>${invoice.currency} ${invoice.total}</strong></p>
          <p>Due: ${new Date(invoice.dueDate).toLocaleDateString()}</p>
          ${isOverdue ? '<p style="color: #dc2626; font-weight: bold;">⚠️ This invoice is overdue</p>' : ""}
          <a href="${publicUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Invoice</a>
        </div>
        <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">[TEST MODE - minutes instead of days]</p>
      </body>
      </html>
    `;
  }

  private async scheduleNextAlarm(state: ReminderState): Promise<void> {
    const now = Date.now();
    let nextTime: number | null = null;

    for (const invoiceData of Object.values(state.invoices)) {
      if (invoiceData.cancelled) continue;

      for (const reminder of invoiceData.reminders) {
        if (!reminder.sent && reminder.scheduled_at > now) {
          if (!nextTime || reminder.scheduled_at < nextTime) {
            nextTime = reminder.scheduled_at;
          }
        }
      }
    }

    if (nextTime) {
      await this.state.storage.setAlarm(nextTime);
    }
  }

  private async handleStatus(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const invoiceId = url.searchParams.get("invoice_id");

    const state =
      (await this.state.storage.get<ReminderState>("state")) || {
        invoices: {},
      };

    if (invoiceId) {
      const invoiceData = state.invoices[invoiceId];
      return new Response(JSON.stringify(invoiceData || null), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(state), {
      headers: { "Content-Type": "application/json" },
    });
  }
}