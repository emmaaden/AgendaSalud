import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

// Tipos mínimos de la Web Speech API: lib.dom de TS todavía no los trae de
// forma estable (Chrome/Edge/Safari los exponen como webkitSpeechRecognition).
interface ResultadoVoz {
  isFinal: boolean
  0: { transcript: string }
}
interface EventoVoz {
  resultIndex: number
  results: ArrayLike<ResultadoVoz>
}
interface Reconocedor {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: EventoVoz) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
type ReconocedorCtor = new () => Reconocedor

function getCtor(): ReconocedorCtor | undefined {
  if (typeof window === "undefined") return undefined
  const w = window as unknown as {
    SpeechRecognition?: ReconocedorCtor
    webkitSpeechRecognition?: ReconocedorCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

// Un solo micrófono activo a la vez: arrancar un campo detiene el anterior.
let detenerActivo: (() => void) | null = null

/**
 * Dictado por voz con la Web Speech API del navegador (es-AR).
 * `start(onFinal)` llama a `onFinal` con cada frase reconocida; mientras se
 * habla, el texto provisorio queda en `interim`.
 */
export function useDictado() {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState("")
  const recRef = useRef<Reconocedor | null>(null)
  const quiereEscuchar = useRef(false)
  const onFinalRef = useRef<(texto: string) => void>(() => {})
  const supported = !!getCtor()

  const stop = useCallback(() => {
    quiereEscuchar.current = false
    recRef.current?.stop()
  }, [])

  const start = useCallback(
    (onFinal: (texto: string) => void) => {
      const Ctor = getCtor()
      if (!Ctor || recRef.current) return
      if (detenerActivo && detenerActivo !== stop) detenerActivo()
      detenerActivo = stop

      onFinalRef.current = onFinal
      quiereEscuchar.current = true

      const rec = new Ctor()
      rec.lang = "es-AR"
      rec.continuous = true
      rec.interimResults = true

      rec.onresult = (e) => {
        let provisorio = ""
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i]
          if (r.isFinal) onFinalRef.current(r[0].transcript)
          else provisorio += r[0].transcript
        }
        setInterim(provisorio)
      }

      rec.onerror = (e) => {
        if (e.error === "no-speech" || e.error === "aborted") return
        quiereEscuchar.current = false
        if (e.error === "not-allowed" || e.error === "service-not-allowed")
          toast.error("Permití el acceso al micrófono para dictar.")
        else if (e.error === "audio-capture")
          toast.error("No se detectó ningún micrófono.")
        else if (e.error === "network")
          toast.error("El dictado necesita conexión a internet.")
        else toast.error("No se pudo usar el dictado por voz.")
      }

      rec.onend = () => {
        // Chrome corta solo tras unos segundos de silencio: si el usuario no
        // pidió parar, retomamos.
        if (quiereEscuchar.current) {
          try {
            rec.start()
            return
          } catch {
            /* cae al cierre */
          }
        }
        recRef.current = null
        if (detenerActivo === stop) detenerActivo = null
        setListening(false)
        setInterim("")
      }

      recRef.current = rec
      try {
        rec.start()
        setListening(true)
      } catch {
        recRef.current = null
        quiereEscuchar.current = false
        toast.error("No se pudo iniciar el dictado.")
      }
    },
    [stop]
  )

  useEffect(
    () => () => {
      quiereEscuchar.current = false
      recRef.current?.abort()
      if (detenerActivo === stop) detenerActivo = null
    },
    [stop]
  )

  return { supported, listening, interim, start, stop }
}
