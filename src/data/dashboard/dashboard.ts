import { clients, invoices, settings } from "@/db/schema";
import { authMiddleware } from "@/middlewares/dependencies";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq, and, sql, inArray, lt, gte, lte } from "drizzle-orm";


export const getDashboardStatsFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        const { db, user } = context;

        // Get user's settings for default currency
        const [userSettings] = await db
            .select({ defaultCurrency: settings.defaultCurrency })
            .from(settings)
            .where(eq(settings.userId, user.id))
            .limit(1);

        const defaultCurrency = userSettings?.defaultCurrency || "USD";

        // Get current month boundaries
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Total outstanding (sent, viewed, overdue)
        const [outstandingResult] = await db
            .select({ total: sql<number>`COALESCE(SUM(${invoices.total}), 0)` })
            .from(invoices)
            .where(
                and(
                    eq(invoices.userId, user.id),
                    inArray(invoices.status, ["sent", "viewed", "overdue"])
                )
            );

        // Total paid this month
        const [paidThisMonthResult] = await db
            .select({ total: sql<number>`COALESCE(SUM(${invoices.total}), 0)` })
            .from(invoices)
            .where(
                and(
                    eq(invoices.userId, user.id),
                    eq(invoices.status, "paid"),
                    gte(invoices.updatedAt, firstDayOfMonth),
                    lte(invoices.updatedAt, lastDayOfMonth)
                )
            );

        // Overdue count
        const [overdueResult] = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(invoices)
            .where(
                and(
                    eq(invoices.userId, user.id),
                    inArray(invoices.status, ["sent", "viewed"]),
                    lt(invoices.dueDate, today)
                )
            );

        // Update overdue invoices status
        await db
            .update(invoices)
            .set({ status: "overdue", updatedAt: now })
            .where(
                and(
                    eq(invoices.userId, user.id),
                    inArray(invoices.status, ["sent", "viewed"]),
                    lt(invoices.dueDate, today)
                )
            );

        // Total clients (non-archived)
        const [clientsResult] = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(clients)
            .where(and(eq(clients.userId, user.id), eq(clients.archived, false)));

        // Total invoices
        const [invoicesCountResult] = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(invoices)
            .where(eq(invoices.userId, user.id));

        // Recent invoices (last 10) using query for relations
        const recentInvoices = await db
            .select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            status: invoices.status,
            total: invoices.total,
            currency: invoices.currency,
            dueDate: invoices.dueDate,
            createdAt: invoices.createdAt,
            clientName: clients.name,
            })
            .from(invoices)
            .leftJoin(clients, eq(clients.id, invoices.clientId))
            .where(eq(invoices.userId, user.id))
            .orderBy(desc(invoices.createdAt))
            .limit(10);

        return {
            kpis: {
                totalOutstanding: outstandingResult?.total || 0,
                totalPaidThisMonth: paidThisMonthResult?.total || 0,
                overdueCount: overdueResult?.count || 0,
                totalClients: clientsResult?.count || 0,
                totalInvoices: invoicesCountResult?.count || 0,
            },
            defaultCurrency,
            recentInvoices,
        };
    });

export const getDashboardChartStatsFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        const { db, user } = context;
        const now = new Date();

        // Get last 6 months of data
        const months: { month: string; invoiced: number; paid: number }[] = [];

        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
            const monthLabel = date.toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
            });

            // Total invoiced this month
            const [invoicedResult] = await db
                .select({ total: sql<number>`COALESCE(SUM(${invoices.total}), 0)` })
                .from(invoices)
                .where(
                    and(
                        eq(invoices.userId, user.id),
                        gte(invoices.createdAt, monthStart),
                        lte(invoices.createdAt, monthEnd)
                    )
                );

            // Total paid this month
            const [paidResult] = await db
                .select({ total: sql<number>`COALESCE(SUM(${invoices.total}), 0)` })
                .from(invoices)
                .where(
                    and(
                        eq(invoices.userId, user.id),
                        eq(invoices.status, "paid"),
                        gte(invoices.updatedAt, monthStart),
                        lte(invoices.updatedAt, monthEnd)
                    )
                );

            months.push({
                month: monthLabel,
                invoiced: invoicedResult?.total || 0,
                paid: paidResult?.total || 0,
            });
        }

        // Status breakdown
        const statusBreakdown = await db
            .select({
                status: invoices.status,
                count: sql<number>`COUNT(*)`,
                total: sql<number>`COALESCE(SUM(${invoices.total}), 0)`,
            })
            .from(invoices)
            .where(eq(invoices.userId, user.id))
            .groupBy(invoices.status);

        return {
            monthly: months,
            byStatus: statusBreakdown,
        };
    });