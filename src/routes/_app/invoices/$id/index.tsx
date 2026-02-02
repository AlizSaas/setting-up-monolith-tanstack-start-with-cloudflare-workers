import { InvoiceDetailPage } from '@/components/invoices/details'

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/invoices/$id/')({
  component: RouteComponent,
  loader: async ({ params }) => {
    return { invoiceId: params.id }
  },


})

function RouteComponent() {

  const { id } = Route.useParams()


  return(
  <InvoiceDetailPage invoiceId={id} />
  )
}
