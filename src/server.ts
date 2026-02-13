import handler from "@tanstack/react-start/server-entry";
import { createDb, getDb } from "./db";
import { schema } from "./db";
import { setAuth } from "./lib/auth";
import { createLogger } from "./utils/logger";
import { eq, inArray, lt, and } from "drizzle-orm";
import { sendEmail } from "./lib/auth-emails";
import * as Sentry from "@sentry/cloudflare";

export { ReminderScheduler } from './durable-objects/reminder-schedular';

async function handleScheduledEvent(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
  const logger = createLogger();
  logger.info('Cron trigger started', { cron: controller.cron });

  createDb(env.DATABASE_URL);
  const db = getDb();

  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const overdueResult = await db
      .update(schema.invoices)
      .set({
        status: 'overdue',
        updatedAt: now,
      })
      .where(
        and(
          inArray(schema.invoices.status, ['sent', 'viewed']),
          lt(schema.invoices.dueDate, new Date(today))
        )
      )
      .returning({ id: schema.invoices.id });

    logger.info('Updated overdue invoices', { count: overdueResult.length });

    const usersWithReminders = await db
      .selectDistinct({ userId: schema.invoices.userId })
      .from(schema.invoices)
      .where(
        and(
          inArray(schema.invoices.status, ['sent', 'viewed', 'overdue']),
          eq(schema.invoices.remindersEnabled, true)
        )
      );

    for (const row of usersWithReminders) {
      const reminderDOId = env.REMINDER_SCHEDULER.idFromName(row.userId);
      const reminderDO = env.REMINDER_SCHEDULER.get(reminderDOId);

      ctx.waitUntil(
        reminderDO.fetch('http://internal/process', { method: 'POST' })
          .catch((error) => {
            logger.error('Failed to process reminders for user', error as Error, { user_id: row.userId });
          })
      );
    }

    logger.info('Cron trigger completed');
  } catch (error) {
    logger.error('Cron trigger failed', error as Error);
    throw error; // Re-throw so Sentry captures it!
  }
}

// ✅ Wrap your entire export with Sentry.withSentry
export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN, // Add SENTRY_DSN to your wrangler.toml / env
    tracesSampleRate: 0.1, // Adjust this value in production (e.g., 0.1 for 10% of transactions)
    enableLogs: true, // Enable Sentry logs
    sendDefaultPii: false, // Send user info with errors (make sure to set user context in auth middleware
  }),
  {
    async fetch(request: Request, env: Env, executionCtx: ExecutionContext) {
    

      createDb(env.DATABASE_URL);
      setAuth({
        secret: env.BETTER_AUTH_SECRET,
        adapter: {
          drizzleDb: getDb(),
          provider: "pg",
        },
        sendResetPassword: async ({ email, url }) => {
          await sendEmail(env, {
            to: email,
            subject: "Reset your password",
            text: `Click this link to reset your password:\n${url}`,
          });
        },
      });

      return handler.fetch(request, {
        context: {
          env,
          waitUntil: executionCtx.waitUntil.bind(executionCtx),
          fromFetch: true,
          request: request,
        },
      });
    },
    scheduled: handleScheduledEvent,
  } satisfies ExportedHandler<Env>
);

