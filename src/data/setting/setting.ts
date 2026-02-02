import { authMiddleware } from "@/middlewares/dependencies";
import { createServerFn } from "@tanstack/react-start";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
 export const getSettingsFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        const { db, user } = context;

        let userSettings = await db
            .select()
            .from(settings)
            .where(eq(settings.userId, user.id))
            .then((rows) => rows[0]);

        if (!userSettings) {
            const now = new Date();
            await db.insert(settings).values({
                id: crypto.randomUUID(),
                userId: user.id,
                defaultCurrency: "USD",
                defaultPaymentTerms: "net_30",
                timezone: "Europe/Amsterdam",
                invoicePrefix: "INV",
                nextInvoiceNumber: 1,
                createdAt: now,
                updatedAt: now,
            });

            userSettings = await db
                .select()
                .from(settings)
                .where(eq(settings.userId, user.id))
                .then((rows) => rows[0]);
        }

        return userSettings;
    });

