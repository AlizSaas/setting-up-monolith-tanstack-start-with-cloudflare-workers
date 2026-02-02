import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  Send,
  Pencil,
  Eye,
  Loader2,
  Clock,
  CheckCircle,
  Copy,
  Download,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDateForTimezone } from '@/lib/utils';
import { PageHeader } from '@/routes/_app/clients';
import { toast } from 'sonner';
import {  settingsQueryOptions } from '@/data/setting/fetch-setting';
import { invoiceQueryOptions, INVOICES_QUERY_KEY } from '@/data/invoices/fetch-invoices';
import { duplicateInvoiceFn, generatePdfFn, getInvoicePdfUrl, sendInvoiceFn } from '@/data/invoices/invoices';


export function InvoiceDetailPage({invoiceId}: {invoiceId: string}) {

  const navigate = useNavigate();

  const queryClient = useQueryClient();

const { data: invoice, isLoading } = useQuery(invoiceQueryOptions(invoiceId));
const { data: settings } = useQuery(settingsQueryOptions());

const sendMutation = useMutation({
  mutationFn: () => sendInvoiceFn({ data: { invoiceId: invoiceId } }),
  onSuccess: () => {
    // ✅ Fixed: Remove the extra array wrapper
    queryClient.invalidateQueries({ 
      queryKey: INVOICES_QUERY_KEY.invoice(invoiceId) 
    });
    toast.success('Invoice sent to client');
  },
  onError: (error: any) => {
    toast.error(`Error sending invoice: ${error.message}`);
  },
});

const duplicateMutation = useMutation({
  mutationFn: () => duplicateInvoiceFn({ data: { invoiceId: invoiceId } }),
  onSuccess: (data) => {
    // ✅ Fixed: Add the queryKey wrapper
    queryClient.invalidateQueries({ 
      queryKey: INVOICES_QUERY_KEY.invoicesInvalidation 
    });
    toast.success('Invoice duplicated');
    navigate({ to: `/invoices/${data.id}` });
  },
  onError: (error: any) => {
    toast.error(`Error duplicating invoice: ${error.message}`);   
  },
});

  const generatePdfMutation = useMutation({
    mutationFn: () => generatePdfFn({ data: { invoiceId: invoiceId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', invoiceId] });
      toast.success('PDF generated');
    },
    onError: (error: any) => {
      toast.error(`Error generating PDF: ${error.message}`);
      
    },
  });



  const timezone = settings?.timezone || 'Europe/Amsterdam';

  if (isLoading) {
    return (
      <div className="min-h-screen lg:px-6">
        <PageHeader title="Invoice" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-8 w-32 mb-4" />
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-24 mb-4" />
                <Skeleton className="h-10 w-full mb-2" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Invoice not found</p>
          <Link to="/invoices">
            <Button variant="link">Back to invoices</Button>
          </Link>
        </div>
      </div>
    );
  }

  const canSend = invoice.status === 'draft';
  const canEdit = invoice.status === 'draft';

  const handleViewPDF = async () => {
  const response = await getInvoicePdfUrl({ data: { invoiceId: invoice.id } });
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
};


  return (
    <div className="min-h-screen lg:px-6">
      <PageHeader
        title={invoice.invoiceNumber}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={invoice.status as any} className="text-sm">
              {invoice.status}
            </Badge>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice details */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Issue Date</p>
                  <p className="font-medium">{formatDateForTimezone(invoice.issueDate, timezone)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium">{formatDateForTimezone(invoice.dueDate, timezone)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Currency</p>
                  <p className="font-medium">{invoice.currency}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Terms</p>
                  <p className="font-medium">
                    {invoice.paymentTerms?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client */}
          <Card>
            <CardHeader>
              <CardTitle>Client</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{invoice.clients.name}</p>
              {invoice.clients.company && (
                <p className="text-muted-foreground">{invoice.clients.company}</p>
              )}
              <p className="text-muted-foreground">{invoice.clients.email}</p>
              {invoice.clients.address && (
                <p className="text-muted-foreground whitespace-pre-line mt-2">
                  {invoice.clients.address}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Line items */}
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-sm text-muted-foreground">
                      <th className="text-left py-2">Description</th>
                      <th className="text-right py-2">Qty</th>
                      <th className="text-right py-2">Price</th>
                      <th className="text-right py-2">Tax</th>
                      <th className="text-right py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items?.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-3">{item.description}</td>
                        <td className="text-right py-3">{item.quantity}</td>
                        <td className="text-right py-3">
                          {formatCurrency(Number(item.unitPrice), invoice.currency as any)}
                        </td>
                        <td className="text-right py-3">
                          {item.taxRate ? `${item.taxRate}%` : '-'}
                        </td>
                        <td className="text-right py-3 font-medium">
                          {formatCurrency(Number(item.amount), invoice.currency as any)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-6 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(Number(invoice.subtotal), invoice.currency as any)}</span>
                </div>
                {Number(invoice.taxTotal) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(Number(invoice.taxTotal), invoice.currency as any)}</span>
                  </div>
                )}
                {invoice.discountAmount && Number(invoice.discountAmount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Discount
                      {invoice.discountType === 'percentage' && invoice.discountValue
                        ? ` (${invoice.discountValue}%)`
                        : ''}
                    </span>
                    <span>-{formatCurrency(Number(invoice.discountAmount), invoice.currency as any)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(Number(invoice.total), invoice.currency as any)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-line">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {canEdit && (
                <Link to="/invoices/$id/edit" params={{ id: invoiceId }} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Invoice
                  </Button>
                </Link>
              )}
              {canSend && (
                <Button
                  className="w-full justify-start"
                  onClick={() => sendMutation.mutate()}
                  disabled={sendMutation.isPending}
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send to Client
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => generatePdfMutation.mutate()}
                disabled={generatePdfMutation.isPending}
              >
                {generatePdfMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Generate PDF
              </Button> 
              {invoice.pdfGeneratedAt && (
                
                  <Button 

                  onClick={handleViewPDF}
                  
                  
                  variant="outline" className="w-full justify-start">
                    <Eye className="mr-2 h-4 w-4" />
                    View PDF
                  </Button>
                
              )} 
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => duplicateMutation.mutate()}
                disabled={duplicateMutation.isPending}
              >
                {duplicateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                Duplicate
              </Button>
            </CardContent>
          </Card>

          {/* Activity */}
          {invoice.events && invoice.events.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {invoice.events.slice(0, 10).map((event) => (
                    <div key={event.id} className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {event.eventType === 'paid' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : event.eventType === 'sent' ? (
                          <Send className="h-4 w-4 text-blue-500" />
                        ) : event.eventType === 'viewed' ? (
                          <Eye className="h-4 w-4 text-purple-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {event.eventType.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateForTimezone(event.createdAt, timezone)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payments */}
          {invoice.payments && invoice.payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {invoice.payments.map((payment: any) => (
                    <div key={payment.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {formatCurrency(payment.amount, payment.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {payment.paid_at
                            ? formatDateForTimezone(payment.paid_at, timezone)
                            : 'Pending'}
                        </p>
                      </div>
                      <Badge
                        variant={payment.status === 'succeeded' ? 'default' : 'secondary'}
                      >
                        {payment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
