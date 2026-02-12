import { useState, useTransition } from "react";
import z from "zod";

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

  FieldDescription,

  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "../ui/input";

import { useForm } from "@tanstack/react-form"
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

const resetPasswordSchema = z.object({
     NewPassword: z.string().min(8),
})
export default function ResetPassword({token}:{token?: string}) {
 
      const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
 
  const [isPending, startTransition] = useTransition();
    const form = useForm({
        defaultValues:{
            NewPassword:""
        },
        validators:{
            onSubmit:resetPasswordSchema
        },
        onSubmit:({value}) =>{
            startTransition( async () => {
        const {error} =  await authClient.resetPassword({
                    newPassword: value.NewPassword,
                    token: token
                })

                if(error){
                    toast.error(`Error resetting password: ${error.message}`)
                    setError(error.message || "An unknown error occurred.")
                    setSuccess(null)
                } else {
                    toast.success("Password reset successful! You can now log in with your new password.")
                    setSuccess("Password reset successful! You can now log in with your new password.")
                    setError(null)
                }

            })
        }
    })
  return (
 <Card  className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>
          Enter your information below to reset your password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form 
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }} >
  <FieldGroup>
     <form.Field
                  name="NewPassword"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>New Password</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder="********"
                          type="password"
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
  <Field>
    {success && (
              <div role="status" className="text-sm text-green-600">
                {success}
              </div>
            )}
            {error && (
              <div role="alert" className="text-sm text-red-600">
                {error}
              </div>
            )}
                  <Button
                  className="mt-3"
                  disabled={isPending}
                   type="submit">
                    {
    isPending ? "Resetting..." : "Reset Password"
                    }
                   </Button>
              
                  <FieldDescription className="px-6 text-center">
                    Remember your password?{" "}
                    <Link
                      to="/login"
                      className="text-primary hover:underline"
                    >
                      Login
                    </Link>
                    
                  </FieldDescription>
                </Field>



        </form>
          </CardContent>
            </Card>


  )
}
