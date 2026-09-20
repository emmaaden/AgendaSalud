import { Link } from "react-router-dom"
import { User, Stethoscope, ClipboardList, ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Container } from "@/components/site/Section"

const roles = [
  {
    to: "/register/paciente",
    icon: User,
    title: "Soy paciente",
    description:
      "Reservá turnos, consultá tu historia clínica y gestioná tus consultas.",
  },
  {
    to: "/register/profesional",
    icon: Stethoscope,
    title: "Soy profesional",
    description:
      "Administrá tu agenda, tus pacientes y tu clínica desde un panel completo.",
  },
  {
    to: "/register/recepcion",
    icon: ClipboardList,
    title: "Trabajo en recepción",
    description:
      "Gestioná los turnos de la clínica. Necesitás un código de activación.",
  },
]

export default function RegisterRole() {
  return (
    <Container className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center py-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold sm:text-4xl">Crear cuenta</h1>
        <p className="mt-3 text-muted-foreground">
          Elegí el tipo de cuenta que querés crear.
        </p>
      </div>

      <div className="mt-10 grid w-full max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((r) => (
          <Link key={r.to} to={r.to} className="group">
            <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:ring-primary/40">
              <CardContent className="flex h-full flex-col p-8">
                <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <r.icon className="size-7" />
                </div>
                <h2 className="mt-5 text-xl font-semibold">{r.title}</h2>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">
                  {r.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  Continuar <ArrowRight className="size-4" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        ¿Ya tenés cuenta?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </Container>
  )
}
