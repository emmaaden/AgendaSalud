const { createClient } = require('@supabase/supabase-js');
const { slugify } = require('../utils/slug');
const { getMembresiasActivas } = require('../utils/membresias');
require('dotenv').config();

// service_role: SALTEA la RLS. Se usa SOLO para operaciones sobre tablas.
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// anon (sin sesión persistida): se usa para las operaciones de auth (signUp / signIn /
// reset). IMPORTANTE: no se deben hacer los signIn/signUp sobre el cliente `supabase`
// service_role, porque supabase-js le adjunta la sesión del usuario a ese cliente y las
// consultas posteriores dejarían de correr como service_role (pasarían a estar bajo RLS).
const supabaseAuth = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY_PUBLIC, {
    auth: { persistSession: false, autoRefreshToken: false },
});

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

        // Creamos usuario en Supabase Auth (cliente anon: si el signUp devolviera sesión
        // —confirmación de email desactivada— no debe adjuntarse al cliente service_role,
        // porque los INSERT siguientes dejarían de saltear la RLS).
        const { data, error } = await supabaseAuth.auth.signUp({ email, password });
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
            const nombreLimpio = String(nombreClinica).trim();
            const base = slugify(nombreLimpio);
            let slug = base;
            let cli = null, cliErr = null;
            // Reintentar con sufijo aleatorio si el slug ya existe (unique).
            for (let intento = 0; intento < 5; intento++) {
                ({ data: cli, error: cliErr } = await supabase
                    .from("clinica")
                    .insert([{ nombre: nombreLimpio, slug }])
                    .select("id")
                    .single());
                if (!cliErr) break;
                if (cliErr.code !== '23505') throw cliErr; // 23505 = unique_violation
                slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
                cli = null;
            }
            if (!cli) throw cliErr || new Error('No se pudo crear la clínica');
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

            // Fase A: crear la membresía (pertenencia + rol en la clínica).
            //   - alta con código  -> rol 'profesional'
            //   - clínica nueva     -> rol 'admin' (esAdmin=true)
            const { error: err_mem } = await supabase
                .from("membresia")
                .insert([{
                    id_persona,
                    clinica_id: clinicaId,
                    rol: esAdmin ? 'admin' : 'profesional',
                    activo: true,
                }]);
            if (err_mem) throw err_mem;

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
    const { email, password } = req.body;

    try {
        // 1. Autenticación con Supabase Auth (cliente anon, para no adjuntar la sesión
        //    del usuario al cliente service_role).
        const { data, error } = await supabaseAuth.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }

        const userId = data.user.id;

        // 2. Detectar el rol desde la base (NO se confía en un rol enviado por el
        //    cliente). Un mismo formulario de login sirve para profesional y paciente.
        //    Si una persona fuese ambas cosas, se prioriza profesional.
        const { data: persona, error: personaError } = await supabase
            .from("persona")
            .select(`id, clinica_id, profesional(id), paciente(id)`)
            .eq("id_auth", userId)
            .maybeSingle();
        if (personaError) {
            console.error("Error al buscar la persona en login:", personaError);
        }

        const profRow = persona?.profesional?.[0];
        const pacRow = persona?.paciente?.[0];
        const personaId = persona?.id || null;

        let role = null;
        let idRole = null;

        if (profRow) {
            role = "profesional";
            idRole = profRow.id;
        } else if (pacRow) {
            role = "paciente";
            idRole = pacRow.id;
        }

        // 3. Si no está asociado a ningún rol.
        if (!role) {
            return res.status(403).json({ error: "El usuario no tiene rol asignado" });
        }

        // 4. Guardar los tokens de Supabase (Fase 2c: operar por-JWT bajo RLS).
        if (data.session) {
            req.session.sb = {
                accessToken: data.session.access_token,
                refreshToken: data.session.refresh_token,
                expiresAt: data.session.expires_at, // epoch en segundos
            };
        }

        // 5. Fase A — resolver la clínica activa a partir de las MEMBRESÍAS.
        //    Los pacientes siguen mono-clínica (persona.clinica_id).
        req.session.isAuthenticated = true;

        if (role === "paciente") {
            req.session.user = {
                idRole, id: userId, personaId, email: data.user.email, role,
                clinicaId: persona?.clinica_id || null, rol: null, esAdmin: false,
            };
            return res.json({ message: "Login exitoso", user: req.session.user });
        }

        // Profesional/recepción/admin: puede tener N clínicas.
        let membresias = [];
        try {
            membresias = await getMembresiasActivas(supabase, personaId);
        } catch (e) {
            console.error("Error obteniendo membresías en login:", e.message);
        }

        if (membresias.length === 0) {
            // Sin membresía activa: dado de baja en todas sus clínicas, o cuenta legacy
            // sin backfill. No puede operar.
            req.session.destroy(() => {});
            return res.status(403).json({
                error: "No tenés una clínica activa asignada. Contactá al administrador.",
            });
        }

        if (membresias.length === 1) {
            const m = membresias[0];
            req.session.user = {
                idRole, id: userId, personaId, email: data.user.email, role,
                clinicaId: m.clinicaId, rol: m.rol, esAdmin: m.esAdmin,
            };
            return res.json({ message: "Login exitoso", user: req.session.user });
        }

        // Varias clínicas: no se fija ninguna todavía; el cliente debe elegir.
        req.session.user = {
            idRole, id: userId, personaId, email: data.user.email, role,
            clinicaId: null, rol: null, esAdmin: false,
        };
        return res.json({
            message: "Elegí la clínica para trabajar",
            needsClinicSelection: true,
            clinicas: membresias.map((m) => ({ clinicaId: m.clinicaId, nombre: m.nombre, rol: m.rol })),
            user: req.session.user,
        });

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

// Fase A — Lista las membresías (clínicas + rol) del usuario autenticado.
// Sirve para el selector de clínica y para el switch dentro del dashboard.
exports.misClinicas = async (req, res) => {
    try {
        const personaId = req.session.user?.personaId;
        if (!personaId) return res.json({ clinicas: [], activa: null });
        const membresias = await getMembresiasActivas(supabase, personaId);
        return res.json({
            clinicas: membresias.map((m) => ({ clinicaId: m.clinicaId, nombre: m.nombre, rol: m.rol })),
            activa: req.session.user?.clinicaId || null,
        });
    } catch (err) {
        console.error('Error en mis-clinicas:', err);
        return res.status(500).json({ error: 'Error al obtener las clínicas' });
    }
};

// Fase A — Fija la clínica activa de la sesión. Valida que el usuario tenga una
// membresía ACTIVA en la clínica pedida (no se confía en el cliente).
exports.selectClinica = async (req, res) => {
    try {
        const personaId = req.session.user?.personaId;
        const { clinicaId } = req.body;
        if (!personaId) return res.status(403).json({ error: 'Sesión sin identidad.' });
        if (!clinicaId) return res.status(400).json({ error: 'Debés indicar una clínica.' });

        const membresias = await getMembresiasActivas(supabase, personaId);
        const elegida = membresias.find((m) => m.clinicaId === clinicaId);
        if (!elegida) {
            return res.status(403).json({ error: 'No tenés una membresía activa en esa clínica.' });
        }

        req.session.user.clinicaId = elegida.clinicaId;
        req.session.user.rol = elegida.rol;
        req.session.user.esAdmin = elegida.esAdmin;

        return res.json({
            message: 'Clínica seleccionada',
            clinica: { clinicaId: elegida.clinicaId, nombre: elegida.nombre, rol: elegida.rol },
            user: req.session.user,
        });
    } catch (err) {
        console.error('Error en select-clinica:', err);
        return res.status(500).json({ error: 'Error al seleccionar la clínica' });
    }
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
        // Ruta del SPA (React). Se conserva compatibilidad con el legacy .html vía
        // un redirect en el router del frontend.
        const redirectTo = `${baseUrl}/reset-password`;

        const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, { redirectTo });
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

        // onConflict sobre el par (id_profesional, id_especialidad): con la UNIQUE
        // de fase2d, reasignar la misma especialidad es idempotente (no duplica).
        const { error } = await supabase
            .from('especialidad_profesional')
            .upsert(
                { id_profesional: idRole, id_especialidad: idEspecialidad },
                { onConflict: 'id_profesional,id_especialidad' }
            );
        if (error) return res.status(400).json({ error: error.message });

        return res.json({ message: 'Área asignada correctamente', especialidad: idEspecialidad });
    } catch (err) {
        console.error('Error en save-area:', err);
        return res.status(500).json({ error: 'Error al guardar el área' });
    }
};