// Fase 2c: opera con el cliente por-JWT (RLS por clinica_id a nivel Postgres).
const { getUserSupabase } = require('../middleware/userSupabase');

exports.data = async (req, res) => {
    try {
        const { dni } = req.body;

        if (!dni) {
            return res.status(400).json({ error: 'Debe enviar un DNI.' });
        }

        const clinicaId = req.session.user.clinicaId;
        if (!clinicaId) {
            return res.status(400).json({ error: 'Tu usuario no tiene una clínica asignada.' });
        }

        const db = await getUserSupabase(req);
        if (!db) return res.status(401).json({ error: 'Tu sesión expiró. Iniciá sesión de nuevo.' });

        const { data, error } = await db
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
            .eq('paciente.persona.clinica_id', clinicaId)
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
