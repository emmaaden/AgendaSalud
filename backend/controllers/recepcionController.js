// Gestión de turnos por el STAFF de una clínica (Fase E).
// Lo usan recepción, profesionales y admin. La recepción es el caso principal:
// su único trabajo es gestionar los turnos de la clínica.
//
// Igual que el panel de administración (Fase B), se opera con el cliente service_role
// SIEMPRE acotado por `req.session.user.clinicaId` (la clínica activa, derivada del
// servidor). Motivo: buscar por DNI/nombre exige cruzar persona/paciente y crear el
// evento en Google Calendar, cosas que la RLS por-JWT del paciente no permite. La
// seguridad la dan el guard `requireStaffClinica` + el scoping explícito por clínica.

const { supabase } = require('../config/supabaseClient');
const { generarTokenGestion } = require('../utils/turnoToken');
const { sendMail } = require('../utils/mailer');
const { estaLibre } = require('../utils/disponibilidad');

// Campos del turno que se devuelven al panel del staff.
const SELECT_STAFF = `
    id, inicio, fin, estado, id_paciente, id_profesional,
    profesional_nombre, especialidad,
    paciente_nombre, paciente_email, paciente_telefono,
    paciente:id_paciente ( persona:id_persona ( dni ) )
`;

// Aplana el turno para el cliente (agrega el DNI del paciente vinculado, si lo hay).
function mapTurno(t) {
    const persona = t.paciente?.persona;
    const dni = Array.isArray(persona) ? persona[0]?.dni : persona?.dni;
    return {
        id: t.id,
        inicio: t.inicio,
        fin: t.fin,
        estado: t.estado,
        profesionalId: t.id_profesional,
        profesionalNombre: t.profesional_nombre,
        especialidad: t.especialidad,
        pacienteNombre: t.paciente_nombre,
        pacienteEmail: t.paciente_email,
        pacienteTelefono: t.paciente_telefono,
        pacienteDni: dni || null,
        esInvitado: t.id_paciente == null,
    };
}

// Patrón ilike para búsquedas: "juan perez" -> "*juan*perez*" (matchea aunque haya
// más texto en el medio). Sanea caracteres que romperían el filtro or() de PostgREST.
function patronBusqueda(q) {
    const limpio = String(q || '')
        .replace(/[,()*%]/g, ' ')
        .trim()
        .replace(/\s+/g, '*');
    return limpio ? `*${limpio}*` : null;
}

function fechaLocal(iso) {
    return new Date(iso).toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        dateStyle: 'full',
        timeStyle: 'short',
    });
}

// ---------------------------------------------------------------------------
// GET /staff/turnos?q=&estado=&desde=&hasta=
// Lista/busca los turnos de la clínica activa. `q` matchea por nombre, email o DNI.
// ---------------------------------------------------------------------------
exports.listarTurnos = async (req, res) => {
    try {
        const clinicaId = req.session.user.clinicaId;
        const { q, estado, desde, hasta } = req.query;

        let query = supabase
            .from('turno')
            .select(SELECT_STAFF)
            .eq('clinica_id', clinicaId)
            .order('inicio', { ascending: true })
            .limit(300);

        if (estado === 'reservado' || estado === 'cancelado') {
            query = query.eq('estado', estado);
        }
        if (desde) query = query.gte('inicio', desde);
        if (hasta) query = query.lte('inicio', hasta);

        const patron = patronBusqueda(q);
        if (patron) {
            // Resolver ids de paciente cuyo DNI/nombre/apellido matchean (para el DNI,
            // que el turno no guarda como snapshot). Acotado a la clínica activa.
            const { data: personas } = await supabase
                .from('persona')
                .select('paciente ( id )')
                .eq('clinica_id', clinicaId)
                .or(`dni.ilike.${patron},nombre.ilike.${patron},apellido.ilike.${patron}`);
            const idsPaciente = (personas || [])
                .flatMap((p) => (Array.isArray(p.paciente) ? p.paciente : p.paciente ? [p.paciente] : []))
                .map((pa) => pa.id)
                .filter((id) => id != null);

            const orParts = [
                `paciente_nombre.ilike.${patron}`,
                `paciente_email.ilike.${patron}`,
            ];
            if (idsPaciente.length) orParts.push(`id_paciente.in.(${idsPaciente.join(',')})`);
            query = query.or(orParts.join(','));
        } else if (!desde && !hasta) {
            // Sin búsqueda ni rango: por defecto, desde el comienzo de hoy (turnos
            // vigentes/próximos), para no arrastrar todo el histórico.
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            query = query.gte('inicio', hoy.toISOString());
        }

        const { data, error } = await query;
        if (error) throw error;

        return res.json({ turnos: (data || []).map(mapTurno) });
    } catch (err) {
        console.error('Error listando turnos (staff):', err);
        return res.status(500).json({ error: 'Error al listar los turnos.' });
    }
};

// ---------------------------------------------------------------------------
// GET /staff/profesionales
// Profesionales de la clínica activa (para el formulario de "nuevo turno").
// ---------------------------------------------------------------------------
exports.listarProfesionales = async (req, res) => {
    try {
        const clinicaId = req.session.user.clinicaId;

        const { data, error } = await supabase
            .from('profesional')
            .select(`
                id,
                persona:id_persona!inner ( nombre, apellido, clinica_id ),
                especialidad_profesional ( especialidad:id_especialidad ( nombre ) )
            `)
            .eq('persona.clinica_id', clinicaId);
        if (error) throw error;

        const profesionales = (data || []).map((p) => ({
            id: p.id,
            nombre: [p.persona?.nombre, p.persona?.apellido].filter(Boolean).join(' '),
            especialidad: p.especialidad_profesional?.[0]?.especialidad?.nombre || null,
        }));

        return res.json({ profesionales });
    } catch (err) {
        console.error('Error listando profesionales (staff):', err);
        return res.status(500).json({ error: 'Error al listar los profesionales.' });
    }
};

// Envía el email de confirmación/actualización de un turno (best-effort).
function enviarEmailTurno({ req, tipo, email, inicio, profesionalNombre, especialidad, manageToken }) {
    if (!email) return;
    const fecha = fechaLocal(inicio);
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const con = profesionalNombre ? ` con ${profesionalNombre}` : '';
    const esp = especialidad ? ` (${especialidad})` : '';

    const asuntos = {
        confirmacion: 'Confirmación de tu turno - Agenda Salud',
        reprogramacion: 'Tu turno fue reprogramado - Agenda Salud',
        cancelacion: 'Tu turno fue cancelado - Agenda Salud',
    };
    const encabezados = {
        confirmacion: `Tu turno${con}${esp} quedó <strong>agendado</strong> para el <strong>${fecha} hs</strong>.`,
        reprogramacion: `Tu turno${con}${esp} fue <strong>reprogramado</strong> para el <strong>${fecha} hs</strong>.`,
        cancelacion: `Tu turno${con}${esp} del <strong>${fecha} hs</strong> fue <strong>cancelado</strong>.`,
    };

    const gestion = manageToken
        ? `<p>Para ver o cancelar este turno, entrá a <a href="${baseUrl}/gestionar-turno?token=${manageToken}">este enlace</a>. Guardalo: es personal.</p>`
        : '';
    const gestionText = manageToken
        ? `\nVer o cancelar: ${baseUrl}/gestionar-turno?token=${manageToken}`
        : '';

    sendMail({
        to: email,
        subject: asuntos[tipo],
        text: `Hola,\n\n${encabezados[tipo].replace(/<[^>]+>/g, '')}${gestionText}\n\nAgenda Salud.`,
        html: `<p>Hola,</p><p>${encabezados[tipo]}</p>${gestion}<p>Gracias por usar Agenda Salud.</p>`,
    }).catch((e) => console.error('Error enviando email de turno:', e.message));
}

// ---------------------------------------------------------------------------
// POST /staff/turnos  { profId, start, end, nombre, email, telefono?, dni? }
// Crea un turno para un paciente. Valida que el profesional sea de la clínica activa
// y que el horario siga libre (turnos reservados + bloqueos).
// ---------------------------------------------------------------------------
exports.crearTurno = async (req, res) => {
    try {
        const clinicaId = req.session.user.clinicaId;
        const { profId, start, end, nombre, email, telefono, dni } = req.body;

        // 1. Profesional -> snapshot, validando que sea de la clínica.
        const { data: prof, error: profErr } = await supabase
            .from('profesional')
            .select(`
                persona:id_persona ( clinica_id, nombre, apellido ),
                especialidad_profesional ( especialidad:id_especialidad ( nombre ) )
            `)
            .eq('id', profId)
            .maybeSingle();
        if (profErr) throw profErr;
        if (!prof) return res.status(404).json({ error: 'Profesional no encontrado.' });
        if (prof.persona?.clinica_id !== clinicaId) {
            return res.status(403).json({ error: 'El profesional no pertenece a tu clínica.' });
        }

        const profNombre = [prof.persona?.nombre, prof.persona?.apellido].filter(Boolean).join(' ') || null;
        const especialidad = prof.especialidad_profesional?.[0]?.especialidad?.nombre || null;

        // 2. Verificar que el horario siga libre (turnos reservados + bloqueos).
        if (!(await estaLibre(profId, start.dateTime, end.dateTime))) {
            return res.status(409).json({ error: 'Ese horario no está disponible (ocupado o bloqueado).' });
        }

        // 3. Si se pasó un DNI, intentar vincular con un paciente de la clínica.
        let idPaciente = null;
        if (dni && String(dni).trim()) {
            const { data: per } = await supabase
                .from('persona')
                .select('paciente ( id )')
                .eq('clinica_id', clinicaId)
                .eq('dni', String(dni).trim())
                .maybeSingle();
            const pa = per && (Array.isArray(per.paciente) ? per.paciente[0] : per.paciente);
            if (pa?.id) idPaciente = pa.id;
        }

        // 4. Registrar el turno (fuente de verdad del vínculo). Si es invitado (sin
        //    cuenta), se genera un token para que también pueda gestionarlo por email.
        const turnoRow = {
            id_profesional: profId,
            id_paciente: idPaciente,
            clinica_id: clinicaId,
            profesional_nombre: profNombre,
            especialidad,
            paciente_nombre: nombre,
            paciente_email: email,
            paciente_telefono: telefono ? String(telefono) : null,
            inicio: start.dateTime,
            fin: end.dateTime,
        };
        let manageToken = null;
        if (!idPaciente) {
            const { token, hash } = generarTokenGestion();
            manageToken = token;
            turnoRow.manage_token_hash = hash;
        }

        const { data: creado, error: insErr } = await supabase
            .from('turno')
            .insert(turnoRow)
            .select(SELECT_STAFF)
            .single();
        if (insErr) throw insErr;

        // 5. Email de confirmación (best-effort).
        enviarEmailTurno({
            req, tipo: 'confirmacion', email,
            inicio: start.dateTime, profesionalNombre: profNombre, especialidad, manageToken,
        });

        return res.status(201).json({ message: 'Turno creado', turno: mapTurno(creado) });
    } catch (err) {
        console.error('Error creando turno (staff):', err);
        return res.status(500).json({ error: 'Error al crear el turno.' });
    }
};

// Carga un turno de la clínica activa (o null). Trae los campos internos de calendario.
async function cargarTurnoDeClinica(id, clinicaId) {
    const { data, error } = await supabase
        .from('turno')
        .select('id, estado, inicio, fin, clinica_id, id_profesional, paciente_email, profesional_nombre, especialidad, id_paciente, manage_token_hash')
        .eq('id', id)
        .eq('clinica_id', clinicaId)
        .maybeSingle();
    if (error) throw error;
    return data || null;
}

// ---------------------------------------------------------------------------
// POST /staff/turnos/:id/cancelar
// ---------------------------------------------------------------------------
exports.cancelarTurno = async (req, res) => {
    try {
        const clinicaId = req.session.user.clinicaId;
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(400).json({ error: 'Turno inválido.' });

        const turno = await cargarTurnoDeClinica(id, clinicaId);
        if (!turno) return res.status(404).json({ error: 'Turno no encontrado.' });
        if (turno.estado === 'cancelado') {
            return res.json({ message: 'El turno ya estaba cancelado.' });
        }

        const { error } = await supabase
            .from('turno')
            .update({ estado: 'cancelado' })
            .eq('id', id)
            .eq('clinica_id', clinicaId);
        if (error) throw error;

        enviarEmailTurno({
            req, tipo: 'cancelacion', email: turno.paciente_email,
            inicio: turno.inicio, profesionalNombre: turno.profesional_nombre, especialidad: turno.especialidad,
        });

        return res.json({ message: 'Turno cancelado.' });
    } catch (err) {
        console.error('Error cancelando turno (staff):', err);
        return res.status(500).json({ error: 'Error al cancelar el turno.' });
    }
};

// ---------------------------------------------------------------------------
// POST /staff/turnos/:id/reprogramar  { start, end }
// ---------------------------------------------------------------------------
exports.reprogramarTurno = async (req, res) => {
    try {
        const clinicaId = req.session.user.clinicaId;
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(400).json({ error: 'Turno inválido.' });
        const { start, end } = req.body;

        const turno = await cargarTurnoDeClinica(id, clinicaId);
        if (!turno) return res.status(404).json({ error: 'Turno no encontrado.' });
        if (turno.estado === 'cancelado') {
            return res.status(409).json({ error: 'No se puede reprogramar un turno cancelado.' });
        }

        // El nuevo horario debe estar libre (excluyendo este mismo turno).
        if (!(await estaLibre(turno.id_profesional, start.dateTime, end.dateTime, id))) {
            return res.status(409).json({ error: 'Ese horario no está disponible (ocupado o bloqueado).' });
        }

        const { data: actualizado, error } = await supabase
            .from('turno')
            .update({ inicio: start.dateTime, fin: end.dateTime })
            .eq('id', id)
            .eq('clinica_id', clinicaId)
            .select(SELECT_STAFF)
            .single();
        if (error) throw error;

        enviarEmailTurno({
            req, tipo: 'reprogramacion', email: turno.paciente_email,
            inicio: start.dateTime, profesionalNombre: turno.profesional_nombre, especialidad: turno.especialidad,
        });

        return res.json({ message: 'Turno reprogramado.', turno: mapTurno(actualizado) });
    } catch (err) {
        console.error('Error reprogramando turno (staff):', err);
        return res.status(500).json({ error: 'Error al reprogramar el turno.' });
    }
};

// ---------------------------------------------------------------------------
// POST /staff/turnos/:id/reenviar-confirmacion
// ---------------------------------------------------------------------------
exports.reenviarConfirmacion = async (req, res) => {
    try {
        const clinicaId = req.session.user.clinicaId;
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(400).json({ error: 'Turno inválido.' });

        const turno = await cargarTurnoDeClinica(id, clinicaId);
        if (!turno) return res.status(404).json({ error: 'Turno no encontrado.' });
        if (turno.estado === 'cancelado') {
            return res.status(409).json({ error: 'El turno está cancelado.' });
        }
        if (!turno.paciente_email) {
            return res.status(400).json({ error: 'El turno no tiene un email de contacto.' });
        }

        enviarEmailTurno({
            req, tipo: 'confirmacion', email: turno.paciente_email,
            inicio: turno.inicio, profesionalNombre: turno.profesional_nombre, especialidad: turno.especialidad,
        });

        return res.json({ message: 'Confirmación reenviada.' });
    } catch (err) {
        console.error('Error reenviando confirmación (staff):', err);
        return res.status(500).json({ error: 'Error al reenviar la confirmación.' });
    }
};

// ---------------------------------------------------------------------------
// Bloqueos de horario (ausencias). Reemplazan al "bloquear tiempo" que antes se
// hacía creando un evento suelto en Google Calendar. La disponibilidad los descuenta.
// ---------------------------------------------------------------------------

// GET /staff/bloqueos — bloqueos vigentes (fin >= ahora) de la clínica activa.
exports.listarBloqueos = async (req, res) => {
    try {
        const clinicaId = req.session.user.clinicaId;
        const { data, error } = await supabase
            .from('bloqueo_horario')
            .select('id, id_profesional, inicio, fin, motivo, profesional:id_profesional ( persona:id_persona ( nombre, apellido ) )')
            .eq('clinica_id', clinicaId)
            .gte('fin', new Date().toISOString())
            .order('inicio', { ascending: true });
        if (error) throw error;

        const bloqueos = (data || []).map((b) => {
            const persona = b.profesional?.persona;
            const p = Array.isArray(persona) ? persona[0] : persona;
            return {
                id: b.id,
                profesionalId: b.id_profesional,
                profesionalNombre: [p?.nombre, p?.apellido].filter(Boolean).join(' ') || null,
                inicio: b.inicio,
                fin: b.fin,
                motivo: b.motivo,
            };
        });
        return res.json({ bloqueos });
    } catch (err) {
        console.error('Error listando bloqueos (staff):', err);
        return res.status(500).json({ error: 'Error al listar los bloqueos.' });
    }
};

// POST /staff/bloqueos  { profId, inicio, fin, motivo? }
exports.crearBloqueo = async (req, res) => {
    try {
        const clinicaId = req.session.user.clinicaId;
        const { profId, inicio, fin, motivo } = req.body;

        if (new Date(fin) <= new Date(inicio)) {
            return res.status(400).json({ error: 'El fin debe ser posterior al inicio.' });
        }

        // El profesional debe pertenecer a la clínica activa.
        const { data: prof, error: profErr } = await supabase
            .from('profesional')
            .select('persona:id_persona ( clinica_id )')
            .eq('id', profId)
            .maybeSingle();
        if (profErr) throw profErr;
        if (!prof) return res.status(404).json({ error: 'Profesional no encontrado.' });
        if (prof.persona?.clinica_id !== clinicaId) {
            return res.status(403).json({ error: 'El profesional no pertenece a tu clínica.' });
        }

        const { data: creado, error } = await supabase
            .from('bloqueo_horario')
            .insert({
                id_profesional: profId,
                clinica_id: clinicaId,
                inicio,
                fin,
                motivo: motivo ? String(motivo).trim() : null,
                creada_por: req.session.user.id,
            })
            .select('id, id_profesional, inicio, fin, motivo')
            .single();
        if (error) throw error;

        return res.status(201).json({ message: 'Bloqueo creado', bloqueo: creado });
    } catch (err) {
        console.error('Error creando bloqueo (staff):', err);
        return res.status(500).json({ error: 'Error al crear el bloqueo.' });
    }
};

// DELETE /staff/bloqueos/:id
exports.eliminarBloqueo = async (req, res) => {
    try {
        const clinicaId = req.session.user.clinicaId;
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(400).json({ error: 'Bloqueo inválido.' });

        const { data, error } = await supabase
            .from('bloqueo_horario')
            .delete()
            .eq('id', id)
            .eq('clinica_id', clinicaId)
            .select('id');
        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Bloqueo no encontrado.' });
        }
        return res.json({ message: 'Bloqueo eliminado.' });
    } catch (err) {
        console.error('Error eliminando bloqueo (staff):', err);
        return res.status(500).json({ error: 'Error al eliminar el bloqueo.' });
    }
};
