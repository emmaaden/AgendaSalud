/**
 * Catálogos (Fase K): obras sociales, CIE-10 y prácticas de la clínica, y la
 * codificación de los registros clínicos.
 *
 * Los catálogos cambian poco: se cachean en memoria por sesión de página (una sola
 * petición aunque varios formularios los usen). `invalidarCatalogo` fuerza recargar
 * después de editarlos en Administración.
 */
import { useEffect, useState } from "react"
import { api } from "@/lib/api"

export type ObraSocial = {
  id: number
  nombre: string
  sigla: string | null
  propia: boolean
  activo: boolean
}

export type Cie10 = { codigo: string; descripcion: string; categoria: boolean }

export type Practica = {
  id: number
  codigo: string
  descripcion: string
  requiereAutorizacion: boolean
  activo: boolean
}

/** Cobertura del paciente tal como la edita un formulario. */
export type Cobertura = { idObraSocial: string; nroAfiliado: string; plan: string }
export const COBERTURA_VACIA: Cobertura = { idObraSocial: "", nroAfiliado: "", plan: "" }

/** Payload de cobertura para la API (sin obra social elegida no se envía el id). */
export function coberturaPayload(c: Cobertura) {
  return {
    ...(c.idObraSocial ? { idObraSocial: Number(c.idObraSocial) } : {}),
    nroAfiliado: c.nroAfiliado.trim(),
    plan: c.plan.trim(),
  }
}

/** Selección de codificación en el formulario de una consulta. */
export type DiagnosticoSel = { codigo: string; principal: boolean }
export type PracticaSel = {
  key: string
  idPractica: number
  pieza: string
  cantidad: number
  idAutorizacion: number | null
}
export type Codificacion = { diagnosticos: DiagnosticoSel[]; practicas: PracticaSel[] }
export const CODIFICACION_VACIA: Codificacion = { diagnosticos: [], practicas: [] }

export function codificacionPayload(c: Codificacion) {
  return {
    diagnosticos: c.diagnosticos.map(({ codigo, principal }) => ({ codigo, principal })),
    practicas: c.practicas.map(({ idPractica, pieza, cantidad, idAutorizacion }) => ({
      idPractica,
      pieza: pieza.trim(),
      cantidad,
      idAutorizacion,
    })),
  }
}

/** Codificación de un registro ya guardado (como la devuelve la API). */
export type CodificacionRegistro = {
  diagnosticos?: { codigo: string; descripcion: string; principal: boolean }[]
  practicas?: {
    codigo: string
    descripcion: string
    pieza: string | null
    cantidad: number
    autorizacion: string | null
    requiereAutorizacion: boolean
  }[]
}

export type AutorizacionVigente = {
  id: number
  numero: string | null
  idPractica: number | null
  practica: string
  pieza: string
  venceEn: string | null
}

/* ----------------------------- caché + hooks ----------------------------- */

const cache = new Map<string, Promise<unknown>>()

function cargar<T>(clave: string, url: string, campo: string): Promise<T[]> {
  if (!cache.has(clave)) {
    const p = api
      .get<Record<string, T[]>>(url)
      .then((d) => d[campo] || [])
      .catch((err) => {
        cache.delete(clave) // reintentar la próxima vez
        throw err
      })
    cache.set(clave, p)
  }
  return cache.get(clave) as Promise<T[]>
}

export function invalidarCatalogo(...claves: string[]) {
  for (const k of claves) cache.delete(k)
}

function useCatalogo<T>(clave: string, url: string, campo: string, activo = true) {
  const [datos, setDatos] = useState<T[]>([])
  const [cargando, setCargando] = useState(activo)
  useEffect(() => {
    if (!activo) return
    let vivo = true
    cargar<T>(clave, url, campo)
      .then((d) => vivo && setDatos(d))
      .catch(() => {})
      .finally(() => vivo && setCargando(false))
    return () => {
      vivo = false
    }
  }, [clave, url, campo, activo])
  return { datos, cargando }
}

/** Obras sociales: `publico` = solo el catálogo global (registro sin sesión). */
export function useObrasSociales(publico = false) {
  return useCatalogo<ObraSocial>(
    publico ? "os-publicas" : "os",
    publico ? "/catalogos/obras-sociales/publicas" : "/catalogos/obras-sociales",
    "obrasSociales"
  )
}

export function useCie10(activo = true) {
  return useCatalogo<Cie10>("cie10", "/catalogos/cie10", "cie10", activo)
}

export function usePracticas(activo = true) {
  return useCatalogo<Practica>("practicas", "/catalogos/practicas", "practicas", activo)
}
