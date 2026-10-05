// Helper de membresías (Fase A: multi-clínica).
// Una membresía = pertenencia de una persona a una clínica con un rol
// (admin | profesional | recepcion | auditor). La "clínica activa" de la sesión se elige
// entre las membresías ACTIVAS del usuario.

// Devuelve las membresías activas de una persona, con datos de la clínica.
// `db` es un cliente Supabase (service_role para login/sistema; por-JWT si aplica).
const COLS_BASE = 'clinica_id, rol, clinica:clinica_id ( id, nombre, slug )';

function consultarMembresias(db, personaId, cols) {
    return db
        .from('membresia')
        .select(cols)
        .eq('id_persona', personaId)
        .eq('activo', true)
        .order('creada_en', { ascending: true });
}

async function getMembresiasActivas(db, personaId) {
    if (!personaId) return [];
    let { data, error } = await consultarMembresias(db, personaId, `${COLS_BASE}, alcance_obra_social`);
    // Base sin la migración faseJ_auditoria.sql (falta alcance_obra_social): el login
    // NO debe romperse por eso; se leen las membresías sin el alcance.
    if (error && (error.code === '42703' || /alcance_obra_social/.test(error.message || ''))) {
        console.warn('[membresias] falta membresia.alcance_obra_social: aplicá backend/db/faseJ_auditoria.sql');
        ({ data, error } = await consultarMembresias(db, personaId, COLS_BASE));
    }
    if (error) throw error;
    return (data || []).map((m) => ({
        clinicaId: m.clinica_id,
        rol: m.rol,
        esAdmin: m.rol === 'admin',
        // Fase J: alcance del auditor (NULL = interno, toda la clínica).
        alcanceObraSocial: m.rol === 'auditor' ? (m.alcance_obra_social || null) : null,
        nombre: m.clinica?.nombre ?? null,
        slug: m.clinica?.slug ?? null,
    }));
}

// Rol de SESIÓN (`req.session.user.role`) para una cuenta sin fila en `profesional`
// ni en `paciente`: su tipo lo define la membresía. Fase J: si es auditor en la clínica
// (o en todas, mientras no eligió una) es 'auditor'; si no, 'recepcion' (Fase E).
function roleSinProfesional(membresias) {
    if (!membresias || membresias.length === 0) return 'recepcion';
    return membresias.every((m) => m.rol === 'auditor') ? 'auditor' : 'recepcion';
}

module.exports = { getMembresiasActivas, roleSinProfesional };
