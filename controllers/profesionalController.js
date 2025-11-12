const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Datos del profesional
exports.getDatosProf = async (req, res) => {
    try {
        const { user_id } = req.body;

        const { data, error } = await supabase
            .from("persona")
            .select(`
                nombre,
                apellido,
                dni,
                profesional (
                    direccion,
                    telefono,
                    matricula,
                    id_calendario,
                    descripcion,
                    precio
                )
            `)
            .eq("id_auth", user_id)
            .maybeSingle();

        if (error) {
            console.error("Error obteniendo el profesional:", error);
            return res.status(400).json({ error: error.message });
        }

        if (!data) {
            return res.status(404).json({ error: "Profesional no encontrado" });
        }
        return res.json({
            nombre: data.nombre,
            apellido: data.apellido,
            dni: data.dni,
            descripcion: data.profesional[0].descripcion,
            precio: data.profesional[0].precio,
            direccion: data.profesional[0].direccion,
            id_calendario: data.profesional[0].id_calendario,
        });
    } catch (err) {
        console.error("Error interno del servidor:", err);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
};

// Especialidad Profesioanl
exports.getEspProf = async (req, res) => {
    try {
        const { user_id } = req.body;
        const { data, error } = await supabase
            .from('especialidad_profesional')
            .select(`
                id_profesional,
                id_especialidad ( 
                    nombre
                )
            `)
            .eq('id_profesional', user_id);
        if (error) {
            console.error("Error obteniendo el profesional:", error)
            return res.status(400).json({ error: error.message })
        }

        if (!data) {
            return res.status(404).json({ error: "Especialidad del profesional no encontrada" })
        }

        return res.json({ especialidad_profesional: data[0]?.id_especialidad.nombre })
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el área' });
    }
};

// Descripcion
exports.saveDesc = async (req, res) => {
    try {
        const { user_id, descripcion } = req.body;
        const { data, error } = await supabase
            .from("profesional")
            .update({ descripcion: descripcion })
            .eq("id", user_id)
            .select();

        if (error) {
            return res.status(400).json({ error: error.message });
        }
        if (!data) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.status(200).json({ message: 'Descripcion guardada exitosamente', descripcion });
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar la Descripcion', details: error.message });
    }
};

// Precio
exports.savePrecio = async (req, res) => {
    try {
        const { user_id, precio } = req.body;
        const { data, error } = await supabase
            .from("profesional")
            .update({ precio: precio })
            .eq("id", user_id)
            .select();

        if (error) {
            return res.status(400).json({ error: error.message });
        }
        if (!data) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.status(200).json({ message: 'Precio guardado exitosamente', precio });
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar el Precio', details: error.message });
    }
};

// Direccion
exports.saveDirec = async (req, res) => {
    try {
        const { user_id, direccion } = req.body;
        const { data, error } = await supabase
            .from("profesional")
            .update({ direccion: direccion })
            .eq("id", user_id)
            .select();

        if (error) {
            return res.status(400).json({ error: error.message });
        }
        if (!data) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.status(200).json({ message: 'Direccion guardada exitosamente', direccion });
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar la Direccion', details: error.message });
    }
};

// CalendarID
exports.saveCalenID = async (req, res) => {
    try {
        const { user_id, calendarid } = req.body;
        const { data, error } = await supabase
            .from('profesional')
            .update({ id_calendario: calendarid })
            .eq('id', user_id)
            .select();

        if (error) {
            return res.status(400).json({ error: error.message });
        }
        if (!data) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.status(200).json({ message: 'Id calendar guardado exitosamente', calendarid });
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar el calendarid', details: error.message });
    }
};