import { Children, cloneElement, isValidElement } from "react"
import { cn } from "cn"
import { Label } from "@/components/ui/label"

/**
 * Fila de formulario: label + control + mensaje de error.
 * Pensada para usarse con react-hook-form (pasar el mensaje de `errors`).
 *
 * Accesibilidad: si el hijo es un único control (Input, SelectField…), recibe
 * `aria-required` y `aria-describedby` apuntando a la ayuda/error, así el lector de
 * pantalla anuncia que es obligatorio y por qué es inválido. El error además se
 * anuncia al aparecer (role="alert").
 */
export function Field({
  label,
  htmlFor,
  error,
  required,
  className,
  children,
  hint,
}: {
  label: string
  htmlFor?: string
  error?: string
  required?: boolean
  className?: string
  children: React.ReactNode
  hint?: string
}) {
  const hintId = htmlFor && hint && !error ? `${htmlFor}-hint` : undefined
  const errorId = htmlFor && error ? `${htmlFor}-error` : undefined
  const describedBy = errorId ?? hintId

  let control = children
  const unico = Children.count(children) === 1 ? Children.only(children) : null
  if (isValidElement<Record<string, unknown>>(unico)) {
    const propio = unico.props["aria-describedby"]
    control = cloneElement(unico, {
      ...(required ? { "aria-required": true } : {}),
      ...(describedBy || propio
        ? { "aria-describedby": [propio, describedBy].filter(Boolean).join(" ") }
        : {}),
    })
  }

  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && (
          <>
            <span aria-hidden className="text-destructive">
              {" "}
              *
            </span>
            <span className="sr-only"> (obligatorio)</span>
          </>
        )}
      </Label>
      {control}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
