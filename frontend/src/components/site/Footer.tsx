import { Link } from "react-router-dom"
import { Mail, MessageCircle } from "lucide-react"
import { Logo } from "./Logo"
import { CONTACT_EMAIL, WHATSAPP_URL } from "@/lib/site"

const columns = [
  {
    title: "Producto",
    links: [
      { to: "/turnos", label: "Reservar turno" },
      { to: "/planes", label: "Planes" },
      { to: "/mi-historia", label: "Mi historia clínica" },
      { to: "/valor-ortodoncia", label: "Valor ortodoncia" },
    ],
  },
  {
    title: "Cuenta",
    links: [
      { to: "/login", label: "Iniciar sesión" },
      { to: "/register/paciente", label: "Registro paciente" },
      { to: "/register/profesional", label: "Registro profesional" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/terminos", label: "Términos y condiciones" },
      { to: "/privacidad", label: "Política de privacidad" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            Turnos online, historia clínica digital y gestión para profesionales
            de la salud.
          </p>
          <div className="flex flex-col gap-2 pt-1 text-sm">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <MessageCircle className="size-4" /> WhatsApp
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Mail className="size-4" /> {CONTACT_EMAIL}
            </a>
          </div>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              {col.title}
            </h3>
            <ul className="space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-5 text-center text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} AgendaSalud. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  )
}
