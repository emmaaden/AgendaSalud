// Endpoints públicos usados por la página de turnos (paciente sin autenticar).
// Solo exponen datos necesarios para elegir profesional y calcular horarios.

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// GET /professionals
// Lista, agrupado por área/especialidad, los profesionales disponibles.
// Respuesta: [ { area, professionals: [ { id, nombre, id_calendario } ] } ]
exports.listProfessionals = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('especialidad_profesional')
            .select(`
                especialidad:id_especialidad ( nombre ),
                profesional:id_profesional ( id, id_calendario, persona ( nombre, apellido ) )
            `);
        if (error) throw error;

        const porArea = new Map();
        for (const row of data || []) {
            const area = row.especialidad && row.especialidad.nombre;
            const p = row.profesional;
            if (!area || !p) continue;

            const nombre = [p.persona && p.persona.nombre, p.persona && p.persona.apellido]
                .filter(Boolean)
                .join(' ');

            if (!porArea.has(area)) porArea.set(area, []);
            porArea.get(area).push({ id: p.id, nombre, id_calendario: p.id_calendario || null });
        }

        const result = [...porArea.entries()].map(([area, professionals]) => ({ area, professionals }));
        return res.json(result);
    } catch (err) {
        console.error('Error listando profesionales:', err);
        return res.status(500).json({ error: 'Error al obtener los profesionales.' });
    }
};

// GET /api/get-hours
// Horario global (inicio más temprano / fin más tardío) de cada profesional,
// usado por el frontend para calcular las franjas de turnos.
// Respuesta: [ { id, fullName, startHour, endHour } ]
exports.getBookingHours = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('horario_profesional')
            .select(`
                id_profesional,
                horario_inicio,
                horario_fin,
                profesional:id_profesional ( id, persona ( nombre, apellido ) )
            `);
        if (error) throw error;

        const agg = new Map();
        for (const h of data || []) {
            const id = h.id_profesional;
            if (id == null) continue;

            const persona = h.profesional && h.profesional.persona;
            const fullName = [persona && persona.nombre, persona && persona.apellido]
                .filter(Boolean)
                .join(' ');

            const cur = agg.get(id) || {
                id,
                fullName,
                startHour: h.horario_inicio,
                endHour: h.horario_fin,
            };
            // Comparación lexicográfica de 'HH:MM' equivale a comparación temporal.
            if (h.horario_inicio < cur.startHour) cur.startHour = h.horario_inicio;
            if (h.horario_fin > cur.endHour) cur.endHour = h.horario_fin;
            agg.set(id, cur);
        }

        return res.json([...agg.values()]);
    } catch (err) {
        console.error('Error obteniendo horarios:', err);
        return res.status(500).json({ error: 'Error al obtener los horarios.' });
    }
};
