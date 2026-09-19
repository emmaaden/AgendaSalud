// Tokens de gestión de turno para invitados (sin cuenta).
//
// Al reservar como invitado, el paciente recibe por email un enlace con un token
// único. Ese token es la ÚNICA forma de ver/cancelar ese turno (evita la enumeración
// por email que tenía el buscador público anterior). En la base guardamos SOLO el
// hash SHA-256 del token, nunca el token en claro: si se filtrara la tabla, los
// enlaces siguen sin poder reconstruirse.

const crypto = require('crypto');

// Genera un token aleatorio (url-safe) y su hash para persistir.
function generarTokenGestion() {
    const token = crypto.randomBytes(32).toString('base64url'); // ~43 chars url-safe
    return { token, hash: hashToken(token) };
}

// Hash determinístico del token (para buscar/comparar en la base).
function hashToken(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
}

module.exports = { generarTokenGestion, hashToken };
