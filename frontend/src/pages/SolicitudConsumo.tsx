import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { CircleCheck, Loader2, Mail, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Field } from "@/components/form/Field"
import { AvisoDatosPersonales } from "@/components/form/Consentimiento"
import { Container, PageHero } from "@/components/site/Section"
import { api, ApiError } from "@/lib/api"
import { CONTACT_EMAIL } from "@/lib/site"

type Tipo = "arrepentimiento" | "baja"

const TEXTOS: Record<Tipo, { titulo: string; descripcion: string; boton: string }> = {
  arrepentimiento: {
    titulo: "Botón de arrepentimiento",
    descripcion:
      "Si contrataste un plan a distancia, podés revocar la contratación dentro de los 10 días corridos, sin costo y sin dar explicaciones. No necesitás iniciar sesión.",
    boton: "Enviar solicitud de arrepentimiento",
  },
  baja: {
    titulo: "Botón de baja de servicio",
    descripcion:
      "Pedí la baja de tu plan cuando quieras, sin penalidades. No necesitás iniciar sesión.",
    boton: "Enviar solicitud de baja",
  },
}

const schema = z.object({
  nombre: z.string().trim().min(2, "Ingresá tu nombre"),
  email: z.string().trim().email("Email inválido"),
  servicio: z.string().trim().max(120, "Máximo 120 caracteres").optional(),
  detalle: z.string().trim().max(1000, "Máximo 1000 caracteres").optional(),
})
type FormValues = z.infer<typeof schema>

type Resultado = { codigo: string; notificado: boolean; datos: FormValues }

/**
 * Botón de arrepentimiento / botón de baja de servicio (Disp. SSDCyLC 954/2025):
 * sin registración ni pasos adicionales, y con código de identificación.
 */
export default function SolicitudConsumo({ tipo }: { tipo: Tipo }) {
  const t = TEXTOS[tipo]
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const r = await api.post<{ codigo: string; notificado: boolean }>(
        "/api/solicitudes-consumo",
        { tipo, ...values }
      )
      setResultado({ ...r, datos: values })
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : `No se pudo enviar. Escribinos a ${CONTACT_EMAIL}.`
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHero eyebrow="Tus derechos" title={t.titulo} description={t.descripcion} />
      <Container className="py-12">
        <div className="mx-auto max-w-2xl">
          {resultado ? (
            <Confirmacion tipo={tipo} resultado={resultado} />
          ) : (
            <Card>
              <CardContent className="p-6 sm:p-8">
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="grid gap-4"
                  noValidate
                >
                  <Field label="Nombre y apellido" htmlFor="nombre" required error={errors.nombre?.message}>
                    <Input id="nombre" autoComplete="name" className="h-10" aria-invalid={!!errors.nombre} {...register("nombre")} />
                  </Field>
                  <Field
                    label="Email"
                    htmlFor="email"
                    required
                    error={errors.email?.message}
                    hint="El que usaste al contratar. Ahí te enviamos el código."
                  >
                    <Input id="email" type="email" autoComplete="email" className="h-10" aria-invalid={!!errors.email} {...register("email")} />
                  </Field>
                  <Field
                    label="Plan o servicio (opcional)"
                    htmlFor="servicio"
                    error={errors.servicio?.message}
                    hint="Por ejemplo: Plan Full, clínica «Consultorio Centro»."
                  >
                    <Input id="servicio" className="h-10" aria-invalid={!!errors.servicio} {...register("servicio")} />
                  </Field>
                  <Field label="Comentario (opcional)" htmlFor="detalle" error={errors.detalle?.message}>
                    <Textarea id="detalle" rows={4} aria-invalid={!!errors.detalle} {...register("detalle")} />
                  </Field>

                  <p className="text-xs text-muted-foreground">
                    Usamos estos datos solo para gestionar tu solicitud. Más
                    información en la{" "}
                    <Link to="/privacidad" className="font-medium text-primary underline-offset-2 hover:underline">
                      Política de privacidad
                    </Link>
                    .
                  </p>
                  <AvisoDatosPersonales />

                  <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                    {submitting ? <Loader2 className="animate-spin" /> : <Send />}
                    {t.boton}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Conocé las condiciones en la{" "}
            <Link to="/reembolsos" className="font-medium text-primary underline-offset-2 hover:underline">
              Política de reembolsos
            </Link>
            .
          </p>
        </div>
      </Container>
    </>
  )
}

function Confirmacion({ tipo, resultado }: { tipo: Tipo; resultado: Resultado }) {
  const { codigo, notificado, datos } = resultado
  const asunto = `${TEXTOS[tipo].titulo} — ${codigo}`
  const cuerpo = [
    `Código: ${codigo}`,
    `Nombre: ${datos.nombre}`,
    `Email: ${datos.email}`,
    `Plan o servicio: ${datos.servicio || "—"}`,
    `Comentario: ${datos.detalle || "—"}`,
  ].join("\n")
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`

  return (
    <Card>
      <CardContent className="space-y-4 p-6 sm:p-8" role="status">
        <div className="flex items-center gap-3">
          <CircleCheck className="size-7 shrink-0 text-primary" aria-hidden />
          <h2 className="text-xl font-semibold">Recibimos tu solicitud</h2>
        </div>
        <p className="text-muted-foreground">Tu código de identificación es:</p>
        <p className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-center font-mono text-lg font-semibold tracking-wide">
          {codigo}
        </p>
        {notificado ? (
          <p className="text-sm text-muted-foreground">
            Te lo enviamos también a <strong className="text-foreground">{datos.email}</strong>.
            Guardalo para cualquier consulta.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Anotá el código. Para que quede constancia escrita, envianos también
              la solicitud por email con un clic:
            </p>
            <Button asChild size="lg" className="w-full">
              <a href={mailto}>
                <Mail /> Enviar la solicitud por email
              </a>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
