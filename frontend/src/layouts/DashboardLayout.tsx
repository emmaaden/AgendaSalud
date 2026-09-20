import { useEffect } from "react"
import { Outlet, useLocation, Navigate } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { DashboardNavbar } from "@/components/dashboard/DashboardNavbar"

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
  }, [pathname])
  return null
}

function Guarded() {
  const { user, loading } = useAuth()
  const { pathname } = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    )
  }

  // Sin sesión → login.
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // El panel es del staff (profesional/admin y recepción). Un paciente va a su área.
  // (El backend además exige el rol correspondiente en cada endpoint.)
  if (user.role !== "profesional" && user.role !== "recepcion") {
    return <Navigate to="/mis-turnos" replace />
  }

  // Fase A: con varias clínicas y ninguna activa todavía → elegir primero.
  if (user.needsClinicSelection) {
    return <Navigate to="/seleccionar-clinica" replace />
  }

  // Fase E: la recepción SOLO gestiona turnos. Cualquier otra ruta del dashboard
  // la mandamos a su panel (además el backend bloquea los endpoints de profesional).
  if (user.rol === "recepcion" && !pathname.startsWith("/dashboard/turnos")) {
    return <Navigate to="/dashboard/turnos" replace />
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <ScrollToTop />
      <DashboardNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}

export function DashboardLayout() {
  return (
    <AuthProvider>
      <Guarded />
    </AuthProvider>
  )
}
