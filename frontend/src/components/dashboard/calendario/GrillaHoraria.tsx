import { useMemo } from "react"
import { Plus, CalendarOff } from "lucide-react"
import { cn } from "cn"
import type { Bloqueo, Turno } from "@/components/dashboard/turnos-dialogs"
import { horaAR, hoyAR, numeroDia, DIAS, diaSemana } from "@/lib/fecha"
import {
  construirCeldas,
  filasHorarias,
  type Celda as CeldaAgenda,
  type Horario,
} from "./agenda"

/**
 * Grilla de media hora: una columna por día. La usan la vista Semana (varios días)
 * y la vista Día (uno solo).
 */
export function GrillaHoraria({
  dias,
  horarios,
  turnos,
  bloqueos,
  onSlotLibre,
  onTurno,
  onBloqueo,
}: {
  dias: string[]
  horarios: Horario[]
  turnos: Turno[]
  bloqueos: Bloqueo[]
  onSlotLibre: (iso: string) => void
  onTurno: (t: Turno) => void
  onBloqueo: (b: Bloqueo) => void
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

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-max"
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
            onSlotLibre={onSlotLibre}
            onTurno={onTurno}
            onBloqueo={onBloqueo}
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
  onSlotLibre,
  onTurno,
  onBloqueo,
}: {
  hora: string
  dias: string[]
  hoy: string
  celdas: Map<string, CeldaAgenda>
  onSlotLibre: (iso: string) => void
  onTurno: (t: Turno) => void
  onBloqueo: (b: Bloqueo) => void
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
        return (
          <div
            key={ymd + hora}
            className={cn(
              "h-12 border-b border-l border-border p-0.5",
              ymd === hoy && "bg-primary/5"
            )}
          >
            <Celda
              celda={celda}
              onSlotLibre={onSlotLibre}
              onTurno={onTurno}
              onBloqueo={onBloqueo}
            />
          </div>
        )
      })}
    </>
  )
}

function Celda({
  celda,
  onSlotLibre,
  onTurno,
  onBloqueo,
}: {
  celda: CeldaAgenda
  onSlotLibre: (iso: string) => void
  onTurno: (t: Turno) => void
  onBloqueo: (b: Bloqueo) => void
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
    return (
      <div className="size-full rounded bg-muted/40" aria-hidden />
    )
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

  return (
    <button
      type="button"
      onClick={() => onTurno(celda.turno)}
      className="size-full overflow-hidden rounded bg-primary/15 px-1.5 py-1 text-left ring-1 ring-primary/30 transition-colors hover:bg-primary/25"
    >
      <p className="truncate text-[11px] font-medium leading-tight">
        {celda.turno.pacienteNombre || "Sin nombre"}
      </p>
      <p className="truncate text-[10px] leading-tight text-muted-foreground">
        {horaAR(celda.turno.inicio)}
      </p>
    </button>
  )
}
