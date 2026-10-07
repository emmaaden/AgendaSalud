import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import {
  Search,
  UserPlus,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Download,
  Save,
  FileText,
  User,
  Stethoscope,
  ShieldCheck,
  Pencil,
  Tags,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Field } from "@/components/form/Field"
import { DictationTextarea } from "@/components/form/DictationTextarea"
import { SelectField } from "@/components/form/SelectField"
import { CoberturaFields } from "@/components/form/CoberturaFields"
import { CodificacionEditor, CodificacionResumen } from "@/components/form/CodificacionEditor"
import { Container } from "@/components/site/Section"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Odontogram, type Diente } from "@/components/dashboard/Odontogram"
import { api, ApiError } from "@/lib/api"
import { downloadPatientHistoryPdf, type Paciente } from "@/lib/patientPdf"
import { useAuth } from "@/contexts/AuthContext"
import { tieneFeature } from "@/lib/planes"
import {
  COBERTURA_VACIA,
  CODIFICACION_VACIA,
  coberturaPayload,
  codificacionPayload,
  type Cobertura,
  type Codificacion,
} from "@/lib/catalogos"
import { ESTADO_AUDITORIA, type EstadoAuditoria } from "@/lib/auditoria"

const SEXO = [
  { value: "Masculino", label: "Masculino" },
  { value: "Femenino", label: "Femenino" },
  { value: "Otro", label: "Otro" },
]

function generarContrasena(longitud = 8) {
  const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%"
  let out = ""
  for (let i = 0; i < longitud; i++)
    out += c.charAt(Math.floor(Math.random() * c.length))
  return out
}

type View = "menu" | "registrar" | "buscar"

const emptyForm = {
  nombre: "",
  dni: "",
  telefono: "",
  email: "",
  sexo: "",
  direccion: "",
  fechaNacimiento: "",
  edad: "",
  sintomas: "",
  diagnostico: "",
  tratamiento: "",
}

export default function RegistroClinico() {
  const { user } = useAuth()
  const [area, setArea] = useState("")
  const [view, setView] = useState<View>("menu")

  useEffect(() => {
    if (!user?.email) return
    api
      .post<{ area?: string }>("/auth/get-area", { email: user.email })
      .then((d) => setArea(d.area || ""))
      .catch(() => {})
  }, [user?.email])

  // La especialidad odontológica se llama "Odontología" en la base; aceptamos
  // también "Dentista" y variantes de mayúsculas por robustez.
  const isOdonto = /odonto|dentista/i.test(area)

  return (
    <Container className="py-8 sm:py-12">
      <h1 className="text-2xl font-semibold sm:text-3xl">Registro clínico</h1>
      <p className="mt-1 text-muted-foreground">
        {area ? `Área: ${area}` : "Gestión de pacientes y consultas."}
      </p>

      {view === "menu" && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <MenuCard
            icon={Search}
            title="Buscar paciente"
            description="Consultá la ficha, el historial y cargá una nueva consulta."
            onClick={() => setView("buscar")}
          />
          <MenuCard
            icon={UserPlus}
            title="Registrar paciente"
            description="Dá de alta un paciente nuevo con su primera consulta."
            onClick={() => setView("registrar")}
          />
        </div>
      )}

      {view === "registrar" && (
        <RegistrarPaciente
          isOdonto={isOdonto}
          profesional={user?.fullName || ""}
          area={area}
          onBack={() => setView("menu")}
        />
      )}

      {view === "buscar" && (
        <BuscarPaciente
          isOdonto={isOdonto}
          profesional={user?.fullName || ""}
          area={area}
          onBack={() => setView("menu")}
        />
      )}
    </Container>
  )
}

function MenuCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="group text-left">
      <Card className="h-full transition-[translate,box-shadow] duration-200 ease-out group-hover:-translate-y-0.5 group-hover:ring-primary/40 motion-reduce:group-hover:translate-y-0">
        <CardContent className="p-4 sm:p-6">
          <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon className="size-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            Continuar <ArrowRight className="size-4" />
          </span>
        </CardContent>
      </Card>
    </button>
  )
}

/* --------------------------- Registrar --------------------------- */
function RegistrarPaciente({
  isOdonto,
  profesional,
  area,
  onBack,
}: {
  isOdonto: boolean
  profesional: string
  area: string
  onBack: () => void
}) {
  const [form, setForm] = useState({ ...emptyForm })
  const [cobertura, setCobertura] = useState<Cobertura>(COBERTURA_VACIA)
  const [codificacion, setCodificacion] = useState<Codificacion>(CODIFICACION_VACIA)
  const [dientes, setDientes] = useState<Diente[]>([])
  const [saving, setSaving] = useState(false)
  const [clave, setClave] = useState<string | null>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    const req = ["nombre", "dni", "telefono", "email", "sexo", "direccion", "fechaNacimiento"] as const
    if (req.some((k) => !form[k]) || !cobertura.idObraSocial) {
      toast.warning("Completá los datos personales obligatorios.")
      return
    }
    setSaving(true)
    const password = generarContrasena(8)
    try {
      await api.post("/pacient/regis-pacient", {
        fullName: form.nombre,
        dni: form.dni,
        password,
        telefono: form.telefono,
        email: form.email,
        sexo: form.sexo,
        direccion: form.direccion,
        fechaNacimiento: form.fechaNacimiento,
        edad: form.edad,
        ...coberturaPayload(cobertura),
        area,
        profesional,
        sintomas: form.sintomas,
        diagnostico: form.diagnostico,
        tratamiento: form.tratamiento,
        fecha: new Date(),
        ...(isOdonto ? { dientes } : {}),
        ...codificacionPayload(codificacion),
      })
      setClave(password)
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? `No se pudo registrar: ${err.message}`
          : "No se pudo registrar el paciente."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-6">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft /> Volver
      </Button>

      <form onSubmit={guardar} className="space-y-6">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <User className="size-5 text-primary" /> Datos personales
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Nombre y apellido" htmlFor="nombre" required>
                <Input id="nombre" className="h-10" value={form.nombre} onChange={set("nombre")} />
              </Field>
              <Field label="DNI" htmlFor="dni" required>
                <Input id="dni" type="number" inputMode="numeric" className="h-10" value={form.dni} onChange={set("dni")} />
              </Field>
              <Field label="Teléfono" htmlFor="telefono" required>
                <Input id="telefono" type="tel" className="h-10" value={form.telefono} onChange={set("telefono")} />
              </Field>
              <Field label="Email" htmlFor="email" required>
                <Input id="email" type="email" className="h-10" value={form.email} onChange={set("email")} />
              </Field>
              <Field label="Sexo" htmlFor="sexo" required>
                <SelectField
                  id="sexo"
                  value={form.sexo}
                  onValueChange={(v) => setForm((f) => ({ ...f, sexo: v }))}
                  options={SEXO}
                />
              </Field>
              <Field label="Dirección" htmlFor="direccion" required>
                <Input id="direccion" className="h-10" value={form.direccion} onChange={set("direccion")} />
              </Field>
              <Field label="Fecha de nacimiento" htmlFor="fechaNacimiento" required>
                <Input id="fechaNacimiento" type="date" className="h-10" value={form.fechaNacimiento} onChange={set("fechaNacimiento")} />
              </Field>
              <Field label="Edad" htmlFor="edad">
                <Input id="edad" type="number" className="h-10" value={form.edad} onChange={set("edad")} />
              </Field>
              <CoberturaFields value={cobertura} onChange={setCobertura} required idPrefix="reg" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <Stethoscope className="size-5 text-primary" /> Primera consulta
            </h2>
            <div className="mt-4 space-y-4">
              <Field label="Síntomas" htmlFor="sintomas">
                <DictationTextarea id="sintomas" rows={2} value={form.sintomas} onValueChange={(v) => setForm((f) => ({ ...f, sintomas: v }))} />
              </Field>
              <Field label="Diagnóstico" htmlFor="diagnostico">
                <DictationTextarea id="diagnostico" rows={2} value={form.diagnostico} onValueChange={(v) => setForm((f) => ({ ...f, diagnostico: v }))} />
              </Field>
              <Field label="Tratamiento" htmlFor="tratamiento">
                <DictationTextarea id="tratamiento" rows={2} value={form.tratamiento} onValueChange={(v) => setForm((f) => ({ ...f, tratamiento: v }))} />
              </Field>
              <CodificacionEditor value={codificacion} onChange={setCodificacion} />
            </div>
          </CardContent>
        </Card>

        {isOdonto && (
          <Card>
            <CardContent className="p-4 sm:p-6">
              <h2 className="font-semibold">Odontograma</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Tocá un diente para registrar su estado.
              </p>
              <div className="mt-4">
                <Odontogram value={dientes} onChange={setDientes} />
              </div>
            </CardContent>
          </Card>
        )}

        <Button type="submit" size="lg" disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <UserPlus />}
          Registrar paciente
        </Button>
      </form>

      <Dialog open={!!clave} onOpenChange={(o) => !o && (setClave(null), onBack())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paciente registrado</DialogTitle>
            <DialogDescription>
              Compartí esta clave con el paciente para que consulte su historia
              clínica.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-center">
            <p className="text-xs text-muted-foreground">Clave de acceso</p>
            <p className="mt-1 font-mono text-xl font-semibold">{clave}</p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setClave(null)
                onBack()
              }}
            >
              Listo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* --------------------------- Buscar / ficha --------------------------- */
function BuscarPaciente({
  isOdonto,
  profesional,
  area,
  onBack,
}: {
  isOdonto: boolean
  profesional: string
  area: string
  onBack: () => void
}) {
  const { user } = useAuth()
  const [dni, setDni] = useState("")
  const [loading, setLoading] = useState(false)
  const [paciente, setPaciente] = useState<Paciente | null>(null)

  // Nueva consulta
  const [sintomas, setSintomas] = useState("")
  const [diagnostico, setDiagnostico] = useState("")
  const [tratamiento, setTratamiento] = useState("")
  const [dientes, setDientes] = useState<Diente[]>([])
  const [codificacion, setCodificacion] = useState<Codificacion>(CODIFICACION_VACIA)
  const [saving, setSaving] = useState(false)
  // Fase K: edición de la cobertura del paciente.
  const [editCob, setEditCob] = useState<Cobertura | null>(null)
  const [savingCob, setSavingCob] = useState(false)

  async function guardarCobertura() {
    if (!paciente || !editCob) return
    if (!editCob.idObraSocial) {
      toast.warning("Elegí la obra social.")
      return
    }
    setSavingCob(true)
    try {
      await api.put("/pacient/cobertura", { dni: paciente.dni, ...coberturaPayload(editCob) })
      toast.success("Cobertura actualizada")
      setEditCob(null)
      setPaciente(await api.post<Paciente>("/pacient/get-data-pacient", { dni: paciente.dni }))
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo actualizar la cobertura.")
    } finally {
      setSavingCob(false)
    }
  }

  async function buscar(e: React.FormEvent) {
    e.preventDefault()
    if (!dni) return
    setLoading(true)
    try {
      const data = await api.post<Paciente>("/pacient/get-data-pacient", { dni })
      setPaciente(data)
      // Cargar el último odontograma conocido, si existe.
      const last = data.history?.[data.history.length - 1]
      setDientes(last?.dientes || [])
    } catch {
      toast.error("Datos incorrectos. Asegurate de que el paciente esté registrado.")
    } finally {
      setLoading(false)
    }
  }

  async function guardarConsulta() {
    if (!paciente) return
    if (!sintomas && !diagnostico && !tratamiento && !codificacion.diagnosticos.length && !codificacion.practicas.length) {
      toast.warning("Cargá al menos un dato de la consulta.")
      return
    }
    setSaving(true)
    try {
      await api.post("/pacient/save-data-pacient", {
        dni: paciente.dni,
        area,
        profesional,
        sintomas,
        diagnostico,
        tratamiento,
        fecha: new Date(),
        ...(isOdonto ? { dientes } : {}),
        ...codificacionPayload(codificacion),
      })
      toast.success("Consulta guardada")
      setSintomas("")
      setDiagnostico("")
      setTratamiento("")
      setCodificacion(CODIFICACION_VACIA)
      // Refrescar ficha
      const data = await api.post<Paciente>("/pacient/get-data-pacient", {
        dni: paciente.dni,
      })
      setPaciente(data)
    } catch (err) {
      toast.error(
        err instanceof ApiError ? `No guardado: ${err.message}` : "No se pudo guardar."
      )
    } finally {
      setSaving(false)
    }
  }

  if (!paciente) {
    return (
      <div className="mt-6 max-w-lg">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft /> Volver
        </Button>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={buscar} className="flex flex-col gap-3 sm:flex-row">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="DNI del paciente"
                className="h-10"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
              />
              <Button type="submit" size="lg" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <Search />}
                Buscar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  const datos: [string, React.ReactNode][] = [
    ["Teléfono", paciente.telefono],
    ["Email", paciente.email],
    ["DNI", paciente.dni],
    ["Sexo", paciente.sexo],
    ["Dirección", paciente.direccion],
    ["Fecha de nacimiento", paciente.fechaNacimiento],
    ["Edad", paciente.edad],
    ["Obra social", paciente.obraSocial],
    ["N.º de afiliado", paciente.nroAfiliado],
    ["Plan", paciente.plan],
    ["Fecha de apertura", paciente.fechaApertura],
  ]

  return (
    <div className="mt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => setPaciente(null)}>
          <ArrowLeft /> Nueva búsqueda
        </Button>
        <div className="flex flex-wrap gap-2">
          {tieneFeature(user?.plan, "autorizaciones") && (
            <Button variant="outline" asChild>
              <Link to={`/dashboard/autorizaciones?dni=${encodeURIComponent(paciente.dni)}`}>
                <ShieldCheck /> Solicitar autorización
              </Link>
            </Button>
          )}
          <Button variant="outline" onClick={() => downloadPatientHistoryPdf(paciente)}>
            <Download /> Descargar PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <User className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold">{paciente.fullName}</h2>
              <p className="text-sm text-muted-foreground">Ficha del paciente</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setEditCob({
                  idObraSocial: paciente.idObraSocial ? String(paciente.idObraSocial) : "",
                  nroAfiliado: paciente.nroAfiliado || "",
                  plan: paciente.plan || "",
                })
              }
            >
              <Pencil /> Cobertura
            </Button>
          </div>
          <dl className="mt-6 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {datos.map(([label, value]) => (
              <div key={label} className="flex flex-col">
                <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                <dd className="text-sm">{value || "—"}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {/* Nueva consulta */}
      <Card className="mt-6">
        <CardContent className="p-4 sm:p-6">
          <h3 className="flex items-center gap-2 font-semibold">
            <Stethoscope className="size-5 text-primary" /> Nueva consulta
          </h3>
          <div className="mt-4 space-y-4">
            <Field label="Síntomas" htmlFor="s-sintomas">
              <DictationTextarea id="s-sintomas" rows={2} value={sintomas} onValueChange={setSintomas} />
            </Field>
            <Field label="Diagnóstico" htmlFor="s-diagnostico">
              <DictationTextarea id="s-diagnostico" rows={2} value={diagnostico} onValueChange={setDiagnostico} />
            </Field>
            <Field label="Tratamiento" htmlFor="s-tratamiento">
              <DictationTextarea id="s-tratamiento" rows={2} value={tratamiento} onValueChange={setTratamiento} />
            </Field>
            <CodificacionEditor value={codificacion} onChange={setCodificacion} dni={paciente.dni} />
            {isOdonto && (
              <div>
                <p className="mb-2 text-sm font-medium">Odontograma</p>
                <Odontogram value={dientes} onChange={setDientes} />
              </div>
            )}
            <Button onClick={guardarConsulta} disabled={saving} size="lg">
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              Guardar consulta
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Historial */}
      <h3 className="mt-8 flex items-center gap-2 text-lg font-semibold">
        <FileText className="size-5 text-primary" /> Historial de consultas
      </h3>
      {paciente.history?.length ? (
        <div className="mt-4 space-y-4">
          {paciente.history.map((e, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex flex-wrap justify-between gap-2 border-b border-border pb-3 text-sm">
                  <span>
                    <span className="font-medium text-muted-foreground">Profesional: </span>
                    {e.profesional}
                  </span>
                  <span>
                    <span className="font-medium text-muted-foreground">Área: </span>
                    {e.area}
                  </span>
                  <span>
                    <span className="font-medium text-muted-foreground">Fecha: </span>
                    {e.fecha}hs
                  </span>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <p><span className="font-medium text-muted-foreground">Síntomas: </span>{e.sintomas}</p>
                  <p><span className="font-medium text-muted-foreground">Diagnóstico: </span>{e.diagnostico}</p>
                  <p><span className="font-medium text-muted-foreground">Tratamiento: </span>{e.tratamiento}</p>
                </div>
                {((e.diagnosticos?.length ?? 0) > 0 || (e.practicas?.length ?? 0) > 0) && (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                      <Tags className="size-4" /> Codificación
                    </p>
                    <CodificacionResumen diagnosticos={e.diagnosticos} practicas={e.practicas} />
                  </div>
                )}
                {e.auditoria && e.auditoria !== "pendiente" && (
                  <div className="mt-3">
                    <Badge variant={ESTADO_AUDITORIA[e.auditoria as EstadoAuditoria]?.variant ?? "outline"}>
                      Auditoría: {ESTADO_AUDITORIA[e.auditoria as EstadoAuditoria]?.label ?? e.auditoria}
                    </Badge>
                  </div>
                )}
                {e.dientes && e.dientes.length > 0 && (
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="mb-2 text-sm font-medium text-muted-foreground">Odontograma</p>
                    <Odontogram value={e.dientes} readOnly />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No hay consultas registradas.</p>
      )}

      <Dialog open={!!editCob} onOpenChange={(o) => !o && setEditCob(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cobertura del paciente</DialogTitle>
            <DialogDescription>
              Obra social, número de afiliado y plan. Se usan en las autorizaciones y en la
              auditoría.
            </DialogDescription>
          </DialogHeader>
          {editCob && (
            <div className="grid gap-4 sm:grid-cols-2">
              <CoberturaFields
                value={editCob}
                onChange={setEditCob}
                required
                idPrefix="edit-cob"
                textoLegado={!paciente.idObraSocial ? paciente.obraSocial : undefined}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCob(null)} disabled={savingCob}>
              Cancelar
            </Button>
            <Button onClick={guardarCobertura} disabled={savingCob}>
              {savingCob ? <Loader2 className="animate-spin" /> : <Save />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
