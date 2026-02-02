import { ClientFormPage } from '@/components/client/client-form'

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/clients/new')({
  component: RouteComponent,
 
 
})

function RouteComponent() {
  return <ClientFormPage/>
}
