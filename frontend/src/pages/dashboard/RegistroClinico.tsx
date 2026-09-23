import { useEffect, useState } from "react"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Field } from "@/components/form/Field"
import { SelectField } from "@/components/form/SelectField"
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
  obraSocial: "",
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
        <CardContent className="p-6">
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
  const [dientes, setDientes] = useState<Diente[]>([])
  const [saving, setSaving] = useState(false)
  const [clave, setClave] = useState<string | null>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    const req = ["nombre", "dni", "telefono", "email", "sexo", "direccion", "fechaNacimiento", "obraSocial"] as const
    if (req.some((k) => !form[k])) {
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
        obraSocial: form.obraSocial,
        area,
        profesional,
        sintomas: form.sintomas,
        diagnostico: form.diagnostico,
        tratamiento: form.tratamiento,
        fecha: new Date(),
        ...(isOdonto ? { dientes } : {}),
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
          <CardContent className="p-6">
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
              <Field label="Obra social" htmlFor="obraSocial" required className="sm:col-span-2">
                <Input id="obraSocial" className="h-10" value={form.obraSocial} onChange={set("obraSocial")} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <Stethoscope className="size-5 text-primary" /> Primera consulta
            </h2>
            <div className="mt-4 space-y-4">
              <Field label="Síntomas" htmlFor="sintomas">
                <Textarea id="sintomas" rows={2} value={form.sintomas} onChange={set("sintomas")} />
              </Field>
              <Field label="Diagnóstico" htmlFor="diagnostico">
                <Textarea id="diagnostico" rows={2} value={form.diagnostico} onChange={set("diagnostico")} />
              </Field>
              <Field label="Tratamiento" htmlFor="tratamiento">
                <Textarea id="tratamiento" rows={2} value={form.tratamiento} onChange={set("tratamiento")} />
              </Field>
            </div>
          </CardContent>
        </Card>

        {isOdonto && (
          <Card>
            <CardContent className="p-6">
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
  const [dni, setDni] = useState("")
  const [loading, setLoading] = useState(false)
  const [paciente, setPaciente] = useState<Paciente | null>(null)

  // Nueva consulta
  const [sintomas, setSintomas] = useState("")
  const [diagnostico, setDiagnostico] = useState("")
  const [tratamiento, setTratamiento] = useState("")
  const [dientes, setDientes] = useState<Diente[]>([])
  const [saving, setSaving] = useState(false)

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
    if (!sintomas && !diagnostico && !tratamiento) {
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
      })
      toast.success("Consulta guardada")
      setSintomas("")
      setDiagnostico("")
      setTratamiento("")
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
          <CardContent className="p-6">
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
    ["Fecha de apertura", paciente.fechaApertura],
  ]

  return (
    <div className="mt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => setPaciente(null)}>
          <ArrowLeft /> Nueva búsqueda
        </Button>
        <Button variant="outline" onClick={() => downloadPatientHistoryPdf(paciente)}>
          <Download /> Descargar PDF
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <User className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{paciente.fullName}</h2>
              <p className="text-sm text-muted-foreground">Ficha del paciente</p>
            </div>
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
        <CardContent className="p-6">
          <h3 className="flex items-center gap-2 font-semibold">
            <Stethoscope className="size-5 text-primary" /> Nueva consulta
          </h3>
          <div className="mt-4 space-y-4">
            <Field label="Síntomas" htmlFor="s-sintomas">
              <Textarea id="s-sintomas" rows={2} value={sintomas} onChange={(e) => setSintomas(e.target.value)} />
            </Field>
            <Field label="Diagnóstico" htmlFor="s-diagnostico">
              <Textarea id="s-diagnostico" rows={2} value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} />
            </Field>
            <Field label="Tratamiento" htmlFor="s-tratamiento">
              <Textarea id="s-tratamiento" rows={2} value={tratamiento} onChange={(e) => setTratamiento(e.target.value)} />
            </Field>
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
    </div>
  )
}
