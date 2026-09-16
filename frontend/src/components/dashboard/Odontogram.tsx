import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Field } from "@/components/form/Field"
import { SelectField } from "@/components/form/SelectField"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

export type Diente = { numero: string; estado: string; notas?: string }

// Numeración FDI completa. `numero` se guarda como "tooth-<n>" por compatibilidad
// con los registros existentes (registro_diente.numero).
const UPPER = ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"]
const LOWER = ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"]

const ESTADOS = [
  { value: "sano", label: "Sano" },
  { value: "caries", label: "Caries" },
  { value: "tratado", label: "Tratado" },
  { value: "falta", label: "Ausente" },
]
const COLOR: Record<string, string> = {
  sano: "#16a34a",
  caries: "#dc2626",
  tratado: "#2563eb",
  falta: "#9ca3af",
}

const CELL = 44
const PAD = 8

function toothId(n: string) {
  return `tooth-${n}`
}

export function Odontogram({
  value,
  onChange,
  readOnly = false,
}: {
  value: Diente[]
  onChange?: (d: Diente[]) => void
  readOnly?: boolean
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [estado, setEstado] = useState("falta")
  const [notas, setNotas] = useState("")

  const byId = new Map(value.map((d) => [d.numero, d]))

  function openTooth(n: string) {
    if (readOnly) return
    const id = toothId(n)
    const existing = byId.get(id)
    setSelected(n)
    setEstado(existing?.estado || "falta")
    setNotas(existing?.notas || "")
  }

  function guardar() {
    if (!selected || !onChange) return
    const id = toothId(selected)
    const next = value.filter((d) => d.numero !== id)
    next.push({ numero: id, estado, notas })
    onChange(next)
    setSelected(null)
  }

  function fill(n: string) {
    const d = byId.get(toothId(n))
    return d ? COLOR[d.estado] || "#ffffff" : "#ffffff"
  }

  const width = 16 * CELL + PAD * 2
  const rowHeight = CELL + 22

  function renderRow(teeth: string[], y: number, numbersAbove: boolean) {
    return teeth.map((n, i) => {
      const rx = PAD + i * CELL
      const numberY = numbersAbove ? y - 6 : y + CELL + 16
      return (
        <g key={n}>
          <rect
            id={toothId(n)}
            x={rx + 3}
            y={y}
            width={CELL - 6}
            height={CELL - 6}
            rx={6}
            fill={fill(n)}
            stroke="#cbd5e1"
            strokeWidth={1.5}
            style={{ cursor: readOnly ? "default" : "pointer" }}
            onClick={() => openTooth(n)}
          />
          <text
            x={rx + CELL / 2}
            y={numberY}
            textAnchor="middle"
            fontSize="11"
            fill="currentColor"
          >
            {n}
          </text>
        </g>
      )
    })
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          id="odontogramaSVG"
          viewBox={`0 0 ${width} ${rowHeight * 2 + 30}`}
          className="mx-auto block max-w-full text-muted-foreground"
          style={{ minWidth: 560 }}
        >
          {/* separador de cuadrantes */}
          <line
            x1={PAD + 8 * CELL}
            y1={6}
            x2={PAD + 8 * CELL}
            y2={rowHeight * 2 + 10}
            stroke="#e2e8f0"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          {renderRow(UPPER, 16, false)}
          {renderRow(LOWER, rowHeight + 40, true)}
        </svg>
      </div>

      {/* Leyenda */}
      <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
        {ESTADOS.map((e) => (
          <span key={e.value} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block size-3 rounded-sm"
              style={{ background: COLOR[e.value] }}
            />
            {e.label}
          </span>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Diente {selected}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Estado" htmlFor="estado">
              <SelectField
                id="estado"
                value={estado}
                onValueChange={setEstado}
                options={ESTADOS}
              />
            </Field>
            <Field label="Notas" htmlFor="notas">
              <Textarea
                id="notas"
                rows={3}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Cancelar
            </Button>
            <Button onClick={guardar}>Guardar diente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
