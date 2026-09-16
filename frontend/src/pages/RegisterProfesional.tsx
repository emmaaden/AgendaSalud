import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, Stethoscope, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Field } from "@/components/form/Field"
import { SelectField, type Option } from "@/components/form/SelectField"
import { Container } from "@/components/site/Section"
import { api, ApiError } from "@/lib/api"

const schema = z
  .object({
    onboardingMode: z.enum(["crear", "codigo"]),
    nombreClinica: z.string().optional(),
    activationCode: z.string().optional(),
    especialidad: z.string().min(1, "Seleccioná una especialidad"),
    nombre: z.string().min(2, "Requerido"),
    apellido: z.string().min(2, "Requerido"),
    dni: z.string().min(6, "DNI inválido"),
    sexo: z.string().min(1, "Seleccioná una opción"),
    fechaNacimiento: z.string().min(1, "Requerido"),
    matricula: z.string().min(1, "Requerido"),
    telefono: z.string().min(6, "Teléfono inválido"),
    direccion: z.string().min(2, "Requerido"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
  })
  .refine((d) => d.onboardingMode !== "crear" || !!d.nombreClinica?.trim(), {
    message: "Ingresá el nombre de la clínica",
    path: ["nombreClinica"],
  })
  .refine((d) => d.onboardingMode !== "codigo" || !!d.activationCode?.trim(), {
    message: "Ingresá el código de activación",
    path: ["activationCode"],
  })
type FormValues = z.infer<typeof schema>

const SEXO = [
  { value: "Masculino", label: "Masculino" },
  { value: "Femenino", label: "Femenino" },
  { value: "Otro", label: "Otro" },
]

const MODOS = [
  { value: "crear", label: "Crear una clínica nueva" },
  { value: "codigo", label: "Unirme con un código de activación" },
]

export default function RegisterProfesional() {
  const [submitting, setSubmitting] = useState(false)
  const [especialidades, setEspecialidades] = useState<Option[]>([])

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { onboardingMode: "crear" },
  })

  const modo = watch("onboardingMode")

  useEffect(() => {
    api
      .get<{ especialidades: { id: number | string; nombre: string }[] }>(
        "/especialidades/get-especialidades"
      )
      .then((d) =>
        setEspecialidades(
          (d.especialidades || []).map((e) => ({
            value: String(e.id),
            label: e.nombre,
          }))
        )
      )
      .catch(() => toast.error("No se pudieron cargar las especialidades"))
  }, [])

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      await api.post("/auth/register", {
        email: values.email,
        password: values.password,
        activationCode: values.onboardingMode === "codigo" ? values.activationCode : "",
        nombreClinica: values.onboardingMode === "crear" ? values.nombreClinica : "",
        dni: values.dni,
        nombre: values.nombre,
        apellido: values.apellido,
        fechaNacimiento: values.fechaNacimiento,
        telefono: values.telefono,
        especialidad: values.especialidad,
        matricula: values.matricula,
        direccion: values.direccion,
        sexo: values.sexo,
        role: "PROFESIONAL",
      })
      toast.success("Cuenta profesional creada")
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
          <h1 className="text-3xl font-semibold">Registro profesional</h1>
          <p className="mt-2 text-muted-foreground">
            Creá tu clínica o unite a una existente con un código.
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
                label="¿Cómo querés empezar?"
                htmlFor="onboardingMode"
                required
                className="sm:col-span-2"
                error={errors.onboardingMode?.message}
              >
                <Controller
                  control={control}
                  name="onboardingMode"
                  render={({ field }) => (
                    <SelectField
                      id="onboardingMode"
                      value={field.value}
                      onValueChange={field.onChange}
                      options={MODOS}
                    />
                  )}
                />
              </Field>

              {modo === "crear" ? (
                <Field
                  label="Nombre de la clínica"
                  htmlFor="nombreClinica"
                  required
                  className="sm:col-span-2"
                  error={errors.nombreClinica?.message}
                >
                  <Input
                    id="nombreClinica"
                    className="h-10"
                    aria-invalid={!!errors.nombreClinica}
                    {...register("nombreClinica")}
                  />
                </Field>
              ) : (
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
              )}

              <Field
                label="Especialidad"
                htmlFor="especialidad"
                required
                className="sm:col-span-2"
                error={errors.especialidad?.message}
              >
                <Controller
                  control={control}
                  name="especialidad"
                  render={({ field }) => (
                    <SelectField
                      id="especialidad"
                      value={field.value}
                      onValueChange={field.onChange}
                      options={especialidades}
                      invalid={!!errors.especialidad}
                      placeholder={
                        especialidades.length ? "Seleccionar…" : "Cargando…"
                      }
                    />
                  )}
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
              <Field label="Sexo" htmlFor="sexo" required error={errors.sexo?.message}>
                <Controller
                  control={control}
                  name="sexo"
                  render={({ field }) => (
                    <SelectField
                      id="sexo"
                      value={field.value}
                      onValueChange={field.onChange}
                      options={SEXO}
                      invalid={!!errors.sexo}
                    />
                  )}
                />
              </Field>

              <Field label="Fecha de nacimiento" htmlFor="fechaNacimiento" required error={errors.fechaNacimiento?.message}>
                <Input id="fechaNacimiento" type="date" className="h-10" aria-invalid={!!errors.fechaNacimiento} {...register("fechaNacimiento")} />
              </Field>
              <Field label="Matrícula" htmlFor="matricula" required error={errors.matricula?.message}>
                <Input id="matricula" className="h-10" aria-invalid={!!errors.matricula} {...register("matricula")} />
              </Field>

              <Field label="Teléfono" htmlFor="telefono" required error={errors.telefono?.message}>
                <Input id="telefono" type="tel" className="h-10" aria-invalid={!!errors.telefono} {...register("telefono")} />
              </Field>
              <Field label="Dirección" htmlFor="direccion" required error={errors.direccion?.message}>
                <Input id="direccion" className="h-10" aria-invalid={!!errors.direccion} {...register("direccion")} />
              </Field>

              <Field label="Email" htmlFor="email" required error={errors.email?.message}>
                <Input id="email" type="email" autoComplete="email" className="h-10" aria-invalid={!!errors.email} {...register("email")} />
              </Field>
              <Field label="Contraseña" htmlFor="password" required error={errors.password?.message}>
                <Input id="password" type="password" autoComplete="new-password" className="h-10" aria-invalid={!!errors.password} {...register("password")} />
              </Field>

              <div className="sm:col-span-2">
                <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin" /> : <Stethoscope />}
                  Crear cuenta profesional
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
