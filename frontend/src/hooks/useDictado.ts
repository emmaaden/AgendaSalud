import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

// Dictado con motor propio: el navegador solo graba (funciona en cualquier
// navegador moderno, Brave/Firefox/Safari incluidos) y el backend transcribe
// con whisper.cpp local (POST /dictado). El audio nunca sale de nuestra
// infraestructura.
//
// El audio se corta en tramos en cada pausa de la voz: así cada tramo es una
// frase completa y el texto aparece a medida que se habla.

const RATE_WHISPER = 16000
const PAUSA_MS = 700 // silencio que cierra un tramo
const MAX_TRAMO_MS = 14000 // corte forzado si no hay pausas (whisper/start.ps1 usa una ventana de 15 s)
const PREROLL_MS = 300 // audio previo al inicio de la voz (no comerse la primera sílaba)
const MIN_VOZ_MS = 250 // tramos con menos voz que esto se descartan (toses, golpes)

function isSupported() {
  return (
    typeof window !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia && // requiere https o localhost
    typeof AudioWorkletNode !== "undefined"
  )
}

/** Promedia ventanas para bajar a 16 kHz (filtro pasa-bajos simple). */
function downsample(muestras: Float32Array, rate: number) {
  if (rate === RATE_WHISPER) return muestras
  const ratio = rate / RATE_WHISPER
  const out = new Float32Array(Math.floor(muestras.length / ratio))
  for (let i = 0; i < out.length; i++) {
    const ini = Math.floor(i * ratio)
    const fin = Math.min(muestras.length, Math.floor((i + 1) * ratio))
    let suma = 0
    for (let j = ini; j < fin; j++) suma += muestras[j]
    out[i] = suma / Math.max(1, fin - ini)
  }
  return out
}

/** WAV PCM 16 bits mono. */
function encodeWav(muestras: Float32Array) {
  const view = new DataView(new ArrayBuffer(44 + muestras.length * 2))
  const str = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i))
  }
  str(0, "RIFF")
  view.setUint32(4, 36 + muestras.length * 2, true)
  str(8, "WAVE")
  str(12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, RATE_WHISPER, true)
  view.setUint32(28, RATE_WHISPER * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  str(36, "data")
  view.setUint32(40, muestras.length * 2, true)
  for (let i = 0; i < muestras.length; i++) {
    const s = Math.max(-1, Math.min(1, muestras[i]))
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([view], { type: "audio/wav" })
}

function concat(bloques: Float32Array[]) {
  const out = new Float32Array(bloques.reduce((n, b) => n + b.length, 0))
  let off = 0
  for (const b of bloques) {
    out.set(b, off)
    off += b.length
  }
  return out
}

interface Grabacion {
  ctx: AudioContext
  stream?: MediaStream
  node?: AudioWorkletNode
  /** Cierra el tramo en curso y lo manda a transcribir. */
  flush: () => void
}

// Un solo micrófono activo a la vez: arrancar un campo detiene el anterior.
let detenerActivo: (() => void) | null = null

/**
 * Dictado por voz con el motor propio (whisper.cpp vía /dictado).
 * `start(onFinal)` llama a `onFinal` con el texto de cada tramo; `interim`
 * indica si hay audio transcribiéndose.
 */
export function useDictado() {
  const [listening, setListening] = useState(false)
  const [pendientes, setPendientes] = useState(0)
  const grabRef = useRef<Grabacion | null>(null)
  const onFinalRef = useRef<(texto: string) => void>(() => {})
  const colaRef = useRef<Promise<void>>(Promise.resolve())
  const supported = isSupported()

  const liberar = useCallback((g: Grabacion) => {
    if (g.node) {
      g.node.port.onmessage = null
      g.node.disconnect()
    }
    g.stream?.getTracks().forEach((t) => t.stop())
    g.ctx.close().catch(() => {})
  }, [])

  const stop = useCallback(() => {
    const g = grabRef.current
    if (!g) return
    grabRef.current = null
    g.flush()
    liberar(g)
    detenerActivo = null // con grabación en curso, este campo es el activo
    setListening(false)
  }, [liberar])

  // Los tramos se transcriben en orden (cola) para que el texto no se desordene.
  const enviar = useCallback(
    (wav: Blob) => {
      setPendientes((n) => n + 1)
      colaRef.current = colaRef.current.then(async () => {
        try {
          const res = await fetch("/dictado", {
            method: "POST",
            headers: { "Content-Type": "audio/wav" },
            body: wav,
            credentials: "include",
          })
          if (res.status === 503) {
            toast.error("El motor de dictado no está corriendo.", {
              id: "dictado",
              description: "Inicialo con `npm run whisper` en backend/.",
            })
            stop()
            return
          }
          if (!res.ok) throw new Error(String(res.status))
          const { texto } = (await res.json()) as { texto?: string }
          if (texto) onFinalRef.current(texto)
        } catch {
          toast.error("No se pudo transcribir parte del dictado.", { id: "dictado" })
        } finally {
          setPendientes((n) => n - 1)
        }
      })
    },
    [stop]
  )

  const start = useCallback(
    async (onFinal: (texto: string) => void) => {
      if (!isSupported() || grabRef.current) return
      if (detenerActivo && detenerActivo !== stop) detenerActivo()
      detenerActivo = stop
      onFinalRef.current = onFinal

      // El AudioContext se crea dentro del click (Safari lo deja suspendido si no).
      const ctx = new AudioContext()
      const rate = ctx.sampleRate

      // Estado del detector de voz (por energía) y del tramo en curso.
      let tramo: Float32Array[] = []
      let preroll: Float32Array[] = []
      let hablando = false
      let vozMs = 0
      let silencioMs = 0
      let ruido = 0.003

      const flush = () => {
        if (hablando && vozMs >= MIN_VOZ_MS)
          enviar(encodeWav(downsample(concat(tramo), rate)))
        tramo = []
        hablando = false
        vozMs = 0
        silencioMs = 0
      }

      const g: Grabacion = { ctx, flush }
      grabRef.current = g
      setListening(true)

      try {
        g.stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        })
        await ctx.audioWorklet.addModule(`${import.meta.env.BASE_URL}captura-voz-worklet.js`)
        await ctx.resume()
      } catch (e) {
        if (grabRef.current === g) grabRef.current = null
        liberar(g)
        if (detenerActivo === stop) detenerActivo = null
        setListening(false)
        const nombre = e instanceof DOMException ? e.name : ""
        if (nombre === "NotAllowedError" || nombre === "SecurityError")
          toast.error("Permití el acceso al micrófono para dictar.")
        else if (nombre === "NotFoundError")
          toast.error("No se detectó ningún micrófono.")
        else toast.error("No se pudo iniciar el dictado.")
        return
      }
      // Se pidió detener mientras se pedía el permiso.
      if (grabRef.current !== g) {
        liberar(g)
        return
      }

      const node = new AudioWorkletNode(ctx, "captura-dictado")
      g.node = node
      ctx.createMediaStreamSource(g.stream).connect(node)
      node.connect(ctx.destination) // sale en silencio; hace que el nodo procese

      node.port.onmessage = ({ data }: MessageEvent<Float32Array>) => {
        const ms = (data.length / rate) * 1000
        let suma = 0
        for (let i = 0; i < data.length; i++) suma += data[i] * data[i]
        const rms = Math.sqrt(suma / data.length)
        const voz = rms > Math.max(0.01, ruido * 3)
        if (!voz) ruido = ruido * 0.95 + rms * 0.05 // piso de ruido adaptativo

        if (!hablando) {
          preroll.push(data)
          if (preroll.length * ms > PREROLL_MS) preroll.shift()
          if (!voz) return
          hablando = true
          tramo = preroll
          preroll = []
          vozMs = ms
          return
        }

        tramo.push(data)
        if (voz) {
          vozMs += ms
          silencioMs = 0
        } else silencioMs += ms
        if (silencioMs >= PAUSA_MS || tramo.length * ms >= MAX_TRAMO_MS) flush()
      }
    },
    [stop, enviar, liberar]
  )

  useEffect(
    () => () => {
      const g = grabRef.current
      grabRef.current = null
      if (g) liberar(g)
      if (detenerActivo === stop) detenerActivo = null
    },
    [stop, liberar]
  )

  return {
    supported,
    listening,
    interim: pendientes > 0 ? "Transcribiendo…" : "",
    start,
    stop,
  }
}
