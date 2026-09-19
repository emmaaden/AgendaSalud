// Generación del PDF de un certificado médico (Fase C).
// pdf-lib es JS puro (sin binarios nativos): funciona igual en Windows/Linux.

const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const A4 = [595.28, 841.89];
const MARGIN = 56;
const AZUL = rgb(0.11, 0.31, 0.55);
const GRIS = rgb(0.35, 0.35, 0.35);
const NEGRO = rgb(0.1, 0.1, 0.1);

// Parte un texto en líneas que entran en `maxWidth` para el font/size dados.
function wrap(text, font, size, maxWidth) {
    const palabras = String(text || '').split(/\s+/).filter(Boolean);
    const lineas = [];
    let actual = '';
    for (const p of palabras) {
        const prueba = actual ? `${actual} ${p}` : p;
        if (font.widthOfTextAtSize(prueba, size) > maxWidth && actual) {
            lineas.push(actual);
            actual = p;
        } else {
            actual = prueba;
        }
    }
    if (actual) lineas.push(actual);
    return lineas.length ? lineas : [''];
}

/**
 * Construye el PDF y devuelve un Uint8Array.
 * @param {object} d
 * @param {string} d.clinicaNombre
 * @param {string} d.pacienteNombre
 * @param {string} [d.pacienteDni]
 * @param {string} d.profesionalNombre
 * @param {string} [d.matricula]
 * @param {string} [d.motivo]
 * @param {string} [d.diagnostico]
 * @param {string} [d.indicaciones]
 * @param {number} [d.diasReposo]
 * @param {Date}   [d.fecha]
 * @param {Buffer} [d.firmaBuffer]
 * @param {string} [d.firmaMime]
 */
async function generarCertificadoPdf(d) {
    const doc = await PDFDocument.create();
    const page = doc.addPage(A4);
    const { width, height } = { width: A4[0], height: A4[1] };
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const contentW = width - MARGIN * 2;

    let y = height - MARGIN;

    // Encabezado: clínica.
    page.drawText(String(d.clinicaNombre || 'Clínica'), {
        x: MARGIN, y, size: 16, font: bold, color: AZUL,
    });
    y -= 26;
    page.drawLine({
        start: { x: MARGIN, y }, end: { x: width - MARGIN, y },
        thickness: 1, color: AZUL,
    });
    y -= 40;

    // Título.
    const titulo = 'CERTIFICADO MÉDICO';
    const tw = bold.widthOfTextAtSize(titulo, 20);
    page.drawText(titulo, { x: (width - tw) / 2, y, size: 20, font: bold, color: NEGRO });
    y -= 40;

    // Fecha (arriba a la derecha del cuerpo).
    const fecha = (d.fecha || new Date()).toLocaleDateString('es-AR', {
        day: '2-digit', month: 'long', year: 'numeric',
    });
    const fechaTxt = `Fecha: ${fecha}`;
    page.drawText(fechaTxt, {
        x: width - MARGIN - font.widthOfTextAtSize(fechaTxt, 11),
        y, size: 11, font, color: GRIS,
    });
    y -= 30;

    // Datos del paciente.
    const linea = (label, valor) => {
        if (!valor) return;
        page.drawText(`${label}: `, { x: MARGIN, y, size: 12, font: bold, color: NEGRO });
        const lw = bold.widthOfTextAtSize(`${label}: `, 12);
        for (const l of wrap(valor, font, 12, contentW - lw)) {
            page.drawText(l, { x: MARGIN + lw, y, size: 12, font, color: NEGRO });
            y -= 18;
        }
    };
    linea('Paciente', d.pacienteNombre);
    linea('DNI', d.pacienteDni);
    y -= 10;

    // Cuerpo.
    const parrafo = (label, valor) => {
        if (!valor) return;
        page.drawText(label, { x: MARGIN, y, size: 12, font: bold, color: AZUL });
        y -= 18;
        for (const l of wrap(valor, font, 12, contentW)) {
            page.drawText(l, { x: MARGIN, y, size: 12, font, color: NEGRO });
            y -= 17;
        }
        y -= 8;
    };

    if (d.diasReposo && Number(d.diasReposo) > 0) {
        parrafo('Reposo indicado', `${d.diasReposo} día(s).`);
    }
    parrafo('Motivo', d.motivo);
    parrafo('Diagnóstico', d.diagnostico);
    parrafo('Indicaciones', d.indicaciones);

    // Firma + profesional (abajo).
    let yFirma = 150;
    if (d.firmaBuffer && d.firmaBuffer.length) {
        try {
            const mime = String(d.firmaMime || '').toLowerCase();
            const img = mime.includes('png')
                ? await doc.embedPng(d.firmaBuffer)
                : await doc.embedJpg(d.firmaBuffer);
            const maxW = 180, maxH = 80;
            const escala = Math.min(maxW / img.width, maxH / img.height, 1);
            const w = img.width * escala, h = img.height * escala;
            page.drawImage(img, { x: MARGIN, y: yFirma, width: w, height: h });
        } catch {
            /* firma ilegible: se omite la imagen, el resto del PDF se emite igual */
        }
    }
    yFirma -= 6;
    page.drawLine({
        start: { x: MARGIN, y: yFirma }, end: { x: MARGIN + 200, y: yFirma },
        thickness: 0.8, color: GRIS,
    });
    yFirma -= 16;
    page.drawText(String(d.profesionalNombre || ''), {
        x: MARGIN, y: yFirma, size: 12, font: bold, color: NEGRO,
    });
    if (d.matricula) {
        yFirma -= 16;
        page.drawText(`Matrícula: ${d.matricula}`, {
            x: MARGIN, y: yFirma, size: 11, font, color: GRIS,
        });
    }

    return doc.save();
}

module.exports = { generarCertificadoPdf };
