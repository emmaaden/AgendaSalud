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

const LINKS = [
  { to: "/dashboard", label: "Inicio", icon: LayoutDashboard, end: true },
  { to: "/dashboard/config", label: "Configuración", icon: Settings, end: false },
  {
    to: "/dashboard/registro-clinico",
    label: "Registro clínico",
    icon: ClipboardList,
    end: false,
  },
]

export function DashboardNavbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Logo to="/dashboard" />
          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
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
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">
                {user?.email}
              </DropdownMenuLabel>
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
              {LINKS.map((l) => (
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
    </header>
  )
}
