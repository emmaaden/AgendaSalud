import { useEffect, useState } from "react"
import { api } from "@/lib/api"

export type ClinicaMembresia = {
  clinicaId: string
  nombre: string | null
  rol: "admin" | "profesional" | "recepcion"
}

export type CurrentUser = {
  user: string
  email: string
  fullName: string | null
  idRole: number
  id: string
  role: string
  // Fase A (multi-clínica): clínica activa, rol en ella y todas las membresías.
  clinicaId: string | null
  rol: "admin" | "profesional" | "recepcion" | null
  esAdmin: boolean
  clinicas: ClinicaMembresia[]
  needsClinicSelection: boolean
}

/**
 * Estado de sesión ligero para la UI pública (p. ej. el navbar).
 * Llama a GET /api/user; si no hay sesión (401) devuelve `user: null`.
 */
export function useUser() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api
      .get<CurrentUser>("/api/user")
      .then((d) => active && setUser(d))
      .catch(() => active && setUser(null))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  return { user, loading }
}
