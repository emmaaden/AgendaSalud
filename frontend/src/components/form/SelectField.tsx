import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "cn"

export type Option = { value: string; label: string }

/** Select controlado, listo para usarse con react-hook-form (Controller). */
export function SelectField({
  id,
  value,
  onValueChange,
  placeholder = "Seleccionar…",
  options,
  invalid,
  disabled,
  className,
}: {
  id?: string
  value?: string
  onValueChange: (v: string) => void
  placeholder?: string
  options: Option[]
  invalid?: boolean
  disabled?: boolean
  className?: string
}) {
  return (
    <Select value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        id={id}
        aria-invalid={invalid}
        className={cn("h-10 w-full", className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
