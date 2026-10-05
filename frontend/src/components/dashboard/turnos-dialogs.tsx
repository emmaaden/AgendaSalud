/**
 * Diálogos de gestión de turnos, compartidos por la lista y el calendario del panel.
 */
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Loader2, CalendarPlus, CalendarCog, Ban } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/form/Field"
import { SelectField } from "@/components/form/SelectField"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { api, ApiError } from "@/lib/api"
import { formatFechaHora, hoyAR, SLOT_MIN, ymdAR } from "@/lib/fecha"

export type Turno = {
  id: number
  inicio: string
  fin: string | null
  estado: "reservado" | "cancelado" | "atendido" | "ausente"
  profesionalId: number
  profesionalNombre: string | null
  especialidad: string | null
  pacienteNombre: string | null
  pacienteEmail: string | null
  pacienteTelefono: string | null
  pacienteDni: string | null
  esInvitado: boolean
}

export type Profesional = {
  id: number
  nombre: string
  especialidad: string | null
}

export type Bloqueo = {
  id: number
  profesionalId: number
  profesionalNombre: string | null
  inicio: string
  fin: string
  motivo: string | null
}

export const SLOT_MS = SLOT_MIN * 60000

// Fase K: etiqueta y estilo del estado del turno (incluye la asistencia).
export const ESTADO_TURNO: Record<
  Turno["estado"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  reservado: { label: "Reservado", variant: "default" },
  atendido: { label: "Atendido", variant: "outline" },
  ausente: { label: "Ausente", variant: "destructive" },
  cancelado: { label: "Cancelado", variant: "secondary" },
}

export function opcionesProfesional(profesionales: Profesional[]) {
  return profesionales.map((p) => ({
    value: String(p.id),
    label: p.especialidad ? `${p.nombre} · ${p.especialidad}` : p.nombre,
  }))
}

/* -------------------------------------------------------------------------- */
/* Selector de fecha + horario                                                */
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
  const { slots, loading } = useSlots(profId, date)

  // Si cambia la fecha o el profesional, el horario elegido deja de ser válido.
  // (Salvo que ya venga uno precargado y siga perteneciendo a esa fecha.)
  useEffect(() => {
    setSlot(slot && date && ymdAR(slot) === date ? slot : "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profId, date])

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Fecha" htmlFor="fecha" required>
        <Input
          id="fecha"
          type="date"
          min={hoyAR()}
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
export function NuevoTurnoDialog({
  open,
  onOpenChange,
  profesionales,
  onCreated,
  profIdInicial,
  slotInicial,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  profesionales: Profesional[]
  onCreated: () => void
  /** Precarga al abrirse desde una celda del calendario. */
  profIdInicial?: string | number
  slotInicial?: string
}) {
  const [profId, setProfId] = useState("")
  const [date, setDate] = useState("")
  const [slot, setSlot] = useState("")
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [telefono, setTelefono] = useState("")
  const [dni, setDni] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Al abrirse, arranca con lo que venga precargado del calendario.
  useEffect(() => {
    if (!open) return
    setProfId(profIdInicial != null ? String(profIdInicial) : "")
    setDate(slotInicial ? ymdAR(slotInicial) : "")
    setSlot(slotInicial || "")
  }, [open, profIdInicial, slotInicial])

  function limpiar() {
    setNombre("")
    setEmail("")
    setTelefono("")
    setDni("")
  }

  const profOptions = useMemo(
    () => opcionesProfesional(profesionales),
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
      limpiar()
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
        if (!o) limpiar()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
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
export function ReprogramarDialog({
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
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
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
/* Cancelar                                                                   */
/* -------------------------------------------------------------------------- */
export function CancelarTurnoDialog({
  turno,
  onClose,
  onDone,
}: {
  turno: Turno | null
  onClose: () => void
  onDone: () => void
}) {
  const [submitting, setSubmitting] = useState(false)

  async function confirmar() {
    if (!turno) return
    setSubmitting(true)
    try {
      await api.post(`/staff/turnos/${turno.id}/cancelar`)
      toast.success("Turno cancelado.")
      onClose()
      onDone()
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "No se pudo cancelar el turno."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={!!turno} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar turno</DialogTitle>
          <DialogDescription>
            Se cancelará el turno de {turno?.pacienteNombre || "el paciente"} del{" "}
            {turno ? formatFechaHora(turno.inicio) : ""} hs. Se le avisará por
            email. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Volver
          </Button>
          <Button
            variant="destructive"
            onClick={confirmar}
            disabled={submitting}
          >
            {submitting ? <Loader2 className="animate-spin" /> : <Ban />}
            Cancelar turno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
