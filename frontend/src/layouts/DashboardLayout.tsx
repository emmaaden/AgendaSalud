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

  // El panel es exclusivo de profesionales. Un paciente logueado va a su área.
  // (El backend además exige rol profesional en cada endpoint del dashboard.)
  if (user.role !== "profesional") {
    return <Navigate to="/mis-turnos" replace />
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
