const { createClient } = require('@supabase/supabase-js');
const { glob } = require('fs');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

exports.register = async (req, res) => {
    const {
        email, password, activationCode, nombreClinica,
        dni, nombre, apellido, fechaNacimiento, telefono, telefono_profesional,
        direccion, direccion_profesional, obraSocial, sexo, especialidad, matricula, role, area
    } = req.body;

    try {
        // --- Fase 2: resolver la clínica del profesional ANTES de crear el usuario ---
        // Dos vías de onboarding:
        //   a) código de activación -> se une a una clínica existente (no admin).
        //   b) nombre de clínica     -> crea una clínica nueva y queda como admin.
        let clinicaId = null;
        let esAdmin = false;
        let codigoRow = null;
        const tieneCodigo = activationCode && String(activationCode).trim();
        const tieneNombreClinica = nombreClinica && String(nombreClinica).trim();

        if (role === "PROFESIONAL") {
            if (tieneCodigo) {
                const { data: cod, error: codErr } = await supabase
                    .from("codigo_activacion")
                    .select("id, clinica_id, usado")
                    .eq("codigo", String(activationCode).trim())
                    .maybeSingle();
                if (codErr) throw codErr;
                if (!cod || cod.usado) {
                    return res.status(400).json({ error: "Código de activación inválido o ya utilizado." });
                }
                clinicaId = cod.clinica_id;
                codigoRow = cod;
            } else if (!tieneNombreClinica) {
                return res.status(400).json({ error: "Debés crear una clínica nueva o ingresar un código de activación." });
            }
        }

        // Creamos usuario en Supabase Auth
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) { return res.status(400).json({ error: error.message }); }

        const user = data.user;
        if (!user) {
            return res.status(200).json({
                message: "Usuario registrado, pero falta confirmar el email antes de insertar en la tabla",
            });
        }

        const userId = data.user.id;

        // Crear la clínica nueva (vía b) una vez confirmado el usuario.
        if (role === "PROFESIONAL" && !clinicaId && tieneNombreClinica) {
            const { data: cli, error: cliErr } = await supabase
                .from("clinica")
                .insert([{ nombre: String(nombreClinica).trim() }])
                .select("id")
                .single();
            if (cliErr) throw cliErr;
            clinicaId = cli.id;
            esAdmin = true;
        }

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
                sexo,
                clinica_id: clinicaId
            }])
            .select()
            .single();

        if (persona_error) throw persona_error;

        const id_persona = persona_data.id;

        if (role === "PACIENTE") {
            const { error: err } = await supabase
                .from("paciente")
                .insert([{ id_persona, obra_social: obraSocial }]);
            if (err) throw err;
        }

        if (role === "PROFESIONAL") {
            const { data: data_prof, error: err_prof } = await supabase
                .from("profesional")
                .insert([{
                    id_persona,
                    telefono: telefono_profesional,
                    direccion: direccion_profesional,
                    matricula,
                    es_admin: esAdmin
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

            // Marcar el código de activación como usado.
            if (codigoRow) {
                await supabase
                    .from("codigo_activacion")
                    .update({ usado: true, usado_por: userId })
                    .eq("id", codigoRow.id);
            }
        }

        res.json({ message: "Registro exitoso", user: { id: userId, email: user.email, role } });

    } catch (err) {
        console.error("Error detallado en registro:", err);
        res.status(500).json({ error: "Error en el registro" });
    }
};

exports.login = async (req, res) => {
    const { email, password, role } = req.body;

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

        let idRole = null;
        let clinicaId = null;
        let esAdmin = false;

        // 3. Buscar rol + clínica (scoping multi-clínica).
        if (role == "profesional") {
            const { data: profesional, error: profesionalError } = await supabase
                .from("persona")
                .select(`id, clinica_id, profesional(id, es_admin)`)
                .eq("id_auth", userId)
                .maybeSingle();

            if (profesionalError) {
                console.error("Error al buscar profesional:", profesionalError);
            }

            if (profesional) {
                clinicaId = profesional.clinica_id;
                if (profesional.profesional && profesional.profesional[0]) {
                    idRole = profesional.profesional[0].id;
                    esAdmin = !!profesional.profesional[0].es_admin;
                }
            }
        } else if (role == "paciente") {
            const { data: paciente, error: pacienteError } = await supabase
                .from("persona")
                .select(`id, clinica_id, paciente(id)`)
                .eq("id_auth", userId)
                .maybeSingle();

            if (pacienteError) {
                console.error("Error al buscar paciente:", pacienteError);
            }

            if (paciente) {
                clinicaId = paciente.clinica_id;
                if (paciente.paciente && paciente.paciente[0]) {
                    idRole = paciente.paciente[0].id;
                }
            }
        }

        // 4. Si no está en ninguna tabla
        if (!role) {
            return res.status(403).json({ error: "El usuario no tiene rol asignado" });
        }
        req.session.isAuthenticated = true;
        req.session.user = { idRole, id: userId, email: data.user.email, role, clinicaId, esAdmin };

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

// Área/especialidad del profesional AUTENTICADO (se deriva de la sesión, no del body).
// Usado por la historia clínica y los dashboards. Requiere sesión (ver authRoutes).
exports.getArea = async (req, res) => {
    try {
        const idRole = req.session.user.idRole; // profesional.id
        let area = null;
        if (idRole) {
            const { data, error } = await supabase
                .from('especialidad_profesional')
                .select('id_especialidad ( nombre )')
                .eq('id_profesional', idRole)
                .limit(1);
            if (error) {
                console.error('Error obteniendo el área:', error);
                return res.status(400).json({ error: error.message });
            }
            if (data && data[0] && data[0].id_especialidad) area = data[0].id_especialidad.nombre;
        }
        return res.json({ area });
    } catch (err) {
        console.error('Error en get-area:', err);
        return res.status(500).json({ error: 'Error al obtener el área' });
    }
};

// Solicitud de recuperación de contraseña.
// Dispara el email de recuperación de Supabase Auth (mismo mecanismo que el botón
// "Send recovery" del dashboard). El enlace del email redirige a /reset-password.html,
// donde el usuario define su nueva contraseña.
// Respuesta genérica siempre: no se revela si el email existe (anti-enumeración).
exports.forgotPassword = async (req, res) => {
    const respuestaGenerica = {
        message: 'Si el email está registrado, te enviamos un enlace para restablecer tu contraseña.'
    };
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Debe indicar un email.' });

        const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
        const redirectTo = `${baseUrl}/reset-password.html`;

        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) {
            // Se loguea pero no se expone al cliente.
            console.error('Error en resetPasswordForEmail:', error.message);
        }

        return res.json(respuestaGenerica);
    } catch (err) {
        console.error('Error en forgot-password:', err);
        return res.json(respuestaGenerica);
    }
};

// id_calendario de un profesional a partir de su id (público: lo usa la página de turnos).
exports.getCalenID = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'id de profesional no proporcionado' });

        const { data, error } = await supabase
            .from('profesional')
            .select('id_calendario')
            .eq('id', id)
            .maybeSingle();

        if (error) return res.status(400).json({ error: error.message });
        if (!data) return res.status(404).json({ error: 'Profesional no encontrado' });

        return res.json({ calendarid: data.id_calendario });
    } catch (err) {
        console.error('Error en get-calenID:', err);
        return res.status(500).json({ error: 'Error al obtener el calendario' });
    }
};

// Asigna una especialidad al profesional AUTENTICADO (se deriva de la sesión).
// Acepta id numérico o nombre de especialidad. Requiere rol profesional (ver authRoutes).
exports.saveArea = async (req, res) => {
    try {
        const idRole = req.session.user.idRole; // profesional.id
        let { especialidad } = req.body;

        if (!idRole) return res.status(400).json({ error: 'Profesional no identificado en la sesión' });
        if (especialidad === undefined || especialidad === null || especialidad === '') {
            return res.status(400).json({ error: 'Debe indicar una especialidad' });
        }

        // Resolver a id si viene un nombre.
        let idEspecialidad = especialidad;
        if (isNaN(Number(especialidad))) {
            const { data, error } = await supabase
                .from('especialidad')
                .select('id')
                .eq('nombre', especialidad)
                .maybeSingle();
            if (error) return res.status(400).json({ error: error.message });
            if (!data) return res.status(404).json({ error: 'Especialidad no encontrada' });
            idEspecialidad = data.id;
        }

        const { error } = await supabase
            .from('especialidad_profesional')
            .upsert({ id_profesional: idRole, id_especialidad: idEspecialidad });
        if (error) return res.status(400).json({ error: error.message });

        return res.json({ message: 'Área asignada correctamente', especialidad: idEspecialidad });
    } catch (err) {
        console.error('Error en save-area:', err);
        return res.status(500).json({ error: 'Error al guardar el área' });
    }
};