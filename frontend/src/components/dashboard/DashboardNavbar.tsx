import { useState } from "react"
import { Link, NavLink, useNavigate } from "react-router-dom"
import {
  Menu,
  LayoutDashboard,
  Settings,
  ClipboardList,
  LifeBuoy,
  LogOut,
  User,
  Building2,
  ArrowLeftRight,
  ShieldCheck,
  FileCheck2,
  FolderDown,
  FolderHeart,
  CalendarClock,
} from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet"
import { Logo } from "@/components/site/Logo"
import { HELP_URL } from "@/lib/site"
import { useAuth } from "@/contexts/AuthContext"
import { ThemeToggle } from "@/components/site/ThemeToggle"

// Enlace de gestión de turnos (Fase E): lo ve todo el staff.
const TURNOS_LINK = {
  to: "/dashboard/turnos",
  label: "Turnos",
  icon: CalendarClock,
  end: false,
}

const LINKS = [
  { to: "/dashboard", label: "Inicio", icon: LayoutDashboard, end: true },
  TURNOS_LINK,
  { to: "/dashboard/config", label: "Configuración", icon: Settings, end: false },
  {
    to: "/dashboard/registro-clinico",
    label: "Registro clínico",
    icon: ClipboardList,
    end: false,
  },
  {
    to: "/dashboard/certificados",
    label: "Certificados",
    icon: FileCheck2,
    end: false,
  },
  {
    to: "/dashboard/historias",
    label: "Historias",
    icon: FolderDown,
    end: false,
  },
  {
    to: "/dashboard/estudios",
    label: "Compartidos",
    icon: FolderHeart,
    end: false,
  },
]

// Enlace solo para el admin de la clínica activa (Fase B).
const ADMIN_LINK = {
  to: "/dashboard/admin",
  label: "Administración",
  icon: ShieldCheck,
  end: false,
}

export function DashboardNavbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  // Fase E: la recepción SOLO ve el panel de turnos.
  const links =
    user?.rol === "recepcion"
      ? [TURNOS_LINK]
      : user?.esAdmin
        ? [...LINKS, ADMIN_LINK]
        : LINKS

  async function handleLogout() {
    await logout()
    navigate("/login")
  }

  const initials =
    (user?.fullName || user?.email || "?")
      .split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"

  // Fase A: clínica activa y posibilidad de cambiar (si pertenece a varias).
  const clinicaActiva = user?.clinicas?.find(
    (c) => c.clinicaId === user?.clinicaId
  )
  const puedeCambiarClinica = (user?.clinicas?.length ?? 0) > 1
  const ROL_LABEL: Record<string, string> = {
    admin: "Administrador/a",
    profesional: "Profesional",
    recepcion: "Recepción",
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Logo to="/dashboard" />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                    isActive && "bg-accent text-accent-foreground"
                  )
                }
              >
                <l.icon className="size-4" />
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden items-center gap-2 md:flex">
            <Button asChild variant="ghost" size="sm">
              <a href={HELP_URL} target="_blank" rel="noreferrer">
                <LifeBuoy /> Ayuda
              </a>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <span className="grid size-6 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {initials}
                  </span>
                  <span className="max-w-[12ch] truncate">
                    {user?.fullName || user?.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="truncate">
                  {user?.email}
                </DropdownMenuLabel>
                {clinicaActiva && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5">
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        <Building2 className="size-3.5 text-muted-foreground" />
                        <span className="truncate">{clinicaActiva.nombre}</span>
                      </p>
                      <p className="mt-0.5 pl-5 text-xs text-muted-foreground">
                        {ROL_LABEL[clinicaActiva.rol] ?? clinicaActiva.rol}
                      </p>
                    </div>
                    {puedeCambiarClinica && (
                      <DropdownMenuItem asChild>
                        <Link to="/seleccionar-clinica?cambiar=1">
                          <ArrowLeftRight /> Cambiar de clínica
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/config">
                    <User /> Mi perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleLogout} variant="destructive">
                  <LogOut /> Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Móvil */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="outline" size="icon" aria-label="Abrir menú">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle asChild>
                  <Logo to="/dashboard" />
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {links.map((l) => (
                  <SheetClose asChild key={l.to}>
                    <NavLink
                      to={l.to}
                      end={l.end}
                      className={({ isActive }) =>
                        cn(
                          "inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                          isActive && "bg-accent text-accent-foreground"
                        )
                      }
                    >
                      <l.icon className="size-4" />
                      {l.label}
                    </NavLink>
                  </SheetClose>
                ))}
                <a
                  href={HELP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <LifeBuoy className="size-4" /> Ayuda
                </a>
              </nav>
              <div className="mt-auto border-t border-border p-4">
                <p className="mb-2 truncate px-1 text-xs text-muted-foreground">
                  {user?.email}
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleLogout}
                >
                  <LogOut /> Cerrar sesión
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
