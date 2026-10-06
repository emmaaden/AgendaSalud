import { Link } from "react-router-dom"
import { Check, X, Star, MessageCircle } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Container, PageHero } from "@/components/site/Section"
import { WHATSAPP_URL } from "@/lib/site"

type Plan = {
  name: string
  price: string
  desc: string
  featured?: boolean
  features: { label: string; included: boolean }[]
}

const plans: Plan[] = [
  {
    name: "Básico",
    price: "5.000",
    desc: "Una solución práctica para gestionar tus turnos de manera simple.",
    features: [
      { label: "Perfil profesional personalizado", included: true },
      { label: "Gestión de agenda de turnos", included: true },
      { label: "Acceso al registro clínico", included: false },
    ],
  },
  {
    name: "Full",
    price: "10.000",
    desc: "La opción más completa: turnos y registro clínico detallado.",
    featured: true,
    features: [
      { label: "Perfil profesional personalizado", included: true },
      { label: "Gestión de agenda de turnos", included: true },
      { label: "Acceso al registro clínico", included: true },
    ],
  },
  {
    name: "Medio",
    price: "7.000",
    desc: "Para integrar un sistema completo de registro clínico en tu práctica.",
    features: [
      { label: "Perfil profesional personalizado", included: true },
      { label: "Gestión de agenda de turnos", included: false },
      { label: "Acceso al registro clínico", included: true },
    ],
  },
]

function waLink(plan: string) {
  const text = `Hola, me interesa suscribirme al Plan ${plan} y deseo recibir más información sobre los pasos a seguir.`
  return `${WHATSAPP_URL}?text=${encodeURIComponent(text)}`
}

export default function Planes() {
  return (
    <>
      <PageHero
        eyebrow="Planes"
        title="Elegí el plan ideal para tu consultorio"
        description="Precio final por mes, en pesos argentinos. Podés cambiar de plan o darlo de baja cuando quieras."
      />

      <Container className="py-16">
        <div className="grid items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-6 ring-1 ring-foreground/5 transition-shadow duration-200 ease-out sm:p-8",
                plan.featured
                  ? "border-primary shadow-xl lg:-mt-4 lg:mb-4"
                  : "border-border hover:shadow-md"
              )}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                  <Star className="size-3.5" aria-hidden /> Recomendado
                </span>
              )}
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-semibold">${plan.price}</span>
                <span className="text-sm text-muted-foreground">/ mes</span>
                <span className="sr-only">, precio final en pesos argentinos</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{plan.desc}</p>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f.label} className="flex items-center gap-3 text-sm">
                    {f.included ? (
                      <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                        <Check className="size-3.5" />
                      </span>
                    ) : (
                      <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                        <X className="size-3.5" />
                      </span>
                    )}
                    {/* El tachado no lo lee un lector de pantalla: se aclara en texto. */}
                    <span className="sr-only">{f.included ? "Incluye:" : "No incluye:"}</span>
                    <span
                      className={cn(
                        !f.included && "text-muted-foreground line-through"
                      )}
                    >
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                size="lg"
                variant={plan.featured ? "default" : "outline"}
                className="mt-8 w-full"
              >
                <a href={waLink(plan.name)} target="_blank" rel="noreferrer">
                  <MessageCircle aria-hidden /> Contratar el plan {plan.name} por WhatsApp
                  <span className="sr-only"> (se abre en una pestaña nueva)</span>
                </a>
              </Button>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-muted-foreground">
          Tenés 10 días corridos desde la contratación para arrepentirte sin costo,
          y podés dar de baja el plan cuando quieras. Leé los{" "}
          <Link to="/terminos" className="font-medium text-primary hover:underline">
            Términos y condiciones
          </Link>{" "}
          y la{" "}
          <Link to="/reembolsos" className="font-medium text-primary hover:underline">
            Política de reembolsos
          </Link>{" "}
          antes de contratar.
        </p>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          ¿Tenés dudas sobre qué plan te conviene?{" "}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary hover:underline"
          >
            Escribinos por WhatsApp
            <span className="sr-only"> (se abre en una pestaña nueva)</span>
          </a>
          .
        </p>
      </Container>
    </>
  )
}
