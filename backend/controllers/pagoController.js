// Pagos de la suscripción de la clínica con Mercado Pago (Fase M).
// Las rutas del admin no pasan por el guard de solo lectura: una clínica vencida
// tiene que poder pagar para salir de ese estado.

const { supabase } = require('../config/supabaseClient');
const mp = require('../utils/mercadopago');
const suscripcionMp = require('../utils/suscripcionMp');

function responderError(res, err, contexto) {
    if (err instanceof suscripcionMp.ErrorNegocio) return res.status(err.status).json({ error: err.message });
    if (err instanceof mp.MpError) {
        console.error(`[mp] ${contexto}:`, err.status, JSON.stringify(err.data));
        return res.status(err.status === 503 ? 503 : 502).json({
            error: err.status === 503
                ? 'El pago online todavía no está habilitado. Contratá por WhatsApp.'
                : 'Mercado Pago no respondió como esperábamos. Probá de nuevo en unos minutos.',
        });
    }
    console.error(`Error en ${contexto}:`, err);
    return res.status(500).json({ error: 'No se pudo completar la operación.' });
}

// Adónde vuelve el admin después de pagar. En desarrollo el SPA corre en otro puerto
// que la API: definí MP_BACK_URL (p. ej. http://localhost:5173/dashboard/plan?pago=mp).
function backUrl(req) {
    // `?pago=mp` marca la vuelta para que el panel sincronice (en local no hay webhooks).
    if (process.env.MP_BACK_URL) return process.env.MP_BACK_URL;
    const base = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
    return `${base}/dashboard/plan?pago=mp`;
}

// Mercado Pago rechaza back_url que no sea pública (p. ej. localhost): se avisa
// antes de llamarlo, con un mensaje que explica qué configurar.
function backUrlValida(url) {
    try {
        const u = new URL(url);
        return u.protocol === 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
    } catch {
        return false;
    }
}

// POST /api/pagos/suscripcion — admin: contratar o cambiar de plan.
exports.contratar = async (req, res) => {
    try {
        const u = req.session.user;
        const vuelta = backUrl(req);
        if (!backUrlValida(vuelta)) {
            console.error(`[mp] back_url inválida para Mercado Pago: ${vuelta}`);
            return res.status(500).json({
                error: 'El pago online no está bien configurado: la dirección de vuelta (MP_BACK_URL o APP_URL) '
                    + 'tiene que ser pública y con https. En desarrollo usá un túnel.',
            });
        }
        if (!u.clinicaId) return res.status(400).json({ error: 'No tenés una clínica activa seleccionada.' });
        const { data: clinica } = await supabase
            .from('clinica').select('nombre').eq('id', u.clinicaId).maybeSingle();
        const r = await suscripcionMp.iniciarContratacion({
            clinicaId: u.clinicaId,
            clinicaNombre: clinica ? clinica.nombre : null,
            personaId: u.personaId,
            planId: req.body.planId,
            ciclo: req.body.ciclo,
            profesionalesExtra: req.body.profesionalesExtra || 0,
            payerEmail: req.body.payerEmail,
            backUrl: vuelta,
        });
        return res.json(r);
    } catch (err) {
        return responderError(res, err, 'pagos/contratar');
    }
};

// POST /api/pagos/suscripcion/sincronizar — admin: al volver del checkout.
exports.sincronizar = async (req, res) => {
    try {
        await suscripcionMp.sincronizarClinica(req.session.user.clinicaId);
        return res.json({ ok: true });
    } catch (err) {
        return responderError(res, err, 'pagos/sincronizar');
    }
};

// POST /api/pagos/suscripcion/cancelar — admin: dar de baja la renovación.
exports.cancelar = async (req, res) => {
    try {
        const r = await suscripcionMp.cancelarRenovacion(req.session.user.clinicaId);
        return res.json({ message: 'Renovación dada de baja', ...r });
    } catch (err) {
        return responderError(res, err, 'pagos/cancelar');
    }
};

// POST /api/pagos/mp/webhook — notificaciones de Mercado Pago (público).
// Se valida la firma si hay MP_WEBHOOK_SECRET. Igual nunca se confía en el cuerpo:
// se vuelve a consultar el recurso en MP y solo se procesan suscripciones propias.
// Si el procesamiento falla se responde 500 para que MP reintente (es idempotente).
exports.webhook = async (req, res) => {
    const tipo = req.query.type || req.query.topic || req.body?.type || req.body?.topic;
    const dataId = req.query['data.id'] || req.body?.data?.id || req.query.id;

    if (process.env.MP_WEBHOOK_SECRET) {
        const ok = mp.firmaValida({
            xSignature: req.get('x-signature'),
            xRequestId: req.get('x-request-id'),
            dataId: req.query['data.id'] || req.body?.data?.id,
            secret: process.env.MP_WEBHOOK_SECRET,
        });
        if (!ok) return res.status(401).json({ error: 'Firma inválida' });
    }
    if (!dataId || !mp.configurado()) return res.status(200).json({ ok: true });

    try {
        if (tipo === 'subscription_preapproval' || tipo === 'preapproval') {
            await suscripcionMp.sincronizarSuscripcion(String(dataId));
        } else if (tipo === 'subscription_authorized_payment' || tipo === 'authorized_payment') {
            await suscripcionMp.sincronizarCobro(String(dataId));
        }
        return res.status(200).json({ ok: true });
    } catch (err) {
        // Un recurso que no existe (404) no se va a arreglar reintentando.
        if (err instanceof mp.MpError && err.status === 404) return res.status(200).json({ ok: true });
        console.error('[mp] webhook', tipo, dataId, err.message);
        return res.status(500).json({ error: 'No se pudo procesar la notificación' });
    }
};
