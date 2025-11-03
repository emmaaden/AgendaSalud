const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

exports.saveHours = async (req, res) => {
    try {
        const { id, user_id, dia, startHour, endHour } = req.body;

        if (!id || !user_id || !dia || !startHour || !endHour) {
            return res.status(400).json({ error: 'Datos incompletos' });
        }

        const { data, error } = await supabase
            .from('horario_profesional')
            .update({
                dia,
                horario_inicio: startHour,
                horario_fin: endHour
            })
            .eq('id', id)
            .eq('id_profesional', user_id)
            .select();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Horario no encontrado' });
        }

        res.status(200).json({
            success: true,
            message: 'Horario actualizado correctamente.',
            horario: data[0]
        });
    } catch (err) {
        console.error('Error al actualizar el horario:', err);
        res.status(500).json({ error: 'Error al actualizar el horario.' });
    }
};

exports.insertHours = async (req, res) => {
    try {
        const { user_id, dia, startHour, endHour } = req.body;

        if (!user_id || !dia || !startHour || !endHour) {
            return res.status(400).json({ error: 'Datos incompletos' });
        }

        const { data, error } = await supabase
            .from('horario_profesional')
            .insert({
                id_profesional: user_id,
                dia,
                horario_inicio: startHour,
                horario_fin: endHour
            })
            .select();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(201).json({
            success: true,
            message: 'Horario insertado correctamente.',
            horario: data[0]
        });
    } catch (err) {
        console.error('Error al insertar el horario:', err);
        res.status(500).json({ error: 'Error al insertar el horario.' });
    }
};

// Obtener horarios del profesional
exports.getHours = async (req, res) => {
    try {
        const { user_id } = req.query;  // 🔹 Cambiado a query params porque lo llamás con GET
        if (!user_id) {
            return res.status(400).json({ error: "Falta el user_id" });
        }

        const { data, error } = await supabase
            .from("horario_profesional")
            .select("*")
            .eq("id_profesional", user_id);

        if (error) {
            console.error("Error obteniendo el horario del profesional:", error);
            return res.status(400).json({ error: error.message });
        }

        if (data.length === 0) {
            return res.json([]); // 🔹 Devuelve array vacío si no hay horarios
        }

        return res.json(data); // 🔹 Devuelve array directo
    } catch (err) {
        console.error("Error al obtener los horarios:", err);
        res.status(500).json({ error: "Error al obtener los horarios." });
    }
};

exports.deleteHours = async (req, res) => {
    try {
        const { id, user_id } = req.body;
        const { error } = await supabase
            .from('horario_profesional')
            .delete()
            .eq('id', id)
            .eq('id_profesional', user_id);

        if (error) {
            console.error("Error obteniendo el horario del profesional:", error);
            return res.status(400).json({ error: error.message });
        }

        return res.status(200).json({ message: 'Horario borrado con exito' });

    } catch (err) {
        console.error("Error al borrar el horario:", err);
        res.status(500).json({ error: "Error al borrar el horario." });
    }
};