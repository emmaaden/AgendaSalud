const Patient = require('../models/Paciente');

exports.regisPacient = async (req, res) => {
    const { fullName, email, password, dni, telefono, sexo, direccion, fechaNacimiento, edad, obraSocial, fecha, area, profesional, sintomas, diagnostico, tratamiento, dientes } = req.body;
    console.log(req.body);

    try {
      if (!fullName || !email || !password || !dni || !telefono) {
          return res.status(400).json({ error: 'Faltan datos obligatorios' });
      }

      const fechaApertura = new Date(fecha).toLocaleString("es-AR", {
          day: "numeric",
          month: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "numeric"
      });

        // Array Historial

        const historial = [
    {
        fecha: fecha,
        area: area,
        profesional: profesional,
        sintomas: sintomas,
        diagnostico: diagnostico,
        tratamiento: tratamiento,
        dientes: dientes
    }
];

        const newPatients = new Patient({
            fullName,
            email,
            password,
            dni,
            telefono,
            sexo,
            direccion,
            fechaNacimiento,
            edad,
            obraSocial,
            fechaApertura,
            historial
        });

        await newPatients.save();
        res.status(201).json({ message: 'Datos del paciente cargados con exito' });

    } catch (error) {
        res.status(500).json({ error: 'Error al cargar los datos del paciente' });
    }
};


exports.saveData = async (req, res) => {
    const { profesional, dni, sintomas, diagnostico, tratamiento, area, fecha, dientes } = req.body;

    try {
        // Buscar paciente por DNI
        const pacient = await Patient.findOne({ dni });
        if (!pacient) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }

        // Crear un nuevo registro para el historial
        const nuevoHistorial = {
            fecha: fecha || new Date().toLocaleString("es-AR", {
                day: "numeric",
                month: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "numeric"
            }),
            area: area || "No especificado",
            profesional: profesional || "No especificado",
            sintomas: sintomas || "No especificado",
            diagnostico: diagnostico || "No especificado",
            tratamiento: tratamiento || "No especificado",
            dientes: dientes ||  "No especificado"
        };
        console.log(nuevoHistorial);
        // Agregar el nuevo historial al paciente
        pacient.historial.push(nuevoHistorial);

        // Guardar los cambios en la base de datos
        await pacient.save();

        res.status(200).json({ message: 'Historial del paciente actualizado con éxito' });
    } catch (error) {
        console.error("Error al actualizar los datos del paciente:", error.message);
        res.status(500).json({ error: 'Error al actualizar los datos del paciente' });
    }
};


exports.data = async (req, res) => {
    const { dni, password } = req.body;
    try {
        const pacient = await Patient.findOne({ dni });
        if (!pacient) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }

        if (password != pacient.password) {
            return res.status(404).json({ error: 'Contraseña incorrecta' });
        }
        // Suponiendo que 'pacient' es un objeto que se obtiene de la base de datos
        const formattedHistory = pacient.historial.map(registro => ({
          fecha: new Date(registro.fecha).toLocaleString("es-AR", {
            day: "numeric",
            month: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "numeric"
          }),
          sintomas: registro.sintomas,
          diagnostico: registro.diagnostico,
          tratamiento: registro.tratamiento,
          area: registro.area,
          profesional: registro.profesional,
          dientes: registro.dientes
        }));

        res.status(200).json({
            fullName: pacient.fullName,
            dni: pacient.dni,
            telefono: pacient.telefono,
            email: pacient.email,
            telefono: pacient.telefono,
            direccion: pacient.direccion,
            fechaNacimiento: pacient.fechaNacimiento,
            edad: pacient.edad,
            obraSocial: pacient.obraSocial,
            sexo: pacient.sexo,
            fechaApertura: pacient.fechaApertura,
            history: formattedHistory
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al cargar los datos del paciente' });
    }
};
