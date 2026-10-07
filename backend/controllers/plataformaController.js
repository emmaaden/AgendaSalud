// Panel de la plataforma (Fase L). Solo el equipo de AgendaSalud
// (PLATAFORMA_ADMIN_EMAILS). Hasta integrar Mercado Pago, la activación y la
// renovación de los planes se hacen a mano desde acá.
//
// service_role: opera sobre TODAS las clínicas (no hay clínica activa que acotar).

const { supabase } = require('../config/supabaseClient');
const planes = require('../utils/planes');

// GET /plataforma/clinicas — todas las clínicas con su suscripción y uso.
exports.listarClinicas = async (req, res) => {
    try {
        const [cRes, sRes, mRes] = await Promise.all([
            supabase.from('clinica').select('id, nombre, slug, activa, creada_en').order('creada_en'),
            supabase.from('suscripcion').select('*'),
            supabase.from('membresia').select('clinica_id, rol').eq('activo', true),
        ]);
        const errorDb = cRes.error || sRes.error || mRes.error;
        if (errorDb) throw errorDb;

        const subPorClinica = new Map((sRes.data || []).map((s) => [s.clinica_id, s]));
        const uso = new Map();
        for (const m of mRes.data || []) {
            const u = uso.get(m.clinica_id) || { profesionales: 0, recepcion: 0, auditores: 0 };
            if (planes.ROLES_PROFESIONAL.includes(m.rol)) u.profesionales++;
            else if (m.rol === 'recepcion') u.recepcion++;
            else if (m.rol === 'auditor') u.auditores++;
            uso.set(m.clinica_id, u);
        }

        const clinicas = (cRes.data || []).map((c) => {
            const s = subPorClinica.get(c.id) || null;
            return {
                id: c.id,
                nombre: c.nombre,
                slug: c.slug,
                creadaEn: c.creada_en,
                suscripcion: s && {
                    planId: s.plan_id,
                    estadoGuardado: s.estado,
                    estado: planes.calcularEstado(s),
                    ciclo: s.ciclo,
                    profesionalesExtra: s.profesionales_extra,
                    pruebaHasta: s.prueba_hasta,
                    periodoHasta: s.periodo_hasta,
                    notas: s.notas,
                },
                uso: uso.get(c.id) || { profesionales: 0, recepcion: 0, auditores: 0 },
            };
        });

        const todos = await planes.getPlanes();
        return res.json({ clinicas, planes: [...todos.values()], features: planes.FEATURES });
    } catch (err) {
        console.error('Error en plataforma/clinicas:', err);
        return res.status(500).json({ error: 'No se pudieron listar las clínicas.' });
    }
};

// null/'' → null (sin fecha); inválida → undefined (error); válida → ISO.
function fechaONull(v) {
    if (v === null || v === '') return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

// PATCH /plataforma/clinicas/:id/suscripcion — activar, renovar o cambiar de plan.
exports.actualizarSuscripcion = async (req, res) => {
    try {
        const clinicaId = req.params.id;
        const { planId, estado, ciclo, profesionalesExtra, pruebaHasta, periodoHasta, notas } = req.body;

        const { data: cli, error: cliErr } = await supabase
            .from('clinica').select('id').eq('id', clinicaId).maybeSingle();
        if (cliErr) return res.status(400).json({ error: cliErr.message });
        if (!cli) return res.status(404).json({ error: 'Clínica no encontrada.' });

        const patch = { actualizada_en: new Date().toISOString() };
        if (planId !== undefined) {
            const todos = await planes.getPlanes();
            if (!todos.has(planId)) return res.status(400).json({ error: 'Plan inexistente.' });
            patch.plan_id = planId;
        }
        if (estado !== undefined) patch.estado = estado;
        if (ciclo !== undefined) patch.ciclo = ciclo;
        if (profesionalesExtra !== undefined) patch.profesionales_extra = profesionalesExtra;
        if (notas !== undefined) patch.notas = notas || null;
        const fechas = [['pruebaHasta', 'prueba_hasta', pruebaHasta], ['periodoHasta', 'periodo_hasta', periodoHasta]];
        for (const [campo, col, valor] of fechas) {
            if (valor === undefined) continue;
            const f = fechaONull(valor);
            if (f === undefined) return res.status(400).json({ error: `Fecha inválida en ${campo}.` });
            patch[col] = f;
        }

        const { data: actual, error: aErr } = await supabase
            .from('suscripcion').select('clinica_id').eq('clinica_id', clinicaId).maybeSingle();
        if (aErr) return res.status(400).json({ error: aErr.message });

        // Una clínica sin suscripción (legacy) la obtiene acá.
        const q = actual
            ? supabase.from('suscripcion').update(patch).eq('clinica_id', clinicaId)
            : supabase.from('suscripcion').insert({ clinica_id: clinicaId, plan_id: planes.PLAN_PRUEBA, ...patch });
        const { data, error } = await q.select('*').single();
        if (error) return res.status(400).json({ error: error.message });

        planes.invalidar(clinicaId);
        return res.json({ message: 'Suscripción actualizada', estado: planes.calcularEstado(data) });
    } catch (err) {
        console.error('Error en plataforma/suscripcion:', err);
        return res.status(500).json({ error: 'No se pudo actualizar la suscripción.' });
    }
};

// PATCH /plataforma/planes/:id — precios, asientos y features de un plan.
exports.actualizarPlan = async (req, res) => {
    try {
        const b = req.body;
        if (b.features) {
            const invalidas = b.features.filter((f) => !planes.FEATURES[f]);
            if (invalidas.length) return res.status(400).json({ error: `Funciones desconocidas: ${invalidas.join(', ')}` });
        }
        const columnas = {
            nombre: 'nombre', descripcion: 'descripcion', precioMensual: 'precio_mensual',
            precioAnual: 'precio_anual', profesionalesIncluidos: 'profesionales_incluidos',
            precioProfesionalExtra: 'precio_profesional_extra', maxRecepcion: 'max_recepcion',
            features: 'features', destacado: 'destacado', activo: 'activo',
        };
        const patch = { actualizado_en: new Date().toISOString() };
        for (const [k, col] of Object.entries(columnas)) if (b[k] !== undefined) patch[col] = b[k];

        const { data, error } = await supabase
            .from('plan').update(patch).eq('id', req.params.id).select('id').maybeSingle();
        if (error) return res.status(400).json({ error: error.message });
        if (!data) return res.status(404).json({ error: 'Plan no encontrado.' });

        planes.invalidar();
        return res.json({ message: 'Plan actualizado' });
    } catch (err) {
        console.error('Error en plataforma/planes:', err);
        return res.status(500).json({ error: 'No se pudo actualizar el plan.' });
    }
};
