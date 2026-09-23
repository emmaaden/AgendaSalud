import { useCallback, useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { toast } from "sonner"
import {
  Users,
  KeyRound,
  Plus,
  Trash2,
  Loader2,
  ShieldCheck,
  Stethoscope,
  ClipboardList,
  MoreVertical,
  Copy,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Container } from "@/components/site/Section"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"

type Rol = "admin" | "profesional" | "recepcion"

type Miembro = {
  id: number
  personaId: number
  nombre: string | null
  apellido: string | null
  email: string | null
  dni: string | null
  matricula: string | null
  rol: Rol
  activo: boolean
  esYo: boolean
}

type Codigo = {
  id: number
  codigo: string
  usado: boolean
  rol?: "profesional" | "recepcion"
  creado_en?: string
}

const ROL_META: Record<Rol, { label: string; icon: typeof ShieldCheck }> = {
  admin: { label: "Administrador/a", icon: ShieldCheck },
  profesional: { label: "Profesional", icon: Stethoscope },
  recepcion: { label: "Recepción", icon: ClipboardList },
}

export default function Administracion() {
  const { user, loading } = useAuth()

  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [codigos, setCodigos] = useState<Codigo[]>([])
  const [cargando, setCargando] = useState(true)
  const [accion, setAccion] = useState<number | null>(null) // membresiaId en curso
  const [generating, setGenerating] = useState(false)
  const [borrando, setBorrando] = useState<number | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [m, c] = await Promise.all([
        api.get<{ miembros: Miembro[] }>("/admin/miembros"),
        api.get<{ codigos: Codigo[] }>("/clinica/codigos"),
      ])
      setMiembros(m.miembros || [])
      setCodigos(c.codigos || [])
    } catch {
      toast.error("No se pudo cargar la administración.")
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    if (user?.esAdmin) cargar()
  }, [user?.esAdmin, cargar])

  // Solo el admin de la clínica activa. (El backend además lo exige en cada endpoint.)
  if (!loading && user && !user.esAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  async function cambiar(m: Miembro, patch: { activo?: boolean; rol?: Rol }) {
    setAccion(m.id)
    try {
      await api.patch(`/admin/miembros/${m.id}`, patch)
      toast.success("Miembro actualizado.")
      await cargar()
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "No se pudo actualizar el miembro."
      toast.error(msg)
    } finally {
      setAccion(null)
    }
  }

  async function generarCodigo(rol: "profesional" | "recepcion") {
    setGenerating(true)
    try {
      const d = await api.post<{ codigo?: string }>("/clinica/generar-codigo", {
        rol,
      })
      toast.success(`Código generado: ${d.codigo}`)
      await cargar()
    } catch {
      toast.error("No se pudo generar el código.")
    } finally {
      setGenerating(false)
    }
  }

  async function eliminarCodigo(c: Codigo) {
    setBorrando(c.id)
    try {
      await api.del(`/clinica/codigos/${c.id}`)
      toast.success("Código eliminado.")
      await cargar()
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "No se pudo eliminar el código."
      toast.error(msg)
    } finally {
      setBorrando(null)
    }
  }

  async function copiar(codigo: string) {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado(codigo)
      setTimeout(() => setCopiado(null), 1500)
    } catch {
      toast.error("No se pudo copiar.")
    }
  }

  if (loading || cargando) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <Container className="py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold sm:text-3xl">Administración</h1>
        <p className="mt-1 text-muted-foreground">
          Gestioná los profesionales de tu clínica y los códigos de activación.
        </p>
      </div>

      {/* Profesionales / miembros */}
      <Card>
        <CardContent className="p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Users className="size-5 text-primary" /> Profesionales
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Dá de alta o de baja a los miembros y cambiá su rol en la clínica.
          </p>

          <ul className="mt-5 divide-y divide-border rounded-lg border border-border">
            {miembros.map((m) => {
              const meta = ROL_META[m.rol] ?? ROL_META.profesional
              const Icon = meta.icon
              const enCurso = accion === m.id
              const nombre =
                [m.nombre, m.apellido].filter(Boolean).join(" ") ||
                m.email ||
                "Sin nombre"
              return (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-medium">
                      <span className="truncate">{nombre}</span>
                      {m.esYo && (
                        <Badge variant="outline" className="font-normal">
                          Vos
                        </Badge>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {meta.label}
                      {m.matricula ? ` · Mat. ${m.matricula}` : ""}
                      {m.email ? ` · ${m.email}` : ""}
                    </p>
                  </div>

                  <Badge variant={m.activo ? "default" : "secondary"}>
                    {m.activo ? "Activo" : "De baja"}
                  </Badge>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={enCurso}
                        aria-label="Acciones"
                      >
                        {enCurso ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <MoreVertical />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Estado</DropdownMenuLabel>
                      {m.activo ? (
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => cambiar(m, { activo: false })}
                        >
                          Dar de baja
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onSelect={() => cambiar(m, { activo: true })}
                        >
                          Activar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Rol</DropdownMenuLabel>
                      {(Object.keys(ROL_META) as Rol[]).map((r) => (
                        <DropdownMenuItem
                          key={r}
                          disabled={r === m.rol}
                          onSelect={() => cambiar(m, { rol: r })}
                        >
                          {ROL_META[r].label}
                          {r === m.rol ? " ·" : ""}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              )
            })}
            {miembros.length === 0 && (
              <li className="px-4 py-3 text-sm text-muted-foreground">
                No hay miembros en la clínica.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>

      {/* Códigos de activación */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <KeyRound className="size-5 text-primary" /> Códigos de activación
            </h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" disabled={generating}>
                  {generating ? <Loader2 className="animate-spin" /> : <Plus />}
                  Generar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Tipo de código</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => generarCodigo("profesional")}>
                  <Stethoscope /> Profesional
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => generarCodigo("recepcion")}>
                  <ClipboardList /> Recepción
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Compartí un código disponible para que alguien se una a tu clínica al
            registrarse: como profesional o en recepción. Solo se pueden eliminar
            los que no se usaron.
          </p>

          <ul className="mt-5 divide-y divide-border rounded-lg border border-border">
            {codigos.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 px-4 py-2.5 text-sm"
              >
                <code className="font-mono">{c.codigo}</code>
                <Badge variant="outline" className="font-normal">
                  {c.rol === "recepcion" ? "Recepción" : "Profesional"}
                </Badge>
                <Badge
                  variant={c.usado ? "secondary" : "default"}
                  className="ml-1"
                >
                  {c.usado ? "Usado" : "Disponible"}
                </Badge>
                <div className="ml-auto flex items-center gap-1">
                  {!c.usado && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copiar(c.codigo)}
                      aria-label="Copiar código"
                    >
                      {copiado === c.codigo ? <Check /> : <Copy />}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={c.usado || borrando === c.id}
                    onClick={() => eliminarCodigo(c)}
                    aria-label="Eliminar código"
                    title={
                      c.usado
                        ? "No se puede eliminar: ya fue usado"
                        : "Eliminar código"
                    }
                  >
                    {borrando === c.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Trash2 className={c.usado ? "" : "text-destructive"} />
                    )}
                  </Button>
                </div>
              </li>
            ))}
            {codigos.length === 0 && (
              <li className="px-4 py-3 text-sm text-muted-foreground">
                Todavía no generaste códigos.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </Container>
  )
}
