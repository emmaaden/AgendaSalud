const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

exports.register = async (req, res) => {
    const { email, password, activationCode, dni, nombre, apellido, fechaNacimiento, telefono, telefono_profesional, direccion, direccion_profesional, obraSocial, sexo, especialidad, matricula, role, area } = req.body;

    try {
        // Creamos usuairo en Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        })
        if (error) { return res.status(400).json({ error: error.message }) };

        const user = data.user

        if (!user) {
            return res.status(200).json({
                message: "Usuario registrado, pero falta confirmar el email antes de insertar en la tabla",
            });
        }

        const userId = data.user.id

        const { data: persona_data, error: persona_error } = await supabase
            .from("persona")
            .insert([{
                id_auth: userId,
                dni,
                nombre,
                apellido,
                fecha_nacimiento: fechaNacimiento,
                telefono,
                direccion,
                sexo
            }])
            .select()
            .single();

        if (persona_error) throw persona_error;

        const id_persona = persona_data.id;


        // Insertar en la tabla correspondiente
        let insertError;
        if (role === "PACIENTE") {
            const { error: err } = await supabase
                .from("paciente")
                .insert([{
                    id_persona,
                    obra_social: obraSocial
                }]);
            if (err) throw err;
        }

        if (role === "PROFESIONAL") {
            const { data: data_prof, error: err_prof } = await supabase
                .from("profesional")
                .insert([{
                    id_persona,
                    telefono: telefono_profesional,
                    direccion: direccion_profesional,
                    matricula
                }])
                .select()
                .single();
            if (err_prof) throw err_prof;

            const { error: err_esp } = await supabase
                .from("especialidad_profesional")
                .insert([{
                    id_profesional: data_prof.id,
                    id_especialidad: especialidad
                }]);
            if (err_esp) throw err_esp;
        }


        /*  if (insertError) {
             console.error("Error insertando en tabla:", insertError);
             return res.status(400).json({ error: insertError.message });
         } */

        res.json({ message: "Registro exitoso", user: { id: userId, email: user.email, role } });

    } catch (err) {
        console.error("Error detallado en registro:", err);
        res.status(500).json({ error: "Error en el registro" });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Autenticación con Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }

        const userId = data.user.id;
        let role = null;

        // 2. Buscar en tabla PACIENTE
        const { data: paciente, error: pacienteError } = await supabase
            .from("paciente")
            .select("user_id, nombre")
            .eq("user_id", userId)
            .maybeSingle();

        if (paciente) {
            role = "paciente";
        }

        // 3. Buscar en tabla PROFESIONAL (solo si no es paciente)
        if (!role) {
            const { data: profesional, error: profesionalError } = await supabase
                .from("profesional")
                .select("user_id, nombre")
                .eq("user_id", userId)
                .maybeSingle();

            if (profesional) {
                role = "profesional";
            }
        }

        // 4. Si no está en ninguna tabla
        if (!role) {
            return res.status(403).json({ error: "El usuario no tiene rol asignado" });
        }
        req.session.isAuthenticated = true;
        req.session.user = { id: userId, email: data.user.email, role };

        res.json({ message: "Login exitoso", user: req.session.user });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al iniciar sesión" });
    }
};

exports.logout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Error al cerrar sesión', err });
        }
        res.status(200).json({ message: 'Sesión cerrada exitosamente' });
    });
};