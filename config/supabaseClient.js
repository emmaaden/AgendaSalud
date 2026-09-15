const { createClient } = require('@supabase/supabase-js');

// Cliente con service_role: SALTEA la RLS. Se usa para operaciones del sistema,
// públicas y para los controllers todavía no migrados a RLS por JWT.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Cliente con la anon key, sin sesión persistida. Se usa para operaciones de auth
// del lado servidor (p. ej. refrescar el token del usuario).
const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY_PUBLIC,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Cliente "como el usuario": anon key + JWT del usuario en el header Authorization.
// Con esto las consultas corren con el rol `authenticated` y la RLS por clinica_id
// se aplica realmente a nivel Postgres (Fase 2c).
function userClientFromToken(accessToken) {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY_PUBLIC,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    }
  );
}

module.exports = { supabase, supabaseAnon, userClientFromToken };
