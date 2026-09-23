/**
 * Cálculo de la grilla de la agenda: qué hay en cada celda de media hora.
 *
 * Espeja a `backend/utils/disponibilidad.js` pero solo para PINTAR. La verdad sigue
 * siendo del servidor: al crear o reprogramar, `estaLibre` responde 409 si el horario
 * se ocupó mientras tanto.
 */
import type { Bloqueo, Turno } from "@/components/dashboard/turnos-dialogs"
import {
  SLOT_MIN,
  horaAR,
  instanteAR,
  minutosAR,
  nombreDia,
  ymdAR,
} from "@/lib/fecha"

export type Horario = {
  id: number
  dia: string
  /** "HH:MM:SS" como lo devuelve Postgres. */
  horario_inicio: string
  horario_fin: string
}

export type Celda =
  | { tipo: "fuera" }
  | { tipo: "libre"; iso: string; pasado: boolean }
  | { tipo: "turno"; turno: Turno; filas: number }
  | { tipo: "bloqueo"; bloqueo: Bloqueo; filas: number }
  /** Continuación de un turno o bloqueo que empezó más arriba. */
  | { tipo: "sigue"; de: "turno" | "bloqueo" }

/** "09:00:00" → minutos desde medianoche. */
function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":")
  return Number(h) * 60 + Number(m || 0)
}

function aHora(minutos: number): string {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/** Franjas de atención de ese día, en minutos desde medianoche. */
export function franjasDelDia(horarios: Horario[], ymd: string) {
  const dia = nombreDia(ymd)
  const normalizar = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  return horarios
    .filter((h) => normalizar(h.dia) === normalizar(dia))
    .map((h) => ({
      desde: aMinutos(h.horario_inicio),
      hasta: aMinutos(h.horario_fin),
    }))
    .sort((a, b) => a.desde - b.desde)
}

function duracionFilas(inicio: string, fin: string | null) {
  const ini = new Date(inicio).getTime()
  const f = fin ? new Date(fin).getTime() : ini + SLOT_MIN * 60000
  return Math.max(1, Math.round((f - ini) / (SLOT_MIN * 60000)))
}

/**
 * Horas (filas) que muestra la grilla: de la primera a la última que se necesita
 * mostrar en los días visibles, contemplando turnos fuera del horario habitual.
 */
export function filasHorarias(
  dias: string[],
  horarios: Horario[],
  turnos: Turno[]
): string[] {
  let desde = Infinity
  let hasta = -Infinity

  for (const ymd of dias) {
    for (const f of franjasDelDia(horarios, ymd)) {
      desde = Math.min(desde, f.desde)
      hasta = Math.max(hasta, f.hasta)
    }
  }
  for (const t of turnos) {
    const ini = minutosAR(t.inicio)
    desde = Math.min(desde, ini)
    hasta = Math.max(hasta, ini + duracionFilas(t.inicio, t.fin) * SLOT_MIN)
  }

  // Sin horarios cargados ni turnos: jornada por defecto.
  if (!Number.isFinite(desde) || !Number.isFinite(hasta)) {
    desde = 8 * 60
    hasta = 20 * 60
  }

  desde = Math.floor(desde / SLOT_MIN) * SLOT_MIN
  hasta = Math.min(24 * 60, Math.ceil(hasta / SLOT_MIN) * SLOT_MIN)

  const filas: string[] = []
  for (let m = desde; m < hasta; m += SLOT_MIN) filas.push(aHora(m))
  return filas
}

/** Mapa `${ymd} ${HH:MM}` → qué mostrar en esa celda. */
export function construirCeldas(
  dias: string[],
  horas: string[],
  horarios: Horario[],
  turnos: Turno[],
  bloqueos: Bloqueo[]
): Map<string, Celda> {
  const celdas = new Map<string, Celda>()
  const ahora = Date.now()
  const clave = (ymd: string, hora: string) => `${ymd} ${hora}`

  // 1. Base: dentro o fuera del horario de atención.
  for (const ymd of dias) {
    const franjas = franjasDelDia(horarios, ymd)
    for (const hora of horas) {
      const m = aMinutos(hora)
      const dentro = franjas.some((f) => m >= f.desde && m < f.hasta)
      const iso = instanteAR(ymd, hora).toISOString()
      celdas.set(
        clave(ymd, hora),
        dentro
          ? { tipo: "libre", iso, pasado: new Date(iso).getTime() < ahora }
          : { tipo: "fuera" }
      )
    }
  }

  const ocupar = (
    ymd: string,
    desdeMin: number,
    filas: number,
    celda: Celda & { tipo: "turno" | "bloqueo" }
  ) => {
    for (let i = 0; i < filas; i++) {
      const hora = aHora(desdeMin + i * SLOT_MIN)
      if (!horas.includes(hora)) continue
      celdas.set(
        clave(ymd, hora),
        i === 0 ? celda : { tipo: "sigue", de: celda.tipo }
      )
    }
  }

  // 2. Bloqueos (pueden abarcar varias horas o días).
  for (const b of bloqueos) {
    for (const ymd of dias) {
      const inicioDia = instanteAR(ymd, "00:00").getTime()
      const finDia = inicioDia + 24 * 60 * 60000
      const bIni = new Date(b.inicio).getTime()
      const bFin = new Date(b.fin).getTime()
      if (bFin <= inicioDia || bIni >= finDia) continue

      const desdeMin =
        bIni <= inicioDia ? 0 : Math.floor(minutosAR(b.inicio) / SLOT_MIN) * SLOT_MIN
      const hastaMin =
        bFin >= finDia ? 24 * 60 : Math.ceil(minutosAR(b.fin) / SLOT_MIN) * SLOT_MIN
      const filas = Math.max(1, (hastaMin - desdeMin) / SLOT_MIN)
      ocupar(ymd, desdeMin, filas, { tipo: "bloqueo", bloqueo: b, filas })
    }
  }

  // 3. Turnos (mandan sobre el bloqueo: si existe, hay que verlo).
  for (const t of turnos) {
    const ymd = ymdAR(t.inicio)
    if (!dias.includes(ymd)) continue
    const desdeMin = Math.floor(minutosAR(t.inicio) / SLOT_MIN) * SLOT_MIN
    const filas = duracionFilas(t.inicio, t.fin)
    ocupar(ymd, desdeMin, filas, { tipo: "turno", turno: t, filas })
  }

  return celdas
}

/** Turnos de un día, ordenados por hora. */
export function turnosDelDia(turnos: Turno[], ymd: string): Turno[] {
  return turnos
    .filter((t) => ymdAR(t.inicio) === ymd)
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
}

export function bloqueosDelDia(bloqueos: Bloqueo[], ymd: string): Bloqueo[] {
  const inicioDia = instanteAR(ymd, "00:00").getTime()
  const finDia = inicioDia + 24 * 60 * 60000
  return bloqueos.filter(
    (b) =>
      new Date(b.fin).getTime() > inicioDia &&
      new Date(b.inicio).getTime() < finDia
  )
}

export { horaAR }
