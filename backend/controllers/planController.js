// Planes (Fase L): catálogo público para la página de precios y el plan de la
// clínica activa (estado, uso de asientos) para el panel.

const planes = require('../utils/planes');

// GET /api/planes/catalogo — público. Planes vigentes + textos de cada feature.
exports.catalogo = async (req, res) => {
    try {
        const todos = await planes.getPlanes();
        return res.json({
            planes: [...todos.values()].filter((p) => p.activo),
            features: planes.FEATURES,
            diasPrueba: planes.DIAS_PRUEBA,
            planPrueba: planes.PLAN_PRUEBA,
        });
    } catch (err) {
        console.error('Error en planes/catalogo:', err);
        return res.status(500).json({ error: 'No se pudieron obtener los planes.' });
    }
};

// GET /api/planes/mi-clinica — staff de la clínica activa. Plan, estado y uso.
exports.miClinica = async (req, res) => {
    try {
        const clinicaId = req.session.user.clinicaId;
        if (!clinicaId) return res.status(400).json({ error: 'No tenés una clínica activa seleccionada.' });

        const [plan, uso, todos] = await Promise.all([
            planes.getPlanClinica(clinicaId),
            planes.usoClinica(clinicaId),
            planes.getPlanes(),
        ]);
        return res.json({
            plan,
            uso,
            planes: [...todos.values()].filter((p) => p.activo || p.id === plan?.planId),
            features: planes.FEATURES,
            diasGracia: planes.DIAS_GRACIA,
        });
    } catch (err) {
        console.error('Error en planes/mi-clinica:', err);
        return res.status(500).json({ error: 'No se pudo obtener el plan de la clínica.' });
    }
};
