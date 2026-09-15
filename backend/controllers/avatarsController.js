// Avatar del usuario autenticado (Supabase Storage, bucket 'avatars').
// Fase 2c: la subida usa el cliente por-JWT, de modo que la política de storage
// (avatar_rw_own) obliga a escribir solo 'avatars/<auth.uid()>.png'. La lectura es
// la URL pública del bucket (no pasa por RLS), así que usa el cliente anon.
const { getUserSupabase } = require('../middleware/userSupabase');
const { supabaseAnon } = require('../config/supabaseClient');

exports.uploadAvatar = async (req, res) => {
  const user_id = req.session.user.id; // id de auth.users
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'No se subió ninguna imagen' });

  try {
    const db = await getUserSupabase(req);
    if (!db) return res.status(401).json({ error: 'Tu sesión expiró. Iniciá sesión de nuevo.' });

    // Subir a Supabase (con overwrite si ya existe). El path lo determina la sesión,
    // no el cliente, y la política de storage lo verifica contra auth.uid().
    const { error } = await db.storage
      .from('avatars')
      .upload(`avatars/${user_id}.png`, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (error) throw error;

    // Conseguir la URL pública
    const { data: publicUrl } = db.storage
      .from('avatars')
      .getPublicUrl(`avatars/${user_id}.png`);

    res.json({ url: publicUrl.publicUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al subir la imagen' });
  }
};

exports.getAvatar = async (req, res) => {
  const user_id = req.session.user.id; // id de auth.users

  if (!user_id) return res.status(400).json({ error: 'Falta user_id' });

  try {
    // getPublicUrl solo arma la URL del bucket público (no requiere token ni RLS).
    const { data: publicUrl } = supabaseAnon.storage
      .from('avatars')
      .getPublicUrl(`avatars/${user_id}.png`);

    res.json({ image: publicUrl.publicUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener la imagen' });
  }
};
