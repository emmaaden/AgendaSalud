import { useEffect, useState } from "react"
import { Link, Navigate } from "react-router-dom"
import { toast } from "sonner"
import { Loader2, Download, FileText, User, ArrowLeft, FileJson } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Container, PageHero } from "@/components/site/Section"
import { api } from "@/lib/api"
import { useUser } from "@/hooks/useUser"
import { downloadPatientHistoryPdf, type Paciente } from "@/lib/patientPdf"

export default function MiHistoria() {
  const { user, loading: loadingUser } = useUser()
  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [loading, setLoading] = useState(true)

  const esPaciente = user?.role === "paciente"

  useEffect(() => {
    if (!esPaciente) return
    api
      .get<Paciente>("/api/mi-cuenta/historia")
      .then((d) => setPaciente(d))
      .catch(() => toast.error("No se pudo cargar tu historia clínica."))
      .finally(() => setLoading(false))
  }, [esPaciente])

  async function descargarJson() {
    try {
      const res = await fetch("/api/mi-cuenta/historia/export", {
        credentials: "include",
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const cd = res.headers.get("Content-Disposition") || ""
      const m = cd.match(/filename="?([^"]+)"?/)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = m?.[1] || "mi-historia-clinica.json"
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("No se pudo descargar el archivo.")
    }
  }

  if (loadingUser) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }
  if (!user || !esPaciente) {
    return <Navigate to="/login" replace />
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
        eyebrow="Mi cuenta"
        title="Mi historia clínica"
        description="Tu ficha y el historial de tus consultas. Solo vos podés verlo."
      />

      <Container className="py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Button asChild variant="ghost">
              <Link to="/mis-turnos">
                <ArrowLeft /> Volver a mi cuenta
              </Link>
            </Button>
            {paciente && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={descargarJson}>
                  <FileJson /> Descargar JSON
                </Button>
                <Button onClick={() => downloadPatientHistoryPdf(paciente)}>
                  <Download /> Descargar PDF
                </Button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : !paciente ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No pudimos cargar tu historia clínica.
              </CardContent>
            </Card>
          ) : (
            <>
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
            </>
          )}
        </div>
      </Container>
    </>
  )
}
