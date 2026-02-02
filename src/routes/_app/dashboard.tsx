import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { dashboardChartsStatsQueryOptions,  dashboardStatsQueryOptions } from '@/data/dashboard/fech-dashboard'
import { formatCurrency } from '@/lib/utils'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { AlertTriangle, ArrowRight, BarChart3, ChevronRight, DollarSign, FileText, Send, TrendingUp, Users, Zap } from 'lucide-react'

export const Route = createFileRoute('/_app/dashboard')({
  component: RouteComponent,
  loader: async ({context}) => {
    await context.queryClient.ensureQueryData(dashboardStatsQueryOptions())
    await context.queryClient.ensureQueryData(dashboardChartsStatsQueryOptions())
  }
  
})
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
      text: `${overdueDays}d overdue`,
      className: 'text-status-overdue font-medium',
    };
  } else if (diffDays === 0) {
    return { text: 'Due today', className: 'text-status-overdue font-medium' };
  } else if (diffDays <= 7) {
    return {
      text: `${diffDays}d left`,
      className: 'text-foreground',
    };
  } else {
    return {
      text: `${diffDays}d left`,
      className: 'text-muted-foreground',
    };
  }
}

function RouteComponent() {
  const { data } = useSuspenseQuery(dashboardStatsQueryOptions())


  return (
    <div className='bg-background lg:pl-5'>
      <div className='flex items-center justify-between'>
         <div>
        <h1 className='text-3xl font-bold'>
          Dashboard
        </h1>
        <p className='text-muted-foreground'>
          View your invoice statistics and recent activity here.
        </p>

      </div>
      
      <div>
        <Link to="/clients" className={buttonVariants({ variant: 'default' })}>
      <FileText className='mr-2 h-4 w-4'/>
        New Invoice
        
        
        </Link>
      </div>

      </div>

     
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8 mt-5">
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Outstanding</p>
                <p className="text-2xl font-bold tracking-tight">
                  {formatCurrency(data.kpis.totalOutstanding || 0, (data.defaultCurrency || 'USD') as any)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Unpaid invoices</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Paid This Month</p>
                <p className="text-2xl font-bold tracking-tight text-status-settled">
                  {formatCurrency(data.kpis.totalPaidThisMonth || 0, (data.defaultCurrency || 'USD') as any)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Revenue collected</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-status-settled/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-status-settled" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Overdue</p>
                <p className="text-2xl font-bold tracking-tight text-status-overdue">
                  {data.kpis.overdueCount || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Need attention</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-status-overdue/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-status-overdue" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Clients</p>
                <p className="text-2xl font-bold tracking-tight">
                  {data.kpis.totalClients || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Active clients</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="group hover:shadow-kivo-md transition-shadow">
          <CardContent className="p-6">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Less time, less effort</h3>
            <p className="text-sm text-muted-foreground">
              Create, edit, and send branded invoices in minutes.
            </p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-kivo-md transition-shadow">
          <CardContent className="p-6">
            <div className="h-10 w-10 rounded-xl bg-status-settled/10 flex items-center justify-center mb-4 group-hover:bg-status-settled/20 transition-colors">
              <Send className="h-5 w-5 text-status-settled" />
            </div>
            <h3 className="font-semibold mb-1">Easy links, faster payments</h3>
            <p className="text-sm text-muted-foreground">
              Share payment links to get paid up to 40% faster.
            </p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-kivo-md transition-shadow">
          <CardContent className="p-6">
            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
              <BarChart3 className="h-5 w-5 text-accent" />
            </div>
            <h3 className="font-semibold mb-1">Full control, better tracking</h3>
            <p className="text-sm text-muted-foreground">
              Simplify invoice management with a unified dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
        <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg">Recent Invoices</CardTitle>
          <Link to="/invoices">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary">
              View all
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {data.recentInvoices.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No invoices yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first invoice to get started
              </p>
              <Link to="/invoices/new">
                <Button variant="outline" size="sm">
                  Create your first invoice
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 border-b bg-muted/30 text-sm font-medium text-muted-foreground">
                <div className="col-span-3">Number</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Due</div>
                <div className="col-span-3">Customer</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>

              {/* Table Body */}
              <div className="divide-y">
                {data.recentInvoices.map((invoice) => {
                    const dueDisplay = getDueDateDisplay(invoice.dueDate.toString(), invoice.status);
                    return (
                    <Link
                      key={invoice.id}
                      to="/invoices/$id"
                      params={{ id: invoice.id }}
                      className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-muted/50 transition-colors group"
                    >
                      {/* Invoice Number */}
                      <div className="col-span-12 sm:col-span-3">
                        <span className="font-medium">{invoice.invoiceNumber}</span>
                      </div>

                      {/* Status */}
                      <div className="col-span-4 sm:col-span-2">
                        <Badge variant={invoice.status as any} className="capitalize">
                          {invoice.status}
                        </Badge>
                      </div>

                      {/* Due */}
                      <div className="col-span-4 sm:col-span-2">
                        <span className={`text-sm ${dueDisplay.className}`}>
                          {dueDisplay.text}
                        </span>
                      </div>

                      {/* Customer */}
                      <div className="col-span-4 sm:col-span-3">
                        <span className="text-sm text-muted-foreground truncate block">
                          {invoice.clientName}
                        </span>
                      </div>

                      {/* Amount */}
                      <div className="col-span-12 sm:col-span-2 flex items-center justify-end gap-2">
                        <span className="font-semibold">
                          {formatCurrency(Number(invoice.total), invoice.currency as any)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
     

    </div>
  )
}
