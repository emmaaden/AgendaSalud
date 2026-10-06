// Fecha calendario en Argentina (UTC-3, sin horario de verano), sin depender de la
// zona del servidor.

const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

// 'YYYY-MM-DD' del instante dado (por defecto, ahora) en hora argentina.
function ymdAR(d = new Date()) {
    return fmt.format(typeof d === 'string' ? new Date(d) : d);
}

const hoyAR = () => ymdAR();

module.exports = { ymdAR, hoyAR };
