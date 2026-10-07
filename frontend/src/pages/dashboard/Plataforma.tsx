import { useCallback, useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { toast } from "sonner"
import { Loader2, Pencil, Building2, Tags } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Container } from "@/components/site/Section"
import { SelectField } from "@/components/form/SelectField"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { ESTADO_LABEL, formatoPesos, type EstadoPlan, type Plan } from "@/lib/planes"

type Suscripcion = {
  planId: string
  estadoGuardado: "prueba" | "activa" | "vencida" | "cancelada"
  estado: EstadoPlan
  ciclo: "mensual" | "anual"
  profesionalesExtra: number
  pruebaHasta: string | null
  periodoHasta: string | null
  notas: string | null
  // Fase M: débito automático de Mercado Pago.
  mpEstado: "pending" | "authorized" | "paused" | "cancelled" | null
  mpPayerEmail: string | null
  monto: number | null
  proximoCobro: string | null
}

const MP_LABEL: Record<string, string> = {
  pending: "Pendiente",
  authorized: "Débito activo",
  paused: "En pausa",
  cancelled: "Dado de baja",
}

type ClinicaPlataforma = {
  id: string
  nombre: string
  slug: string | null
  creadaEn: string
  suscripcion: Suscripcion | null
  uso: { profesionales: number; recepcion: number; auditores: number }
}

type Datos = { clinicas: ClinicaPlataforma[]; planes: Plan[]; pagoOnline: boolean }

/** Formulario de suscripción (fechas como YYYY-MM-DD para <input type="date">). */
type FormSub = {
  planId: string
  estado: Suscripcion["estadoGuardado"]
  ciclo: Suscripcion["ciclo"]
  profesionalesExtra: string
  pruebaHasta: string
  periodoHasta: string
  notas: string
}

const ESTADOS_GUARDADOS = [
  { value: "prueba", label: "Prueba" },
  { value: "activa", label: "Activa" },
  { value: "vencida", label: "Vencida" },
  { value: "cancelada", label: "Cancelada" },
]

const CICLOS = [
  { value: "mensual", label: "Mensual" },
  { value: "anual", label: "Anual" },
]

const aInputFecha = (iso: string | null) => (iso ? iso.slice(0, 10) : "")
// Fin del día en Argentina para que «vence el 10» incluya todo el 10.
const deInputFecha = (v: string) => (v ? `${v}T23:59:59-03:00` : null)

function fechaCorta(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
}

const ESTADO_VARIANTE: Record<EstadoPlan, "default" | "secondary" | "destructive" | "outline"> = {
  activa: "default",
  prueba: "secondary",
  gracia: "outline",
  vencida: "destructive",
  cancelada: "destructive",
}

/** Suma meses al vencimiento actual (si sigue vigente) o a hoy. */
function extenderPeriodo(periodoHasta: string | null, meses: number) {
  const base = periodoHasta && new Date(periodoHasta) > new Date() ? new Date(periodoHasta) : new Date()
  base.setMonth(base.getMonth() + meses)
  return base.toISOString().slice(0, 10)
}

export default function Plataforma() {
  const { user, loading } = useAuth()
  const [datos, setDatos] = useState<Datos | null>(null)
  const [editando, setEditando] = useState<ClinicaPlataforma | null>(null)
  const [form, setForm] = useState<FormSub | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)

  const cargar = useCallback(async () => {
    try {
      setDatos(await api.get<Datos>("/plataforma/clinicas"))
    } catch {
      toast.error("No se pudo cargar el panel de plataforma.")
    }
  }, [])

  useEffect(() => {
    if (user?.esPlataforma) cargar()
  }, [user?.esPlataforma, cargar])

  if (!loading && user && !user.esPlataforma) return <Navigate to="/dashboard" replace />

  function abrir(c: ClinicaPlataforma) {
    const s = c.suscripcion
    setEditando(c)
    setForm({
      planId: s?.planId ?? "clinica",
      estado: s?.estadoGuardado ?? "prueba",
      ciclo: s?.ciclo ?? "mensual",
      profesionalesExtra: String(s?.profesionalesExtra ?? 0),
      pruebaHasta: aInputFecha(s?.pruebaHasta ?? null),
      periodoHasta: aInputFecha(s?.periodoHasta ?? null),
      notas: s?.notas ?? "",
    })
  }

  // Atajo: activar (o renovar) por un período, con el ciclo correspondiente.
  function activar(meses: 1 | 12) {
    if (!form || !editando) return
    setForm({
      ...form,
      estado: "activa",
      ciclo: meses === 12 ? "anual" : "mensual",
      periodoHasta: extenderPeriodo(editando.suscripcion?.periodoHasta ?? null, meses),
    })
  }

  async function guardar() {
    if (!form || !editando) return
    const extra = Number(form.profesionalesExtra)
    if (!Number.isInteger(extra) || extra < 0) {
      toast.error("Los profesionales extra tienen que ser un número entero.")
      return
    }
    setGuardando(true)
    try {
      await api.patch(`/plataforma/clinicas/${editando.id}/suscripcion`, {
        planId: form.planId,
        estado: form.estado,
        ciclo: form.ciclo,
        profesionalesExtra: extra,
        pruebaHasta: deInputFecha(form.pruebaHasta),
        periodoHasta: deInputFecha(form.periodoHasta),
        notas: form.notas.trim() || null,
      })
      toast.success("Suscripción actualizada.")
      setEditando(null)
      cargar()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo guardar.")
    } finally {
      setGuardando(false)
    }
  }

  async function sincronizar() {
    if (!editando) return
    setSincronizando(true)
    try {
      await api.post(`/plataforma/clinicas/${editando.id}/sincronizar`)
      toast.success("Sincronizado con Mercado Pago.")
      setEditando(null)
      cargar()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo sincronizar.")
    } finally {
      setSincronizando(false)
    }
  }

  if (!datos) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  const planPorId = new Map(datos.planes.map((p) => [p.id, p]))
  const opcionesPlan = datos.planes.map((p) => ({ value: p.id, label: p.nombre }))
  const planElegido = form ? planPorId.get(form.planId) : undefined

  return (
    <Container className="py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold sm:text-3xl">Plataforma</h1>
        <p className="mt-1 text-muted-foreground">
          Activá y renová los planes de las clínicas, y actualizá los precios.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Building2 className="size-5 text-primary" aria-hidden /> Clínicas
          </h2>
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clínica</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead>Mercado Pago</TableHead>
                  <TableHead className="text-right">Profesionales</TableHead>
                  <TableHead className="sr-only">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datos.clinicas.map((c) => {
                  const s = c.suscripcion
                  const plan = s ? planPorId.get(s.planId) : undefined
                  const max = plan
                    ? plan.profesionalesIncluidos + (plan.precioProfesionalExtra != null ? s?.profesionalesExtra ?? 0 : 0)
                    : 0
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <p className="font-medium">{c.nombre}</p>
                        <p className="text-xs text-muted-foreground">{c.slug}</p>
                      </TableCell>
                      <TableCell>{plan?.nombre ?? "—"}</TableCell>
                      <TableCell>
                        {s ? (
                          <Badge variant={ESTADO_VARIANTE[s.estado]}>{ESTADO_LABEL[s.estado]}</Badge>
                        ) : (
                          <Badge variant="outline">Sin suscripción</Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {fechaCorta(s?.estadoGuardado === "prueba" ? s.pruebaHasta : s?.periodoHasta ?? null)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {s?.mpEstado ? MP_LABEL[s.mpEstado] ?? s.mpEstado : "Manual"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.uso.profesionales} / {max}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => abrir(c)}>
                          <Pencil aria-hidden /> Editar
                          <span className="sr-only"> la suscripción de {c.nombre}</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PreciosPlanes planes={datos.planes} onGuardado={cargar} />

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Suscripción de {editando?.nombre}</DialogTitle>
            <DialogDescription>
              Activá el plan cuando se confirme el pago. Las fechas vencen al final del día.
            </DialogDescription>
          </DialogHeader>

          {form && (
            <div className="grid gap-4">
              {editando?.suscripcion?.mpEstado && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                  <p className="font-medium">
                    Mercado Pago: {MP_LABEL[editando.suscripcion.mpEstado] ?? editando.suscripcion.mpEstado}
                  </p>
                  <p className="text-muted-foreground">
                    {editando.suscripcion.monto != null && `${formatoPesos(editando.suscripcion.monto)} por ciclo`}
                    {editando.suscripcion.proximoCobro && ` · próximo cobro ${fechaCorta(editando.suscripcion.proximoCobro)}`}
                    {editando.suscripcion.mpPayerEmail && ` · ${editando.suscripcion.mpPayerEmail}`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Con débito activo, los cobros extienden el período solos: editá a mano solo para corregir.
                  </p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => activar(1)}>
                  Activar 1 mes
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => activar(12)}>
                  Activar 1 año
                </Button>
                {datos.pagoOnline && (
                  <Button type="button" variant="outline" size="sm" onClick={sincronizar} disabled={sincronizando}>
                    {sincronizando && <Loader2 className="animate-spin" />} Sincronizar con Mercado Pago
                  </Button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="sub-plan">Plan</Label>
                  <SelectField
                    id="sub-plan"
                    value={form.planId}
                    onValueChange={(v) => setForm({ ...form, planId: v })}
                    options={opcionesPlan}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="sub-estado">Estado</Label>
                  <SelectField
                    id="sub-estado"
                    value={form.estado}
                    onValueChange={(v) => setForm({ ...form, estado: v as FormSub["estado"] })}
                    options={ESTADOS_GUARDADOS}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="sub-ciclo">Ciclo de pago</Label>
                  <SelectField
                    id="sub-ciclo"
                    value={form.ciclo}
                    onValueChange={(v) => setForm({ ...form, ciclo: v as FormSub["ciclo"] })}
                    options={CICLOS}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="sub-extra">Profesionales extra</Label>
                  <Input
                    id="sub-extra"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={form.profesionalesExtra}
                    disabled={planElegido?.precioProfesionalExtra == null}
                    onChange={(e) => setForm({ ...form, profesionalesExtra: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="sub-prueba">Prueba hasta</Label>
                  <Input
                    id="sub-prueba"
                    type="date"
                    value={form.pruebaHasta}
                    onChange={(e) => setForm({ ...form, pruebaHasta: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="sub-periodo">Período pago hasta</Label>
                  <Input
                    id="sub-periodo"
                    type="date"
                    value={form.periodoHasta}
                    onChange={(e) => setForm({ ...form, periodoHasta: e.target.value })}
                  />
                </div>
              </div>
              <p className="-mt-2 text-xs text-muted-foreground">
                Sin «período pago hasta», un plan activo no vence (cuentas de cortesía).
              </p>
              <div className="grid gap-1.5">
                <Label htmlFor="sub-notas">Notas internas</Label>
                <Textarea
                  id="sub-notas"
                  rows={3}
                  value={form.notas}
                  placeholder="Por ejemplo: pagó por transferencia el 6/10."
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)} disabled={guardando}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={guardando}>
              {guardando && <Loader2 className="animate-spin" />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Container>
  )
}

/** Precios y asientos de cada plan (se actualizan sin deploy, p. ej. por inflación). */
function PreciosPlanes({ planes, onGuardado }: { planes: Plan[]; onGuardado: () => void }) {
  return (
    <Card className="mt-8">
      <CardContent className="p-4 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Tags className="size-5 text-primary" aria-hidden /> Precios
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Precio final con IVA. Un cambio rige para lo que se contrate desde ahora; los
          períodos ya pagados no cambian.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {planes.map((p) => (
            <PrecioPlan key={p.id} plan={p} onGuardado={onGuardado} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function PrecioPlan({ plan, onGuardado }: { plan: Plan; onGuardado: () => void }) {
  const [v, setV] = useState({
    precioMensual: String(plan.precioMensual),
    precioAnual: String(plan.precioAnual),
    precioProfesionalExtra: plan.precioProfesionalExtra == null ? "" : String(plan.precioProfesionalExtra),
    profesionalesIncluidos: String(plan.profesionalesIncluidos),
  })
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    const n = (s: string) => Number(s.replace(/\./g, "").replace(",", "."))
    const body = {
      precioMensual: n(v.precioMensual),
      precioAnual: n(v.precioAnual),
      precioProfesionalExtra: v.precioProfesionalExtra.trim() === "" ? null : n(v.precioProfesionalExtra),
      profesionalesIncluidos: Math.trunc(n(v.profesionalesIncluidos)),
    }
    if (Object.values(body).some((x) => x !== null && (!Number.isFinite(x) || x < 0))) {
      toast.error("Revisá los importes: tienen que ser números positivos.")
      return
    }
    setGuardando(true)
    try {
      await api.patch(`/plataforma/planes/${plan.id}`, body)
      toast.success(`Plan ${plan.nombre} actualizado.`)
      onGuardado()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo guardar.")
    } finally {
      setGuardando(false)
    }
  }

  const campo = (k: keyof typeof v, label: string, ayuda?: string) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`${plan.id}-${k}`}>{label}</Label>
      <Input
        id={`${plan.id}-${k}`}
        inputMode="decimal"
        value={v[k]}
        onChange={(e) => setV({ ...v, [k]: e.target.value })}
      />
      {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
    </div>
  )

  return (
    <div className="grid gap-3 rounded-lg border border-border p-4">
      <p className="font-medium">
        {plan.nombre}{" "}
        <span className="text-sm font-normal text-muted-foreground">
          · hoy {formatoPesos(plan.precioMensual)} por mes
        </span>
      </p>
      {campo("precioMensual", "Precio mensual")}
      {campo("precioAnual", "Precio anual")}
      {campo("profesionalesIncluidos", "Profesionales incluidos")}
      {campo("precioProfesionalExtra", "Profesional extra (por mes)", "Vacío = el plan no admite extras.")}
      <Button variant="outline" onClick={guardar} disabled={guardando}>
        {guardando && <Loader2 className="animate-spin" />} Guardar {plan.nombre}
      </Button>
    </div>
  )
}
