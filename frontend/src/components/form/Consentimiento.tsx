import { Link } from "react-router-dom"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { AAIP_URL } from "@/lib/site"

/**
 * Leyenda obligatoria en sitios y formularios que recolectan datos personales
 * (Disposición DNPDP 10/2008, art. 1; órgano de control actual: AAIP).
 */
export function AvisoDatosPersonales({ className }: { className?: string }) {
  return (
    <p className={className ?? "text-xs leading-relaxed text-muted-foreground"}>
      El titular de los datos personales tiene la facultad de ejercer el derecho de
      acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses,
      salvo que se acredite un interés legítimo al efecto conforme lo establecido en
      el artículo 14, inciso 3 de la Ley Nº 25.326. La{" "}
      <a
        href={AAIP_URL}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2 hover:text-foreground"
      >
        Agencia de Acceso a la Información Pública
        <span className="sr-only"> (se abre en una pestaña nueva)</span>
      </a>
      , en su carácter de Órgano de Control de la Ley Nº 25.326, tiene la atribución
      de atender las denuncias y reclamos que interpongan quienes resulten afectados
      en sus derechos por incumplimiento de las normas vigentes en materia de
      protección de datos personales.
    </p>
  )
}

/** Enlace a un texto legal que se abre aparte para no perder lo cargado en el formulario. */
function LegalLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-primary underline underline-offset-2"
    >
      {children}
      <span className="sr-only"> (se abre en una pestaña nueva)</span>
    </Link>
  )
}

/**
 * Casilla de consentimiento expreso (Ley 25.326 arts. 5, 6, 7 y 12): sin marcarla no
 * se puede enviar el formulario. Nunca viene tildada por defecto.
 *
 * - `salud`: el formulario trata datos de salud (paciente o reserva de turno).
 */
export function Consentimiento({
  id = "consentimiento",
  checked,
  onCheckedChange,
  error,
  salud = false,
  ref,
}: {
  id?: string
  /** react-hook-form (field.ref): permite enfocar la casilla si falta aceptarla. */
  ref?: React.Ref<HTMLButtonElement>
  checked: boolean
  onCheckedChange: (v: boolean) => void
  error?: string
  salud?: boolean
}) {
  const errorId = `${id}-error`
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-muted/40 p-4">
      <div className="flex items-start gap-3">
        <Checkbox
          ref={ref}
          id={id}
          checked={checked}
          onCheckedChange={(v) => onCheckedChange(v === true)}
          aria-required
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5"
        />
        <Label htmlFor={id} className="block leading-relaxed font-normal select-text">
          Leí y acepto los <LegalLink to="/terminos">Términos y condiciones</LegalLink>{" "}
          y la <LegalLink to="/privacidad">Política de privacidad</LegalLink>. Doy mi
          consentimiento expreso para el tratamiento de mis datos personales
          {salud ? ", incluidos mis datos de salud," : ""} con las finalidades allí
          indicadas y para que se alojen en servidores de proveedores ubicados en
          Estados Unidos.
          <span aria-hidden className="text-destructive">
            {" "}
            *
          </span>
          <span className="sr-only"> (obligatorio)</span>
        </Label>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
      <AvisoDatosPersonales />
    </div>
  )
}

export const CONSENTIMIENTO_REQUERIDO =
  "Para continuar tenés que aceptar los Términos y la Política de privacidad."
