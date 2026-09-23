import { cn } from "cn"
import { Label } from "@/components/ui/label"

/**
 * Fila de formulario: label + control + mensaje de error.
 * Pensada para usarse con react-hook-form (pasar el mensaje de `errors`).
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
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  )
}
