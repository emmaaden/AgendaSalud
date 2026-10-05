// Captura de audio para el dictado (ver src/hooks/useDictado.ts).
// (No empieza con "/dictado": ese prefijo lo intercepta el proxy de Vite hacia la API.)
// Junta las muestras del micrófono en bloques de ~2048 y las manda al hilo
// principal, que detecta las pausas y arma los tramos que se transcriben.
// Es un archivo externo porque la CSP de la SPA no permite blobs como script.
class CapturaDictado extends AudioWorkletProcessor {
  constructor() {
    super()
    this.buf = new Float32Array(2048)
    this.n = 0
  }

  process(inputs) {
    const canal = inputs[0] && inputs[0][0]
    if (canal) {
      for (let i = 0; i < canal.length; i++) {
        this.buf[this.n++] = canal[i]
        if (this.n === this.buf.length) {
          this.port.postMessage(this.buf, [this.buf.buffer])
          this.buf = new Float32Array(2048)
          this.n = 0
        }
      }
    }
    return true
  }
}

registerProcessor("captura-dictado", CapturaDictado)
