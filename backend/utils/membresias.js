// Helper de membresías (Fase A: multi-clínica).
// Una membresía = pertenencia de una persona a una clínica con un rol
// (admin | profesional | recepcion). La "clínica activa" de la sesión se elige
// entre las membresías ACTIVAS del usuario.

// Devuelve las membresías activas de una persona, con datos de la clínica.
// `db` es un cliente Supabase (service_role para login/sistema; por-JWT si aplica).
async function getMembresiasActivas(db, personaId) {
    if (!personaId) return [];
    const { data, error } = await db
        .from('membresia')
        .select('clinica_id, rol, clinica:clinica_id ( id, nombre, slug )')
        .eq('id_persona', personaId)
        .eq('activo', true)
        .order('creada_en', { ascending: true });
    if (error) throw error;
    return (data || []).map((m) => ({
        clinicaId: m.clinica_id,
        rol: m.rol,
        esAdmin: m.rol === 'admin',
        nombre: m.clinica?.nombre ?? null,
        slug: m.clinica?.slug ?? null,
    }));
}

module.exports = { getMembresiasActivas };
