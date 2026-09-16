import { Check, X, Star } from "lucide-react"
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
        description="Precios claros, sin sorpresas. Cambiá o cancelá cuando quieras."
      />

      <Container className="py-16">
        <div className="grid items-stretch gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-8 ring-1 ring-foreground/5 transition-all",
                plan.featured
                  ? "border-primary shadow-xl lg:-mt-4 lg:mb-4"
                  : "border-border hover:shadow-md"
              )}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                  <Star className="size-3.5" /> Recomendado
                </span>
              )}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-semibold">${plan.price}</span>
                <span className="text-sm text-muted-foreground">/ mes</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{plan.desc}</p>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f.label} className="flex items-center gap-3 text-sm">
                    {f.included ? (
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                        <Check className="size-3.5" />
                      </span>
                    ) : (
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                        <X className="size-3.5" />
                      </span>
                    )}
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
                  Suscribirme
                </a>
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          ¿Tenés dudas sobre qué plan te conviene?{" "}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary hover:underline"
          >
            Escribinos por WhatsApp
          </a>
          .
        </p>
      </Container>
    </>
  )
}
