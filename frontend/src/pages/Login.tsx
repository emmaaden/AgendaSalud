import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/form/Field"
import { AuthShell } from "@/components/site/AuthShell"
import { api, ApiError } from "@/lib/api"

const schema = z.object({
  email: z.string().email("Ingresá un email válido"),
  password: z.string().min(1, "Ingresá tu contraseña"),
})
type FormValues = z.infer<typeof schema>

export default function Login() {
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      // El backend detecta el rol (profesional/paciente) desde la base; no se envía.
      const res = await api.post<{ user?: { role?: string } }>(
        "/auth/login",
        values
      )
      toast.success("Bienvenido/a")
      // Paciente → su área de turnos; profesional → panel. Navegación completa para
      // que la nueva sesión (cookie httpOnly) se tome en el primer render.
      const destino =
        res?.user?.role === "paciente" ? "/mis-turnos" : "/dashboard"
      window.location.href = destino
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "No se pudo iniciar sesión. Intentá de nuevo."
      toast.error(msg)
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Tu salud, organizada en un solo lugar"
      subtitle="Accedé a tus turnos y tus datos. Si sos profesional, gestioná tu agenda y tu clínica."
      bullets={[
        "Pacientes: mirá y cancelá tus turnos",
        "Turnos y calendario sincronizados",
        "Historia clínica digital",
      ]}
    >
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ingresá con tu cuenta de paciente o profesional.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Email" htmlFor="email" required error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="tu@email.com"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
        </Field>

        <Field
          label="Contraseña"
          htmlFor="password"
          required
          error={errors.password?.message}
        >
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
        </Field>

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-primary hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" /> : <LogIn />}
          Iniciar sesión
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿No tenés cuenta?{" "}
        <Link to="/register" className="font-medium text-primary hover:underline">
          Registrate
        </Link>
      </p>
    </AuthShell>
  )
}
