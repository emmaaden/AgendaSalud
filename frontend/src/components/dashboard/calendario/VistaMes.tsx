import { cn } from "cn"
import type { Bloqueo, Turno } from "@/components/dashboard/turnos-dialogs"
import { DIAS, horaAR, hoyAR, numeroDia } from "@/lib/fecha"
import { bloqueosDelDia, turnosDelDia } from "./agenda"

/**
 * Cuadrícula mensual: carga del mes de un vistazo. Tocar un día abre la vista Día.
 */
export function VistaMes({
  dias,
  mes,
  turnos,
  bloqueos,
  compacto,
  onDia,
}: {
  dias: string[]
  /** "YYYY-MM" del mes mostrado, para agrisar los días de relleno. */
  mes: string
  turnos: Turno[]
  bloqueos: Bloqueo[]
  compacto: boolean
  onDia: (ymd: string) => void
}) {
  const hoy = hoyAR()

  return (
    <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-border">
      {DIAS.map((d) => (
        <div
          key={d}
          className="border-b border-border bg-muted/40 px-1 py-2 text-center text-[11px] font-medium text-muted-foreground"
        >
          {compacto ? d.slice(0, 1) : d.slice(0, 3)}
        </div>
      ))}

      {dias.map((ymd) => {
        const delMes = ymd.slice(0, 7) === mes
        const delDia = turnosDelDia(turnos, ymd)
        const bloqueado = bloqueosDelDia(bloqueos, ymd).length > 0
        return (
          <button
            key={ymd}
            type="button"
            onClick={() => onDia(ymd)}
            className={cn(
              "flex min-h-20 flex-col items-stretch gap-1 border-b border-l border-border p-1 text-left transition-colors first:border-l-0 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:min-h-28",
              !delMes && "bg-muted/30 text-muted-foreground"
            )}
            aria-label={`${numeroDia(ymd)}: ${delDia.length} ${delDia.length === 1 ? "turno" : "turnos"}`}
          >
            <span className="flex items-center justify-between gap-1">
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full text-xs tabular-nums",
                  ymd === hoy && "bg-primary font-semibold text-primary-foreground"
                )}
              >
                {numeroDia(ymd)}
              </span>
              {bloqueado && (
                <span
                  className="size-1.5 rounded-full bg-muted-foreground"
                  title="Tiene bloqueos"
                />
              )}
            </span>

            {compacto ? (
              delDia.length > 0 && (
                <span className="flex flex-wrap gap-0.5">
                  {delDia.slice(0, 4).map((t) => (
                    <span key={t.id} className="size-1.5 rounded-full bg-primary" />
                  ))}
                  {delDia.length > 4 && (
                    <span className="text-[9px] leading-none text-muted-foreground">
                      +{delDia.length - 4}
                    </span>
                  )}
                </span>
              )
            ) : (
              <span className="flex flex-col gap-0.5">
                {delDia.slice(0, 3).map((t) => (
                  <span
                    key={t.id}
                    className="truncate rounded bg-primary/15 px-1 text-[10px] leading-4 ring-1 ring-primary/25"
                  >
                    {horaAR(t.inicio)} {t.pacienteNombre || "Sin nombre"}
                  </span>
                ))}
                {delDia.length > 3 && (
                  <span className="px-1 text-[10px] text-muted-foreground">
                    +{delDia.length - 3} más
                  </span>
                )}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
