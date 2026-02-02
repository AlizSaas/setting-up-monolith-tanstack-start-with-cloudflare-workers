import { InvoiceFormPage } from '@/components/invoices/form'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/invoices/$id/edit')({
  component: RouteComponent,
    loader: async ({ params }) => {
    return { invoiceId: params.id }
  },
})

function RouteComponent() {
   const { id } = Route.useParams()
  return <InvoiceFormPage invoiceId={id} />
}
