import { useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { Loader2, Send, ShieldCheck, Paperclip, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Field } from "@/components/form/Field"
import { SelectField } from "@/components/form/SelectField"
import { Cie10Select } from "@/components/form/Cie10Select"
import { Container } from "@/components/site/Section"
import { AutorizacionesLista } from "@/components/dashboard/AutorizacionesLista"
import { api, ApiError } from "@/lib/api"
import { usePracticas } from "@/lib/catalogos"
import { tamanioLegible } from "@/lib/autorizaciones"
import { useAuth } from "@/contexts/AuthContext"

const MAX_ADJUNTOS = 5
const MAX_BYTES = 10 * 1024 * 1024

const formVacio = {
  dni: "",
  idPractica: "",
  pieza: "",
  cantidad: "1",
  diagnosticoCie10: "",
  fundamento: "",
  adjuntarOdontograma: false,
}

/** Fase K: el profesional pide autorizaciones previas y sigue sus solicitudes. */
export default function Autorizaciones() {
  const [params] = useSearchParams()
  const { user } = useAuth()
  const [form, setForm] = useState({ ...formVacio, dni: params.get("dni") || "" })
  const [archivos, setArchivos] = useState<File[]>([])
  const [enviando, setEnviando] = useState(false)
  const [recargar, setRecargar] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const { datos: practicas, cargando } = usePracticas()

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  // Primero las que requieren autorización (son las que se piden acá).
  const opcionesPractica = [...practicas]
    .sort((a, b) => Number(b.requiereAutorizacion) - Number(a.requiereAutorizacion))
    .map((p) => ({
      value: String(p.id),
      label: `${p.codigo} · ${p.descripcion}${p.requiereAutorizacion ? " (requiere autorización)" : ""}`,
    }))

  function agregarArchivos(lista: FileList | null) {
    if (!lista) return
    const nuevos = [...archivos]
    for (const f of Array.from(lista)) {
      if (!/^image\/(png|jpe?g)$/.test(f.type) && f.type !== "application/pdf") {
        toast.error(`${f.name}: solo imágenes PNG/JPG o PDF.`)
        continue
      }
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name}: pesa más de 10 MB.`)
        continue
      }
      if (nuevos.length >= MAX_ADJUNTOS) {
        toast.error(`Podés adjuntar hasta ${MAX_ADJUNTOS} archivos.`)
        break
      }
      nuevos.push(f)
    }
    setArchivos(nuevos)
    if (inputRef.current) inputRef.current.value = ""
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.dni.trim() || !form.idPractica || !form.fundamento.trim()) {
      toast.warning("Completá el DNI, la práctica y el fundamento.")
      return
    }
    setEnviando(true)
    try {
      const fd = new FormData()
      fd.set("dni", form.dni.trim())
      fd.set("idPractica", form.idPractica)
      if (form.pieza.trim()) fd.set("pieza", form.pieza.trim())
      fd.set("cantidad", form.cantidad || "1")
      if (form.diagnosticoCie10) fd.set("diagnosticoCie10", form.diagnosticoCie10)
      fd.set("fundamento", form.fundamento.trim())
      fd.set("adjuntarOdontograma", String(form.adjuntarOdontograma))
      archivos.forEach((f) => fd.append("adjuntos", f))
      await api.upload("/autorizaciones", fd)
      toast.success("Solicitud enviada a auditoría.")
      setForm({ ...formVacio })
      setArchivos([])
      setRecargar((n) => n + 1)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo enviar la solicitud.")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Container className="py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold sm:text-3xl">Autorizaciones previas</h1>
        <p className="mt-1 text-muted-foreground">
          Pedí a la auditoría que autorice una práctica antes de realizarla.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-5 text-primary" /> Nueva solicitud
          </h2>
          {!cargando && practicas.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              La clínica todavía no cargó su catálogo de prácticas. Pedile al administrador
              que lo cargue en Administración.
            </p>
          ) : (
            <form onSubmit={enviar} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate>
              <Field label="DNI del paciente" htmlFor="aut-dni" required>
                <Input
                  id="aut-dni"
                  inputMode="numeric"
                  className="h-10"
                  value={form.dni}
                  onChange={(e) => set("dni", e.target.value)}
                  maxLength={20}
                />
              </Field>
              <Field label="Práctica" htmlFor="aut-practica" required>
                <SelectField
                  id="aut-practica"
                  value={form.idPractica}
                  onValueChange={(v) => set("idPractica", v)}
                  options={opcionesPractica}
                  placeholder={cargando ? "Cargando…" : "Elegí la práctica"}
                  disabled={cargando}
                />
              </Field>
              <Field label="Pieza o zona" htmlFor="aut-pieza">
                <Input
                  id="aut-pieza"
                  className="h-10"
                  value={form.pieza}
                  onChange={(e) => set("pieza", e.target.value)}
                  maxLength={40}
                  placeholder="Ej.: 36"
                />
              </Field>
              <Field label="Cantidad" htmlFor="aut-cantidad">
                <Input
                  id="aut-cantidad"
                  type="number"
                  min={1}
                  max={99}
                  className="h-10"
                  value={form.cantidad}
                  onChange={(e) => set("cantidad", e.target.value)}
                />
              </Field>
              <Field label="Diagnóstico (CIE-10)" htmlFor="aut-dx" className="sm:col-span-2">
                <Cie10Select
                  id="aut-dx"
                  value={form.diagnosticoCie10}
                  onChange={(v) => set("diagnosticoCie10", v)}
                />
              </Field>
              <Field label="Fundamento clínico" htmlFor="aut-fundamento" required className="sm:col-span-2">
                <Textarea
                  id="aut-fundamento"
                  rows={4}
                  value={form.fundamento}
                  onChange={(e) => set("fundamento", e.target.value)}
                  maxLength={4000}
                  placeholder="Por qué es necesaria la práctica: hallazgos, estudios, antecedentes."
                />
              </Field>

              <div className="grid gap-2 sm:col-span-2">
                <Label>Adjuntos (estudios, radiografías)</Label>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png,image/jpeg,application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => agregarArchivos(e.target.files)}
                />
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => inputRef.current?.click()}
                    disabled={archivos.length >= MAX_ADJUNTOS}
                  >
                    <Paperclip /> Adjuntar archivos
                  </Button>
                </div>
                {archivos.length > 0 && (
                  <ul className="grid gap-1.5">
                    {archivos.map((f, i) => (
                      <li
                        key={`${f.name}-${i}`}
                        className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm"
                      >
                        <span className="min-w-0 flex-1 truncate">{f.name}</span>
                        <span className="text-xs text-muted-foreground">{tamanioLegible(f.size)}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setArchivos(archivos.filter((_, j) => j !== i))}
                          aria-label={`Quitar ${f.name}`}
                        >
                          <X />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground">
                  Hasta 5 archivos PNG, JPG o PDF de 10 MB cada uno.
                </p>
              </div>

              <div className="flex items-center gap-2.5 sm:col-span-2">
                <Checkbox
                  id="aut-odontograma"
                  checked={form.adjuntarOdontograma}
                  onCheckedChange={(v) => set("adjuntarOdontograma", v === true)}
                />
                <Label htmlFor="aut-odontograma" className="font-normal">
                  Adjuntar el odontograma de la última consulta
                </Label>
              </div>

              <div className="sm:col-span-2">
                <Button type="submit" size="lg" disabled={enviando}>
                  {enviando ? <Loader2 className="animate-spin" /> : <Send />}
                  Enviar a auditoría
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="p-4 sm:p-6">
          <h2 className="mb-4 font-semibold">
            {user?.esAdmin ? "Solicitudes de la clínica" : "Mis solicitudes"}
          </h2>
          <AutorizacionesLista modo="profesional" recargar={recargar} />
        </CardContent>
      </Card>
    </Container>
  )
}
