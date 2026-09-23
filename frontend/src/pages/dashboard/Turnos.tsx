import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  CalendarClock,
  CalendarPlus,
  CalendarOff,
  Search,
  Loader2,
  MoreVertical,
  Mail,
  CalendarCog,
  Ban,
  User,
  Stethoscope,
  IdCard,
  Phone,
  Plus,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Field } from "@/components/form/Field"
import { SelectField } from "@/components/form/SelectField"
import { Container } from "@/components/site/Section"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { api, ApiError } from "@/lib/api"

/* -------------------------------------------------------------------------- */
/* Tipos                                                                      */
/* -------------------------------------------------------------------------- */
type Turno = {
  id: number
  inicio: string
  fin: string | null
  estado: "reservado" | "cancelado"
  profesionalId: number
  profesionalNombre: string | null
  especialidad: string | null
  pacienteNombre: string | null
  pacienteEmail: string | null
  pacienteTelefono: string | null
  pacienteDni: string | null
  esInvitado: boolean
}

type Profesional = {
  id: number
  nombre: string
  especialidad: string | null
}

type Bloqueo = {
  id: number
  profesionalId: number
  profesionalNombre: string | null
  inicio: string
  fin: string
  motivo: string | null
}

const SLOT_MS = 30 * 60000

function formatFechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "medium",
    timeStyle: "short",
  })
}

const ESTADOS = [
  { value: "todos", label: "Todos los estados" },
  { value: "reservado", label: "Reservados" },
  { value: "cancelado", label: "Cancelados" },
]

/* -------------------------------------------------------------------------- */
/* Página                                                                     */
/* -------------------------------------------------------------------------- */
export default function TurnosDashboard() {
  const [q, setQ] = useState("")
  const [estado, setEstado] = useState("todos")
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [loading, setLoading] = useState(true)

  const [profesionales, setProfesionales] = useState<Profesional[]>([])
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [reprogramar, setReprogramar] = useState<Turno | null>(null)
  const [cancelar, setCancelar] = useState<Turno | null>(null)
  const [accion, setAccion] = useState<number | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set("q", q.trim())
      if (estado !== "todos") params.set("estado", estado)
      const d = await api.get<{ turnos: Turno[] }>(
        `/staff/turnos?${params.toString()}`
      )
      setTurnos(d.turnos || [])
    } catch {
      toast.error("No se pudieron cargar los turnos.")
    } finally {
      setLoading(false)
    }
  }, [q, estado])

  // Búsqueda con un pequeño debounce.
  useEffect(() => {
    const t = setTimeout(cargar, 300)
    return () => clearTimeout(t)
  }, [cargar])

  // Profesionales (para el formulario de nuevo turno). Se cargan una vez.
  useEffect(() => {
    api
      .get<{ profesionales: Profesional[] }>("/staff/profesionales")
      .then((d) => setProfesionales(d.profesionales || []))
      .catch(() => {})
  }, [])

  async function reenviar(t: Turno) {
    setAccion(t.id)
    try {
      await api.post(`/staff/turnos/${t.id}/reenviar-confirmacion`)
      toast.success("Confirmación reenviada por email.")
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "No se pudo reenviar el email."
      )
    } finally {
      setAccion(null)
    }
  }

  async function confirmarCancelacion() {
    if (!cancelar) return
    setAccion(cancelar.id)
    try {
      await api.post(`/staff/turnos/${cancelar.id}/cancelar`)
      toast.success("Turno cancelado.")
      setCancelar(null)
      await cargar()
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "No se pudo cancelar el turno."
      )
    } finally {
      setAccion(null)
    }
  }

  return (
    <Container className="py-8 sm:py-12">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold sm:text-3xl">
          <CalendarClock className="size-7 text-primary" /> Turnos
        </h1>
        <p className="mt-1 text-muted-foreground">
          Buscá, agendá y gestioná los turnos y las ausencias de la clínica.
        </p>
      </div>

      <Tabs defaultValue="turnos">
        <TabsList className="mb-6">
          <TabsTrigger value="turnos">Turnos</TabsTrigger>
          <TabsTrigger value="bloqueos">Bloqueos</TabsTrigger>
        </TabsList>

        <TabsContent value="turnos">
          <div className="mb-4 flex justify-end">
            <Button onClick={() => setNuevoOpen(true)}>
              <CalendarPlus /> Nuevo turno
            </Button>
          </div>

          {/* Buscador + filtro */}
          <Card className="mb-6">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 pl-9"
              placeholder="Buscar por DNI, correo o nombre…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="sm:w-56">
            <SelectField
              value={estado}
              onValueChange={setEstado}
              options={ESTADOS}
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : turnos.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            No se encontraron turnos
            {q.trim() ? " para esa búsqueda." : " próximos."}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {turnos.map((t) => (
            <li key={t.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-medium">
                      <User className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {t.pacienteNombre || "Sin nombre"}
                      </span>
                      {t.esInvitado && (
                        <Badge variant="outline" className="font-normal">
                          Invitado
                        </Badge>
                      )}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 pl-6 text-xs text-muted-foreground">
                      {t.pacienteDni && (
                        <span className="inline-flex items-center gap-1">
                          <IdCard className="size-3.5" /> {t.pacienteDni}
                        </span>
                      )}
                      {t.pacienteEmail && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="size-3.5" /> {t.pacienteEmail}
                        </span>
                      )}
                      {t.pacienteTelefono && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="size-3.5" /> {t.pacienteTelefono}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm">
                      <Stethoscope className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {t.profesionalNombre || "—"}
                      </span>
                    </p>
                    {t.especialidad && (
                      <p className="pl-6 text-xs text-muted-foreground">
                        {t.especialidad}
                      </p>
                    )}
                  </div>

                  <div className="text-sm">
                    <p className="font-medium">{formatFechaHora(t.inicio)}</p>
                    <p className="text-xs text-muted-foreground">hs</p>
                  </div>

                  <Badge
                    variant={t.estado === "reservado" ? "default" : "secondary"}
                  >
                    {t.estado === "reservado" ? "Reservado" : "Cancelado"}
                  </Badge>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={accion === t.id}
                        aria-label="Acciones del turno"
                      >
                        {accion === t.id ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <MoreVertical />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem
                        disabled={t.estado === "cancelado"}
                        onSelect={() => setReprogramar(t)}
                      >
                        <CalendarCog /> Reprogramar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={t.estado === "cancelado" || !t.pacienteEmail}
                        onSelect={() => reenviar(t)}
                      >
                        <Mail /> Reenviar confirmación
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={t.estado === "cancelado"}
                        onSelect={() => setCancelar(t)}
                      >
                        <Ban /> Cancelar turno
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
        </TabsContent>

        <TabsContent value="bloqueos">
          <BloqueosPanel profesionales={profesionales} />
        </TabsContent>
      </Tabs>

      <NuevoTurnoDialog
        open={nuevoOpen}
        onOpenChange={setNuevoOpen}
        profesionales={profesionales}
        onCreated={cargar}
      />

      <ReprogramarDialog
        turno={reprogramar}
        onClose={() => setReprogramar(null)}
        onDone={cargar}
      />

      {/* Confirmar cancelación */}
      <Dialog
        open={!!cancelar}
        onOpenChange={(o) => !o && setCancelar(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar turno</DialogTitle>
            <DialogDescription>
              Se cancelará el turno de {cancelar?.pacienteNombre || "el paciente"}{" "}
              del {cancelar ? formatFechaHora(cancelar.inicio) : ""} hs. Se le
              avisará por email. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelar(null)}
              disabled={accion === cancelar?.id}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarCancelacion}
              disabled={accion === cancelar?.id}
            >
              {accion === cancelar?.id ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Ban />
              )}
              Cancelar turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Container>
  )
}

/* -------------------------------------------------------------------------- */
/* Selector de fecha + horario reutilizable                                   */
/* -------------------------------------------------------------------------- */
function useSlots(profId: string | number | null, date: string) {
  const [slots, setSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!profId || !date) {
      setSlots([])
      return
    }
    let active = true
    setLoading(true)
    api
      .get<string[]>(
        `/available-slots?date=${encodeURIComponent(date)}&profId=${encodeURIComponent(String(profId))}`
      )
      .then((s) => active && setSlots(Array.isArray(s) ? [...s].sort() : []))
      .catch(() => active && setSlots([]))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [profId, date])

  return { slots, loading }
}

function FechaYHorario({
  profId,
  date,
  setDate,
  slot,
  setSlot,
}: {
  profId: string | number | null
  date: string
  setDate: (v: string) => void
  slot: string
  setSlot: (v: string) => void
}) {
  const today = new Date().toISOString().split("T")[0]
  const { slots, loading } = useSlots(profId, date)

  // Si cambia la fecha/profesional, el slot elegido deja de ser válido.
  useEffect(() => {
    setSlot("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profId, date])

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Fecha" htmlFor="fecha" required>
        <Input
          id="fecha"
          type="date"
          min={today}
          className="h-10"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={!profId}
        />
      </Field>
      <Field label="Horario disponible" htmlFor="slot" required>
        <SelectField
          id="slot"
          value={slot}
          onValueChange={setSlot}
          options={slots.map((s) => ({ value: s, label: formatFechaHora(s) }))}
          disabled={!date || loading || !slots.length}
          placeholder={
            !profId
              ? "Elegí un profesional"
              : !date
                ? "Elegí una fecha"
                : loading
                  ? "Cargando…"
                  : slots.length
                    ? "Seleccionar…"
                    : "Sin turnos ese día"
          }
        />
      </Field>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Nuevo turno                                                                */
/* -------------------------------------------------------------------------- */
function NuevoTurnoDialog({
  open,
  onOpenChange,
  profesionales,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  profesionales: Profesional[]
  onCreated: () => void
}) {
  const [profId, setProfId] = useState("")
  const [date, setDate] = useState("")
  const [slot, setSlot] = useState("")
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [telefono, setTelefono] = useState("")
  const [dni, setDni] = useState("")
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setProfId("")
    setDate("")
    setSlot("")
    setNombre("")
    setEmail("")
    setTelefono("")
    setDni("")
  }

  const profOptions = useMemo(
    () =>
      profesionales.map((p) => ({
        value: String(p.id),
        label: p.especialidad ? `${p.nombre} · ${p.especialidad}` : p.nombre,
      })),
    [profesionales]
  )

  async function crear() {
    if (!profId || !slot || !nombre.trim() || !email.trim()) {
      toast.warning("Completá profesional, horario, nombre y email.")
      return
    }
    setSubmitting(true)
    const start = new Date(slot)
    try {
      await api.post("/staff/turnos", {
        profId,
        start: { dateTime: start.toISOString() },
        end: { dateTime: new Date(start.getTime() + SLOT_MS).toISOString() },
        nombre: nombre.trim(),
        email: email.trim(),
        telefono: telefono.trim() || undefined,
        dni: dni.trim() || undefined,
      })
      toast.success("Turno creado. Se envió la confirmación por email.")
      reset()
      onOpenChange(false)
      onCreated()
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "No se pudo crear el turno."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo turno</DialogTitle>
          <DialogDescription>
            Agendá un turno para un paciente. Se le enviará la confirmación por
            email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Profesional" htmlFor="prof" required>
            <SelectField
              id="prof"
              value={profId}
              onValueChange={setProfId}
              options={profOptions}
              placeholder={
                profOptions.length ? "Seleccionar…" : "No hay profesionales"
              }
            />
          </Field>

          <FechaYHorario
            profId={profId || null}
            date={date}
            setDate={setDate}
            slot={slot}
            setSlot={setSlot}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del paciente" htmlFor="nombre" required>
              <Input
                id="nombre"
                className="h-10"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </Field>
            <Field label="DNI" htmlFor="dni" hint="Opcional. Vincula con su cuenta si existe.">
              <Input
                id="dni"
                className="h-10"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
              />
            </Field>
            <Field label="Email" htmlFor="email" required>
              <Input
                id="email"
                type="email"
                className="h-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Teléfono" htmlFor="tel">
              <Input
                id="tel"
                type="tel"
                className="h-10"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button onClick={crear} disabled={submitting}>
            {submitting ? <Loader2 className="animate-spin" /> : <CalendarPlus />}
            Crear turno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* -------------------------------------------------------------------------- */
/* Reprogramar                                                                */
/* -------------------------------------------------------------------------- */
function ReprogramarDialog({
  turno,
  onClose,
  onDone,
}: {
  turno: Turno | null
  onClose: () => void
  onDone: () => void
}) {
  const [date, setDate] = useState("")
  const [slot, setSlot] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Reset al abrir/cerrar.
  useEffect(() => {
    setDate("")
    setSlot("")
  }, [turno])

  async function guardar() {
    if (!turno || !slot) {
      toast.warning("Elegí la nueva fecha y horario.")
      return
    }
    setSubmitting(true)
    const start = new Date(slot)
    try {
      await api.post(`/staff/turnos/${turno.id}/reprogramar`, {
        start: { dateTime: start.toISOString() },
        end: { dateTime: new Date(start.getTime() + SLOT_MS).toISOString() },
      })
      toast.success("Turno reprogramado. Se avisó al paciente por email.")
      onClose()
      onDone()
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "No se pudo reprogramar."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={!!turno} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reprogramar turno</DialogTitle>
          <DialogDescription>
            {turno?.pacienteNombre || "Paciente"} con{" "}
            {turno?.profesionalNombre || "el profesional"}. Turno actual:{" "}
            {turno ? formatFechaHora(turno.inicio) : ""} hs.
          </DialogDescription>
        </DialogHeader>

        <FechaYHorario
          profId={turno?.profesionalId ?? null}
          date={date}
          setDate={setDate}
          slot={slot}
          setSlot={setSlot}
        />

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Volver
          </Button>
          <Button onClick={guardar} disabled={submitting}>
            {submitting ? <Loader2 className="animate-spin" /> : <CalendarCog />}
            Reprogramar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* -------------------------------------------------------------------------- */
/* Bloqueos de horario (ausencias)                                            */
/* -------------------------------------------------------------------------- */
function BloqueosPanel({ profesionales }: { profesionales: Profesional[] }) {
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [borrando, setBorrando] = useState<number | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.get<{ bloqueos: Bloqueo[] }>("/staff/bloqueos")
      setBloqueos(d.bloqueos || [])
    } catch {
      toast.error("No se pudieron cargar los bloqueos.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function eliminar(b: Bloqueo) {
    setBorrando(b.id)
    try {
      await api.del(`/staff/bloqueos/${b.id}`)
      toast.success("Bloqueo eliminado.")
      await cargar()
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "No se pudo eliminar el bloqueo."
      )
    } finally {
      setBorrando(null)
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Bloqueá franjas en las que un profesional no atiende (vacaciones,
          ausencias). No se podrán reservar turnos en esos horarios.
        </p>
        <Button onClick={() => setNuevoOpen(true)}>
          <Plus /> Nuevo bloqueo
        </Button>
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : bloqueos.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            No hay bloqueos vigentes.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {bloqueos.map((b) => (
            <li key={b.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center gap-4 p-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <CalendarOff className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-medium">
                      <Stethoscope className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {b.profesionalNombre || "Profesional"}
                      </span>
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {formatFechaHora(b.inicio)} → {formatFechaHora(b.fin)} hs
                    </p>
                    {b.motivo && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {b.motivo}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Eliminar bloqueo"
                    disabled={borrando === b.id}
                    onClick={() => eliminar(b)}
                  >
                    {borrando === b.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Trash2 className="text-destructive" />
                    )}
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <NuevoBloqueoDialog
        open={nuevoOpen}
        onOpenChange={setNuevoOpen}
        profesionales={profesionales}
        onCreated={cargar}
      />
    </>
  )
}

function NuevoBloqueoDialog({
  open,
  onOpenChange,
  profesionales,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  profesionales: Profesional[]
  onCreated: () => void
}) {
  const today = new Date().toISOString().split("T")[0]
  const [profId, setProfId] = useState("")
  const [fecha, setFecha] = useState("")
  const [horaInicio, setHoraInicio] = useState("")
  const [horaFin, setHoraFin] = useState("")
  const [motivo, setMotivo] = useState("")
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setProfId("")
    setFecha("")
    setHoraInicio("")
    setHoraFin("")
    setMotivo("")
  }

  const profOptions = useMemo(
    () =>
      profesionales.map((p) => ({
        value: String(p.id),
        label: p.especialidad ? `${p.nombre} · ${p.especialidad}` : p.nombre,
      })),
    [profesionales]
  )

  async function crear() {
    if (!profId || !fecha || !horaInicio || !horaFin) {
      toast.warning("Completá profesional, fecha y horario.")
      return
    }
    if (horaFin <= horaInicio) {
      toast.warning("La hora de fin debe ser posterior a la de inicio.")
      return
    }
    // Argentina es UTC-3: construimos el instante con ese offset fijo.
    const inicio = new Date(`${fecha}T${horaInicio}:00-03:00`).toISOString()
    const fin = new Date(`${fecha}T${horaFin}:00-03:00`).toISOString()
    setSubmitting(true)
    try {
      await api.post("/staff/bloqueos", {
        profId,
        inicio,
        fin,
        motivo: motivo.trim() || undefined,
      })
      toast.success("Bloqueo creado.")
      reset()
      onOpenChange(false)
      onCreated()
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "No se pudo crear el bloqueo."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo bloqueo</DialogTitle>
          <DialogDescription>
            Elegí el profesional y la franja que querés bloquear.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Profesional" htmlFor="bprof" required>
            <SelectField
              id="bprof"
              value={profId}
              onValueChange={setProfId}
              options={profOptions}
              placeholder={
                profOptions.length ? "Seleccionar…" : "No hay profesionales"
              }
            />
          </Field>

          <Field label="Fecha" htmlFor="bfecha" required>
            <Input
              id="bfecha"
              type="date"
              min={today}
              className="h-10"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Desde" htmlFor="bini" required>
              <Input
                id="bini"
                type="time"
                className="h-10"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
              />
            </Field>
            <Field label="Hasta" htmlFor="bfin" required>
              <Input
                id="bfin"
                type="time"
                className="h-10"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Motivo" htmlFor="bmotivo" hint="Opcional.">
            <Textarea
              id="bmotivo"
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button onClick={crear} disabled={submitting}>
            {submitting ? <Loader2 className="animate-spin" /> : <CalendarOff />}
            Bloquear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
