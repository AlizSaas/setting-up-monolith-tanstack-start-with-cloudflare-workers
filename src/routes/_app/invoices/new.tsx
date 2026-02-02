import { InvoiceFormPage } from '@/components/invoices/form'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/invoices/new')({
  component: RouteComponent,
   
})

function RouteComponent() {
  return <InvoiceFormPage />
}
