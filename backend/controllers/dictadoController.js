// Dictado por voz (motor propio). El navegador graba y manda tramos cortos de audio
// WAV (16 kHz, mono); acá se reenvían al servidor local de whisper.cpp y se devuelve
// el texto. El audio se procesa en memoria: no se guarda en ningún lado.

const WHISPER_URL = (process.env.WHISPER_URL || 'http://127.0.0.1:8178').replace(/\/+$/, '');

// Contexto para el modelo: vocabulario clínico y registro rioplatense. Mejora la
// ortografía de términos médicos, dosis y la puntuación.
const PROMPT =
    'Notas de una consulta médica. Paciente refiere cefalea, dolor abdominal y fiebre de 38,5 °C. ' +
    'Diagnóstico presuntivo: faringitis. Tratamiento: ibuprofeno 400 mg cada 8 horas, amoxicilina 500 mg.';

// Whisper "alucina" estas frases con silencio o ruido (vienen de subtítulos de videos).
const ALUCINACIONES = [
    /subt[ií]tul/i,
    /amara\.org/i,
    /gracias por (ver|mirar|su atenci[oó]n)/i,
    /suscr[ií]b/i,
    /^\W*(gracias|ch[aá]u|adi[oó]s)\W*$/i,
];

function limpiar(texto) {
    const t = String(texto || '')
        .replace(/\[[^\]]*\]|\([^)]*\b(m[uú]sica|risas|aplausos|ruido)\b[^)]*\)/gi, '') // [BLANK_AUDIO], (música)…
        .replace(/\s+/g, ' ')
        .trim();
    if (!/\p{L}/u.test(t)) return '';
    if (ALUCINACIONES.some((re) => re.test(t))) return '';
    return t;
}

exports.transcribir = async (req, res) => {
    if (!Buffer.isBuffer(req.body) || req.body.length < 44) {
        return res.status(400).json({ error: 'Audio vacío o inválido.' });
    }

    const form = new FormData();
    form.append('file', new Blob([req.body], { type: 'audio/wav' }), 'tramo.wav');
    form.append('language', 'es');
    form.append('response_format', 'json');
    form.append('temperature', '0');
    form.append('prompt', PROMPT);

    let r;
    try {
        r = await fetch(`${WHISPER_URL}/inference`, {
            method: 'POST',
            body: form,
            signal: AbortSignal.timeout(60_000),
        });
    } catch (err) {
        console.error('Dictado: whisper no responde:', err.cause?.code || err.message);
        return res.status(503).json({ error: 'El servicio de dictado no está disponible.' });
    }

    if (!r.ok) {
        console.error('Dictado: whisper respondió', r.status, await r.text().catch(() => ''));
        return res.status(502).json({ error: 'No se pudo transcribir el audio.' });
    }

    const data = await r.json().catch(() => ({}));
    res.json({ texto: limpiar(data.text) });
};
