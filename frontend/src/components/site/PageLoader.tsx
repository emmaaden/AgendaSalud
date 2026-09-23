import { Loader2 } from "lucide-react"

/** Indicador de carga para páginas con carga diferida (lazy). */
export function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="size-6 animate-spin text-primary" aria-label="Cargando" />
    </div>
  )
}
