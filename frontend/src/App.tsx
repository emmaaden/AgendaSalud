import { Suspense, lazy } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { PublicLayout } from "@/layouts/PublicLayout"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { Toaster } from "@/components/ui/sonner"

import Home from "@/pages/Home"
import Planes from "@/pages/Planes"
import Login from "@/pages/Login"
import RegisterRole from "@/pages/RegisterRole"
import RegisterPaciente from "@/pages/RegisterPaciente"
import RegisterProfesional from "@/pages/RegisterProfesional"
import ForgotPassword from "@/pages/ForgotPassword"
import Terminos from "@/pages/Terminos"
import Privacidad from "@/pages/Privacidad"
import NotFound from "@/pages/NotFound"

// Páginas con dependencias pesadas (jsPDF / Supabase) → carga diferida.
const Turnos = lazy(() => import("@/pages/Turnos"))
const MisTurnos = lazy(() => import("@/pages/MisTurnos"))
const GestionarTurno = lazy(() => import("@/pages/GestionarTurno"))
const MiHistoria = lazy(() => import("@/pages/MiHistoria"))
const MiPerfil = lazy(() => import("@/pages/MiPerfil"))
const ValorOrtodoncia = lazy(() => import("@/pages/ValorOrtodoncia"))
const ResetPassword = lazy(() => import("@/pages/ResetPassword"))
const SeleccionarClinica = lazy(() => import("@/pages/SeleccionarClinica"))

// Dashboard (área privada)
const DashboardHome = lazy(() => import("@/pages/dashboard/Home"))
const DashboardConfig = lazy(() => import("@/pages/dashboard/Config"))
const DashboardRegistroClinico = lazy(
  () => import("@/pages/dashboard/RegistroClinico")
)
const DashboardAdministracion = lazy(
  () => import("@/pages/dashboard/Administracion")
)

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="size-6 animate-spin text-primary" />
    </div>
  )
}

function App() {
  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
        {/* Dashboard (privado, protegido en el cliente) */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardHome />} />
          <Route path="/dashboard/config" element={<DashboardConfig />} />
          <Route
            path="/dashboard/registro-clinico"
            element={<DashboardRegistroClinico />}
          />
          <Route path="/dashboard/admin" element={<DashboardAdministracion />} />
        </Route>

        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/turnos" element={<Turnos />} />
          <Route path="/mis-turnos" element={<MisTurnos />} />
          <Route path="/mi-perfil" element={<MiPerfil />} />
          <Route path="/mi-historia" element={<MiHistoria />} />
          <Route path="/gestionar-turno" element={<GestionarTurno />} />
          <Route path="/planes" element={<Planes />} />
          {/* Compatibilidad: la vieja historia clínica pública por DNI se retiró. */}
          <Route
            path="/historia-clinica"
            element={<Navigate to="/mi-historia" replace />}
          />
          <Route path="/valor-ortodoncia" element={<ValorOrtodoncia />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegisterRole />} />
          <Route path="/register/paciente" element={<RegisterPaciente />} />
          <Route path="/register/profesional" element={<RegisterProfesional />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/terminos" element={<Terminos />} />
          <Route path="/privacidad" element={<Privacidad />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Selección de clínica: post-login, flujo aislado (sin navbar público) */}
        <Route path="/seleccionar-clinica" element={<SeleccionarClinica />} />

        {/* reset-password: sin navbar/footer (flujo aislado tras el email) */}
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* Compatibilidad con enlaces legacy .html */}
        <Route path="/reset-password.html" element={<Navigate to="/reset-password" replace />} />
        <Route path="/login.html" element={<Navigate to="/login" replace />} />
        <Route path="/index.html" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Toaster position="top-center" richColors />
    </>
  )
}

export default App
