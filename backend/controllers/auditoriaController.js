// Auditoría médica (Fase J): bandeja de registros, revisiones, respuestas y bitácora.
//
// Roles (siempre por la MEMBRESÍA de la clínica activa, req.session.user.rol):
//   - auditor: revisa registros. Alcance: interno (toda la clínica) o una obra social.
//   - admin:   ve la bandeja, la bitácora y el resumen (no revisa).
//   - profesional/admin: ve las observaciones de SUS registros y las responde.
//
// LECTURAS: "como el usuario" (getUserSupabase -> JWT + x-clinica-id), así la RLS de
// Postgres aplica el alcance del auditor (obra social) y el aislamiento por clínica.
// El filtro explícito por clinica_id se mantiene como defensa en profundidad.
// ESCRITURAS: service_role, DESPUÉS de comprobar con una lectura por-JWT que el usuario
// ve el registro/revisión (las tablas no conceden INSERT/UPDATE a `authenticated`).

const { supabase } = require('../config/supabaseClient');
const { getUserSupabase } = require('../middleware/userSupabase');
const { serializarDiente } = require('../utils/odontograma');
const { registrarAcceso, nombreActor } = require('../utils/bitacora');

const ERR_SESION = { status: 401, body: { error: 'Tu sesión expiró. Iniciá sesión de nuevo.' } };
const PAGE_SIZE = 20;
const TZ = '-03:00'; // las fechas de los filtros son días calendario de Argentina
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Ítems del checklist de auditoría (cualquier otra clave se descarta).
const CHECKLIST = ['diagnostico', 'tratamiento', 'coherencia', 'odontograma', 'identificacion'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// PostgREST puede devolver un embed 1:1 como objeto o como array.
const uno = (x) => (Array.isArray(x) ? x[0] : x) || null;

const nombreCompleto = (per) => (per ? [per.nombre, per.apellido].filter(Boolean).join(' ') : '');

// Escapa los comodines de LIKE en un texto de búsqueda.
const escaparLike = (s) => String(s).replace(/[\\%_]/g, (c) => `\\${c}`);

function paginar(q) {
    const page = Math.max(1, Number(q.page) || 1);
    const from = (page - 1) * PAGE_SIZE;
    return { page, from, to: from + PAGE_SIZE - 1 };
}

// Aplica desde/hasta (días completos, hora argentina) sobre una columna timestamptz.
function filtrarFechas(query, columna, q) {
    if (q.desde) query = query.gte(columna, `${q.desde}T00:00:00${TZ}`);
    if (q.hasta) query = query.lte(columna, `${q.hasta}T23:59:59.999${TZ}`);
    return query;
}

function calcEdad(fnac) {
    if (!fnac) return null;
    const b = new Date(fnac);
    if (isNaN(b.getTime())) return null;
    const t = new Date();
    let edad = t.getFullYear() - b.getFullYear();
    const mm = t.getMonth() - b.getMonth();
    if (mm < 0 || (mm === 0 && t.getDate() < b.getDate())) edad--;
    return edad;
}

function mapRevision(r) {
    return {
        id: r.id,
        estado: r.estado,
        checklist: r.checklist || {},
        comentario: r.comentario || '',
        auditor: r.auditor_nombre || '',
        creadoEn: r.creado_en,
        respuesta: r.respuesta || null,
        respondidoEn: r.respondido_en || null,
    };
}

// ---------------------------------------------------------------------------
// GET /auditoria/registros — bandeja paginada (auditor | admin).
// ---------------------------------------------------------------------------
exports.listarRegistros = async (req, res) => {
    try {
        const { clinicaId, alcanceObraSocial } = req.session.user;
        const db = await getUserSupabase(req);
        if (!db) return res.status(ERR_SESION.status).json(ERR_SESION.body);

        const q = req.query;
        const { page, from, to } = paginar(q);

        let query = db
            .from('registro_clinico')
            .select(`
                id, fecha, area, profesional_nombre, id_profesional, diagnostico, auditoria_estado,
                paciente:id_paciente!inner ( id, obra_social, persona:id_persona ( nombre, apellido, dni ) )
            `, { count: 'exact' })
            .eq('clinica_id', clinicaId);
        query = filtrarFechas(query, 'fecha', q);
        if (q.idProfesional) query = query.eq('id_profesional', Number(q.idProfesional));
        if (q.estado) query = query.eq('auditoria_estado', q.estado);
        // Con alcance fijo, la RLS ya acota a su obra social: el filtro libre no aplica.
        if (q.obraSocial && !alcanceObraSocial) {
            query = query.ilike('paciente.obra_social', `%${escaparLike(q.obraSocial)}%`);
        }

        const { data, error, count } = await query
            .order('fecha', { ascending: false })
            .range(from, to);
        if (error) return res.status(400).json({ error: error.message });

        const registros = (data || []).map((r) => {
            const pac = uno(r.paciente);
            const per = uno(pac?.persona);
            return {
                id: r.id,
                fecha: r.fecha,
                area: r.area || '',
                profesional: r.profesional_nombre || '',
                idProfesional: r.id_profesional,
                diagnostico: (r.diagnostico || '').slice(0, 160),
                estado: r.auditoria_estado,
                paciente: {
                    id: pac?.id ?? null,
                    nombre: nombreCompleto(per),
                    dni: per?.dni || '',
                    obraSocial: pac?.obra_social || '',
                },
            };
        });

        return res.json({ registros, total: count || 0, page, pageSize: PAGE_SIZE });
    } catch (err) {
        console.error('Error listando la bandeja de auditoría:', err);
        return res.status(500).json({ error: 'Error al listar los registros' });
    }
};

// ---------------------------------------------------------------------------
// GET /auditoria/filtros — opciones de los filtros (profesionales y obras sociales).
// ---------------------------------------------------------------------------
exports.filtros = async (req, res) => {
    try {
        const { clinicaId, alcanceObraSocial } = req.session.user;
        const db = await getUserSupabase(req);
        if (!db) return res.status(ERR_SESION.status).json(ERR_SESION.body);

        // Profesionales de la clínica (nombres del staff, sin PII de pacientes):
        // service_role acotado por la clínica de la sesión, como el panel de admin.
        const { data: miembros, error: mErr } = await supabase
            .from('membresia')
            .select('persona:id_persona ( nombre, apellido, profesional ( id ) )')
            .eq('clinica_id', clinicaId)
            .in('rol', ['admin', 'profesional']);
        if (mErr) return res.status(400).json({ error: mErr.message });

        const profesionales = (miembros || [])
            .map((m) => {
                const per = uno(m.persona);
                const prof = uno(per?.profesional);
                return prof ? { id: prof.id, nombre: nombreCompleto(per) } : null;
            })
            .filter(Boolean)
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

        let obrasSociales = [];
        if (alcanceObraSocial) {
            obrasSociales = [alcanceObraSocial];
        } else {
            const { data: pacs, error: pErr } = await db
                .from('paciente')
                .select('obra_social, persona:id_persona!inner ( clinica_id )')
                .eq('persona.clinica_id', clinicaId)
                .not('obra_social', 'is', null)
                .limit(5000);
            if (pErr) return res.status(400).json({ error: pErr.message });
            // Texto libre: deduplicar sin distinguir mayúsculas/espacios.
            const vistas = new Map();
            for (const p of pacs || []) {
                const os = String(p.obra_social || '').trim();
                if (os && !vistas.has(os.toLowerCase())) vistas.set(os.toLowerCase(), os);
            }
            obrasSociales = [...vistas.values()].sort((a, b) => a.localeCompare(b, 'es'));
        }

        return res.json({ profesionales, obrasSociales, alcanceObraSocial: alcanceObraSocial || null });
    } catch (err) {
        console.error('Error obteniendo filtros de auditoría:', err);
        return res.status(500).json({ error: 'Error al obtener los filtros' });
    }
};

// ---------------------------------------------------------------------------
// GET /auditoria/registros/:id — detalle para auditar (auditor | admin).
// ---------------------------------------------------------------------------
exports.detalleRegistro = async (req, res) => {
    try {
        const { id } = req.params;
        if (!UUID_RE.test(id)) return res.status(400).json({ error: 'Registro inválido.' });

        const { clinicaId } = req.session.user;
        const db = await getUserSupabase(req);
        if (!db) return res.status(ERR_SESION.status).json(ERR_SESION.body);

        const { data: reg, error } = await db
            .from('registro_clinico')
            .select(`
                id, fecha, area, profesional_nombre, id_profesional, sintomas, diagnostico,
                tratamiento, auditoria_estado, id_paciente,
                registro_diente ( numero, condicion, cara, estado, notas ),
                paciente:id_paciente ( id, obra_social,
                    persona:id_persona ( nombre, apellido, dni, fecha_nacimiento, sexo ) )
            `)
            .eq('id', id)
            .eq('clinica_id', clinicaId)
            .maybeSingle();
        if (error) return res.status(400).json({ error: error.message });
        if (!reg) return res.status(404).json({ error: 'Registro no encontrado.' });

        const [{ data: revs, error: rErr }, { data: previos, error: hErr }] = await Promise.all([
            db.from('auditoria_revision')
                .select('id, estado, checklist, comentario, auditor_nombre, creado_en, respuesta, respondido_en')
                .eq('id_registro', id)
                .order('creado_en', { ascending: false }),
            db.from('registro_clinico')
                .select('id, fecha, area, profesional_nombre, diagnostico, tratamiento, auditoria_estado')
                .eq('id_paciente', reg.id_paciente)
                .eq('clinica_id', clinicaId)
                .neq('id', id)
                .order('fecha', { ascending: false })
                .limit(50),
        ]);
        if (rErr) return res.status(400).json({ error: rErr.message });
        if (hErr) return res.status(400).json({ error: hErr.message });

        const pac = uno(reg.paciente);
        const per = uno(pac?.persona);
        const paciente = {
            id: pac?.id ?? reg.id_paciente,
            nombre: nombreCompleto(per),
            dni: per?.dni || '',
            edad: calcEdad(per?.fecha_nacimiento),
            sexo: per?.sexo || '',
            obraSocial: pac?.obra_social || '',
        };

        await registrarAcceso(req, {
            accion: 'ver_registro_auditoria',
            idPaciente: paciente.id,
            idRegistro: reg.id,
            paciente: { nombre: paciente.nombre, dni: paciente.dni },
        });

        return res.json({
            registro: {
                id: reg.id,
                fecha: reg.fecha,
                area: reg.area || '',
                profesional: reg.profesional_nombre || '',
                sintomas: reg.sintomas || '',
                diagnostico: reg.diagnostico || '',
                tratamiento: reg.tratamiento || '',
                estado: reg.auditoria_estado,
                dientes: (reg.registro_diente || []).map(serializarDiente),
            },
            paciente,
            revisiones: (revs || []).map(mapRevision),
            historial: (previos || []).map((r) => ({
                id: r.id,
                fecha: r.fecha,
                area: r.area || '',
                profesional: r.profesional_nombre || '',
                diagnostico: r.diagnostico || '',
                tratamiento: r.tratamiento || '',
                estado: r.auditoria_estado,
            })),
            checklist: CHECKLIST,
        });
    } catch (err) {
        console.error('Error obteniendo el detalle de auditoría:', err);
        return res.status(500).json({ error: 'Error al obtener el registro' });
    }
};

// ---------------------------------------------------------------------------
// POST /auditoria/registros/:id/revision — el auditor aprueba/observa/rechaza.
// ---------------------------------------------------------------------------
exports.revisar = async (req, res) => {
    try {
        const { id } = req.params;
        if (!UUID_RE.test(id)) return res.status(400).json({ error: 'Registro inválido.' });

        const { clinicaId, personaId } = req.session.user;
        const db = await getUserSupabase(req);
        if (!db) return res.status(ERR_SESION.status).json(ERR_SESION.body);

        // Lectura por-JWT: si la RLS no se lo muestra (otra clínica u obra social), 404.
        const { data: reg, error } = await db
            .from('registro_clinico')
            .select('id, id_paciente, id_profesional')
            .eq('id', id)
            .eq('clinica_id', clinicaId)
            .maybeSingle();
        if (error) return res.status(400).json({ error: error.message });
        if (!reg) return res.status(404).json({ error: 'Registro no encontrado.' });

        const { estado, comentario } = req.body;
        const checklist = {};
        for (const k of CHECKLIST) {
            if (typeof req.body.checklist?.[k] === 'boolean') checklist[k] = req.body.checklist[k];
        }

        const { data: rev, error: iErr } = await supabase
            .from('auditoria_revision')
            .insert({
                clinica_id: clinicaId,
                id_registro: reg.id,
                id_paciente: reg.id_paciente,
                id_profesional: reg.id_profesional,
                id_persona_auditor: personaId,
                auditor_nombre: await nombreActor(req),
                estado,
                checklist,
                comentario: comentario || null,
            })
            .select('id, estado, checklist, comentario, auditor_nombre, creado_en, respuesta, respondido_en')
            .single();
        if (iErr) return res.status(400).json({ error: iErr.message });

        const { error: uErr } = await supabase
            .from('registro_clinico')
            .update({ auditoria_estado: estado })
            .eq('id', reg.id)
            .eq('clinica_id', clinicaId);
        if (uErr) return res.status(400).json({ error: uErr.message });

        await registrarAcceso(req, {
            accion: 'revisar',
            idPaciente: reg.id_paciente,
            idRegistro: reg.id,
            detalle: { estado },
        });

        return res.status(201).json({ message: 'Revisión guardada', revision: mapRevision(rev) });
    } catch (err) {
        console.error('Error guardando la revisión:', err);
        return res.status(500).json({ error: 'Error al guardar la revisión' });
    }
};

// ---------------------------------------------------------------------------
// GET /auditoria/observaciones — observaciones sobre los registros PROPIOS
// (profesional | admin que atiende). Incluye las ya respondidas (esperando al auditor).
// ---------------------------------------------------------------------------
exports.observaciones = async (req, res) => {
    try {
        const { clinicaId, idRole } = req.session.user;
        if (!idRole) return res.json({ observaciones: [], pendientes: 0 });

        const db = await getUserSupabase(req);
        if (!db) return res.status(ERR_SESION.status).json(ERR_SESION.body);

        const { data, error } = await db
            .from('registro_clinico')
            .select(`
                id, fecha, area, diagnostico, tratamiento, auditoria_estado,
                paciente:id_paciente ( persona:id_persona ( nombre, apellido, dni ) ),
                auditoria_revision ( id, estado, checklist, comentario, auditor_nombre, creado_en, respuesta, respondido_en )
            `)
            .eq('clinica_id', clinicaId)
            .eq('id_profesional', idRole)
            .in('auditoria_estado', ['observado', 'rechazado', 'respondido'])
            .order('fecha', { ascending: false })
            .limit(100);
        if (error) return res.status(400).json({ error: error.message });

        const observaciones = (data || [])
            .map((r) => {
                const revs = (r.auditoria_revision || [])
                    .slice()
                    .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));
                const ultima = revs[0];
                if (!ultima) return null;
                const per = uno(uno(r.paciente)?.persona);
                return {
                    registro: {
                        id: r.id,
                        fecha: r.fecha,
                        area: r.area || '',
                        diagnostico: r.diagnostico || '',
                        tratamiento: r.tratamiento || '',
                        estado: r.auditoria_estado,
                    },
                    paciente: { nombre: nombreCompleto(per), dni: per?.dni || '' },
                    revision: mapRevision(ultima),
                    pendienteRespuesta: !ultima.respuesta && ultima.estado !== 'aprobado',
                };
            })
            .filter(Boolean);

        return res.json({
            observaciones,
            pendientes: observaciones.filter((o) => o.pendienteRespuesta).length,
        });
    } catch (err) {
        console.error('Error listando observaciones:', err);
        return res.status(500).json({ error: 'Error al listar las observaciones' });
    }
};

// ---------------------------------------------------------------------------
// POST /auditoria/revisiones/:id/respuesta — el profesional AUTOR responde.
// ---------------------------------------------------------------------------
exports.responder = async (req, res) => {
    try {
        const revisionId = Number(req.params.id);
        if (!Number.isInteger(revisionId)) return res.status(400).json({ error: 'Revisión inválida.' });

        const { clinicaId, idRole, personaId } = req.session.user;
        const db = await getUserSupabase(req);
        if (!db) return res.status(ERR_SESION.status).json(ERR_SESION.body);

        const { data: rev, error } = await db
            .from('auditoria_revision')
            .select('id, id_registro, id_paciente, id_profesional, estado, respuesta')
            .eq('id', revisionId)
            .eq('clinica_id', clinicaId)
            .maybeSingle();
        if (error) return res.status(400).json({ error: error.message });
        // Solo el autor del registro responde (un admin ve todas, pero no responde por otros).
        if (!rev || !idRole || rev.id_profesional !== idRole) {
            return res.status(404).json({ error: 'Observación no encontrada.' });
        }
        if (rev.estado === 'aprobado') {
            return res.status(409).json({ error: 'El registro ya fue aprobado.' });
        }
        if (rev.respuesta) {
            return res.status(409).json({ error: 'Esta observación ya fue respondida.' });
        }

        // Solo se responde la revisión VIGENTE (la última del registro).
        const { data: ultima } = await supabase
            .from('auditoria_revision')
            .select('id')
            .eq('id_registro', rev.id_registro)
            .order('creado_en', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (!ultima || ultima.id !== rev.id) {
            return res.status(409).json({ error: 'Hay una revisión más reciente de este registro.' });
        }

        const { data: upd, error: uErr } = await supabase
            .from('auditoria_revision')
            .update({
                respuesta: req.body.respuesta.trim(),
                respondido_en: new Date().toISOString(),
                id_persona_respuesta: personaId,
            })
            .eq('id', rev.id)
            .is('respuesta', null) // evita pisar una respuesta concurrente
            .select('id, estado, checklist, comentario, auditor_nombre, creado_en, respuesta, respondido_en')
            .maybeSingle();
        if (uErr) return res.status(400).json({ error: uErr.message });
        if (!upd) return res.status(409).json({ error: 'Esta observación ya fue respondida.' });

        const { error: eErr } = await supabase
            .from('registro_clinico')
            .update({ auditoria_estado: 'respondido' })
            .eq('id', rev.id_registro)
            .eq('clinica_id', clinicaId);
        if (eErr) return res.status(400).json({ error: eErr.message });

        await registrarAcceso(req, {
            accion: 'responder',
            idPaciente: rev.id_paciente,
            idRegistro: rev.id_registro,
        });

        return res.json({ message: 'Respuesta enviada', revision: mapRevision(upd) });
    } catch (err) {
        console.error('Error respondiendo la observación:', err);
        return res.status(500).json({ error: 'Error al enviar la respuesta' });
    }
};

// ---------------------------------------------------------------------------
// GET /auditoria/bitacora — accesos a la HC (auditor | admin). La RLS acota el
// alcance del auditor (solo pacientes de su obra social).
// ---------------------------------------------------------------------------
exports.bitacora = async (req, res) => {
    try {
        const { clinicaId } = req.session.user;
        const db = await getUserSupabase(req);
        if (!db) return res.status(ERR_SESION.status).json(ERR_SESION.body);

        const q = req.query;
        const { page, from, to } = paginar(q);

        let query = db
            .from('hc_acceso')
            .select('id, creado_en, actor_nombre, actor_rol, accion, paciente_nombre, paciente_dni, id_registro, detalle, ip', { count: 'exact' })
            .eq('clinica_id', clinicaId);
        query = filtrarFechas(query, 'creado_en', q);
        if (q.accion) query = query.eq('accion', q.accion);
        if (q.dni) query = query.eq('paciente_dni', q.dni);
        if (q.actor) query = query.ilike('actor_nombre', `%${escaparLike(q.actor)}%`);

        const { data, error, count } = await query
            .order('creado_en', { ascending: false })
            .range(from, to);
        if (error) return res.status(400).json({ error: error.message });

        const accesos = (data || []).map((a) => ({
            id: a.id,
            fecha: a.creado_en,
            actor: a.actor_nombre || '',
            rol: a.actor_rol || '',
            accion: a.accion,
            paciente: a.paciente_nombre || '',
            dni: a.paciente_dni || '',
            idRegistro: a.id_registro,
            detalle: a.detalle || null,
            ip: a.ip || '',
        }));

        return res.json({ accesos, total: count || 0, page, pageSize: PAGE_SIZE });
    } catch (err) {
        console.error('Error listando la bitácora:', err);
        return res.status(500).json({ error: 'Error al listar la bitácora' });
    }
};

// ---------------------------------------------------------------------------
// GET /auditoria/resumen — contadores por estado y por profesional en el período
// (por defecto, los últimos 30 días).
// ---------------------------------------------------------------------------
const LIMITE_RESUMEN = 10000;

exports.resumen = async (req, res) => {
    try {
        const { clinicaId } = req.session.user;
        const db = await getUserSupabase(req);
        if (!db) return res.status(ERR_SESION.status).json(ERR_SESION.body);

        const q = { ...req.query };
        if (!q.desde && !q.hasta) {
            const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            q.desde = d.toISOString().slice(0, 10);
        }

        let query = db
            .from('registro_clinico')
            .select('id_profesional, profesional_nombre, auditoria_estado')
            .eq('clinica_id', clinicaId);
        query = filtrarFechas(query, 'fecha', q);
        const { data, error } = await query.limit(LIMITE_RESUMEN);
        if (error) return res.status(400).json({ error: error.message });

        const estados = { pendiente: 0, aprobado: 0, observado: 0, rechazado: 0, respondido: 0 };
        const porProf = new Map();
        for (const r of data || []) {
            estados[r.auditoria_estado] = (estados[r.auditoria_estado] || 0) + 1;
            const key = r.id_profesional ?? `ext:${r.profesional_nombre || ''}`;
            if (!porProf.has(key)) {
                porProf.set(key, {
                    nombre: r.profesional_nombre || 'Sin profesional (importado)',
                    total: 0, aprobado: 0, conObservaciones: 0, pendiente: 0,
                });
            }
            const p = porProf.get(key);
            p.total++;
            if (r.auditoria_estado === 'aprobado') p.aprobado++;
            else if (r.auditoria_estado === 'pendiente') p.pendiente++;
            else p.conObservaciones++;
        }

        const profesionales = [...porProf.values()]
            .map((p) => {
                const auditados = p.aprobado + p.conObservaciones;
                return { ...p, tasaAprobacion: auditados ? Math.round((p.aprobado / auditados) * 100) : null };
            })
            .sort((a, b) => b.total - a.total);

        return res.json({
            desde: q.desde || null,
            hasta: q.hasta || null,
            total: (data || []).length,
            truncado: (data || []).length >= LIMITE_RESUMEN,
            estados,
            profesionales,
        });
    } catch (err) {
        console.error('Error armando el resumen de auditoría:', err);
        return res.status(500).json({ error: 'Error al obtener el resumen' });
    }
};
