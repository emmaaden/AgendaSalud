import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Loader2,
  Search,
  Download,
  ArrowLeft,
  FileText,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Field } from "@/components/form/Field"
import { Container, PageHero } from "@/components/site/Section"
import { api, ApiError } from "@/lib/api"
import { downloadPatientHistoryPdf, type Paciente } from "@/lib/patientPdf"

const schema = z.object({
  dni: z.string().min(6, "Ingresá un DNI válido"),
  clave: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function HistoriaClinica() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paciente, setPaciente] = useState<Paciente | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setLoading(true)
    setError(null)
    try {
      const data = await api.post<Paciente>("/pacient/get-data-pacient", {
        dni: values.dni,
      })
      setPaciente(data)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? "No encontramos datos. Asegurate de que el paciente esté registrado."
          : "No se pudo obtener la información. Intentá de nuevo."
      )
    } finally {
      setLoading(false)
    }
  }

  function volver() {
    setPaciente(null)
    setError(null)
    reset()
  }

  function descargarPDF() {
    if (!paciente) return
    downloadPatientHistoryPdf(paciente)
  }

  const datos = paciente
    ? [
        ["Teléfono", paciente.telefono],
        ["Email", paciente.email],
        ["DNI", paciente.dni],
        ["Dirección", paciente.direccion],
        ["Fecha de nacimiento", paciente.fechaNacimiento],
        ["Edad", paciente.edad],
        ["Obra social", paciente.obraSocial],
        ["Sexo", paciente.sexo],
        ["Fecha de apertura", paciente.fechaApertura],
      ]
    : []

  return (
    <>
      <PageHero
        eyebrow="Historia clínica"
        title="Consultá tu historia clínica"
        description="Ingresá tu DNI para acceder a tus datos y al historial de consultas."
      />

      <Container className="py-12">
        {!paciente ? (
          <div className="mx-auto max-w-lg">
            <Card>
              <CardContent className="p-6 sm:p-8">
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-4"
                  noValidate
                >
                  <Field
                    label="DNI"
                    htmlFor="dni"
                    required
                    error={errors.dni?.message}
                  >
                    <Input
                      id="dni"
                      type="number"
                      inputMode="numeric"
                      className="h-10"
                      aria-invalid={!!errors.dni}
                      {...register("dni")}
                    />
                  </Field>
                  <Field
                    label="Clave de acceso"
                    htmlFor="clave"
                    hint="La clave que te proporcionó tu profesional."
                  >
                    <Input
                      id="clave"
                      type="password"
                      className="h-10"
                      {...register("clave")}
                    />
                  </Field>
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <Search />}
                    Buscar
                  </Button>
                </form>
              </CardContent>
            </Card>
            {error && (
              <p className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <Button variant="ghost" onClick={volver}>
                <ArrowLeft />
                Nueva búsqueda
              </Button>
              <Button onClick={descargarPDF}>
                <Download />
                Descargar PDF
              </Button>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
                    <User className="size-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">
                      {paciente.fullName}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Datos del paciente
                    </p>
                  </div>
                </div>
                <dl className="mt-6 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  {datos.map(([label, value]) => (
                    <div key={String(label)} className="flex flex-col">
                      <dt className="text-xs font-medium text-muted-foreground">
                        {label}
                      </dt>
                      <dd className="text-sm">{value || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>

            <h3 className="mt-8 flex items-center gap-2 text-lg font-semibold">
              <FileText className="size-5 text-primary" />
              Historial de consultas
            </h3>

            {paciente.history?.length ? (
              <div className="mt-4 space-y-4">
                {paciente.history.map((e, i) => (
                  <Card key={i}>
                    <CardContent className="p-5">
                      <div className="flex flex-wrap justify-between gap-2 border-b border-border pb-3">
                        <span className="text-sm">
                          <span className="font-medium text-muted-foreground">
                            Profesional:{" "}
                          </span>
                          {e.profesional}
                        </span>
                        <span className="text-sm">
                          <span className="font-medium text-muted-foreground">
                            Área:{" "}
                          </span>
                          {e.area}
                        </span>
                        <span className="text-sm">
                          <span className="font-medium text-muted-foreground">
                            Fecha:{" "}
                          </span>
                          {e.fecha}hs
                        </span>
                      </div>
                      <div className="mt-3 space-y-2 text-sm">
                        <p>
                          <span className="font-medium text-muted-foreground">
                            Síntomas:{" "}
                          </span>
                          {e.sintomas}
                        </p>
                        <p>
                          <span className="font-medium text-muted-foreground">
                            Diagnóstico:{" "}
                          </span>
                          {e.diagnostico}
                        </p>
                        <p>
                          <span className="font-medium text-muted-foreground">
                            Tratamiento:{" "}
                          </span>
                          {e.tratamiento}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No hay consultas registradas.
              </p>
            )}
          </div>
        )}
      </Container>
    </>
  )
}
