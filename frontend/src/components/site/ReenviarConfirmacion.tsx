import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api, ApiError } from "@/lib/api"

/** Segundos de espera entre reenvíos (Supabase limita los emails por hora). */
const ESPERA = 60

/**
 * Botón para reenviar el email de confirmación de la cuenta, con una espera entre
 * envíos. El backend responde siempre lo mismo (no revela si el email existe).
 */
export function ReenviarConfirmacion({
  email,
  variant = "outline",
  size = "lg",
  className,
}: {
  email: string
  variant?: "default" | "outline" | "secondary"
  size?: "default" | "sm" | "lg"
  className?: string
}) {
  const [enviando, setEnviando] = useState(false)
  const [restan, setRestan] = useState(0)

  useEffect(() => {
    if (restan <= 0) return
    const t = setTimeout(() => setRestan((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [restan])

  async function reenviar() {
    setEnviando(true)
    try {
      await api.post("/auth/reenviar-confirmacion", { email })
      toast.success("Te reenviamos el email de confirmación")
      setRestan(ESPERA)
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "No se pudo reenviar el email."
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={enviando || restan > 0}
      onClick={reenviar}
    >
      {enviando ? <Loader2 className="animate-spin" /> : <RotateCw />}
      {restan > 0 ? `Reenviar en ${restan} s` : "Reenviar email"}
    </Button>
  )
}
