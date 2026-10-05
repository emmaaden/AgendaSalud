/**
 * Autorizaciones previas de prácticas (Fase K): tipos y etiquetas compartidas entre
 * la página del profesional (/dashboard/autorizaciones) y la bandeja del auditor.
 */
import type { Diente } from "@/lib/odontograma"

export type EstadoAutorizacion = "pendiente" | "aprobada" | "rechazada" | "cancelada"

export const ESTADO_AUTORIZACION: Record<
  EstadoAutorizacion,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pendiente: { label: "Pendiente", variant: "outline" },
  aprobada: { label: "Aprobada", variant: "default" },
  rechazada: { label: "Rechazada", variant: "destructive" },
  cancelada: { label: "Cancelada", variant: "secondary" },
}

export type Autorizacion = {
  id: number
  estado: EstadoAutorizacion
  vencida: boolean
  numero: string | null
  creadoEn: string
  resueltaEn: string | null
  venceEn: string | null
  paciente: { id: number; nombre: string; dni: string; obraSocial: string; nroAfiliado: string }
  profesional: string
  practica: { id: number | null; codigo: string; descripcion: string; pieza: string; cantidad: number }
  diagnostico: { codigo: string; descripcion: string } | null
  motivo: string
  auditor: string
  adjuntos: { id: number; nombre: string; mime: string; size: number | null }[]
  // Solo en el detalle:
  fundamento?: string
  odontograma?: Diente[]
}

export type ListaAutorizaciones = {
  autorizaciones: Autorizacion[]
  total: number
  page: number
  pageSize: number
}

/** Tamaño legible de un archivo. */
export function tamanioLegible(bytes: number | null) {
  if (!bytes) return ""
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
