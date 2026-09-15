// Historia clínica sobre Supabase (Fase 1).
//
// SEGURIDAD: la identidad del profesional SIEMPRE se toma de la sesión, nunca del body.
//   - req.session.user.id     -> persona.id_auth (auth.users)
//   - req.session.user.idRole -> profesional.id
// El nombre del profesional y su área se derivan de la sesión y se guardan como
// snapshot en cada registro_clinico. El body NO puede sobrescribir quién firma el registro.
//
// Las rutas que usan este controller pasan por requireRole('profesional') (ver routes/pacienteRoutes.js).
//
// Fase 2c: este controller opera "como el usuario" (anon key + JWT), de modo que la
// RLS por clinica_id se aplica a nivel Postgres. El cliente se obtiene por-request con
// getUserSupabase(req); el scoping por clinica_id en la app se mantiene como defensa en
// profundidad (y para dar errores claros), pero ya no es lo único que aísla los datos.

const { getUserSupabase } = require('../middleware/userSupabase');

const ESTADOS_DIENTE = ['sano', 'caries', 'tratado', 'falta'];

// Mensaje uniforme cuando la sesión no tiene (o perdió) el token de Supabase.
const ERR_SESION = { status: 401, body: { error: 'Tu sesión expiró. Iniciá sesión de nuevo.' } };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Normaliza una fecha de nacimiento a ISO 'YYYY-MM-DD'.
// El frontend suele enviar 'dd/mm/yyyy' (toLocaleDateString es-AR).
function parseFechaNacimiento(f) {
    if (!f) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(f)) return f.slice(0, 10); // ya viene ISO
    const m = String(f).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
        const [, d, mo, y] = m;
        const yr = y.length === 2 ? `20${y}` : y;
        return `${yr}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return null;
}

// Devuelve un ISO válido para timestamptz o null (para dejar el default now()).
function toIso(v) {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString();
}

// Edad calculada a partir de la fecha de nacimiento (no se confía en el valor del cliente).
function calcEdad(fnac) {
    if (!fnac) return '';
    const b = new Date(fnac);
    if (isNaN(b.getTime())) return '';
    const t = new Date();
    let edad = t.getFullYear() - b.getFullYear();
    const mm = t.getMonth() - b.getMonth();
    if (mm < 0 || (mm === 0 && t.getDate() < b.getDate())) edad--;
    return String(edad);
}

// Fecha + hora legible para la historia clínica.
function fmtFechaHora(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
    });
}

// Fecha (sin hora) legible.
function fmtFecha(iso) {
    if (!iso) return '';
    const s = String(iso);
    // Fecha pura 'YYYY-MM-DD' (ej: fecha_nacimiento): reformatear SIN conversión de
    // zona horaria, para no correr el día. Los timestamptz (con 'T') sí usan tz.
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
}

// Datos del profesional autenticado (nombre + área) tomados de la sesión.
async function getProfContext(db, session) {
    const authId = session.user.id;      // persona.id_auth
    const idRole = session.user.idRole;  // profesional.id

    let nombre = '';
    const { data: per } = await db
        .from('persona')
        .select('nombre, apellido')
        .eq('id_auth', authId)
        .maybeSingle();
    if (per) nombre = [per.nombre, per.apellido].filter(Boolean).join(' ');

    let area = '';
    if (idRole) {
        const { data: esp } = await db
            .from('especialidad_profesional')
            .select('id_especialidad ( nombre )')
            .eq('id_profesional', idRole)
            .limit(1);
        if (esp && esp[0] && esp[0].id_especialidad) area = esp[0].id_especialidad.nombre;
    }

    return { idProfesional: idRole || null, nombre, area, clinicaId: session.user.clinicaId || null };
}

// Inserta el registro clínico + el estado del odontograma (si viene).
async function insertRegistro(db, idPaciente, prof, body) {
    const { sintomas, diagnostico, tratamiento, fecha, dientes, area } = body;

    const registro = {
        id_paciente: idPaciente,
        id_profesional: prof.idProfesional,
        clinica_id: prof.clinicaId,
        profesional_nombre: prof.nombre || null,
        area: prof.area || area || null,
        sintomas: sintomas || null,
        diagnostico: diagnostico || null,
        tratamiento: tratamiento || null,
    };
    const fechaIso = toIso(fecha);
    if (fechaIso) registro.fecha = fechaIso;

    const { data: reg, error: regError } = await db
        .from('registro_clinico')
        .insert(registro)
        .select('id')
        .single();
    if (regError) throw regError;

    if (Array.isArray(dientes) && dientes.length > 0) {
        const rows = dientes
            .filter(d => d && d.numero)
            .map(d => ({
                id_registro: reg.id,
                numero: String(d.numero),
                estado: ESTADOS_DIENTE.includes(d.estado) ? d.estado : 'sano',
                notas: d.notas || null,
            }));
        if (rows.length > 0) {
            const { error: dienteError } = await db.from('registro_diente').insert(rows);
            if (dienteError) throw dienteError;
        }
    }

    return reg.id;
}

// ---------------------------------------------------------------------------
// Alta de paciente + primer registro clínico (rol profesional).
// ---------------------------------------------------------------------------
exports.regisPacient = async (req, res) => {
    try {
        const { fullName, dni, telefono, email, sexo, direccion, fechaNacimiento, obraSocial } = req.body;

        if (!dni || !fullName) {
            return res.status(400).json({ error: 'Nombre y DNI son obligatorios.' });
        }

        const db = await getUserSupabase(req);
        if (!db) return res.status(ERR_SESION.status).json(ERR_SESION.body);

        const prof = await getProfContext(db, req.session);
        if (!prof.clinicaId) {
            return res.status(400).json({ error: 'Tu usuario no tiene una clínica asignada.' });
        }

        // ¿Ya existe una persona con ese DNI EN ESTA CLÍNICA?
        const { data: existente } = await db
            .from('persona')
            .select('id')
            .eq('dni', dni)
            .eq('clinica_id', prof.clinicaId)
            .maybeSingle();
        if (existente) {
            return res.status(409).json({ error: 'Ya existe un paciente con ese DNI en tu clínica.' });
        }

        // 1. persona (asignada a la clínica del profesional)
        const { data: persona, error: personaError } = await db
            .from('persona')
            .insert({
                dni,
                nombre: fullName,
                telefono: telefono || null,
                direccion: direccion || null,
                sexo: sexo || null,
                fecha_nacimiento: parseFechaNacimiento(fechaNacimiento),
                email: email || null,
                clinica_id: prof.clinicaId,
            })
            .select('id')
            .single();
        if (personaError) throw personaError;

        // 2. paciente (si falla, limpiamos la persona huérfana)
        const { data: paciente, error: pacienteError } = await db
            .from('paciente')
            .insert({ id_persona: persona.id, obra_social: obraSocial || null })
            .select('id')
            .single();
        if (pacienteError) {
            await db.from('persona').delete().eq('id', persona.id);
            throw pacienteError;
        }

        // 3. primer registro clínico (+ odontograma)
        await insertRegistro(db, paciente.id, prof, req.body);

        return res.status(201).json({ message: 'Paciente registrado con éxito', id_paciente: paciente.id });
    } catch (err) {
        console.error('Error en regis-pacient:', err);
        return res.status(500).json({ error: err.message || 'Error al registrar el paciente.' });
    }
};

// ---------------------------------------------------------------------------
// Nuevo registro clínico para un paciente existente, buscado por DNI (rol profesional).
// ---------------------------------------------------------------------------
exports.saveDataPacient = async (req, res) => {
    try {
        const { dni } = req.body;
        if (!dni) return res.status(400).json({ error: 'Debe enviar un DNI.' });

        const clinicaId = req.session.user.clinicaId;
        if (!clinicaId) return res.status(400).json({ error: 'Tu usuario no tiene una clínica asignada.' });

        const db = await getUserSupabase(req);
        if (!db) return res.status(ERR_SESION.status).json(ERR_SESION.body);

        const { data: persona, error: personaError } = await db
            .from('persona')
            .select('id, paciente(id)')
            .eq('dni', dni)
            .eq('clinica_id', clinicaId)
            .maybeSingle();
        if (personaError) throw personaError;

        const paciente = persona && persona.paciente && persona.paciente[0];
        if (!paciente) {
            return res.status(404).json({ error: 'Paciente no encontrado.' });
        }

        const prof = await getProfContext(db, req.session);
        await insertRegistro(db, paciente.id, prof, req.body);

        return res.status(201).json({ message: 'Registro guardado con éxito' });
    } catch (err) {
        console.error('Error en save-data-pacient:', err);
        return res.status(500).json({ error: err.message || 'Error al guardar el registro.' });
    }
};

// ---------------------------------------------------------------------------
// Paciente + historial completo, buscado por DNI (rol profesional).
// NO devuelve contraseña ni datos de auth. Acceso controlado por la sesión del profesional.
// ---------------------------------------------------------------------------
exports.getDataPacient = async (req, res) => {
    try {
        const { dni } = req.body;
        if (!dni) return res.status(400).json({ error: 'Debe enviar un DNI.' });

        const clinicaId = req.session.user.clinicaId;
        if (!clinicaId) return res.status(400).json({ error: 'Tu usuario no tiene una clínica asignada.' });

        const db = await getUserSupabase(req);
        if (!db) return res.status(ERR_SESION.status).json(ERR_SESION.body);

        const { data: persona, error: personaError } = await db
            .from('persona')
            .select('nombre, apellido, dni, telefono, direccion, sexo, fecha_nacimiento, email, paciente(id, obra_social)')
            .eq('dni', dni)
            .eq('clinica_id', clinicaId)
            .maybeSingle();
        if (personaError) throw personaError;

        const paciente = persona && persona.paciente && persona.paciente[0];
        if (!paciente) {
            return res.status(404).json({ error: 'Paciente no encontrado.' });
        }

        const { data: registros, error: regError } = await db
            .from('registro_clinico')
            .select('id, profesional_nombre, area, fecha, sintomas, diagnostico, tratamiento, registro_diente(numero, estado, notas)')
            .eq('id_paciente', paciente.id)
            .order('fecha', { ascending: true });
        if (regError) throw regError;

        const history = (registros || []).map(r => ({
            profesional: r.profesional_nombre || '',
            area: r.area || '',
            fecha: fmtFechaHora(r.fecha),
            sintomas: r.sintomas || '',
            diagnostico: r.diagnostico || '',
            tratamiento: r.tratamiento || '',
            dientes: (r.registro_diente || []).map(d => ({
                numero: d.numero,
                estado: d.estado,
                notas: d.notas || '',
            })),
        }));

        const fechaApertura = registros && registros.length > 0 ? fmtFecha(registros[0].fecha) : '';

        return res.status(200).json({
            fullName: [persona.nombre, persona.apellido].filter(Boolean).join(' '),
            telefono: persona.telefono || '',
            email: persona.email || '',
            dni: persona.dni,
            sexo: persona.sexo || '',
            direccion: persona.direccion || '',
            fechaNacimiento: fmtFecha(persona.fecha_nacimiento),
            edad: calcEdad(persona.fecha_nacimiento),
            obraSocial: paciente.obra_social || '',
            fechaApertura,
            history,
        });
    } catch (err) {
        console.error('Error en get-data-pacient:', err);
        return res.status(500).json({ error: err.message || 'Error al obtener los datos del paciente.' });
    }
};
