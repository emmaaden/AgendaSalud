import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Plus, CalendarOff, GripVertical } from "lucide-react"
import { cn } from "cn"
import type { Bloqueo, Turno } from "@/components/dashboard/turnos-dialogs"
import { horaAR, hoyAR, numeroDia, DIAS, diaSemana } from "@/lib/fecha"
import {
  construirCeldas,
  filasHorarias,
  type Celda as CeldaAgenda,
  type Horario,
} from "./agenda"

/** Píxeles que hay que mover con el mouse antes de considerar que es un arrastre. */
const UMBRAL_PX = 6
/** Con el dedo se exige mantener apretado, para no romper el scroll de la grilla. */
const ESPERA_TOUCH_MS = 400

type Arrastre = { turno: Turno; activo: boolean }
type Destino = { ymd: string; hora: string; iso: string }

/**
 * Grilla de media hora: una columna por día. La usan la vista Semana (varios días)
 * y la vista Día (uno solo). Los turnos se pueden arrastrar a un hueco libre.
 */
export function GrillaHoraria({
  dias,
  horarios,
  turnos,
  bloqueos,
  onSlotLibre,
  onTurno,
  onBloqueo,
  onMover,
}: {
  dias: string[]
  horarios: Horario[]
  turnos: Turno[]
  bloqueos: Bloqueo[]
  onSlotLibre: (iso: string) => void
  onTurno: (t: Turno) => void
  onBloqueo: (b: Bloqueo) => void
  /** Soltó un turno sobre un hueco libre: pide confirmación y reprograma. */
  onMover: (turno: Turno, iso: string) => void
}) {
  const horas = useMemo(
    () => filasHorarias(dias, horarios, turnos),
    [dias, horarios, turnos]
  )
  const celdas = useMemo(
    () => construirCeldas(dias, horas, horarios, turnos, bloqueos),
    [dias, horas, horarios, turnos, bloqueos]
  )
  const hoy = hoyAR()

  const [arrastre, setArrastre] = useState<Arrastre | null>(null)
  const [destino, setDestino] = useState<Destino | null>(null)
  const origenRef = useRef<{ x: number; y: number } | null>(null)
  const esperaRef = useRef<number | null>(null)
  // El estado del arrastre vive en refs: los handlers del documento tienen que ver
  // el valor actual sin esperar al próximo render.
  const arrastreRef = useRef<Arrastre | null>(null)
  // Para que el click que sigue al arrastre no abra el detalle del turno.
  const arrastroRef = useRef(false)
  const autoScrollRef = useRef(0)

  const limpiar = useCallback(() => {
    if (esperaRef.current) window.clearTimeout(esperaRef.current)
    esperaRef.current = null
    origenRef.current = null
    arrastreRef.current = null
    autoScrollRef.current = 0
    setArrastre(null)
    setDestino(null)
  }, [])

  const activar = useCallback(() => {
    if (!arrastreRef.current || arrastreRef.current.activo) return
    arrastreRef.current = { ...arrastreRef.current, activo: true }
    arrastroRef.current = true
    setArrastre(arrastreRef.current)
  }, [])

  function tomarTurno(e: React.PointerEvent, turno: Turno) {
    if (e.pointerType === "mouse" && e.button !== 0) return
    origenRef.current = { x: e.clientX, y: e.clientY }
    arrastreRef.current = { turno, activo: false }
    setArrastre(arrastreRef.current)
    if (e.pointerType === "touch") {
      esperaRef.current = window.setTimeout(activar, ESPERA_TOUCH_MS)
    }
  }

  useEffect(() => {
    if (!arrastre) return

    function celdaDebajo(x: number, y: number): Destino | null {
      const el = document
        .elementFromPoint(x, y)
        ?.closest<HTMLElement>("[data-ymd][data-hora]")
      if (!el) return null
      const ymd = el.dataset.ymd!
      const hora = el.dataset.hora!
      const celda = celdas.get(`${ymd} ${hora}`)
      if (!celda || celda.tipo !== "libre" || celda.pasado) return null
      return { ymd, hora, iso: celda.iso }
    }

    function alMover(e: PointerEvent) {
      const origen = origenRef.current
      const actual = arrastreRef.current
      if (!origen || !actual) return

      if (!actual.activo) {
        // Con el dedo manda la espera; si se mueve antes, es scroll.
        if (e.pointerType === "touch") {
          limpiar()
          return
        }
        const dist = Math.hypot(e.clientX - origen.x, e.clientY - origen.y)
        if (dist < UMBRAL_PX) return
        activar()
      }

      if (e.cancelable) e.preventDefault()

      // Cerca del borde la página acompaña, para poder soltar en un horario que
      // quedaba fuera de la pantalla.
      const margen = 72
      autoScrollRef.current =
        e.clientY < margen
          ? -14
          : e.clientY > window.innerHeight - margen
            ? 14
            : 0

      setDestino(celdaDebajo(e.clientX, e.clientY))
    }

    function alSoltar(e: PointerEvent) {
      const actual = arrastreRef.current
      const sobre = actual?.activo ? celdaDebajo(e.clientX, e.clientY) : null
      const turno = actual?.turno
      limpiar()
      if (turno && sobre && sobre.iso !== turno.inicio) onMover(turno, sobre.iso)
      // El click llega justo después; se ignora una sola vez.
      window.setTimeout(() => {
        arrastroRef.current = false
      }, 0)
    }

    document.addEventListener("pointermove", alMover, { passive: false })
    document.addEventListener("pointerup", alSoltar)
    document.addEventListener("pointercancel", limpiar)
    return () => {
      document.removeEventListener("pointermove", alMover)
      document.removeEventListener("pointerup", alSoltar)
      document.removeEventListener("pointercancel", limpiar)
    }
  }, [arrastre, celdas, limpiar, activar, onMover])

  const arrastrando = !!arrastre?.activo

  useEffect(() => {
    if (!arrastrando) return
    const id = window.setInterval(() => {
      if (autoScrollRef.current) window.scrollBy(0, autoScrollRef.current)
    }, 16)
    return () => window.clearInterval(id)
  }, [arrastrando])

  return (
    <div className={cn("overflow-x-auto", arrastrando && "touch-none")}>
      <div
        className={cn("grid min-w-max", arrastrando && "select-none")}
        style={{
          gridTemplateColumns: `4rem repeat(${dias.length}, minmax(8.5rem, 1fr))`,
        }}
      >
        {/* Encabezado */}
        <div className="sticky left-0 z-10 border-b border-border bg-card" />
        {dias.map((ymd) => (
          <div
            key={ymd}
            className={cn(
              "border-b border-l border-border px-2 py-2 text-center",
              ymd === hoy && "bg-primary/5"
            )}
          >
            <p className="text-xs text-muted-foreground">
              {DIAS[diaSemana(ymd)].slice(0, 3)}
            </p>
            <p
              className={cn(
                "text-sm font-semibold",
                ymd === hoy && "text-primary"
              )}
            >
              {numeroDia(ymd)}
            </p>
          </div>
        ))}

        {/* Filas de media hora */}
        {horas.map((hora) => (
          <Fila
            key={hora}
            hora={hora}
            dias={dias}
            hoy={hoy}
            celdas={celdas}
            destino={destino}
            arrastre={arrastre}
            arrastroRef={arrastroRef}
            onSlotLibre={onSlotLibre}
            onTurno={onTurno}
            onBloqueo={onBloqueo}
            onTomarTurno={tomarTurno}
          />
        ))}
      </div>
    </div>
  )
}

function Fila({
  hora,
  dias,
  hoy,
  celdas,
  destino,
  arrastre,
  arrastroRef,
  onSlotLibre,
  onTurno,
  onBloqueo,
  onTomarTurno,
}: {
  hora: string
  dias: string[]
  hoy: string
  celdas: Map<string, CeldaAgenda>
  destino: Destino | null
  arrastre: Arrastre | null
  arrastroRef: React.RefObject<boolean>
  onSlotLibre: (iso: string) => void
  onTurno: (t: Turno) => void
  onBloqueo: (b: Bloqueo) => void
  onTomarTurno: (e: React.PointerEvent, t: Turno) => void
}) {
  const enPunto = hora.endsWith(":00")
  return (
    <>
      <div
        className={cn(
          "sticky left-0 z-10 h-12 border-b border-border bg-card pr-2 text-right text-[11px] tabular-nums",
          enPunto ? "text-muted-foreground" : "text-muted-foreground/50"
        )}
      >
        {enPunto ? hora : ""}
      </div>
      {dias.map((ymd) => {
        const celda = celdas.get(`${ymd} ${hora}`) ?? { tipo: "fuera" as const }
        const esDestino = destino?.ymd === ymd && destino?.hora === hora
        return (
          <div
            key={ymd + hora}
            data-ymd={ymd}
            data-hora={hora}
            className={cn(
              "h-12 border-b border-l border-border p-0.5",
              ymd === hoy && "bg-primary/5",
              esDestino && "bg-primary/25 ring-2 ring-inset ring-primary"
            )}
          >
            <Celda
              celda={celda}
              arrastre={arrastre}
              arrastroRef={arrastroRef}
              onSlotLibre={onSlotLibre}
              onTurno={onTurno}
              onBloqueo={onBloqueo}
              onTomarTurno={onTomarTurno}
            />
          </div>
        )
      })}
    </>
  )
}

function Celda({
  celda,
  arrastre,
  arrastroRef,
  onSlotLibre,
  onTurno,
  onBloqueo,
  onTomarTurno,
}: {
  celda: CeldaAgenda
  arrastre: Arrastre | null
  arrastroRef: React.RefObject<boolean>
  onSlotLibre: (iso: string) => void
  onTurno: (t: Turno) => void
  onBloqueo: (b: Bloqueo) => void
  onTomarTurno: (e: React.PointerEvent, t: Turno) => void
}) {
  if (celda.tipo === "sigue") {
    return (
      <div
        aria-hidden
        className={cn(
          "size-full rounded",
          celda.de === "turno"
            ? "bg-primary/15 ring-1 ring-primary/30"
            : "bg-[repeating-linear-gradient(45deg,var(--muted),var(--muted)_6px,transparent_6px,transparent_12px)] ring-1 ring-border"
        )}
      />
    )
  }

  if (celda.tipo === "fuera") {
    return <div className="size-full rounded bg-muted/40" aria-hidden />
  }

  if (celda.tipo === "libre") {
    return (
      <button
        type="button"
        onClick={() => onSlotLibre(celda.iso)}
        disabled={celda.pasado}
        aria-label={`Agendar turno a las ${horaAR(celda.iso)}`}
        className={cn(
          "group size-full rounded text-xs transition-colors",
          celda.pasado
            ? "cursor-default bg-transparent"
            : "hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        {!celda.pasado && (
          <Plus className="mx-auto size-4 text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
        )}
      </button>
    )
  }

  if (celda.tipo === "bloqueo") {
    return (
      <button
        type="button"
        onClick={() => onBloqueo(celda.bloqueo)}
        title={celda.bloqueo.motivo || "Bloqueado"}
        className="flex size-full items-center gap-1 overflow-hidden rounded bg-[repeating-linear-gradient(45deg,var(--muted),var(--muted)_6px,transparent_6px,transparent_12px)] px-1.5 text-left text-[11px] text-muted-foreground ring-1 ring-border hover:ring-foreground/30"
      >
        <CalendarOff className="size-3 shrink-0" />
        <span className="truncate">{celda.bloqueo.motivo || "Bloqueado"}</span>
      </button>
    )
  }

  const enMovimiento = arrastre?.activo && arrastre.turno.id === celda.turno.id

  return (
    <button
      type="button"
      onPointerDown={(e) => onTomarTurno(e, celda.turno)}
      onClick={() => {
        if (arrastroRef.current) return
        onTurno(celda.turno)
      }}
      aria-label={`Turno de ${celda.turno.pacienteNombre || "paciente"} a las ${horaAR(celda.turno.inicio)}. Arrastralo para moverlo.`}
      className={cn(
        "group size-full cursor-grab overflow-hidden rounded bg-primary/15 px-1.5 py-1 text-left ring-1 ring-primary/30 transition-colors hover:bg-primary/25 active:cursor-grabbing",
        enMovimiento && "opacity-40"
      )}
    >
      <p className="flex items-center gap-0.5 truncate text-[11px] font-medium leading-tight">
        <GripVertical className="-ml-1 size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        <span className="truncate">
          {celda.turno.pacienteNombre || "Sin nombre"}
        </span>
      </p>
      <p className="truncate text-[10px] leading-tight text-muted-foreground">
        {horaAR(celda.turno.inicio)}
      </p>
    </button>
  )
}
