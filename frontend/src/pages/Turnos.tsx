import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import {
  CalendarPlus,
  Search,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Trash2,
  CalendarClock,
  Building2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Field } from "@/components/form/Field"
import { SelectField } from "@/components/form/SelectField"
import { Container, PageHero } from "@/components/site/Section"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { api, ApiError } from "@/lib/api"
import { WHATSAPP_URL } from "@/lib/site"

type Professional = { id: number | string; nombre: string; id_calendario?: string }
type ProfArea = { area: string; professionals: Professional[] }
type Appointment = { id: string; start: { dateTime: string } }

const COUNTRIES = [
  { name: "Argentina", code: "+54" },
  { name: "Chile", code: "+56" },
  { name: "Uruguay", code: "+598" },
  { name: "Paraguay", code: "+595" },
  { name: "Bolivia", code: "+591" },
  { name: "Brasil", code: "+55" },
  { name: "Perú", code: "+51" },
  { name: "Colombia", code: "+57" },
  { name: "México", code: "+52" },
  { name: "España", code: "+34" },
  { name: "Estados Unidos", code: "+1" },
]

function formatSlotLocal(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Mendoza",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

type View = "menu" | "reservar" | "buscar"

export default function Turnos() {
  const [params] = useSearchParams()
  const clinica = params.get("clinica") || ""

  const [view, setView] = useState<View>("menu")
  const [areas, setAreas] = useState<ProfArea[]>([])
  const [clinicaNombre, setClinicaNombre] = useState<string | null>(null)

  const [area, setArea] = useState("")
  const [profId, setProfId] = useState("")
  const [calendarId, setCalendarId] = useState("")
  const [loadingCal, setLoadingCal] = useState(false)

  useEffect(() => {
    const url = clinica
      ? `/professionals?clinica=${encodeURIComponent(clinica)}`
      : "/professionals"
    api
      .get<ProfArea[]>(url)
      .then((d) => setAreas(Array.isArray(d) ? d : []))
      .catch(() => toast.error("No se pudieron cargar los profesionales"))

    if (clinica) {
      api
        .get<{ nombre?: string }>(
          `/clinica-publica?clinica=${encodeURIComponent(clinica)}`
        )
        .then((d) => d?.nombre && setClinicaNombre(d.nombre))
        .catch(() => {})
    }
  }, [clinica])

  const areaOptions = useMemo(
    () => areas.map((a) => ({ value: a.area, label: a.area })),
    [areas]
  )
  const profOptions = useMemo(() => {
    const found = areas.find((a) => a.area === area)
    return (found?.professionals || []).map((p) => ({
      value: String(p.id),
      label: p.nombre,
    }))
  }, [areas, area])

  async function selectProfessional(id: string) {
    setProfId(id)
    setCalendarId("")
    if (!id) return
    setLoadingCal(true)
    try {
      const d = await api.post<{ calendarid?: string }>("/auth/get-calenID", {
        id,
      })
      setCalendarId(d.calendarid || "")
      if (!d.calendarid) {
        toast.warning("Este profesional no tiene un calendario configurado.")
      }
    } catch {
      toast.error("No se pudo obtener el calendario del profesional.")
    } finally {
      setLoadingCal(false)
    }
  }

  function reset() {
    setView("menu")
    setArea("")
    setProfId("")
    setCalendarId("")
  }

  const profName =
    areas
      .find((a) => a.area === area)
      ?.professionals.find((p) => String(p.id) === profId)?.nombre || ""

  return (
    <>
      <PageHero
        eyebrow="Turnos"
        title={clinicaNombre ? `Turnos · ${clinicaNombre}` : "Reservá tu turno"}
        description="Elegí especialidad y profesional para ver la disponibilidad en tiempo real."
      />

      <Container className="py-12">
        <div className="mx-auto max-w-2xl">
          {clinicaNombre && (
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-sm text-muted-foreground">
              <Building2 className="size-4 text-primary" /> {clinicaNombre}
            </div>
          )}

          {view === "menu" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <button onClick={() => setView("reservar")} className="group text-left">
                <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:ring-primary/40">
                  <CardContent className="p-6">
                    <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <CalendarPlus className="size-6" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">Agendar turno</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Reservá una nueva consulta con el profesional que elijas.
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                      Continuar <ArrowRight className="size-4" />
                    </span>
                  </CardContent>
                </Card>
              </button>

              <button onClick={() => setView("buscar")} className="group text-left">
                <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:ring-primary/40">
                  <CardContent className="p-6">
                    <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Search className="size-6" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">Mis turnos</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Consultá o cancelá los turnos que reservaste por email.
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                      Continuar <ArrowRight className="size-4" />
                    </span>
                  </CardContent>
                </Card>
              </button>
            </div>
          )}

          {view !== "menu" && (
            <>
              <Button variant="ghost" onClick={reset} className="mb-4">
                <ArrowLeft /> Volver
              </Button>

              <Card>
                <CardContent className="space-y-4 p-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Especialidad" htmlFor="area" required>
                      <SelectField
                        id="area"
                        value={area}
                        onValueChange={(v) => {
                          setArea(v)
                          setProfId("")
                          setCalendarId("")
                        }}
                        options={areaOptions}
                        placeholder={
                          areaOptions.length ? "Seleccionar…" : "Cargando…"
                        }
                      />
                    </Field>
                    <Field label="Profesional" htmlFor="prof" required>
                      <SelectField
                        id="prof"
                        value={profId}
                        onValueChange={selectProfessional}
                        options={profOptions}
                        disabled={!area}
                        placeholder={
                          area ? "Seleccionar…" : "Elegí una especialidad"
                        }
                      />
                    </Field>
                  </div>
                  {loadingCal && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" /> Cargando
                      disponibilidad…
                    </p>
                  )}
                </CardContent>
              </Card>

              {profId && calendarId && !loadingCal && view === "reservar" && (
                <ReservarForm
                  profId={profId}
                  profName={profName}
                  clinica={clinica}
                />
              )}

              {profId && calendarId && !loadingCal && view === "buscar" && (
                <BuscarPanel calendarId={calendarId} />
              )}
            </>
          )}
        </div>
      </Container>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Reservar                                                                   */
/* -------------------------------------------------------------------------- */
function ReservarForm({
  profId,
  profName,
  clinica,
}: {
  profId: string
  profName: string
  clinica: string
}) {
  const today = new Date().toISOString().split("T")[0]
  const [date, setDate] = useState("")
  const [slots, setSlots] = useState<string[]>([])
  const [slot, setSlot] = useState("")
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [nearest, setNearest] = useState("")

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("+54")
  const [number, setNumber] = useState("")

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!date) return
    setLoadingSlots(true)
    setSlot("")
    api
      .get<string[]>(
        `/available-slots?date=${encodeURIComponent(date)}&profId=${encodeURIComponent(profId)}`
      )
      .then((s) => {
        const arr = Array.isArray(s) ? [...s].sort() : []
        setSlots(arr)
        if (arr.length) setNearest(`Turno más cercano: ${formatSlotLocal(arr[0])}hs`)
        else {
          setNearest("No hay turnos ese día. Buscando el más cercano…")
          searchNearest()
        }
      })
      .catch(() => toast.error("No se pudieron cargar los horarios"))
      .finally(() => setLoadingSlots(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, profId])

  async function searchNearest() {
    const current = new Date()
    for (let i = 0; i < 60; i++) {
      const d = current.toISOString().split("T")[0]
      try {
        const s = await api.get<string[]>(
          `/available-slots?date=${encodeURIComponent(d)}&profId=${encodeURIComponent(profId)}`
        )
        if (Array.isArray(s) && s.length) {
          setNearest(`Turno más cercano: ${formatSlotLocal([...s].sort()[0])}hs`)
          return
        }
      } catch {
        return
      }
      current.setDate(current.getDate() + 1)
    }
    setNearest("No se encontraron turnos disponibles próximamente.")
  }

  function openConfirm(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email || !number || !slot) {
      toast.warning("Completá todos los campos y elegí un horario.")
      return
    }
    if (new Date(slot) < new Date()) {
      toast.error("No podés elegir una fecha pasada.")
      return
    }
    setConfirmOpen(true)
  }

  async function confirmar() {
    setSubmitting(true)
    const start = new Date(slot)
    try {
      const res = await api.post<{ success?: boolean }>("/create-event", {
        summary: `Cita con ${name}`,
        description: `Correo del paciente: ${email}, Numero de teléfono: ${number}`,
        start: {
          dateTime: start.toISOString(),
          timeZone: "America/Argentina/Buenos_Aires",
        },
        end: {
          dateTime: new Date(start.getTime() + 30 * 60000).toISOString(),
          timeZone: "America/Argentina/Buenos_Aires",
        },
        email,
        number,
        numberCode: code,
        profId,
        clinica: clinica || undefined,
      })
      if (res.success) {
        setConfirmOpen(false)
        toast.success("¡Turno agendado con éxito!")
        setDate("")
        setSlot("")
        setSlots([])
        setName("")
        setEmail("")
        setNumber("")
      } else {
        toast.error("Turno no agendado. Intentá de nuevo.")
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Turno no agendado."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="mt-6">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold">Datos del turno</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Con {profName}. Elegí la fecha y completá tus datos.
        </p>

        <form onSubmit={openConfirm} className="mt-5 space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha" htmlFor="date" required>
              <Input
                id="date"
                type="date"
                min={today}
                className="h-10"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Horario disponible" htmlFor="slot" required>
              <SelectField
                id="slot"
                value={slot}
                onValueChange={setSlot}
                options={slots.map((s) => ({
                  value: s,
                  label: formatSlotLocal(s),
                }))}
                disabled={!date || loadingSlots || !slots.length}
                placeholder={
                  !date
                    ? "Elegí una fecha"
                    : loadingSlots
                      ? "Cargando…"
                      : slots.length
                        ? "Seleccionar…"
                        : "Sin turnos ese día"
                }
              />
            </Field>
          </div>
          {nearest && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarClock className="size-4 text-primary" /> {nearest}
            </p>
          )}

          <Field label="Nombre y apellido" htmlFor="name" required>
            <Input
              id="name"
              className="h-10"
              value={name}
              onChange={(e) => setName(e.target.value)}
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

          <div className="grid gap-4 sm:grid-cols-[minmax(0,12rem)_1fr]">
            <Field label="País" htmlFor="code">
              <SelectField
                id="code"
                value={code}
                onValueChange={setCode}
                options={COUNTRIES.map((c) => ({
                  value: c.code,
                  label: `${c.name} (${c.code})`,
                }))}
              />
            </Field>
            <Field label="Teléfono" htmlFor="number" required>
              <Input
                id="number"
                type="tel"
                className="h-10"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </Field>
          </div>

          <Button type="submit" size="lg" className="w-full">
            <CalendarPlus />
            Revisar y confirmar
          </Button>
        </form>
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmá tu turno</DialogTitle>
            <DialogDescription>
              Revisá que los datos sean correctos antes de agendar.
            </DialogDescription>
          </DialogHeader>
          <dl className="space-y-2 text-sm">
            <Row label="Profesional" value={profName} />
            <Row label="Fecha y hora" value={slot ? `${formatSlotLocal(slot)}hs` : "—"} />
            <Row label="Nombre" value={name} />
            <Row label="Email" value={email} />
            <Row label="Teléfono" value={`${code} ${number}`} />
          </dl>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
            >
              Volver
            </Button>
            <Button onClick={confirmar} disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <CalendarPlus />}
              Confirmar turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Buscar / cancelar                                                          */
/* -------------------------------------------------------------------------- */
function BuscarPanel({ calendarId }: { calendarId: string }) {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Appointment[] | null>(null)
  const [toDelete, setToDelete] = useState<Appointment | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function buscar(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      const data = await api.get<Appointment[]>(
        `/search-appointment?email=${encodeURIComponent(email)}&calendarId=${encodeURIComponent(calendarId)}`
      )
      setResults(Array.isArray(data) ? data : [])
    } catch {
      toast.error("Error al buscar turnos. Intentá de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  async function eliminar() {
    if (!toDelete) return
    setDeleting(true)
    try {
      await api.del(
        `/delete-appointment/${toDelete.id}?calendarId=${encodeURIComponent(calendarId)}`
      )
      toast.success("Turno eliminado con éxito")
      setResults((r) => (r ? r.filter((a) => a.id !== toDelete.id) : r))
      setToDelete(null)
    } catch {
      toast.error("No se pudo eliminar el turno.")
    } finally {
      setDeleting(false)
    }
  }

  function formatFecha(iso: string) {
    const f = new Date(iso)
    f.setHours(f.getHours() - 3)
    return f.toLocaleString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  return (
    <Card className="mt-6">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold">Buscar mis turnos</h3>
        <form onSubmit={buscar} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input
            type="email"
            placeholder="Tu email"
            className="h-10"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Search />}
            Buscar
          </Button>
        </form>

        {results && (
          <div className="mt-6">
            {results.length ? (
              <ul className="space-y-3">
                {results.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-4 rounded-lg border-l-4 border-primary bg-muted/40 px-4 py-3"
                  >
                    <span className="text-sm">
                      Turno: {formatFecha(a.start.dateTime)}
                    </span>
                    <Button
                      variant="destructive"
                      size="icon"
                      aria-label="Cancelar turno"
                      onClick={() => setToDelete(a)}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>No se encontraron turnos disponibles.</p>
                <p>
                  Solo aparecen los turnos solicitados a través de nuestro
                  sistema. Si lo reservaste de manera presencial, comunicate con
                  el centro médico.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar turno</DialogTitle>
            <DialogDescription>
              {toDelete
                ? `¿Seguro que querés cancelar el turno del ${formatFecha(toDelete.start.dateTime)}?`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setToDelete(null)}
              disabled={deleting}
            >
              No, volver
            </Button>
            <Button variant="destructive" onClick={eliminar} disabled={deleting}>
              {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Sí, cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="border-t border-border px-6 py-3 text-center text-xs text-muted-foreground">
        ¿Problemas?{" "}
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary hover:underline"
        >
          Escribinos
        </a>
      </div>
    </Card>
  )
}
