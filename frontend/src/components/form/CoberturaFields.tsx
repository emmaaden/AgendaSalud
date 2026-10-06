import { Input } from "@/components/ui/input"
import { Field } from "@/components/form/Field"
import { SelectField } from "@/components/form/SelectField"
import { useObrasSociales, type Cobertura } from "@/lib/catalogos"

/**
 * Fase K: cobertura del paciente (obra social del catálogo + n.º de afiliado + plan).
 * `publico` usa solo el catálogo global (registro del paciente, sin sesión).
 * Pensado para una grilla de 2 columnas: la obra social ocupa una fila completa.
 */
export function CoberturaFields({
  value,
  onChange,
  publico = false,
  required = false,
  idPrefix = "cob",
  error,
  textoLegado,
}: {
  value: Cobertura
  onChange: (c: Cobertura) => void
  publico?: boolean
  required?: boolean
  idPrefix?: string
  error?: string
  /** Obra social cargada como texto libre antes del catálogo (se muestra como pista). */
  textoLegado?: string
}) {
  const { datos, cargando } = useObrasSociales(publico)
  const opciones = datos.map((o) => ({
    value: String(o.id),
    label: o.sigla ? `${o.nombre} (${o.sigla})` : o.nombre,
  }))
  const set = (k: keyof Cobertura, v: string) => onChange({ ...value, [k]: v })
  const sinCobertura = datos.find((o) => String(o.id) === value.idObraSocial)?.nombre === "Particular"

  return (
    <>
      <Field
        label="Obra social"
        htmlFor={`${idPrefix}-os`}
        required={required}
        error={error}
        className="sm:col-span-2"
        hint={
          textoLegado && !value.idObraSocial
            ? `Cargada antes como "${textoLegado}": elegila del listado.`
            : "Si no está en el listado, elegí “Particular” o pedí que la agreguen."
        }
      >
        <SelectField
          id={`${idPrefix}-os`}
          value={value.idObraSocial}
          onValueChange={(v) => set("idObraSocial", v)}
          options={opciones}
          placeholder={cargando ? "Cargando…" : "Elegí la obra social"}
          invalid={!!error}
          disabled={cargando}
        />
      </Field>
      <Field label="N.º de afiliado" htmlFor={`${idPrefix}-afiliado`}>
        <Input
          id={`${idPrefix}-afiliado`}
          className="h-10"
          value={value.nroAfiliado}
          onChange={(e) => set("nroAfiliado", e.target.value)}
          maxLength={40}
          disabled={sinCobertura}
        />
      </Field>
      <Field label="Plan" htmlFor={`${idPrefix}-plan`}>
        <Input
          id={`${idPrefix}-plan`}
          className="h-10"
          value={value.plan}
          onChange={(e) => set("plan", e.target.value)}
          maxLength={60}
          disabled={sinCobertura}
        />
      </Field>
    </>
  )
}
