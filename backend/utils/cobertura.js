// Cobertura del paciente (Fase K): catálogo de obras sociales + n.º de afiliado + plan.
//
// El catálogo tiene entradas GLOBALES (clinica_id NULL: las ve cualquier clínica y los
// pacientes que se registran solos) y altas PROPIAS de cada clínica. `paciente.obra_social`
// (texto) se conserva como snapshot del nombre: lo siguen mostrando la HC, el PDF y la
// auditoría, así que se actualiza siempre junto con `id_obra_social`.

const { supabase } = require('../config/supabaseClient');

// Obra social del catálogo visible para la clínica (global o propia). null si no existe
// o no es visible. `clinicaId` null => solo el catálogo global (registro del paciente).
async function resolverObraSocial(idObraSocial, clinicaId) {
    const id = Number(idObraSocial);
    if (!Number.isInteger(id) || id <= 0) return null;
    const { data, error } = await supabase
        .from('obra_social')
        .select('id, nombre, clinica_id, activo')
        .eq('id', id)
        .maybeSingle();
    if (error) throw error;
    if (!data || !data.activo) return null;
    if (data.clinica_id && data.clinica_id !== clinicaId) return null;
    return { id: data.id, nombre: data.nombre };
}

// Columnas de `paciente` para una cobertura recibida del cliente:
//   { idObraSocial, nroAfiliado, plan }  (cualquiera puede venir vacío)
// Devuelve { ok:true, cols } o { ok:false, error }. Sin idObraSocial no toca la obra
// social (cols sin obra_social/id_obra_social) salvo que `limpiar` sea true.
async function columnasCobertura(body, clinicaId) {
    const cols = {};
    if (body.idObraSocial !== undefined && body.idObraSocial !== null && body.idObraSocial !== '') {
        const os = await resolverObraSocial(body.idObraSocial, clinicaId);
        if (!os) return { ok: false, error: 'La obra social elegida no es válida.' };
        cols.id_obra_social = os.id;
        cols.obra_social = os.nombre;
    }
    if (body.nroAfiliado !== undefined) cols.nro_afiliado = String(body.nroAfiliado || '').trim() || null;
    if (body.plan !== undefined) cols.plan = String(body.plan || '').trim() || null;
    return { ok: true, cols };
}

// Catálogo visible: global + (si hay clínica) el propio. Solo activas, salvo `todas`.
async function listarObrasSociales(clinicaId, { todas = false } = {}) {
    let q = supabase
        .from('obra_social')
        .select('id, nombre, sigla, clinica_id, activo')
        .order('nombre', { ascending: true });
    q = clinicaId ? q.or(`clinica_id.is.null,clinica_id.eq.${clinicaId}`) : q.is('clinica_id', null);
    if (!todas) q = q.eq('activo', true);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map((o) => ({
        id: o.id,
        nombre: o.nombre,
        sigla: o.sigla || null,
        propia: !!o.clinica_id,
        activo: o.activo,
    }));
}

module.exports = { resolverObraSocial, columnasCobertura, listarObrasSociales };
