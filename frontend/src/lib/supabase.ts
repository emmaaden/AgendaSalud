import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Cliente Supabase para el navegador — SOLO se usa en el flujo de reset de
 * contraseña, que habla con Supabase Auth directamente (PKCE / implícito).
 * La URL y la anon key (segura de exponer) se obtienen de /api/public-config.
 */
let clientPromise: Promise<SupabaseClient> | null = null

export function getSupabase(): Promise<SupabaseClient> {
  if (!clientPromise) {
    clientPromise = fetch("/api/public-config")
      .then((r) => r.json())
      .then((cfg: { supabaseUrl?: string; supabaseAnonKey?: string }) => {
        if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
          throw new Error("Configuración de Supabase no disponible")
        }
        return createClient(cfg.supabaseUrl, cfg.supabaseAnonKey)
      })
  }
  return clientPromise
}
