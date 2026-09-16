import { Link } from "react-router-dom"
import {
  CalendarClock,
  FileHeart,
  Stethoscope,
  ShieldCheck,
  Clock,
  Smartphone,
  ArrowRight,
  UserPlus,
  CalendarPlus,
  Search,
  ClipboardList,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Container } from "@/components/site/Section"

const features = [
  {
    icon: CalendarClock,
    title: "Turnos online",
    description:
      "Reservá tu consulta en minutos, elegí profesional y horario disponible, y recibí la confirmación por email.",
    to: "/turnos",
    cta: "Pedir turno",
  },
  {
    icon: FileHeart,
    title: "Historia clínica digital",
    description:
      "Consultá tu historial de consultas, diagnósticos y tratamientos de forma segura con tu DNI.",
    to: "/historia-clinica",
    cta: "Ver historia clínica",
  },
  {
    icon: Stethoscope,
    title: "Para profesionales",
    description:
      "Gestioná tu agenda, tus pacientes y tu clínica desde un panel simple y ordenado.",
    to: "/register/profesional",
    cta: "Crear cuenta profesional",
  },
]

const steps = [
  {
    icon: Search,
    title: "Elegí especialidad",
    description: "Buscá el área y el profesional que necesitás.",
  },
  {
    icon: CalendarPlus,
    title: "Seleccioná el horario",
    description: "Vé los turnos disponibles en tiempo real y reservá.",
  },
  {
    icon: ClipboardList,
    title: "Recibí la confirmación",
    description: "Te llega el detalle del turno por email al instante.",
  },
]

const values = [
  {
    icon: ShieldCheck,
    title: "Datos protegidos",
    description:
      "Tu información clínica se maneja con seguridad y confidencialidad.",
  },
  {
    icon: Clock,
    title: "Disponible 24/7",
    description: "Reservá o consultá cuando quieras, sin llamadas ni esperas.",
  },
  {
    icon: Smartphone,
    title: "Desde cualquier dispositivo",
    description: "Una experiencia rápida y clara en el celular o la computadora.",
  },
]

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-accent/60 via-background to-background"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-40 -z-10 size-[32rem] rounded-full bg-primary/10 blur-3xl"
        />
        <Container className="grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium text-primary">
              <span className="size-1.5 rounded-full bg-primary" />
              Salud simple y organizada
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
              Tu salud, <span className="text-primary">a un clic</span> de
              distancia
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Reservá turnos online, accedé a tu historia clínica y gestioná tu
              consultorio desde un solo lugar. Rápido, claro y profesional.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/turnos">
                  <CalendarPlus />
                  Pedir turno
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/register">
                  <UserPlus />
                  Crear cuenta
                </Link>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6">
              {[
                { k: "100%", v: "Online" },
                { k: "24/7", v: "Disponible" },
                { k: "+", v: "Especialidades" },
              ].map((s) => (
                <div key={s.v}>
                  <dt className="text-2xl font-semibold text-foreground">
                    {s.k}
                  </dt>
                  <dd className="text-sm text-muted-foreground">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <Card className="mx-auto max-w-md shadow-xl ring-foreground/5">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                    <CalendarClock className="size-6" />
                  </div>
                  <div>
                    <p className="font-medium">Próximo turno</p>
                    <p className="text-sm text-muted-foreground">
                      Confirmado por email
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">Especialidad</p>
                  <p className="font-medium">Odontología · Dra. Pérez</p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1.5 text-foreground">
                      <CalendarClock className="size-4 text-primary" /> Lun 09:30
                    </span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Confirmado
                    </span>
                  </div>
                </div>
                <Button asChild className="w-full" size="lg">
                  <Link to="/turnos">
                    Reservar ahora <ArrowRight />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-20">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Todo lo que necesitás
            </h2>
            <p className="mt-3 text-muted-foreground">
              Una plataforma pensada para pacientes y profesionales de la salud.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="group h-full">
                <CardContent className="flex h-full flex-col p-6">
                  <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <f.icon className="size-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">
                    {f.description}
                  </p>
                  <Link
                    to={f.to}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    {f.cta} <ArrowRight className="size-4" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Cómo funciona */}
      <section className="border-y border-border bg-muted/30 py-16 sm:py-20">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold sm:text-4xl">Cómo funciona</h2>
            <p className="mt-3 text-muted-foreground">
              Reservar un turno nunca fue tan fácil.
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="relative text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-background text-primary shadow-sm ring-1 ring-border">
                  <s.icon className="size-7" />
                </div>
                <span className="mt-4 inline-block text-xs font-semibold text-primary">
                  Paso {i + 1}
                </span>
                <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button asChild size="lg">
              <Link to="/turnos">
                <CalendarPlus />
                Empezar ahora
              </Link>
            </Button>
          </div>
        </Container>
      </section>

      {/* Sobre nosotros */}
      <section id="sobrenosotros" className="scroll-mt-20 py-16 sm:py-20">
        <Container className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-primary">Sobre nosotros</p>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">
              Cerca de tu salud, siempre
            </h2>
            <p className="mt-4 text-muted-foreground">
              AgendaSalud nació para simplificar la relación entre pacientes y
              profesionales: menos llamadas, menos esperas y más tiempo para lo
              que importa. Digitalizamos turnos e historias clínicas con foco en
              la seguridad y la simplicidad.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="outline" size="lg">
                <Link to="/planes">Ver planes</Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link to="/register/profesional">Soy profesional</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {values.map((v) => (
              <Card key={v.title} className="h-full">
                <CardContent className="p-5">
                  <v.icon className="size-6 text-primary" />
                  <h3 className="mt-3 font-semibold">{v.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {v.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA final */}
      <section className="pb-20">
        <Container>
          <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/10 blur-2xl"
            />
            <h2 className="relative text-3xl font-semibold sm:text-4xl">
              ¿Listo para empezar?
            </h2>
            <p className="relative mx-auto mt-3 max-w-xl text-primary-foreground/80">
              Creá tu cuenta gratis o reservá tu próximo turno en segundos.
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/register">Crear cuenta</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
              >
                <Link to="/turnos">Pedir turno</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
