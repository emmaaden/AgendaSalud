import { jsPDF } from "jspdf"

export type HistoryEntry = {
  profesional: string
  area: string
  fecha: string
  sintomas: string
  diagnostico: string
  tratamiento: string
  dientes?: { numero: string; estado: string; notas?: string }[]
}

export type Paciente = {
  fullName: string
  telefono: string
  email: string
  dni: string
  direccion: string
  fechaNacimiento: string
  edad: string | number
  obraSocial: string
  sexo: string
  fechaApertura: string
  history: HistoryEntry[]
}

/** Genera y descarga el PDF del historial clínico de un paciente. */
export function downloadPatientHistoryPdf(p: Paciente) {
  const doc = new jsPDF()
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text("AgendaSalud", 105, 20, { align: "center" })
  doc.setFontSize(14)
  doc.setFont("helvetica", "normal")
  doc.text("Historial clínico del paciente", 105, 30, { align: "center" })
  doc.setLineWidth(0.5)
  doc.line(10, 35, 200, 35)

  const left: [string, string][] = [
    ["Nombre", p.fullName ?? "N/A"],
    ["Teléfono", String(p.telefono ?? "N/A")],
    ["DNI", String(p.dni ?? "N/A")],
    ["Email", p.email ?? "N/A"],
    ["Sexo", p.sexo ?? "N/A"],
  ]
  const right: [string, string][] = [
    ["Fecha de nacimiento", p.fechaNacimiento ?? "N/A"],
    ["Edad", String(p.edad ?? "N/A")],
    ["Dirección", p.direccion ?? "N/A"],
    ["Obra social", p.obraSocial ?? "N/A"],
    ["Fecha de apertura", p.fechaApertura ?? "N/A"],
  ]
  let yL = 45
  let yR = 45
  doc.setFontSize(12)
  left.forEach(([l, v]) => {
    doc.setFont("helvetica", "bold")
    doc.text(`${l}:`, 10, yL)
    doc.setFont("helvetica", "normal")
    doc.text(String(v), 40, yL)
    yL += 10
  })
  right.forEach(([l, v]) => {
    doc.setFont("helvetica", "bold")
    doc.text(`${l}:`, 110, yR)
    doc.setFont("helvetica", "normal")
    doc.text(String(v), 165, yR)
    yR += 10
  })

  const lineY = Math.max(yL, yR) + 5
  doc.line(10, lineY, 200, lineY)
  let y = lineY + 10
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("Historial médico", 10, y)
  y += 10

  const maxHeight = doc.internal.pageSize.height - 10
  const line = (text: string, bold = false) => {
    if (y > maxHeight) {
      doc.addPage()
      y = 20
    }
    doc.setFont("helvetica", bold ? "bold" : "normal")
    doc.setFontSize(12)
    doc.text(text, 10, y)
    y += 7
  }

  ;(p.history || []).forEach((entry) => {
    line(`Profesional: ${entry.profesional}`)
    line(`Área: ${entry.area}`)
    line(`Fecha: ${entry.fecha}hs`)
    line("")
    doc.splitTextToSize(`Síntomas: ${entry.sintomas}`, 180).forEach((l: string) => line(l))
    line("")
    doc.splitTextToSize(`Diagnóstico: ${entry.diagnostico}`, 180).forEach((l: string) => line(l))
    line("")
    doc.splitTextToSize(`Tratamiento: ${entry.tratamiento}`, 180).forEach((l: string) => line(l))
    if (entry.dientes && entry.dientes.length) {
      line("")
      line("Odontograma:", true)
      entry.dientes.forEach((d) => {
        const n = d.numero.replace("tooth-", "")
        line(`  · Diente ${n}: ${d.estado}${d.notas ? ` (${d.notas})` : ""}`)
      })
    }
    if (y > maxHeight) {
      doc.addPage()
      y = 20
    }
    doc.line(10, y, 200, y)
    y += 10
  })

  if (y > maxHeight) {
    doc.addPage()
    y = 20
  }
  doc.setFont("helvetica", "bold")
  doc.text("Fin del historial clínico", 10, y + 5)
  doc.save(`Historial_${p.fullName}.pdf`)
}
