import { useEffect, useState } from "react"
import { Link, Navigate } from "react-router-dom"
import { toast } from "sonner"
import { Loader2, MessageCircle, Users, ClipboardList, ClipboardCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Container } from "@/components/site/Section"
import { PlanCard, type Ciclo } from "@/components/site/PlanCard"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import {
  ESTADO_LABEL,
  mesesDeRegalo,
  waContratar,
  type EstadoPlan,
  type Plan as PlanCatalogo,
} from "@/lib/planes"

type PlanClinica = {
  planId: string | null
  planNombre: string | null
  estado: EstadoPlan
  soloLectura: boolean
  diasRestantes: number | null
  pruebaHasta: string | null
  periodoHasta: string | null
  ciclo: Ciclo
  features: string[]
  maxProfesionales: number
  profesionalesExtra: number
  maxRecepcion: number | null
}

type MiClinica = {
  plan: PlanClinica
  uso: { profesionales: number; recepcion: number; auditores: number }
  planes: PlanCatalogo[]
  features: Record<string, string>
  diasGracia: number
}

function fecha(iso: string | null) {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

const ESTADO_VARIANTE: Record<EstadoPlan, "default" | "secondary" | "destructive" | "outline"> = {
  activa: "default",
  prueba: "secondary",
  gracia: "outline",
  vencida: "destructive",
  cancelada: "destructive",
}

/** Barra de uso de un tipo de asiento. `max` null = sin tope. */
function Uso({
  icon: Icon,
  label,
  usados,
  max,
}: {
  icon: typeof Users
  label: string
  usados: number
  max: number | null
}) {
  // Estar en el tope es normal (p. ej. 1 de 1); en rojo solo si se pasó (tras bajar de plan).
  const excedido = max != null && usados > max
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 font-medium">
          <Icon className="size-4 text-muted-foreground" aria-hidden /> {label}
        </span>
        <span className={excedido ? "font-medium text-destructive" : "text-muted-foreground"}>
          {max == null ? `${usados} · sin tope` : `${usados} de ${max}`}
        </span>
      </div>
      {max != null && (
        <Progress
          value={Math.min(100, max === 0 ? 100 : (usados / max) * 100)}
          className="mt-2"
          aria-label={`${label}: ${usados} de ${max}`}
        />
      )}
    </div>
  )
}

export default function Plan() {
  const { user, loading } = useAuth()
  const [datos, setDatos] = useState<MiClinica | null>(null)
  const [ciclo, setCiclo] = useState<Ciclo>("mensual")

  useEffect(() => {
    if (!user?.esAdmin) return
    api
      .get<MiClinica>("/api/planes/mi-clinica")
      .then((d) => {
        setDatos(d)
        setCiclo(d.plan.ciclo)
      })
      .catch(() => toast.error("No se pudo cargar el plan de la clínica."))
  }, [user?.esAdmin])

  // El plan lo gestiona el admin de la clínica activa.
  if (!loading && user && !user.esAdmin) return <Navigate to="/dashboard" replace />

  if (!datos) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  const { plan, uso, planes, features } = datos
  const clinica = user?.clinicas.find((c) => c.clinicaId === user.clinicaId)?.nombre
  const vigente = plan.estado === "activa" || plan.estado === "gracia"
  const regalo = planes[0] ? mesesDeRegalo(planes[0]) : 0

  let detalle = ""
  if (plan.estado === "prueba") detalle = `La prueba termina el ${fecha(plan.pruebaHasta)}.`
  else if (plan.estado === "activa")
    detalle = plan.periodoHasta
      ? `Pago ${plan.ciclo}. Vence el ${fecha(plan.periodoHasta)}.`
      : `Pago ${plan.ciclo}.`
  else if (plan.estado === "gracia")
    detalle = `Venció el ${fecha(plan.periodoHasta)}. Tenés ${datos.diasGracia} días de gracia para renovarlo.`
  else detalle = "La clínica está en solo lectura: podés ver y exportar los datos."

  return (
    <Container className="py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold sm:text-3xl">Plan de la clínica</h1>
        <p className="mt-1 text-muted-foreground">
          Qué incluye tu plan, cuánto estás usando y cómo cambiarlo.
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-6 p-4 sm:p-6 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">{clinica}</p>
            <h2 className="mt-1 flex flex-wrap items-center gap-2 text-xl font-semibold">
              Plan {plan.planNombre ?? "—"}
              <Badge variant={ESTADO_VARIANTE[plan.estado]}>{ESTADO_LABEL[plan.estado]}</Badge>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{detalle}</p>
            {plan.profesionalesExtra > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                Incluye {plan.profesionalesExtra} profesional
                {plan.profesionalesExtra === 1 ? "" : "es"} extra.
              </p>
            )}
          </div>
          <div className="space-y-4">
            <Uso icon={Users} label="Profesionales" usados={uso.profesionales} max={plan.maxProfesionales} />
            <Uso icon={ClipboardList} label="Recepción" usados={uso.recepcion} max={plan.maxRecepcion} />
            {plan.features.includes("auditoria") && (
              <Uso icon={ClipboardCheck} label="Auditoría" usados={uso.auditores} max={null} />
            )}
            <p className="text-xs text-muted-foreground">
              Solo los profesionales ocupan lugar del plan. Para sumar a alguien, generá un
              código en <Link to="/dashboard/admin" className="font-medium text-primary hover:underline">Administración</Link>.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-12 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            {vigente ? "Cambiar de plan" : "Elegí un plan"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Precios finales en pesos argentinos, con IVA incluido.
          </p>
        </div>
        <Tabs value={ciclo} onValueChange={(v) => setCiclo(v as Ciclo)}>
          <TabsList>
            <TabsTrigger value="mensual">Mensual</TabsTrigger>
            <TabsTrigger value="anual">
              Anual{regalo > 0 ? ` · ${regalo} meses de regalo` : ""}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-8 grid items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3">
        {planes.map((p, i) => {
          const esActual = vigente && p.id === plan.planId
          return (
            <PlanCard
              key={p.id}
              plan={p}
              anterior={planes[i - 1]}
              features={features}
              ciclo={ciclo}
              actual={esActual}
              recomendar={!vigente}
              accion={
                esActual ? (
                  <Button variant="outline" size="lg" className="w-full" disabled>
                    Es tu plan actual
                  </Button>
                ) : (
                  <Button asChild size="lg" variant={p.destacado ? "default" : "outline"} className="w-full">
                    <a href={waContratar(p.nombre, clinica, ciclo)} target="_blank" rel="noreferrer">
                      <MessageCircle aria-hidden /> Contratar {p.nombre}
                      <span className="sr-only"> por WhatsApp (se abre en una pestaña nueva)</span>
                    </a>
                  </Button>
                )
              }
            />
          )
        })}
      </div>

      <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-muted-foreground">
        Por ahora la contratación se hace por WhatsApp: te confirmamos por escrito y
        activamos el plan en tu clínica. Tenés 10 días corridos para arrepentirte sin costo
        y podés darlo de baja cuando quieras (ver la{" "}
        <Link to="/reembolsos" className="font-medium text-primary hover:underline">
          Política de reembolsos
        </Link>
        ).
      </p>
    </Container>
  )
}
