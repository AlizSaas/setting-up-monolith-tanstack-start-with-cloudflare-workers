

import { InvoicesListPage } from '@/components/invoices/list';

import { createFileRoute } from '@tanstack/react-router'


export const Route = createFileRoute('/_app/invoices/')({
  component: RouteComponent,
 
})

function RouteComponent() {
  return <InvoicesListPage/>
}
