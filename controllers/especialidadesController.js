const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

exports.getEspecialidades = async (req, res) => {
    try {
        const { data, error } = await supabase
        .from('especialidad')
        .select('*');

        if (!data) {
            console.error("Error:", error);
            return res.status(404).json({ error: "No se encontraron especialidades."})
        };

        return res.json({
            especialidades: data      
        });
    } catch (err) {
        console.error("Error en /data:", err);
        return res.status(500).json({ error: "Error interno del servidor." })
    }
}