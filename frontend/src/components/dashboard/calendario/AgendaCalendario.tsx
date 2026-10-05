import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  CalendarPlus,
  CalendarCog,
  Ban,
  Mail,
  Trash2,
  User,
  Stethoscope,
  CalendarOff,
} from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import {
  CancelarTurnoDialog,
  NuevoTurnoDialog,
  ReprogramarDialog,
  opcionesProfesional,
  SLOT_MS,
  type Bloqueo,
  type Profesional,
  type Turno,
} from "@/components/dashboard/turnos-dialogs"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { useAuth } from "@/contexts/AuthContext"
import {
  diasDelMes,
  formatFecha,
  formatDiaMes,
  formatFechaHora,
  formatMesAnio,
  hoyAR,
  inicioMes,
  inicioSemana,
  rangoISO,
  sumarDias,
  sumarMeses,
  ymdAR,
} from "@/lib/fecha"
import { GrillaHoraria } from "./GrillaHoraria"
import { VistaMes } from "./VistaMes"
import { franjasDelDia, type Horario } from "./agenda"

type Vista = "mes" | "semana" | "dia"

const VISTAS: { value: Vista; label: string }[] = [
  { value: "mes", label: "Mes" },
  { value: "semana", label: "Semana" },
  { value: "dia", label: "Día" },
]

export function AgendaCalendario({
  profesionales,
  onCambio,
}: {
  profesionales: Profesional[]
  /** Para que la pestaña de lista se entere de los cambios. */
  onCambio?: () => void
}) {
  const { user } = useAuth()
  const compacto = useMediaQuery("(max-width: 639px)")
  const [profId, setProfId] = useState("")
  const [vista, setVista] = useState<Vista>(compacto ? "dia" : "semana")
  const [ancla, setAncla] = useState(hoyAR())

  const [turnos, setTurnos] = useState<Turno[]>([])
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([])
  const [horarios, setHorarios] = useState<Horario[]>([])
  const [cargando, setCargando] = useState(false)

  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [nuevoSlot, setNuevoSlot] = useState<string | undefined>(undefined)
  const [detalle, setDetalle] = useState<Turno | null>(null)
  const [reprogramar, setReprogramar] = useState<Turno | null>(null)
  const [cancelar, setCancelar] = useState<Turno | null>(null)
  const [bloqueoSel, setBloqueoSel] = useState<Bloqueo | null>(null)
  const [moviendo, setMoviendo] = useState<{ turno: Turno; iso: string } | null>(null)
  const [accion, setAccion] = useState(false)

  // Un profesional entra a ver SU agenda; recepción, la del primero de la lista.
  useEffect(() => {
    if (profId || !profesionales.length) return
    const propio = profesionales.find((p) => p.id === user?.idRole)
    setProfId(String((propio ?? profesionales[0]).id))
  }, [profesionales, profId, user?.idRole])

  // En celular la semana no entra: se arranca por el día.
  useEffect(() => {
    if (compacto) setVista((v) => (v === "semana" ? "dia" : v))
  }, [compacto])

  const dias = useMemo(() => {
    if (vista === "dia") return [ancla]
    if (vista === "semana") {
      const lunes = inicioSemana(ancla)
      return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i))
    }
    return diasDelMes(ancla)
  }, [vista, ancla])

  const cargar = useCallback(async () => {
    if (!profId || !dias.length) return
    const { desde, hasta } = rangoISO(dias[0], dias[dias.length - 1])
    setCargando(true)
    try {
      const [t, b, h] = await Promise.all([
        api.get<{ turnos: Turno[] }>(
          `/staff/turnos?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}&profId=${profId}&estado=vigentes`
        ),
        api.get<{ bloqueos: Bloqueo[] }>(
          `/staff/bloqueos?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}&profId=${profId}`
        ),
        api.get<{ horarios: Horario[] }>(`/staff/horarios?profId=${profId}`),
      ])
      setTurnos(t.turnos || [])
      setBloqueos(b.bloqueos || [])
      setHorarios(h.horarios || [])
    } catch {
      toast.error("No se pudo cargar la agenda.")
    } finally {
      setCargando(false)
    }
  }, [profId, dias])

  useEffect(() => {
    cargar()
  }, [cargar])

  function refrescar() {
    cargar()
    onCambio?.()
  }

  // En la semana mostramos solo los días con atención o con turnos: una agenda de
  // lunes a viernes no necesita dos columnas vacías.
  const diasVisibles = useMemo(() => {
    if (vista !== "semana") return dias
    const utiles = dias.filter(
      (d) =>
        franjasDelDia(horarios, d).length > 0 ||
        turnos.some((t) => ymdAR(t.inicio) === d)
    )
    return utiles.length ? utiles : dias
  }, [vista, dias, horarios, turnos])

  function mover(paso: number) {
    if (vista === "mes") setAncla(sumarMeses(ancla, paso))
    else if (vista === "semana") setAncla(sumarDias(ancla, paso * 7))
    else setAncla(sumarDias(ancla, paso))
  }

  const titulo =
    vista === "mes"
      ? formatMesAnio(ancla)
      : vista === "semana"
        ? `${formatDiaMes(`${inicioSemana(ancla)}T12:00:00Z`)} – ${formatDiaMes(`${sumarDias(inicioSemana(ancla), 6)}T12:00:00Z`)}`
        : formatFecha(`${ancla}T12:00:00Z`)

  async function reenviar(t: Turno) {
    setAccion(true)
    try {
      await api.post(`/staff/turnos/${t.id}/reenviar-confirmacion`)
      toast.success("Confirmación reenviada.")
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "No se pudo reenviar."
      )
    } finally {
      setAccion(false)
    }
  }

  async function confirmarMover() {
    if (!moviendo) return
    setAccion(true)
    const inicio = new Date(moviendo.iso)
    try {
      await api.post(`/staff/turnos/${moviendo.turno.id}/reprogramar`, {
        start: { dateTime: inicio.toISOString() },
        end: {
          dateTime: new Date(inicio.getTime() + SLOT_MS).toISOString(),
        },
      })
      toast.success("Turno movido. Se avisó al paciente por email.")
      setMoviendo(null)
      refrescar()
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "No se pudo mover el turno."
      )
      // Puede haberse ocupado mientras tanto: recargamos para mostrar la verdad.
      cargar()
    } finally {
      setAccion(false)
    }
  }

  async function eliminarBloqueo(b: Bloqueo) {
    setAccion(true)
    try {
      await api.del(`/staff/bloqueos/${b.id}`)
      toast.success("Bloqueo eliminado.")
      setBloqueoSel(null)
      refrescar()
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "No se pudo eliminar el bloqueo."
      )
    } finally {
      setAccion(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Controles */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-56">
              <SelectField
                value={profId}
                onValueChange={setProfId}
                options={opcionesProfesional(profesionales)}
                placeholder={
                  profesionales.length ? "Elegí un profesional" : "No hay profesionales"
                }
              />
            </div>
            <div className="flex overflow-hidden rounded-md border border-border">
              {VISTAS.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  aria-pressed={vista === v.value}
                  onClick={() => setVista(v.value)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium transition-colors pointer-coarse:min-h-11",
                    vista === v.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Anterior"
              onClick={() => mover(-1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Siguiente"
              onClick={() => mover(1)}
            >
              <ChevronRight />
            </Button>
            <Button variant="outline" onClick={() => setAncla(hoyAR())}>
              Hoy
            </Button>
            <p className="min-w-0 flex-1 truncate text-sm font-medium first-letter:uppercase">
              {titulo}
            </p>
            <Input
              type="date"
              className="h-10 w-auto"
              value={ancla}
              onChange={(e) => e.target.value && setAncla(e.target.value)}
              aria-label="Ir a una fecha"
            />
            {cargando && (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Calendario */}
      {!profId ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Elegí un profesional para ver su agenda.
          </CardContent>
        </Card>
      ) : vista === "mes" ? (
        <VistaMes
          dias={dias}
          mes={inicioMes(ancla).slice(0, 7)}
          turnos={turnos}
          bloqueos={bloqueos}
          compacto={compacto}
          onDia={(ymd) => {
            setAncla(ymd)
            setVista("dia")
          }}
        />
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <GrillaHoraria
              dias={diasVisibles}
              horarios={horarios}
              turnos={turnos}
              bloqueos={bloqueos}
              onSlotLibre={(iso) => {
                setNuevoSlot(iso)
                setNuevoOpen(true)
              }}
              onTurno={setDetalle}
              onBloqueo={setBloqueoSel}
              onMover={(turno, iso) => setMoviendo({ turno, iso })}
            />
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Tocá un hueco libre para agendar, o un turno para reprogramarlo o cancelarlo.
        También podés arrastrar un turno hasta otro horario libre (en el celular,
        mantenelo apretado primero). Las zonas rayadas son bloqueos y las grises,
        fuera del horario de atención.
      </p>

      <NuevoTurnoDialog
        open={nuevoOpen}
        onOpenChange={setNuevoOpen}
        profesionales={profesionales}
        onCreated={refrescar}
        profIdInicial={profId}
        slotInicial={nuevoSlot}
      />

      <ReprogramarDialog
        turno={reprogramar}
        onClose={() => setReprogramar(null)}
        onDone={refrescar}
      />

      <CancelarTurnoDialog
        turno={cancelar}
        onClose={() => setCancelar(null)}
        onDone={refrescar}
      />

      {/* Detalle del turno */}
      <Dialog open={!!detalle} onOpenChange={(o) => !o && setDetalle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Turno</DialogTitle>
            <DialogDescription>
              {detalle ? formatFechaHora(detalle.inicio) : ""} hs
            </DialogDescription>
          </DialogHeader>

          {detalle && (
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <User className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 break-words font-medium">
                  {detalle.pacienteNombre || "Sin nombre"}
                </span>
                {detalle.esInvitado && (
                  <Badge variant="outline" className="font-normal">
                    Invitado
                  </Badge>
                )}
              </p>
              {detalle.pacienteEmail && (
                <p className="break-all pl-6 text-muted-foreground">
                  {detalle.pacienteEmail}
                </p>
              )}
              {detalle.pacienteTelefono && (
                <p className="pl-6 text-muted-foreground">
                  {detalle.pacienteTelefono}
                </p>
              )}
              <p className="flex items-center gap-2">
                <Stethoscope className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 break-words">
                  {detalle.profesionalNombre || "—"}
                </span>
              </p>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              disabled={accion || !detalle?.pacienteEmail}
              onClick={() => detalle && reenviar(detalle)}
            >
              <Mail /> Reenviar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setReprogramar(detalle)
                setDetalle(null)
              }}
            >
              <CalendarCog /> Reprogramar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setCancelar(detalle)
                setDetalle(null)
              }}
            >
              <Ban /> Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar el arrastre: mover avisa al paciente por email */}
      <Dialog open={!!moviendo} onOpenChange={(o) => !o && setMoviendo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover el turno</DialogTitle>
            <DialogDescription>
              {moviendo?.turno.pacienteNombre || "El paciente"} pasa del{" "}
              {moviendo ? formatFechaHora(moviendo.turno.inicio) : ""} al{" "}
              {moviendo ? formatFechaHora(moviendo.iso) : ""} hs. Se le avisará por
              email.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMoviendo(null)}
              disabled={accion}
            >
              Volver
            </Button>
            <Button onClick={confirmarMover} disabled={accion}>
              {accion ? <Loader2 className="animate-spin" /> : <CalendarCog />}
              Mover turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalle del bloqueo */}
      <Dialog open={!!bloqueoSel} onOpenChange={(o) => !o && setBloqueoSel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarOff className="size-5 text-muted-foreground" /> Bloqueo
            </DialogTitle>
            <DialogDescription>
              {bloqueoSel?.motivo || "Sin motivo"}
            </DialogDescription>
          </DialogHeader>
          {bloqueoSel && (
            <p className="text-sm text-muted-foreground">
              Desde {formatFechaHora(bloqueoSel.inicio)} hasta{" "}
              {formatFechaHora(bloqueoSel.fin)} hs.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBloqueoSel(null)}>
              Volver
            </Button>
            <Button
              variant="destructive"
              disabled={accion}
              onClick={() => bloqueoSel && eliminarBloqueo(bloqueoSel)}
            >
              {accion ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Eliminar bloqueo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Atajo para crear sin pasar por la grilla */}
      <div className="sm:hidden">
        <Button
          className="w-full"
          onClick={() => {
            setNuevoSlot(undefined)
            setNuevoOpen(true)
          }}
        >
          <CalendarPlus /> Nuevo turno
        </Button>
      </div>
    </div>
  )
}
