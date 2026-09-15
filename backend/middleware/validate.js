// Validación de entrada con zod.
// Actúa como "gate": valida req[source] contra el schema y, si falla, responde 400
// con el detalle de los campos inválidos. Si pasa, continúa SIN mutar el request
// (los controllers siguen leyendo el body original, incluidos campos dinámicos).

function validate(schema, source = 'body') {
    return (req, res, next) => {
        const result = schema.safeParse(req[source]);
        if (!result.success) {
            const detalles = result.error.issues.map(i => ({
                campo: i.path.join('.') || source,
                mensaje: i.message,
            }));
            return res.status(400).json({ error: 'Datos inválidos', detalles });
        }
        return next();
    };
}

module.exports = { validate };
