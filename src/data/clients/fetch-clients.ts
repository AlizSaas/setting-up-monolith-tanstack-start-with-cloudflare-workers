import { queryOptions } from "@tanstack/react-query"
import { getClientByIdFn, getClientsFn } from "./clients"

// clients.query.ts
export const CLIENTS_QUERY_KEY = {
  clients: (archived: boolean) => ['clients', { archived }] as const,
  clientsInvalidation: ['clients',]
}

export const clientsQueryOptions = (archived = false) => {
  return queryOptions({
    queryKey: CLIENTS_QUERY_KEY.clients(archived),
    queryFn: () => getClientsFn({ data: { archived } }) // Pass boolean directly
  })
}

export const clientQueryOptions = (clientId: string) => {
  return queryOptions({
    queryKey: ['clients', clientId] as const,
    queryFn: () => getClientByIdFn({data:{id: clientId}})
  })
}