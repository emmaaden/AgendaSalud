import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import {
  CalendarDays,
  UserCog,
  ClipboardList,
  ArrowRight,
  Building2,
  Plus,
  Copy,
  Check,
  Loader2,
  KeyRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Container } from "@/components/site/Section"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"

type ClinicaInfo = {
  esAdmin?: boolean
  clinica?: { nombre?: string; slug?: string; plan?: string }
}
type Codigo = { codigo: string; usado: boolean }

const accesos = [
  {
    to: "/dashboard/registro-clinico",
    icon: ClipboardList,
    title: "Registro clínico",
    description: "Registrá pacientes y cargá nuevas consultas.",
  },
  {
    to: "/dashboard/config",
    icon: CalendarDays,
    title: "Calendario y horarios",
    description: "Gestioná tu disponibilidad y tu agenda.",
  },
  {
    to: "/dashboard/config",
    icon: UserCog,
    title: "Mi perfil",
    description: "Actualizá tus datos, precio y descripción.",
  },
]

export default function DashboardHome() {
  const { user } = useAuth()
  const [nombre, setNombre] = useState("")
  const [clinica, setClinica] = useState<ClinicaInfo | null>(null)
  const [codigos, setCodigos] = useState<Codigo[]>([])
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (user?.id) {
      api
        .post<{ nombre?: string; apellido?: string }>(
          "/profesional/get-datos-prof",
          { user_id: user.id }
        )
        .then((d) =>
          setNombre([d.nombre, d.apellido].filter(Boolean).join(" "))
        )
        .catch(() => {})
    }

    api
      .get<ClinicaInfo>("/clinica/info")
      .then((info) => {
        setClinica(info)
        if (info.esAdmin) cargarCodigos()
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  function cargarCodigos() {
    api
      .get<{ codigos?: Codigo[] }>("/clinica/codigos")
      .then((d) => setCodigos(d.codigos || []))
      .catch(() => {})
  }

  async function generarCodigo() {
    setGenerating(true)
    try {
      const d = await api.post<{ codigo?: string }>("/clinica/generar-codigo")
      toast.success(`Código generado: ${d.codigo}`)
      cargarCodigos()
    } catch {
      toast.error("No se pudo generar el código.")
    } finally {
      setGenerating(false)
    }
  }

  const slug = clinica?.clinica?.slug
  const publicLink = slug
    ? `${window.location.origin}/turnos?clinica=${encodeURIComponent(slug)}`
    : ""

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(publicLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("No se pudo copiar el enlace.")
    }
  }

  return (
    <Container className="py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold sm:text-3xl">
          Te damos la bienvenida{nombre ? `, ${nombre}` : ""}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Gestioná tu consultorio desde un solo lugar.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {accesos.map((a) => (
          <Link key={a.title} to={a.to} className="group">
            <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:ring-primary/40">
              <CardContent className="flex h-full flex-col p-6">
                <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <a.icon className="size-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{a.title}</h3>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">
                  {a.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  Abrir <ArrowRight className="size-4" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {clinica?.esAdmin && (
        <Card className="mt-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="size-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Gestión de la clínica</h2>
                <p className="text-sm text-muted-foreground">
                  {clinica.clinica?.nombre || "—"}
                  {clinica.clinica?.plan ? ` · Plan ${clinica.clinica.plan}` : ""}
                </p>
              </div>
            </div>

            {publicLink && (
              <div className="mt-5">
                <label className="text-sm font-medium">
                  Enlace público de turnos
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    readOnly
                    value={publicLink}
                    className="h-10 w-full rounded-lg border border-input bg-muted/40 px-3 text-sm text-muted-foreground"
                  />
                  <Button variant="outline" size="lg" onClick={copiarLink}>
                    {copied ? <Check /> : <Copy />}
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <KeyRound className="size-4 text-primary" />
                  Códigos de activación
                </h3>
                <Button size="sm" onClick={generarCodigo} disabled={generating}>
                  {generating ? <Loader2 className="animate-spin" /> : <Plus />}
                  Generar
                </Button>
              </div>
              <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
                {codigos.length ? (
                  codigos.map((c) => (
                    <li
                      key={c.codigo}
                      className="flex items-center justify-between px-4 py-2.5 text-sm"
                    >
                      <code className="font-mono">{c.codigo}</code>
                      <Badge variant={c.usado ? "secondary" : "default"}>
                        {c.usado ? "Usado" : "Disponible"}
                      </Badge>
                    </li>
                  ))
                ) : (
                  <li className="px-4 py-3 text-sm text-muted-foreground">
                    Todavía no generaste códigos.
                  </li>
                )}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Compartí un código disponible con otro profesional para que se
                una a tu clínica al registrarse.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </Container>
  )
}
