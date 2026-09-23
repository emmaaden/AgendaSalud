import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  Loader2,
  Search,
  Download,
  PenLine,
  UploadCloud,
  FilePlus2,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Field } from "@/components/form/Field"
import { Container } from "@/components/site/Section"
import { api, ApiError } from "@/lib/api"
import type { Certificado } from "@/pages/MisCertificados"

type PacienteInfo = { nombre: string; dni: string }

function formatFecha(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

export default function Certificados() {
  // Firma / sello
  const [tieneFirma, setTieneFirma] = useState<boolean | null>(null)
  const [subiendoFirma, setSubiendoFirma] = useState(false)
  const firmaInput = useRef<HTMLInputElement>(null)

  // Búsqueda de paciente
  const [dni, setDni] = useState("")
  const [buscando, setBuscando] = useState(false)
  const [paciente, setPaciente] = useState<PacienteInfo | null>(null)
  const [certificados, setCertificados] = useState<Certificado[]>([])
  const [buscado, setBuscado] = useState(false)

  // Emitir
  const [form, setForm] = useState({
    motivo: "",
    diagnostico: "",
    indicaciones: "",
    diasReposo: "",
  })
  const [emitiendo, setEmitiendo] = useState(false)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [descargando, setDescargando] = useState<number | null>(null)

  useEffect(() => {
    api
      .get<{ tieneFirma: boolean }>("/certificados/firma")
      .then((d) => setTieneFirma(!!d.tieneFirma))
      .catch(() => setTieneFirma(false))
  }, [])

  async function subirFirma(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendoFirma(true)
    try {
      const fd = new FormData()
      fd.append("firma", file)
      await api.upload("/certificados/firma", fd)
      setTieneFirma(true)
      toast.success("Firma cargada.")
    } catch {
      toast.error("No se pudo cargar la firma.")
    } finally {
      setSubiendoFirma(false)
      if (firmaInput.current) firmaInput.current.value = ""
    }
  }

  async function buscar(e?: React.FormEvent) {
    e?.preventDefault()
    if (!dni.trim()) return
    setBuscando(true)
    setBuscado(false)
    try {
      const d = await api.get<{
        paciente: PacienteInfo | null
        certificados: Certificado[]
      }>(`/certificados?dni=${encodeURIComponent(dni.trim())}`)
      setPaciente(d.paciente)
      setCertificados(d.certificados || [])
      setBuscado(true)
      if (!d.paciente) toast.error("No se encontró un paciente con ese DNI en tu clínica.")
    } catch {
      toast.error("No se pudo buscar el paciente.")
    } finally {
      setBuscando(false)
    }
  }

  async function recargar() {
    if (!dni.trim()) return
    try {
      const d = await api.get<{ certificados: Certificado[] }>(
        `/certificados?dni=${encodeURIComponent(dni.trim())}`
      )
      setCertificados(d.certificados || [])
    } catch {
      /* noop */
    }
  }

  async function emitir() {
    if (!paciente) return
    setEmitiendo(true)
    try {
      await api.post("/certificados/generar", { dni: paciente.dni, ...form })
      toast.success("Certificado generado.")
      setForm({ motivo: "", diagnostico: "", indicaciones: "", diasReposo: "" })
      await recargar()
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "No se pudo generar el certificado."
      toast.error(msg)
    } finally {
      setEmitiendo(false)
    }
  }

  async function subirFoto() {
    if (!paciente || !archivo) return
    setSubiendo(true)
    try {
      const fd = new FormData()
      fd.append("dni", paciente.dni)
      fd.append("archivo", archivo)
      await api.upload("/certificados/subir", fd)
      toast.success("Certificado subido.")
      setArchivo(null)
      await recargar()
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "No se pudo subir el certificado."
      toast.error(msg)
    } finally {
      setSubiendo(false)
    }
  }

  async function descargar(c: Certificado) {
    setDescargando(c.id)
    try {
      const { url } = await api.get<{ url: string }>(
        `/certificados/${c.id}/descargar`
      )
      window.open(url, "_blank", "noopener,noreferrer")
    } catch {
      toast.error("No se pudo descargar el certificado.")
    } finally {
      setDescargando(null)
    }
  }

  return (
    <Container className="py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold sm:text-3xl">Certificados médicos</h1>
        <p className="mt-1 text-muted-foreground">
          Emití certificados para tus pacientes o subí la foto de uno físico.
        </p>
      </div>

      {/* Firma / sello */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-6">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <PenLine className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Firma y sello</h2>
            <p className="text-sm text-muted-foreground">
              {tieneFirma === null
                ? "Comprobando…"
                : tieneFirma
                  ? "Ya cargaste tu firma. Podés reemplazarla cuando quieras."
                  : "Cargá tu firma o sello (PNG o JPG) para poder generar certificados."}
            </p>
          </div>
          {tieneFirma && (
            <Badge className="gap-1">
              <CheckCircle2 className="size-3.5" /> Cargada
            </Badge>
          )}
          <input
            ref={firmaInput}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={subirFirma}
          />
          <Button
            variant={tieneFirma ? "outline" : "default"}
            onClick={() => firmaInput.current?.click()}
            disabled={subiendoFirma}
          >
            {subiendoFirma ? <Loader2 className="animate-spin" /> : <UploadCloud />}
            {tieneFirma ? "Reemplazar" : "Cargar firma"}
          </Button>
        </CardContent>
      </Card>

      {/* Buscar paciente */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <h2 className="font-semibold">Paciente</h2>
          <form onSubmit={buscar} className="mt-3 flex flex-wrap gap-2">
            <Input
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              placeholder="DNI del paciente"
              inputMode="numeric"
              className="max-w-xs"
            />
            <Button type="submit" disabled={buscando || !dni.trim()}>
              {buscando ? <Loader2 className="animate-spin" /> : <Search />}
              Buscar
            </Button>
          </form>
          {buscado && paciente && (
            <p className="mt-3 text-sm">
              Paciente:{" "}
              <span className="font-medium">{paciente.nombre}</span>{" "}
              <span className="text-muted-foreground">· DNI {paciente.dni}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {paciente && (
        <>
          {/* Emitir */}
          <Card className="mt-6">
            <CardContent className="p-6">
              <h2 className="flex items-center gap-2 font-semibold">
                <FilePlus2 className="size-5 text-primary" /> Nuevo certificado
              </h2>
              <Tabs defaultValue="generar" className="mt-4">
                <TabsList>
                  <TabsTrigger value="generar">Generar</TabsTrigger>
                  <TabsTrigger value="subir">Subir foto</TabsTrigger>
                </TabsList>

                <TabsContent value="generar" className="mt-4 space-y-4">
                  {!tieneFirma && (
                    <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                      Cargá tu firma o sello arriba para poder generar certificados.
                    </p>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Motivo" htmlFor="motivo">
                      <Input
                        id="motivo"
                        value={form.motivo}
                        onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                        placeholder="Reposo por cuadro gripal"
                      />
                    </Field>
                    <Field label="Días de reposo" htmlFor="dias">
                      <Input
                        id="dias"
                        type="number"
                        min={0}
                        value={form.diasReposo}
                        onChange={(e) =>
                          setForm({ ...form, diasReposo: e.target.value })
                        }
                        placeholder="0"
                      />
                    </Field>
                  </div>
                  <Field label="Diagnóstico" htmlFor="dx">
                    <Input
                      id="dx"
                      value={form.diagnostico}
                      onChange={(e) =>
                        setForm({ ...form, diagnostico: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Indicaciones" htmlFor="ind">
                    <Textarea
                      id="ind"
                      rows={3}
                      value={form.indicaciones}
                      onChange={(e) =>
                        setForm({ ...form, indicaciones: e.target.value })
                      }
                    />
                  </Field>
                  <Button onClick={emitir} disabled={emitiendo || !tieneFirma}>
                    {emitiendo ? <Loader2 className="animate-spin" /> : <FileText />}
                    Generar certificado
                  </Button>
                </TabsContent>

                <TabsContent value="subir" className="mt-4 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Adjuntá la imagen (PNG/JPG) o el PDF de un certificado físico.
                  </p>
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,application/pdf"
                    onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                  />
                  <Button onClick={subirFoto} disabled={subiendo || !archivo}>
                    {subiendo ? <Loader2 className="animate-spin" /> : <UploadCloud />}
                    Subir certificado
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Listado del paciente */}
          <Card className="mt-6">
            <CardContent className="p-6">
              <h2 className="font-semibold">Certificados de {paciente.nombre}</h2>
              <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
                {certificados.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      {c.esImagen ? (
                        <ImageIcon className="size-4" />
                      ) : (
                        <FileText className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {c.tipo === "generado" ? "Digital" : "Adjunto"}
                        {c.diasReposo ? (
                          <Badge variant="secondary" className="font-normal">
                            {c.diasReposo} día(s)
                          </Badge>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatFecha(c.emitidoEn)}
                        {c.motivo ? ` · ${c.motivo}` : ""}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => descargar(c)}
                      disabled={descargando === c.id}
                    >
                      {descargando === c.id ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Download />
                      )}
                      Descargar
                    </Button>
                  </li>
                ))}
                {certificados.length === 0 && (
                  <li className="px-4 py-3 text-sm text-muted-foreground">
                    Este paciente todavía no tiene certificados.
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </Container>
  )
}
