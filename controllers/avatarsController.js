const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

exports.uploadAvatar = async (req, res) => {
  const { user_id } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'No se subió ninguna imagen' });

  try {
    // Subir a Supabase (con overwrite si ya existe)
    const { error } = await supabase.storage
      .from('avatars')
      .upload(`avatars/${user_id}.png`, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (error) throw error;

    // Conseguir la URL pública
    const { data: publicUrl } = supabase.storage
      .from('avatars')
      .getPublicUrl(`avatars/${user_id}.png`);

    res.json({ url: publicUrl.publicUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al subir la imagen' });
  }
};

exports.getAvatar = async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) return res.status(400).json({ error: 'Falta user_id' });

  try {
    const { data: publicUrl } = supabase.storage
      .from('avatars')
      .getPublicUrl(`avatars/${user_id}.png`);

    res.json({ image: publicUrl.publicUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener la imagen' });
  }
};
