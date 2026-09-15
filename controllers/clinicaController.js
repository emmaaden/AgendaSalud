// Gestión de la clínica (Fase 2). La clínica se toma de la sesión del profesional.
// Generar/listar códigos de activación es exclusivo del admin de la clínica.

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Código legible sin caracteres ambiguos (0/O, 1/I).
function generarCodigoAleatorio() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let c = '';
    for (let i = 0; i < 8; i++) c += chars[Math.floor(Math.random() * chars.length)];
    return c;
}

// Info de la clínica del usuario autenticado.
exports.info = async (req, res) => {
    try {
        const clinicaId = req.session.user.clinicaId;
        if (!clinicaId) return res.json({ clinica: null, esAdmin: false });

        const { data, error } = await supabase
            .from('clinica')
            .select('nombre, plan, slug')
            .eq('id', clinicaId)
            .maybeSingle();
        if (error) return res.status(400).json({ error: error.message });

        return res.json({ clinica: data, esAdmin: !!req.session.user.esAdmin });
    } catch (err) {
        console.error('Error en clinica/info:', err);
        return res.status(500).json({ error: 'Error al obtener la clínica' });
    }
};

// Genera un código de activación nuevo para la clínica del admin.
exports.generarCodigo = async (req, res) => {
    try {
        const clinicaId = req.session.user.clinicaId;
        if (!clinicaId) return res.status(400).json({ error: 'No tenés una clínica asignada.' });

        let inserted = null;
        for (let intentos = 0; intentos < 5 && !inserted; intentos++) {
            const codigo = generarCodigoAleatorio();
            const { data, error } = await supabase
                .from('codigo_activacion')
                .insert({ codigo, clinica_id: clinicaId })
                .select('codigo, usado, creado_en')
                .single();
            if (!error) { inserted = data; break; }
            if (error.code !== '23505') { // 23505 = unique_violation (colisión de código)
                return res.status(400).json({ error: error.message });
            }
        }
        if (!inserted) return res.status(500).json({ error: 'No se pudo generar un código único, reintentá.' });

        return res.status(201).json({ message: 'Código generado', codigo: inserted.codigo });
    } catch (err) {
        console.error('Error generando código:', err);
        return res.status(500).json({ error: 'Error al generar el código' });
    }
};

// Lista los códigos de la clínica del admin.
exports.listarCodigos = async (req, res) => {
    try {
        const clinicaId = req.session.user.clinicaId;
        if (!clinicaId) return res.status(400).json({ error: 'No tenés una clínica asignada.' });

        const { data, error } = await supabase
            .from('codigo_activacion')
            .select('codigo, usado, creado_en')
            .eq('clinica_id', clinicaId)
            .order('creado_en', { ascending: false });
        if (error) return res.status(400).json({ error: error.message });

        return res.json({ codigos: data || [] });
    } catch (err) {
        console.error('Error listando códigos:', err);
        return res.status(500).json({ error: 'Error al listar los códigos' });
    }
};
