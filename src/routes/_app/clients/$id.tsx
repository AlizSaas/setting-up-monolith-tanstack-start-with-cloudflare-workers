import { ClientFormPage } from '@/components/client/client-form'
import { clientQueryOptions } from '@/data/clients/fetch-clients'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'


export const Route = createFileRoute('/_app/clients/$id')({
  component: RouteComponent,
  loader: async({params,context}) => {
    await context.queryClient.ensureQueryData(clientQueryOptions(params.id))
  }
})

function RouteComponent() {
  const {id} = Route.useParams()
  const {data} = useSuspenseQuery(clientQueryOptions(id))

  return <ClientFormPage clientId={data.id}/>
}
