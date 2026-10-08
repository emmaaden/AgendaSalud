// Cliente mínimo de la API de Mercado Pago (Fase M): suscripciones (preapproval),
// sus cobros (authorized_payments) y validación de la firma de los webhooks.
// Sin SDK: son cuatro endpoints y fetch nativo (Node ≥ 18) alcanza.
//
// Variables de entorno:
//   MP_ACCESS_TOKEN   access token de la aplicación (TEST-... en pruebas). Sin él, el
//                     cobro online está apagado y la contratación sigue por WhatsApp.
//   MP_WEBHOOK_SECRET clave secreta de los webhooks (Tus integraciones → Webhooks).

const crypto = require('crypto');

const API = 'https://api.mercadopago.com';

function configurado() {
    return !!process.env.MP_ACCESS_TOKEN;
}

class MpError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'MpError';
        this.status = status;
        this.data = data;
    }
}

async function request(method, path, body) {
    if (!configurado()) throw new MpError('Mercado Pago no está configurado (MP_ACCESS_TOKEN).', 503);
    const headers = {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
    };
    // Evita duplicados si un POST se reintenta (MP lo respeta por 24 h).
    if (method === 'POST') headers['X-Idempotency-Key'] = crypto.randomUUID();

    const res = await fetch(`${API}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
        const msg = (data && (data.message || data.error)) || `HTTP ${res.status}`;
        throw new MpError(`Mercado Pago: ${msg}`, res.status, data);
    }
    return data;
}

// --- Suscripciones (preapproval sin plan asociado, con pago pendiente) ---------

// `inicio` (Date, opcional): fecha del primer débito. Sin ella, MP cobra al autorizar.
function crearSuscripcion({ reason, externalReference, payerEmail, monto, meses, backUrl, inicio }) {
    return request('POST', '/preapproval', {
        reason,
        external_reference: externalReference,
        payer_email: payerEmail,
        auto_recurring: {
            frequency: meses,
            frequency_type: 'months',
            ...(inicio ? { start_date: inicio.toISOString() } : {}),
            transaction_amount: monto,
            currency_id: 'ARS',
        },
        back_url: backUrl,
        status: 'pending',
    });
}

function obtenerSuscripcion(id) {
    return request('GET', `/preapproval/${encodeURIComponent(id)}`);
}

function cambiarMonto(id, monto) {
    return request('PUT', `/preapproval/${encodeURIComponent(id)}`, {
        auto_recurring: { transaction_amount: monto, currency_id: 'ARS' },
    });
}

function cancelarSuscripcion(id) {
    return request('PUT', `/preapproval/${encodeURIComponent(id)}`, { status: 'cancelled' });
}

// --- Cobros de una suscripción (facturas) -----------------------------------

function obtenerCobro(id) {
    return request('GET', `/authorized_payments/${encodeURIComponent(id)}`);
}

// MP rechaza limit > ~15 («Invalid value for limit»): se pagina de a 10.
async function cobrosDeSuscripcion(preapprovalId) {
    const cobros = [];
    for (let offset = 0; offset < 1000; offset += 10) {
        const qs = new URLSearchParams({ preapproval_id: preapprovalId, limit: '10', offset: String(offset) });
        const data = await request('GET', `/authorized_payments/search?${qs}`);
        const pagina = (data && data.results) || [];
        cobros.push(...pagina);
        const total = data && data.paging ? data.paging.total : 0;
        if (pagina.length === 0 || cobros.length >= total) break;
    }
    return cobros;
}

// --- Webhooks ------------------------------------------------------------------

// Valida `x-signature` (ts=...,v1=...) con HMAC-SHA256 sobre el manifest
// "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" (las partes ausentes se omiten).
// MP pide el data.id en minúsculas si es alfanumérico: se prueban ambas formas.
function firmaValida({ xSignature, xRequestId, dataId, secret }) {
    if (!xSignature || !secret) return false;
    let ts = null;
    let v1 = null;
    for (const parte of String(xSignature).split(',')) {
        const i = parte.indexOf('=');
        if (i === -1) continue;
        const k = parte.slice(0, i).trim().toLowerCase();
        const v = parte.slice(i + 1).trim();
        if (k === 'ts') ts = v;
        else if (k === 'v1') v1 = v;
    }
    if (!ts || !v1 || !/^\d+$/.test(ts)) return false;

    const candidatos = dataId ? [...new Set([String(dataId), String(dataId).toLowerCase()])] : [null];
    return candidatos.some((id) => {
        const partes = [];
        if (id) partes.push(`id:${id}`);
        if (xRequestId) partes.push(`request-id:${xRequestId}`);
        partes.push(`ts:${ts}`);
        const calculado = crypto.createHmac('sha256', secret).update(partes.join(';') + ';').digest('hex');
        return calculado.length === v1.length
            && crypto.timingSafeEqual(Buffer.from(calculado), Buffer.from(v1));
    });
}

module.exports = {
    MpError,
    configurado,
    crearSuscripcion,
    obtenerSuscripcion,
    cambiarMonto,
    cancelarSuscripcion,
    obtenerCobro,
    cobrosDeSuscripcion,
    firmaValida,
};
