import { useState } from "react"
import { Link, NavLink } from "react-router-dom"
import { Menu, LifeBuoy, LayoutDashboard } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet"
import { Logo } from "./Logo"
import { NAV_LINKS, HELP_URL } from "@/lib/site"
import { useUser } from "@/hooks/useUser"

function DesktopLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn(
          "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
          isActive && "text-foreground"
        )
      }
    >
      {label}
    </NavLink>
  )
}

export function Navbar() {
  const [open, setOpen] = useState(false)
  const { user } = useUser()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <DesktopLink key={l.to} {...l} />
          ))}
          <a
            href={HELP_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Ayuda
          </a>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <Button asChild size="lg">
              <a href="/dashboard">
                <LayoutDashboard />
                Ir al panel
              </a>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="lg">
                <Link to="/login">Iniciar sesión</Link>
              </Button>
              <Button asChild size="lg">
                <Link to="/register">Crear cuenta</Link>
              </Button>
            </>
          )}
        </div>

        {/* Menú móvil */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="outline" size="icon" aria-label="Abrir menú">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle asChild>
                <Logo />
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4">
              {NAV_LINKS.map((l) => (
                <SheetClose asChild key={l.to}>
                  <NavLink
                    to={l.to}
                    end={l.to === "/"}
                    className={({ isActive }) =>
                      cn(
                        "rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        isActive && "bg-accent text-accent-foreground"
                      )
                    }
                  >
                    {l.label}
                  </NavLink>
                </SheetClose>
              ))}
              <a
                href={HELP_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <LifeBuoy className="size-4" /> Ayuda
              </a>
            </nav>
            <div className="mt-auto flex flex-col gap-2 border-t border-border p-4">
              {user ? (
                <Button asChild size="lg" className="w-full">
                  <a href="/dashboard">Ir al panel</a>
                </Button>
              ) : (
                <>
                  <SheetClose asChild>
                    <Button asChild variant="outline" size="lg" className="w-full">
                      <Link to="/login">Iniciar sesión</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button asChild size="lg" className="w-full">
                      <Link to="/register">Crear cuenta</Link>
                    </Button>
                  </SheetClose>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
