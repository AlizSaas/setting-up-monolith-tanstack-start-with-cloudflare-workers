import { buttonVariants } from '@/components/ui/button'
import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/_auth')({
  component: RouteComponent,
  beforeLoad: async () => {
    // if a user if found in the session, redirect to dashboard
    
  }
})

function RouteComponent() {
  return (
    <div className='min-h-screen'>

        <div className='absolute top-8 left-8'>
            <Link to='/' className={buttonVariants({ variant: 'secondary' })}>
                <ArrowLeft className='size-4' />
            Back to Home
        
            
            </Link>

        </div>

     <div className='flex min-h-screen items-center justify-center'>
           <Outlet />
     </div>

    </div>
  )
}