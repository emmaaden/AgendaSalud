import { Link } from "react-router-dom"
import { Lock, Clock, AlertTriangle, ArrowRight } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "cn"
import { Container } from "@/components/site/Section"
import { useAuth } from "@/contexts/AuthContext"
import {
  FEATURES,
  planMinimo,
  tieneFeature,
  useCatalogoPlanes,
  type Feature,
} from "@/lib/planes"

/**
 * Fase L: muestra `children` solo si el plan de la clínica activa incluye `feature`.
 * Si no, explica qué plan lo incluye. El admin va a elegir plan; el resto, a pedírselo.
 * `compacto` para usar dentro de una página (una tarjeta en vez de una página entera).
 */
export function FeatureGate({
  feature,
  compacto = false,
  className,
  children,
}: {
  feature: Feature
  compacto?: boolean
  /** Clases de la tarjeta de aviso (p. ej. el margen dentro de una página). */
  className?: string
  children: React.ReactNode
}) {
  const { user } = useAuth()
  if (tieneFeature(user?.plan, feature)) return <>{children}</>

  const tarjeta = <PlanRequerido feature={feature} className={className} />
  return compacto ? tarjeta : <Container className="py-8 sm:py-12">{tarjeta}</Container>
}

function PlanRequerido({ feature, className }: { feature: Feature; className?: string }) {
  const { user } = useAuth()
  const { catalogo } = useCatalogoPlanes()
  const minimo = catalogo ? planMinimo(catalogo.planes, feature) : undefined

  return (
    <Card className={cn(className)}>
      <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Lock className="size-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">{FEATURES[feature]}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            No está incluido en el plan {user?.plan?.nombre ?? "actual"} de la clínica
            {minimo ? `. Lo tenés desde el plan ${minimo.nombre}.` : "."}
            {!user?.esAdmin && " Pedile al administrador de la clínica que lo active."}
          </p>
        </div>
        {user?.esAdmin && (
          <Button asChild>
            <Link to="/dashboard/plan">
              Ver planes <ArrowRight />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Fase L: aviso del estado de la suscripción debajo del navbar (prueba, pago
 * pendiente o solo lectura). Con el plan activo no muestra nada.
 */
export function PlanBanner() {
  const { user } = useAuth()
  const plan = user?.plan
  if (!plan || plan.estado === "activa") return null

  const dias = plan.diasRestantes ?? 0
  const enDias = dias === 1 ? "1 día" : `${dias} días`
  const accion = user?.esAdmin ? (
    <Link to="/dashboard/plan" className="font-medium">
      Elegir un plan
    </Link>
  ) : (
    <span>Avisale al administrador de la clínica.</span>
  )

  if (plan.estado === "prueba") {
    return (
      <Container className="pt-4">
        <Alert>
          <Clock aria-hidden />
          <AlertTitle>
            Prueba gratis del plan {plan.nombre}: {dias === 0 ? "termina hoy" : `te quedan ${enDias}`}
          </AlertTitle>
          <AlertDescription>
            <p>
              Al terminar, la clínica queda en solo lectura hasta que contrates un plan. {accion}
            </p>
          </AlertDescription>
        </Alert>
      </Container>
    )
  }

  if (plan.estado === "gracia") {
    return (
      <Container className="pt-4">
        <Alert>
          <AlertTriangle aria-hidden />
          <AlertTitle>El pago del plan {plan.nombre} está pendiente</AlertTitle>
          <AlertDescription>
            <p>
              Si no se renueva, en {enDias} la clínica pasa a solo lectura. {accion}
            </p>
          </AlertDescription>
        </Alert>
      </Container>
    )
  }

  return (
    <Container className="pt-4">
      <Alert variant="destructive">
        <Lock aria-hidden />
        <AlertTitle>
          {plan.estado === "cancelada"
            ? "La suscripción de la clínica está cancelada"
            : "La suscripción de la clínica venció"}
        </AlertTitle>
        <AlertDescription>
          <p>
            La clínica está en solo lectura: podés ver y exportar los datos, pero no cargar
            nada nuevo ni recibir turnos online. {accion}
          </p>
        </AlertDescription>
      </Alert>
    </Container>
  )
}
