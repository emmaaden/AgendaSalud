// Schemas zod de validación de entrada, agrupados por área.
// Nota: los objetos zod ignoran (no rechazan) campos extra, así el frontend puede
// seguir enviando campos adicionales. La validación es un gate (no muta el request).

const { z } = require('zod');

// --- Piezas reutilizables ---
const dni = z.string().trim().min(1, 'DNI requerido').max(20, 'DNI demasiado largo');
const nombre = z.string().trim().min(1, 'Nombre requerido').max(120, 'Nombre demasiado largo');
const emailOpcional = z.union([z.email('Email inválido'), z.literal('')]).optional();
const textoOpcional = z.string().max(4000, 'Texto demasiado largo').optional();
const idFlexible = z.union([z.string().min(1), z.number()]);

const dienteSchema = z.object({
    numero: z.union([z.string(), z.number()]),
    estado: z.enum(['sano', 'caries', 'tratado', 'falta']).optional(),
    notas: z.string().max(1000).optional(),
});

module.exports = {
    auth: {
        register: z.object({
            email: z.email('Email inválido'),
            password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
            dni,
            nombre,
            role: z.enum(['PACIENTE', 'PROFESIONAL'], 'Rol inválido'),
            // Fase 2: onboarding del profesional (una de las dos).
            nombreClinica: z.string().trim().max(120).optional(),
            activationCode: z.string().trim().max(40).optional(),
        }).refine(
            d => d.role !== 'PROFESIONAL'
                || (d.nombreClinica && d.nombreClinica.length > 0)
                || (d.activationCode && d.activationCode.length > 0),
            { message: 'Indicá el nombre de la clínica nueva o un código de activación', path: ['nombreClinica'] }
        ),
        login: z.object({
            email: z.email('Email inválido'),
            password: z.string().min(1, 'Contraseña requerida'),
            role: z.string().optional(),
        }),
        forgotPassword: z.object({
            email: z.email('Email inválido'),
        }),
        saveArea: z.object({
            especialidad: idFlexible,
        }),
        getCalenID: z.object({
            id: idFlexible,
        }),
    },

    pacient: {
        regis: z.object({
            fullName: nombre,
            dni,
            email: emailOpcional,
            telefono: z.string().max(30).optional(),
            sexo: z.string().max(20).optional(),
            direccion: z.string().max(200).optional(),
            fechaNacimiento: z.string().max(40).optional(),
            obraSocial: z.string().max(100).optional(),
            sintomas: textoOpcional,
            diagnostico: textoOpcional,
            tratamiento: textoOpcional,
            dientes: z.array(dienteSchema).optional(),
        }),
        saveData: z.object({
            dni,
            sintomas: textoOpcional,
            diagnostico: textoOpcional,
            tratamiento: textoOpcional,
            dientes: z.array(dienteSchema).optional(),
        }),
        getData: z.object({
            dni,
        }),
    },

    miCuenta: {
        updatePerfil: z.object({
            nombre: z.string().trim().max(120).optional(),
            apellido: z.string().trim().max(120).optional(),
            telefono: z.string().max(30).optional(),
            direccion: z.string().max(200).optional(),
            sexo: z.string().max(20).optional(),
            email: emailOpcional,
            fechaNacimiento: z.string().max(40).optional(),
            obraSocial: z.string().max(100).optional(),
        }),
    },

    profesional: {
        saveDesc: z.object({ descripcion: z.string().max(2000, 'Descripción demasiado larga') }),
        savePrecio: z.object({ precio: z.union([z.string().max(50), z.number()]) }),
        saveDirec: z.object({ direccion: z.string().max(200, 'Dirección demasiado larga') }),
        saveCalenID: z.object({ calendarid: z.string().min(1, 'Calendar ID requerido').max(200) }),
    },

    horario: {
        save: z.object({
            id: idFlexible,
            dia: z.string().min(1, 'Día requerido').max(20),
            startHour: z.string().min(1, 'Hora de inicio requerida').max(8),
            endHour: z.string().min(1, 'Hora de fin requerida').max(8),
        }),
        insert: z.object({
            dia: z.string().min(1, 'Día requerido').max(20),
            startHour: z.string().min(1, 'Hora de inicio requerida').max(8),
            endHour: z.string().min(1, 'Hora de fin requerida').max(8),
        }),
        delete: z.object({ id: idFlexible }),
    },

    ortodoncia: {
        getData: z.object({ dni }),
    },

    calendar: {
        availableSlots: z.object({
            date: z.string()
                .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (formato YYYY-MM-DD)')
                .refine(v => !Number.isNaN(new Date(v).getTime()), 'Fecha inexistente'),
            profId: idFlexible,
        }),
        createEvent: z.object({
            summary: z.string().min(1, 'Resumen requerido'),
            email: z.email('Email inválido'),
            number: z.union([z.string().min(1), z.number()]),
            name: z.string().max(120).optional(),
            // El calendario se deriva del profesional en el server (no se confía en el
            // cliente). Se exige profId; calendarId queda como legacy y se ignora.
            profId: idFlexible,
            clinica: z.string().trim().max(60).optional(),
            calendarId: z.string().optional(),
            start: z.object({ dateTime: z.string().min(1, 'Fecha/hora de inicio requerida') }),
            end: z.object({ dateTime: z.string().min(1, 'Fecha/hora de fin requerida') }),
        }),
        // Nota: el buscador público por email y el borrado directo por eventId se
        // eliminaron en la Fase 3 (permitían enumerar/cancelar turnos ajenos). La
        // gestión segura vive en /api/turnos (ver turnosController).
    },
};
