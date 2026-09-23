// Genera un slug URL-friendly a partir de un texto (nombre de clínica).
// Quita acentos, pasa a minúsculas y reemplaza lo no alfanumérico por guiones.
// Se usa para la URL pública de turnos de cada clínica (Fase 2).
function slugify(texto) {
    return String(texto || '')
        .normalize('NFD')                 // separa los acentos de la letra base
        .replace(/[̀-ͯ]/g, '')  // elimina los diacríticos
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')      // no alfanumérico -> guion
        .replace(/^-+|-+$/g, '')          // sin guiones en los extremos
        .slice(0, 40) || 'clinica';       // fallback si queda vacío
}

module.exports = { slugify };
