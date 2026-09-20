import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, ClipboardList, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Field } from "@/components/form/Field"
import { Container } from "@/components/site/Section"
import { api, ApiError } from "@/lib/api"

const schema = z.object({
  activationCode: z.string().min(1, "Ingresá el código de activación"),
  nombre: z.string().min(2, "Requerido"),
  apellido: z.string().min(2, "Requerido"),
  dni: z.string().min(6, "DNI inválido"),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
})
type FormValues = z.infer<typeof schema>

export default function RegisterRecepcion() {
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      await api.post("/auth/register", {
        email: values.email,
        password: values.password,
        activationCode: values.activationCode.trim(),
        dni: values.dni,
        nombre: values.nombre,
        apellido: values.apellido,
        telefono: values.telefono,
        role: "RECEPCION",
      })
      toast.success("Cuenta de recepción creada")
      window.location.href = "/dashboard"
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "No se pudo completar el registro."
      toast.error(msg)
      setSubmitting(false)
    }
  }

  return (
    <Container className="py-12">
      <Link
        to="/register"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver
      </Link>

      <div className="mx-auto mt-4 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold">Registro de recepción</h1>
          <p className="mt-2 text-muted-foreground">
            Unite a tu clínica con el código que te dio el administrador. Vas a
            gestionar los turnos de la clínica.
          </p>
        </div>

        <Card>
          <CardContent className="p-6 sm:p-8">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="grid gap-4 sm:grid-cols-2"
              noValidate
            >
              <Field
                label="Código de activación"
                htmlFor="activationCode"
                required
                className="sm:col-span-2"
                error={errors.activationCode?.message}
              >
                <Input
                  id="activationCode"
                  className="h-10"
                  aria-invalid={!!errors.activationCode}
                  {...register("activationCode")}
                />
              </Field>

              <Field label="Nombre" htmlFor="nombre" required error={errors.nombre?.message}>
                <Input id="nombre" className="h-10" aria-invalid={!!errors.nombre} {...register("nombre")} />
              </Field>
              <Field label="Apellido" htmlFor="apellido" required error={errors.apellido?.message}>
                <Input id="apellido" className="h-10" aria-invalid={!!errors.apellido} {...register("apellido")} />
              </Field>

              <Field label="DNI" htmlFor="dni" required error={errors.dni?.message}>
                <Input id="dni" type="number" inputMode="numeric" className="h-10" aria-invalid={!!errors.dni} {...register("dni")} />
              </Field>
              <Field label="Teléfono" htmlFor="telefono" error={errors.telefono?.message}>
                <Input id="telefono" type="tel" className="h-10" {...register("telefono")} />
              </Field>

              <Field label="Email" htmlFor="email" required error={errors.email?.message}>
                <Input id="email" type="email" autoComplete="email" className="h-10" aria-invalid={!!errors.email} {...register("email")} />
              </Field>
              <Field label="Contraseña" htmlFor="password" required error={errors.password?.message}>
                <Input id="password" type="password" autoComplete="new-password" className="h-10" aria-invalid={!!errors.password} {...register("password")} />
              </Field>

              <div className="sm:col-span-2">
                <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin" /> : <ClipboardList />}
                  Crear cuenta de recepción
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿Ya tenés cuenta?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </Container>
  )
}
