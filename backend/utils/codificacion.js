// Codificación de un registro clínico (Fase K): diagnósticos CIE-10 y prácticas.
//
// Se valida TODO contra la base antes de insertar (nunca se confía en descripciones o
// flags que mande el cliente):
//   - cada código CIE-10 existe en el catálogo; queda exactamente un principal;
//   - cada práctica es del catálogo ACTIVO de la clínica;
//   - una autorización vinculada es de la misma clínica y paciente, está APROBADA,
//     no venció y corresponde a esa práctica.

const { supabase } = require('../config/supabaseClient');
const { hoyAR } = require('./fechaAR');

// Devuelve { ok:true, diagnosticos, practicas } (filas sin id_registro) o { ok:false, error }.
async function prepararCodificacion({ clinicaId, idPaciente, diagnosticos = [], practicas = [] }) {
    // --- Diagnósticos ---
    const codigos = [...new Set((diagnosticos || []).map((d) => String(d.codigo).trim()))];
    let filasDx = [];
    if (codigos.length) {
        const { data, error } = await supabase.from('cie10').select('codigo, descripcion').in('codigo', codigos);
        if (error) throw error;
        const porCodigo = new Map((data || []).map((c) => [c.codigo, c.descripcion]));
        const faltan = codigos.filter((c) => !porCodigo.has(c));
        if (faltan.length) return { ok: false, error: `Código CIE-10 inexistente: ${faltan.join(', ')}` };

        const principalPedido = (diagnosticos.find((d) => d.principal) || {}).codigo;
        const principal = codigos.includes(principalPedido) ? principalPedido : codigos[0];
        filasDx = codigos.map((codigo) => ({
            codigo,
            descripcion: porCodigo.get(codigo),
            principal: codigo === principal,
        }));
    }

    // --- Prácticas ---
    let filasPx = [];
    const items = practicas || [];
    if (items.length) {
        const ids = [...new Set(items.map((p) => Number(p.idPractica)))];
        const { data: cat, error } = await supabase
            .from('practica')
            .select('id, codigo, descripcion, requiere_autorizacion')
            .eq('clinica_id', clinicaId)
            .eq('activo', true)
            .in('id', ids);
        if (error) throw error;
        const porId = new Map((cat || []).map((p) => [p.id, p]));
        if (ids.some((id) => !porId.has(id))) {
            return { ok: false, error: 'Alguna de las prácticas no está en el catálogo de la clínica.' };
        }

        // Autorizaciones vinculadas.
        const idsAut = [...new Set(items.map((p) => p.idAutorizacion).filter((x) => x != null).map(Number))];
        const auts = new Map();
        if (idsAut.length && idPaciente == null) {
            return { ok: false, error: 'Un paciente nuevo todavía no tiene autorizaciones.' };
        }
        if (idsAut.length) {
            const { data: rows, error: aErr } = await supabase
                .from('autorizacion')
                .select('id, id_practica, estado, vence_en')
                .eq('clinica_id', clinicaId)
                .eq('id_paciente', idPaciente)
                .in('id', idsAut);
            if (aErr) throw aErr;
            for (const a of rows || []) auts.set(a.id, a);
        }
        const hoy = hoyAR();

        for (const it of items) {
            const p = porId.get(Number(it.idPractica));
            let idAutorizacion = null;
            if (it.idAutorizacion != null) {
                const a = auts.get(Number(it.idAutorizacion));
                if (!a || a.estado !== 'aprobada' || a.id_practica !== p.id) {
                    return { ok: false, error: `La autorización elegida para "${p.descripcion}" no es válida.` };
                }
                if (a.vence_en && a.vence_en < hoy) {
                    return { ok: false, error: `La autorización para "${p.descripcion}" está vencida.` };
                }
                idAutorizacion = a.id;
            }
            filasPx.push({
                id_practica: p.id,
                codigo: p.codigo,
                descripcion: p.descripcion,
                pieza: (it.pieza || '').trim() || null,
                cantidad: it.cantidad || 1,
                id_autorizacion: idAutorizacion,
            });
        }
    }

    return { ok: true, diagnosticos: filasDx, practicas: filasPx };
}

// Inserta la codificación ya preparada para un registro (con el cliente `db` del caller:
// por-JWT en la carga de HC, para que aplique la RLS de escritura).
async function insertarCodificacion(db, idRegistro, { diagnosticos, practicas }) {
    if (diagnosticos.length) {
        const { error } = await db
            .from('registro_diagnostico')
            .insert(diagnosticos.map((d) => ({ ...d, id_registro: idRegistro })));
        if (error) throw error;
    }
    if (practicas.length) {
        const { error } = await db
            .from('registro_practica')
            .insert(practicas.map((p) => ({ ...p, id_registro: idRegistro })));
        if (error) throw error;
    }
}

// Mapea los embeds de un registro a la forma que consume el frontend.
function serializarCodificacion(r) {
    return {
        diagnosticos: (r.registro_diagnostico || [])
            .slice()
            .sort((a, b) => Number(b.principal) - Number(a.principal))
            .map((d) => ({ codigo: d.codigo, descripcion: d.descripcion, principal: !!d.principal })),
        practicas: (r.registro_practica || []).map((p) => {
            const aut = Array.isArray(p.autorizacion) ? p.autorizacion[0] : p.autorizacion;
            return {
                codigo: p.codigo,
                descripcion: p.descripcion,
                pieza: p.pieza || null,
                cantidad: p.cantidad || 1,
                autorizacion: aut ? aut.numero || `#${aut.id}` : null,
                requiereAutorizacion: !!(Array.isArray(p.practica) ? p.practica[0] : p.practica)?.requiere_autorizacion,
            };
        }),
    };
}

// Select de PostgREST para embeber la codificación en un registro_clinico.
const SELECT_CODIFICACION = `
    registro_diagnostico ( codigo, descripcion, principal ),
    registro_practica ( codigo, descripcion, pieza, cantidad,
        autorizacion:id_autorizacion ( id, numero ),
        practica:id_practica ( requiere_autorizacion ) )
`;

module.exports = { prepararCodificacion, insertarCodificacion, serializarCodificacion, SELECT_CODIFICACION };
