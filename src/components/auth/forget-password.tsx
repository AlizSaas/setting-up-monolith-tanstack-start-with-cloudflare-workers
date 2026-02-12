import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,

  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"

import { useState, useTransition } from "react"
import z from "zod"
import { useForm } from "@tanstack/react-form"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import { Input } from "../ui/input"
const forgetPasswordSchema  = z.object({

    email: z.string().email("Please enter a valid email address"),
})

export default function ForgetPassword() {
      const [success, setSuccess] = useState<string | null>(null);


  const [isPending,startTransition  ] = useTransition()

      const form = useForm({
        defaultValues:{
            email:""
        },
        validators:{
            onSubmit:forgetPasswordSchema
        },
         onSubmit:   ({value}) => {
            startTransition(async () =>{
                await authClient.requestPasswordReset({
                    email:value.email,
                    redirectTo:'/reset-password',
                    fetchOptions:{
                        onSuccess:() => {
                            toast.success("If an account with that email exists, a password reset link has been sent.")
                            setSuccess("If an account with that email exists, a password reset link has been sent.")
                            
                        },
                        onError:({error}) => {
                            toast.error(`Error requesting password reset: ${error.message}`)
                            setSuccess(null)
                        }

                    }
                })
                
            })

         }

      })
  return (
        <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Forgot your password?</CardTitle>
<CardDescription>
  Enter your email and we'll send you a reset link.
</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
              }}>
                <FieldGroup>
                 <form.Field
                               name="email"
                               children={(field) => {
                                 const isInvalid =
                                   field.state.meta.isTouched && !field.state.meta.isValid
                                 return (
                                   <Field data-invalid={isInvalid}>
                                     <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                                     <Input
                                       id={field.name}
                                       name={field.name}
                                       value={field.state.value}
                                       onBlur={field.handleBlur}
                                       onChange={(e) => field.handleChange(e.target.value)}
                                       aria-invalid={isInvalid}
                                       placeholder="email@example.com"
                                       type="email"
                                       autoComplete="off"
                                     />
                                     {isInvalid && (
                                       <FieldError errors={field.state.meta.errors} />
                                     )}
                                   </Field>
                                 )
                               }}
                             />
                </FieldGroup>
                <Button type="submit" disabled={isPending} className="w-full mt-4">
                  {isPending ? "Requesting..." : "Request Password Reset"}
                </Button>
              </form>
              {success && <p className="mt-4 text-green-600">{success}</p>}
            </CardContent>
          </Card>
  )
}
