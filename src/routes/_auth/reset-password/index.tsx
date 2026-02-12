import ResetPassword from '@/components/auth/reset-password'
import { createFileRoute } from '@tanstack/react-router'


export const Route = createFileRoute('/_auth/reset-password/')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || undefined,
  }),

})

function RouteComponent() {
  const { token } = Route.useSearch()
return (
  <main className="flex min-h-svh items-center justify-center px-4">
      {token ? (
        <ResetPassword token={token} />
      ) : (
        <div role="alert" className="text-red-600">
         <h1 className='text-4xl font-extrabold '>
           Token is missing.
         </h1>
        </div>
      )}
    </main>
)
}
