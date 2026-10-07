// Planes (Fase L): catálogo público para la página de precios y el plan de la
// clínica activa (estado, uso de asientos) para el panel.

const planes = require('../utils/planes');
const { supabase } = require('../config/supabaseClient');
const mp = require('../utils/mercadopago');
const { fechaPrimerCobro, puedeCambiarSinCheckout } = require('../utils/suscripcionMp');

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

        const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const [plan, uso, todos, susRes, pagosRes, pendRes] = await Promise.all([
            planes.getPlanClinica(clinicaId),
            planes.usoClinica(clinicaId),
            planes.getPlanes(),
            // Fase M: débito automático de Mercado Pago y últimos cobros.
            supabase.from('suscripcion')
                .select('estado, ciclo, prueba_hasta, periodo_hasta, mp_preapproval_id, mp_estado, mp_payer_email, monto, renovacion_automatica, proximo_cobro, monto_nuevo, monto_nuevo_desde, aviso_precio_enviado_en')
                .eq('clinica_id', clinicaId).maybeSingle(),
            supabase.from('suscripcion_pago')
                .select('id, fecha, monto, estado, plan_id, ciclo, periodo_desde, periodo_hasta')
                .eq('clinica_id', clinicaId).order('fecha', { ascending: false }).limit(24),
            // Intento de pago reciente sin confirmar: el panel sincroniza solo al abrirse
            // (por si el admin no volvió del checkout por la URL de vuelta).
            supabase.from('suscripcion_checkout').select('mp_preapproval_id', { count: 'exact', head: true })
                .eq('clinica_id', clinicaId).eq('estado', 'pending').gte('creado_en', haceUnaHora),
        ]);
        const s = susRes.data;
        const primerCobro = mp.configurado() ? await fechaPrimerCobro(clinicaId, s) : null;
        return res.json({
            plan,
            uso,
            planes: [...todos.values()].filter((p) => p.activo || p.id === plan?.planId),
            features: planes.FEATURES,
            diasGracia: planes.DIAS_GRACIA,
            pagoOnline: mp.configurado(),
            // Si se contrata ahora, cuándo sería el primer débito (null = al pagar).
            primerCobro: primerCobro ? primerCobro.toISOString() : null,
            pagoPendiente: mp.configurado() && (pendRes.count || 0) > 0,
            debito: s && s.mp_estado ? {
                estado: s.mp_estado,
                payerEmail: s.mp_payer_email,
                monto: s.monto == null ? null : Number(s.monto),
                renovacionAutomatica: s.renovacion_automatica,
                proximoCobro: s.proximo_cobro,
                // Fase M2: nuevo precio ya avisado (rige desde `desde`).
                cambioPrecio: s.monto_nuevo != null && s.aviso_precio_enviado_en ? {
                    monto: Number(s.monto_nuevo), desde: s.monto_nuevo_desde,
                } : null,
            } : null,
            // Con el pago atrasado no se cambia el débito actual: se paga de nuevo.
            cambioSinCheckout: !!s && puedeCambiarSinCheckout(s, s.ciclo),
            pagos: (pagosRes.data || []).map((p) => ({
                id: p.id,
                fecha: p.fecha,
                monto: p.monto == null ? null : Number(p.monto),
                estado: p.estado,
                planId: p.plan_id,
                ciclo: p.ciclo,
                periodoDesde: p.periodo_desde,
                periodoHasta: p.periodo_hasta,
            })),
        });
    } catch (err) {
        console.error('Error en planes/mi-clinica:', err);
        return res.status(500).json({ error: 'No se pudo obtener el plan de la clínica.' });
    }
};
