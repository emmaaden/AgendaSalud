// Exportación / Importación de Historias Clínicas (Fase D).
//
// Marco legal: Ley 26.529 (copia de la HC), Ley 27.706 (digitalización) y
// Res. 1840/2018 (interoperabilidad). El export estructurado (JSON) permite portar
// y re-importar la información.
//
// Alcance (rol dentro de la clínica activa):
//   - admin:       todas las HC de la clínica.
//   - profesional: solo las de pacientes que ATENDIÓ él (registros con su id_profesional).
//
// Se usa service_role acotado SIEMPRE por la clínica de la sesión (y, si no es admin,
// por el id del profesional). El guard requireRole('profesional') protege las rutas.

const { supabase } = require('../config/supabaseClient');

const FORMATO = 'agendasalud.hc';
const VERSION = '1.0';

// Ids de pacientes dentro del alcance del usuario.
async function pacienteIdsEnAlcance(clinicaId, esAdmin, idProfesional) {
    if (esAdmin) {
        const { data, error } = await supabase
            .from('paciente')
            .select('id, persona:id_persona!inner ( clinica_id )')
            .eq('persona.clinica_id', clinicaId);
        if (error) throw error;
        return (data || []).map((p) => p.id);
    }
    const { data, error } = await supabase
        .from('registro_clinico')
        .select('id_paciente')
        .eq('clinica_id', clinicaId)
        .eq('id_profesional', idProfesional);
    if (error) throw error;
    return [...new Set((data || []).map((r) => r.id_paciente))];
}

// Arma el objeto de exportación (pacientes + registros + odontograma) para un set de ids.
async function construirExport(clinicaId, pacienteIds, meta) {
    let pacientes = [];
    let registrosPorPaciente = new Map();

    if (pacienteIds.length) {
        const { data: pacs, error: pErr } = await supabase
            .from('paciente')
            .select('id, obra_social, persona:id_persona ( dni, nombre, apellido, fecha_nacimiento, sexo, telefono, email, direccion )')
            .in('id', pacienteIds);
        if (pErr) throw pErr;
        pacientes = pacs || [];

        const { data: regs, error: rErr } = await supabase
            .from('registro_clinico')
            .select('id, id_paciente, fecha, profesional_nombre, area, sintomas, diagnostico, tratamiento, registro_diente ( numero, estado, notas )')
            .in('id_paciente', pacienteIds)
            .eq('clinica_id', clinicaId)
            .order('fecha', { ascending: true });
        if (rErr) throw rErr;
        for (const r of regs || []) {
            if (!registrosPorPaciente.has(r.id_paciente)) registrosPorPaciente.set(r.id_paciente, []);
            registrosPorPaciente.get(r.id_paciente).push({
                origenId: r.id, // id del registro en ESTE sistema (para dedupe al re-importar)
                fecha: r.fecha,
                profesional: r.profesional_nombre || null,
                area: r.area || null,
                sintomas: r.sintomas || null,
                diagnostico: r.diagnostico || null,
                tratamiento: r.tratamiento || null,
                odontograma: (r.registro_diente || []).map((d) => ({
                    numero: d.numero, estado: d.estado, notas: d.notas || null,
                })),
            });
        }
    }

    const pacientesOut = pacientes.map((p) => {
        const per = Array.isArray(p.persona) ? p.persona[0] : p.persona;
        return {
            dni: per?.dni || null,
            nombre: per?.nombre || null,
            apellido: per?.apellido || null,
            fechaNacimiento: per?.fecha_nacimiento || null,
            sexo: per?.sexo || null,
            telefono: per?.telefono || null,
            email: per?.email || null,
            direccion: per?.direccion || null,
            obraSocial: p.obra_social || null,
            registros: registrosPorPaciente.get(p.id) || [],
        };
    });

    return {
        formato: FORMATO,
        version: VERSION,
        generadoEn: new Date().toISOString(),
        ...meta,
        totalPacientes: pacientesOut.length,
        pacientes: pacientesOut,
    };
}

// GET /hc/export — descarga la HC (JSON) del alcance del usuario.
exports.exportar = async (req, res) => {
    try {
        const { clinicaId, esAdmin, idRole } = req.session.user;
        if (!clinicaId) return res.status(400).json({ error: 'No tenés una clínica activa.' });

        const ids = await pacienteIdsEnAlcance(clinicaId, esAdmin, idRole);

        const { data: cli } = await supabase.from('clinica').select('nombre').eq('id', clinicaId).maybeSingle();
        const exportData = await construirExport(clinicaId, ids, {
            clinica: { nombre: cli?.nombre || null },
            alcance: esAdmin ? 'clinica' : 'propios',
        });

        const fecha = new Date().toISOString().slice(0, 10);
        const slug = (cli?.nombre || 'clinica').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="hc-${slug}-${fecha}.json"`);
        return res.send(JSON.stringify(exportData, null, 2));
    } catch (err) {
        console.error('Error exportando HC:', err);
        return res.status(500).json({ error: 'Error al exportar las historias clínicas' });
    }
};

// GET /hc/pacientes — lista de pacientes en alcance (para la UI: cantidad + PDF por paciente).
exports.pacientesEnAlcance = async (req, res) => {
    try {
        const { clinicaId, esAdmin, idRole } = req.session.user;
        if (!clinicaId) return res.status(400).json({ error: 'No tenés una clínica activa.' });

        const ids = await pacienteIdsEnAlcance(clinicaId, esAdmin, idRole);
        if (!ids.length) return res.json({ alcance: esAdmin ? 'clinica' : 'propios', pacientes: [] });

        const { data: pacs, error } = await supabase
            .from('paciente')
            .select('id, persona:id_persona ( dni, nombre, apellido ), registro_clinico ( count )')
            .in('id', ids);
        if (error) return res.status(400).json({ error: error.message });

        const pacientes = (pacs || []).map((p) => {
            const per = Array.isArray(p.persona) ? p.persona[0] : p.persona;
            const cnt = Array.isArray(p.registro_clinico) ? (p.registro_clinico[0]?.count ?? 0) : 0;
            return {
                dni: per?.dni || null,
                nombre: [per?.nombre, per?.apellido].filter(Boolean).join(' ') || null,
                registros: cnt,
            };
        });
        return res.json({ alcance: esAdmin ? 'clinica' : 'propios', pacientes });
    } catch (err) {
        console.error('Error listando pacientes en alcance:', err);
        return res.status(500).json({ error: 'Error al listar los pacientes' });
    }
};

// Normaliza fecha de nacimiento a 'YYYY-MM-DD' (acepta ISO o dd/mm/yyyy).
function normFechaNac(f) {
    if (!f) return null;
    const s = String(f);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
        const [, d, mo, y] = m;
        const yr = y.length === 2 ? `20${y}` : y;
        return `${yr}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return null;
}

// POST /hc/import — importa una HC (JSON del mismo formato de export).
// Empareja pacientes por DNI dentro de la clínica; crea el paciente si no existe;
// deduplica registros por origen_id. Devuelve un resumen (no aborta todo por un error).
exports.importar = async (req, res) => {
    try {
        const { clinicaId } = req.session.user;
        if (!clinicaId) return res.status(400).json({ error: 'No tenés una clínica activa.' });

        const doc = req.body;
        if (!doc || doc.formato !== FORMATO || !Array.isArray(doc.pacientes)) {
            return res.status(400).json({ error: 'Archivo inválido: no es un export de HC de AgendaSalud.' });
        }

        const resumen = {
            pacientesCreados: 0,
            pacientesExistentes: 0,
            registrosImportados: 0,
            registrosOmitidos: 0,
            errores: [],
        };

        for (const p of doc.pacientes) {
            const dni = p?.dni != null ? String(p.dni).trim() : '';
            if (!dni) { resumen.errores.push('Paciente sin DNI: se omitió.'); continue; }

            try {
                // 1. Resolver o crear el paciente por DNI dentro de la clínica.
                const { data: personaEx, error: persErr } = await supabase
                    .from('persona')
                    .select('id, paciente ( id )')
                    .eq('clinica_id', clinicaId)
                    .eq('dni', dni)
                    .maybeSingle();
                if (persErr) throw persErr;

                let pacienteId;
                if (personaEx) {
                    const pac = Array.isArray(personaEx.paciente) ? personaEx.paciente[0] : personaEx.paciente;
                    if (pac?.id) {
                        pacienteId = pac.id;
                    } else {
                        // persona existe pero no es paciente: crear su fila paciente.
                        const { data: nuevoPac, error: e } = await supabase
                            .from('paciente').insert({ id_persona: personaEx.id, obra_social: p.obraSocial || null })
                            .select('id').single();
                        if (e) throw e;
                        pacienteId = nuevoPac.id;
                    }
                    resumen.pacientesExistentes++;
                } else {
                    const { data: nuevaPersona, error: e1 } = await supabase
                        .from('persona')
                        .insert({
                            clinica_id: clinicaId,
                            dni,
                            nombre: p.nombre || null,
                            apellido: p.apellido || null,
                            fecha_nacimiento: normFechaNac(p.fechaNacimiento),
                            sexo: p.sexo || null,
                            telefono: p.telefono || null,
                            email: p.email || null,
                            direccion: p.direccion || null,
                        })
                        .select('id').single();
                    if (e1) throw e1;
                    const { data: nuevoPac, error: e2 } = await supabase
                        .from('paciente').insert({ id_persona: nuevaPersona.id, obra_social: p.obraSocial || null })
                        .select('id').single();
                    if (e2) throw e2;
                    pacienteId = nuevoPac.id;
                    resumen.pacientesCreados++;
                }

                // 2. Registros que ya se importaron antes (por origen_id) → dedupe.
                const { data: existentes } = await supabase
                    .from('registro_clinico')
                    .select('origen_id')
                    .eq('id_paciente', pacienteId)
                    .not('origen_id', 'is', null);
                const yaImportados = new Set((existentes || []).map((r) => r.origen_id));

                for (const r of Array.isArray(p.registros) ? p.registros : []) {
                    const origenId = r?.origenId != null ? String(r.origenId) : null;
                    if (origenId && yaImportados.has(origenId)) { resumen.registrosOmitidos++; continue; }

                    const { data: nuevoReg, error: rErr } = await supabase
                        .from('registro_clinico')
                        .insert({
                            id_paciente: pacienteId,
                            clinica_id: clinicaId,
                            id_profesional: null, // autoría externa; se conserva el nombre snapshot
                            profesional_nombre: r.profesional || null,
                            area: r.area || null,
                            fecha: r.fecha || new Date().toISOString(),
                            sintomas: r.sintomas || null,
                            diagnostico: r.diagnostico || null,
                            tratamiento: r.tratamiento || null,
                            origen: doc.origen || 'import',
                            origen_id: origenId,
                        })
                        .select('id').single();
                    if (rErr) {
                        // Colisión con el índice único parcial → ya existía: se cuenta como omitido.
                        if (rErr.code === '23505') { resumen.registrosOmitidos++; continue; }
                        throw rErr;
                    }

                    const dientes = Array.isArray(r.odontograma) ? r.odontograma : [];
                    if (dientes.length) {
                        const rows = dientes
                            .filter((d) => d && d.numero != null)
                            .map((d) => ({
                                id_registro: nuevoReg.id,
                                numero: String(d.numero),
                                estado: ['sano', 'caries', 'tratado', 'falta'].includes(d.estado) ? d.estado : 'sano',
                                notas: d.notas || null,
                            }));
                        if (rows.length) {
                            const { error: dErr } = await supabase.from('registro_diente').insert(rows);
                            if (dErr) throw dErr;
                        }
                    }
                    if (origenId) yaImportados.add(origenId);
                    resumen.registrosImportados++;
                }
            } catch (ePac) {
                console.error('Error importando paciente', dni, ePac.message);
                resumen.errores.push(`DNI ${dni}: ${ePac.message}`);
            }
        }

        return res.json({ message: 'Importación finalizada', resumen });
    } catch (err) {
        console.error('Error importando HC:', err);
        return res.status(500).json({ error: 'Error al importar las historias clínicas' });
    }
};
