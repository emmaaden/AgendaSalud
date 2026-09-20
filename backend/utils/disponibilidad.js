// Disponibilidad de turnos (Fase F): fuente ÚNICA = la base, sin Google Calendar.
//
// Un horario está disponible si cae dentro del `horario_profesional` del día y NO
// se solapa con un `turno` reservado ni con un `bloqueo_horario` del profesional.
// Todo se consulta con el cliente service_role (estas funciones también sirven al
// endpoint público de reserva, que no tiene sesión).

const { supabase } = require('../config/supabaseClient');

// Argentina es UTC-3 (sin horario de verano): offset fijo.
const AR_OFFSET = '-03:00';
const SLOT_MINUTOS = 30;

// Fin efectivo de un turno: su `fin`, o inicio + 30' si no lo tiene (histórico/invitado).
function finEfectivo(inicioISO, finISO) {
    if (finISO) return new Date(finISO);
    return new Date(new Date(inicioISO).getTime() + SLOT_MINUTOS * 60000);
}

// Intervalos [inicio, fin) ocupados de un profesional en una fecha (YYYY-MM-DD):
// turnos reservados + bloqueos que se solapan con ese día.
async function intervalosOcupadosDia(profId, dateStr) {
    const dayStart = new Date(`${dateStr}T00:00:00${AR_OFFSET}`);
    const dayEnd = new Date(`${dateStr}T23:59:59${AR_OFFSET}`);

    const [turnosRes, bloqueosRes] = await Promise.all([
        supabase
            .from('turno')
            .select('inicio, fin')
            .eq('id_profesional', profId)
            .eq('estado', 'reservado')
            .gte('inicio', dayStart.toISOString())
            .lte('inicio', dayEnd.toISOString()),
        supabase
            .from('bloqueo_horario')
            .select('inicio, fin')
            .eq('id_profesional', profId)
            .lte('inicio', dayEnd.toISOString())
            .gte('fin', dayStart.toISOString()),
    ]);

    const intervalos = [];
    for (const t of turnosRes.data || []) {
        intervalos.push([new Date(t.inicio), finEfectivo(t.inicio, t.fin)]);
    }
    for (const b of bloqueosRes.data || []) {
        intervalos.push([new Date(b.inicio), new Date(b.fin)]);
    }
    return intervalos;
}

// Genera las franjas de 30' disponibles de un profesional para una fecha, dadas sus
// franjas de atención de ese día (`franjas` = [{ horario_inicio, horario_fin }]).
// Devuelve un array de ISO strings (inicio de cada slot libre y futuro).
async function slotsDisponibles(profId, dateStr, franjas) {
    if (!franjas || franjas.length === 0) return [];
    const ocupados = await intervalosOcupadosDia(profId, dateStr);
    const ahora = new Date();
    const slots = [];

    for (const franja of franjas) {
        let actual = new Date(`${dateStr}T${franja.horario_inicio}${AR_OFFSET}`);
        const fin = new Date(`${dateStr}T${franja.horario_fin}${AR_OFFSET}`);
        while (actual < fin) {
            const slotFin = new Date(actual.getTime() + SLOT_MINUTOS * 60000);
            const ocupado = ocupados.some(([s, e]) => s < slotFin && e > actual);
            if (!ocupado && actual > ahora) slots.push(actual.toISOString());
            actual = slotFin;
        }
    }
    return slots;
}

// ¿El intervalo [inicioISO, finISO) está libre para el profesional?
// Considera turnos reservados (excepto `excluirTurnoId`, útil al reprogramar) y bloqueos.
async function estaLibre(profId, inicioISO, finISO, excluirTurnoId = null) {
    const s = new Date(inicioISO);
    const e = new Date(finISO);

    const { data: turnos } = await supabase
        .from('turno')
        .select('id, inicio, fin')
        .eq('id_profesional', profId)
        .eq('estado', 'reservado')
        .lt('inicio', e.toISOString());
    for (const t of turnos || []) {
        if (excluirTurnoId != null && Number(t.id) === Number(excluirTurnoId)) continue;
        if (new Date(t.inicio) < e && finEfectivo(t.inicio, t.fin) > s) return false;
    }

    const { data: bloqueos } = await supabase
        .from('bloqueo_horario')
        .select('inicio, fin')
        .eq('id_profesional', profId)
        .lt('inicio', e.toISOString());
    for (const b of bloqueos || []) {
        if (new Date(b.inicio) < e && new Date(b.fin) > s) return false;
    }

    return true;
}

module.exports = { SLOT_MINUTOS, slotsDisponibles, estaLibre, intervalosOcupadosDia };
