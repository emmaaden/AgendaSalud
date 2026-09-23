import { Link } from "react-router-dom"
import { Home, CalendarPlus, LifeBuoy, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/site/Section"
import { HELP_URL } from "@/lib/site"

export default function NotFound() {
  return (
    <Container className="flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
      <p className="font-heading text-7xl font-semibold text-primary sm:text-8xl">
        404
      </p>
      <h1 className="mt-4 text-2xl font-semibold sm:text-3xl">
        Página no encontrada
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        La página que buscás no existe o fue movida. Verificá la dirección o
        volvé al inicio para seguir navegando.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link to="/">
            <Home />
            Volver al inicio
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/turnos">
            <CalendarPlus />
            Reservar turno
          </Link>
        </Button>
        <Button asChild size="lg" variant="ghost">
          <a href={HELP_URL} target="_blank" rel="noreferrer">
            <LifeBuoy />
            Ayuda
          </a>
        </Button>
      </div>

      <button
        onClick={() => window.history.back()}
        className="mt-8 inline-flex items-center gap-1.5 pointer-coarse:min-h-11 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver atrás
      </button>
    </Container>
  )
}
