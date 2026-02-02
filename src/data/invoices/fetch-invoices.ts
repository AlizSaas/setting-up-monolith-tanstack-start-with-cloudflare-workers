import { queryOptions } from "@tanstack/react-query";
import { getInvoicesFn, getInvoiceByIdFn } from "./invoices";
import { InvoiceStatus } from "@/lib/types";

// Invoice query keys
export const INVOICES_QUERY_KEY = {
  invoices: (filters: {
    status?:InvoiceStatus,
    client_id?: string;
    page?: number;
    limit?: number;
  }) => ["invoices", filters] as const,
  invoice: (id: string) => ["invoices", id] as const,
  invoicesInvalidation: ["invoices"] as const,
};

// Query options for invoice list with filters
export const invoicesQueryOptions = (filters: {
  status?: InvoiceStatus;
  client_id?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}) => {
  return queryOptions({ 
    queryKey: INVOICES_QUERY_KEY.invoices(filters),
    queryFn: () => getInvoicesFn({data: filters}), // ✅ Pass the actual filters
    enabled: filters.enabled,
  });
};

// Query options for single invoice by ID
export const invoiceQueryOptions = (id: string) => {
  return queryOptions({
    queryKey: INVOICES_QUERY_KEY.invoice(id),
    queryFn: () => getInvoiceByIdFn({ data: { id } }),
  });
};