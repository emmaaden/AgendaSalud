const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

exports.data = async (req, res) => {
    try {
        const { dni } = req.body;

        if (!dni) {
            return res.status(400).json({ error: 'Debe enviar un DNI.' });
        }

        const { data, error } = await supabase
            .from('pacientes_ortodoncia')
            .select(`
                valor,
                aumento,
                paciente(
                    persona(
                        dni,
                        nombre,
                        apellido
                    )
                )
                `)
            .eq('paciente.persona.dni', dni)
            .single();

        if (error || !data) {
            console.error("Error:", error);
            return res.status(404).json({ error: 'No se encontraron datos de ortodoncia para ese paciente.' });
        }

        return res.status(200).json({
            valor: data.valor,
            aumento: data.aumento,
            nombre: data.paciente.persona.nombre,
            apellido: data.paciente.persona.apellido
        });


    } catch (err) {
        console.error('Error en /data:', err);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
};
