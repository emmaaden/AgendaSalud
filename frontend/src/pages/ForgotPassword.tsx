import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, MailCheck, ArrowLeft, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/form/Field"
import { AuthShell } from "@/components/site/AuthShell"
import { api, ApiError } from "@/lib/api"

const schema = z.object({
  email: z.string().email("Ingresá un email válido"),
})
type FormValues = z.infer<typeof schema>

export default function ForgotPassword() {
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      await api.post("/auth/forgot-password", values)
      setSent(true)
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "No se pudo enviar el correo."
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Recuperá el acceso a tu cuenta"
      subtitle="Te enviaremos un enlace para restablecer tu contraseña de forma segura."
    >
      {sent ? (
        <div className="text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <MailCheck className="size-7" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold">Revisá tu correo</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Si el email está registrado, te enviamos un enlace para restablecer
            tu contraseña. Puede tardar unos minutos.
          </p>
          <Button asChild variant="outline" size="lg" className="mt-6">
            <Link to="/login">
              <ArrowLeft />
              Volver a iniciar sesión
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h1 className="text-2xl font-semibold">¿Olvidaste tu contraseña?</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Ingresá tu email y te enviaremos las instrucciones.
            </p>
          </div>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <Field
              label="Email"
              htmlFor="email"
              required
              error={errors.email?.message}
            >
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
            </Field>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="animate-spin" /> : <Send />}
              Enviar enlace
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link
              to="/login"
              className="font-medium text-primary hover:underline"
            >
              Volver a iniciar sesión
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  )
}
