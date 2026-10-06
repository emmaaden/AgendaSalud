import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { ClipboardCheck, Loader2, MessageSquareReply, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { api, ApiError } from "@/lib/api"
import { formatFecha, formatFechaHora } from "@/lib/fecha"
import { CHECKLIST_LABEL, ESTADO_AUDITORIA, type Observacion } from "@/lib/auditoria"

/**
 * Fase J: observaciones de auditoría sobre los registros del profesional. Se muestra
 * en el inicio del dashboard solo si hay alguna; permite responder cada una.
 */
export function ObservacionesAuditoria() {
  const [items, setItems] = useState<Observacion[]>([])
  const [pendientes, setPendientes] = useState(0)
  const [respondiendo, setRespondiendo] = useState<Observacion | null>(null)
  const [respuesta, setRespuesta] = useState("")
  const [enviando, setEnviando] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const d = await api.get<{ observaciones: Observacion[]; pendientes: number }>(
        "/auditoria/observaciones"
      )
      setItems(d.observaciones || [])
      setPendientes(d.pendientes || 0)
    } catch {
      // Silencioso: es un bloque accesorio del inicio (p. ej. migración no aplicada).
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function enviar() {
    if (!respondiendo || !respuesta.trim()) return
    setEnviando(true)
    try {
      await api.post(`/auditoria/revisiones/${respondiendo.revision.id}/respuesta`, {
        respuesta: respuesta.trim(),
      })
      toast.success("Respuesta enviada a auditoría.")
      setRespondiendo(null)
      setRespuesta("")
      await cargar()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo enviar la respuesta.")
    } finally {
      setEnviando(false)
    }
  }

  if (items.length === 0) return null

  return (
    <Card className="mt-8">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <ClipboardCheck className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              Observaciones de auditoría
              {pendientes > 0 && <Badge variant="destructive">{pendientes} sin responder</Badge>}
            </h2>
            <p className="text-sm text-muted-foreground">
              Registros tuyos que la auditoría observó o rechazó.
            </p>
          </div>
        </div>

        <ul className="mt-5 grid gap-3">
          {items.map((o) => {
            const estado = ESTADO_AUDITORIA[o.registro.estado] ?? ESTADO_AUDITORIA.observado
            const fallas = Object.entries(o.revision.checklist || {})
              .filter(([, ok]) => !ok)
              .map(([k]) => CHECKLIST_LABEL[k] ?? k)
            return (
              <li key={o.revision.id} className="rounded-lg border border-border p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={estado.variant}>{estado.label}</Badge>
                  <span className="font-medium">{o.paciente.nombre || "Paciente"}</span>
                  <span className="text-muted-foreground">
                    DNI {o.paciente.dni || "—"} · consulta del {formatFecha(o.registro.fecha)}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap">{o.revision.comentario || "—"}</p>
                {fallas.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    A revisar: {fallas.join(" · ")}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {o.revision.auditor || "Auditoría"} · {formatFechaHora(o.revision.creadoEn)}
                </p>

                {o.revision.respuesta ? (
                  <div className="mt-3 rounded-md bg-muted/50 p-2.5">
                    <p className="flex items-center gap-1.5 text-xs font-medium">
                      <MessageSquareReply className="size-3.5" /> Tu respuesta · esperando
                      a la auditoría
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{o.revision.respuesta}</p>
                  </div>
                ) : (
                  o.pendienteRespuesta && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => {
                        setRespuesta("")
                        setRespondiendo(o)
                      }}
                    >
                      <MessageSquareReply /> Responder
                    </Button>
                  )
                )}
              </li>
            )
          })}
        </ul>
      </CardContent>

      <Dialog open={!!respondiendo} onOpenChange={(v) => !v && setRespondiendo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responder a la auditoría</DialogTitle>
            <DialogDescription>
              Explicá o aclará lo observado. Si hace falta corregir la historia clínica,
              cargá un registro nuevo (los registros no se modifican) y mencionalo acá.
            </DialogDescription>
          </DialogHeader>
          {respondiendo && (
            <p className="rounded-md bg-muted/50 p-2.5 text-sm whitespace-pre-wrap">
              {respondiendo.revision.comentario}
            </p>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="respuesta">Tu respuesta</Label>
            <Textarea
              id="respuesta"
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              maxLength={4000}
              rows={5}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondiendo(null)} disabled={enviando}>
              Cancelar
            </Button>
            <Button onClick={enviar} disabled={enviando || !respuesta.trim()}>
              {enviando ? <Loader2 className="animate-spin" /> : <Send />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
