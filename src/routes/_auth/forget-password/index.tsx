import ForgetPassword from '@/components/auth/forget-password'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/forget-password/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <ForgetPassword/>
}
