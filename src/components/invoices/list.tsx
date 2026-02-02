import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Plus, FileText, Search, ChevronRight, ChevronLeft } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { INVOICE_STATUSES } from '@/lib/constant';


import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/routes/_app/clients';
import { clientsQueryOptions } from '@/data/clients/fetch-clients';
import { invoicesQueryOptions } from '@/data/invoices/fetch-invoices';

function getDueDateDisplay(dueDate: string, status: string) {
  if (status === 'settled' || status === 'paid' || status === 'void' || status === 'draft') {
    return { text: '-', className: 'text-muted-foreground' };
  }

  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      text: `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`,
      className: 'text-status-overdue font-medium',
    };
  } else if (diffDays === 0) {
    return { text: 'Due today', className: 'text-status-overdue font-medium' };
  } else if (diffDays <= 7) {
    return {
      text: `${diffDays} day${diffDays === 1 ? '' : 's'} left`,
      className: 'text-foreground',
    };
  } else {
    return {
      text: `${diffDays} days left`,
      className: 'text-muted-foreground',
    };
  }
}

export function InvoicesListPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;

  // ✅ Use query options instead of calling server function directly
  const { data: invoicesResponse, isLoading } = useQuery(
    invoicesQueryOptions({
      status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
      client_id: clientFilter !== 'all' ? clientFilter : undefined,
      page: currentPage,
      limit,
    })
  );

  // ✅ Use query options for clients too
  const { data: clients } = useQuery(clientsQueryOptions(false));

  const invoices = invoicesResponse?.data || [];
  const pagination = invoicesResponse?.pagination;

  // Filter by search query (client-side for invoice number and client name)
  const filteredInvoices = invoices.filter((invoice) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      invoice.invoice_number?.toLowerCase().includes(query) ||
      invoice.client_name?.toLowerCase().includes(query)
    );
  });

  // Reset page when filters change
  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleClientChange = (value: string) => {
    setClientFilter(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Create and manage your invoices"
        actions={
          <Link to="/invoices/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </Link>
        }
      />

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {INVOICE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={clientFilter} onValueChange={handleClientChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients?.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            {/* Table Header Skeleton */}
            <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 border-b bg-muted/30">
              <Skeleton className="h-4 w-16 col-span-2" />
              <Skeleton className="h-4 w-12 col-span-2" />
              <Skeleton className="h-4 w-10 col-span-2" />
              <Skeleton className="h-4 w-20 col-span-3" />
              <Skeleton className="h-4 w-16 col-span-3" />
            </div>
            <div className="divide-y">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                  <div className="col-span-12 sm:col-span-2">
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <div className="col-span-6 sm:col-span-3 text-right">
                    <Skeleton className="h-5 w-20 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={FileText}
              title="No invoices found"
              description={
                statusFilter !== 'all' || clientFilter !== 'all' || searchQuery
                  ? 'Try adjusting your filters'
                  : 'Create your first invoice to get started'
              }
              action={
                <Link to="/invoices/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Invoice
                  </Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {/* Table Header */}
              <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 border-b bg-muted/30 text-sm font-medium text-muted-foreground">
                <div className="col-span-2">Number</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Due</div>
                <div className="col-span-3">Customer</div>
                <div className="col-span-3 text-right">Amount</div>
              </div>

              {/* Table Body */}
              <div className="divide-y">
                {filteredInvoices.map((invoice) => {
                  const dueDisplay = getDueDateDisplay(
                    invoice.due_date.toString(),
                    invoice.status
                  );
                  return (
                    <Link
                      key={invoice.id}
                      to="/invoices/$id"
                      params={{ id: invoice.id }}
                      className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-muted/50 transition-colors group"
                    >
                      {/* Invoice Number */}
                      <div className="col-span-12 sm:col-span-2">
                        <span className="font-medium text-foreground">
                          {invoice.invoice_number}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <div className="col-span-6 sm:col-span-2">
                        <Badge variant={invoice.status as any} className="capitalize">
                          {invoice.status}
                        </Badge>
                      </div>

                      {/* Due Date */}
                      <div className="col-span-6 sm:col-span-2">
                        <span className={`text-sm ${dueDisplay.className}`}>
                          {dueDisplay.text}
                        </span>
                      </div>

                      {/* Customer */}
                      <div className="col-span-6 sm:col-span-3">
                        <span className="text-sm text-foreground truncate block">
                          {invoice.client_name || 'Unknown client'}
                        </span>
                      </div>

                      {/* Amount */}
                      <div className="col-span-6 sm:col-span-3 flex items-center justify-end gap-2">
                        <span className="font-semibold text-foreground">
                          {formatCurrency(Number(invoice.total), invoice.currency as any)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * limit + 1} to{' '}
                {Math.min(currentPage * limit, pagination.total)} of {pagination.total} invoices
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
                    .filter((page) => {
                      // Show first page, last page, current page, and pages around current
                      return (
                        page === 1 ||
                        page === pagination.total_pages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      );
                    })
                    .map((page, idx, arr) => (
                      <div key={page} className="flex items-center">
                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                          <span className="px-2 text-muted-foreground">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="min-w-9"
                        >
                          {page}
                        </Button>
                      </div>
                    ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(pagination.total_pages, prev + 1))
                  }
                  disabled={currentPage === pagination.total_pages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}