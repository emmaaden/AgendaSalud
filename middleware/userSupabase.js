// Cliente Supabase "como el usuario" para los controllers migrados a RLS por JWT (Fase 2c).
//
// Devuelve un cliente Supabase (anon key + JWT del usuario) cuyas consultas corren
// con el rol `authenticated`, de modo que las políticas RLS por clinica_id se aplican
// a nivel Postgres. Refresca el access_token si está por vencer y actualiza la sesión.
//
// Requiere que el login haya guardado req.session.sb (access/refresh/expiresAt). Las
// sesiones creadas antes de Fase 2c no lo tienen: en ese caso devuelve null y el
// controller debe responder pidiendo reautenticación.

const { supabaseAnon, userClientFromToken } = require('../config/supabaseClient');

const MARGEN_SEG = 60; // refrescar si vence en menos de 1 minuto

async function getUserSupabase(req) {
    const sb = req.session && req.session.sb;
    if (!sb || !sb.accessToken || !sb.refreshToken) return null;

    const ahora = Math.floor(Date.now() / 1000);
    if (sb.expiresAt && ahora < sb.expiresAt - MARGEN_SEG) {
        // Token todavía válido.
        return userClientFromToken(sb.accessToken);
    }

    // Token vencido o por vencer: refrescar con el refresh_token.
    const { data, error } = await supabaseAnon.auth.refreshSession({ refresh_token: sb.refreshToken });
    if (error || !data || !data.session) {
        // Refresh falló (refresh_token revocado/expirado): forzar reautenticación.
        return null;
    }

    req.session.sb = {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
    };
    return userClientFromToken(data.session.access_token);
}

module.exports = { getUserSupabase };
