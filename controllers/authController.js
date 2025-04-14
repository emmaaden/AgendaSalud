const User = require('../models/User');
const ActivationCode = require('../models/ActivationCode');
const bcrypt = require('bcrypt');

exports.register = async (req, res) => {
    const { fullName, email, dni, password, telefono, activationCode, area } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }

        const codeEntry = await ActivationCode.findOne({ code: activationCode });
        if (!codeEntry || codeEntry.used) {
            return res.status(400).json({ error: 'Código de activación inválido o ya utilizado.' });
        }

        if (!area) {
            return res.status(400).json({ error: 'El campo área es obligatorio.' });
        }

        let startHour = "00:00"
        let endHour = "00:00"
        codeEntry.used = true;
        await codeEntry.save();

        let descripcion = "Descripción completa del profesional, su experiencia en el campo de la salud, especialidades y los servicios que ofrece. Detalle de los años de trayectoria, certificaciones, y las instituciones en las que ha trabajado.";
        let precio = 0;
        let direccion = "Calle Muestra 123";
        let calendarid = ""
        let image = "img/img-face.png"
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            fullName,
            email,
            dni,
            telefono,
            password: hashedPassword,
            activationCode,
            startHour,
            endHour,
            area,
            descripcion,
            precio,
            direccion,
            calendarid,
            image
        });

        await newUser.save();

        res.status(201).json({ message: 'Usuario registrado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar el usuario' });
    }
};


exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Usuario no encontrado' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Contraseña incorrecta' });
        }

        req.session.isAuthenticated = true;
        req.session.email = user.email;
        req.session.fullName = user.fullName;
        req.session.dni = user.dni;
        req.session.area = user.area;

        res.status(200).json({ message: 'Inicio de sesión exitoso' });
    } catch (error) {
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
};

exports.logout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Error al cerrar sesión', err });
        }
        res.status(200).json({ message: 'Sesión cerrada exitosamente' });
    });
};

// Area

exports.saveArea = async (req, res) => {
    const { email, area } = req.body;  // Suponiendo que el área y el correo se envían en el cuerpo de la solicitud

    try {
        // Busca al usuario por el correo electrónico
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Verificar si el valor del área es válido (puedes adaptar esto según tu lógica)
        if (!area || typeof area !== 'string' || area.trim() === '') {
            return res.status(400).json({ error: 'Área no válida' });
        }

        // Asignar el valor del área al usuario
        user.area = area;
        await user.save();  // Guardar los cambios en la base de datos

        res.status(200).json({ message: 'Área asignada exitosamente', area });
    } catch (error) {
        res.status(500).json({ error: 'Error al asignar el área', details: error.message });
    }
};

exports.getArea = async (req, res) => {
    try {
        // Obtener el email desde el cuerpo de la solicitud o la sesión
        const email = req.body.email || req.session.email;

        if (!email) {
            return res.status(400).json({ error: 'Email no proporcionado' });
        }

        // Buscar al usuario por email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Devolver el área del usuario
        res.status(200).json({ area: user.area });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el área' });
    }
};

// Descripcion

exports.saveDesc = async (req, res) => {
    const { email, descripcion } = req.body;

    try {
        // Verificar si el valor de la Descripcion es válido (puedes adaptar esto según tu lógica)
        if (!descripcion || typeof descripcion !== 'string' || descripcion.trim() === '') {
            return res.status(400).json({ error: 'Descripcion no válida' });
        }

        // Actualizar el campo descripcion del usuario
        const user = await User.findOneAndUpdate(
          { email },
          { descripcion },
          { new: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.status(200).json({ message: 'Descripcion asignada exitosamente', descripcion });
    } catch (error) {
        res.status(500).json({ error: 'Error al asignar la Descripcion', details: error.message });
    }
};

exports.getDesc = async (req, res) => {
    try {
        // Obtener el email desde el cuerpo de la solicitud o la sesión
        const email = req.body.email;

        if (!email) {
            return res.status(400).json({ error: 'Email no proporcionado' });
        }

        // Buscar al usuario por email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Devolver la Descripcion del usuario
        res.status(200).json({ descripcion: user.descripcion });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener la Descripcion' });
    }
};

// Precio

exports.savePrecio = async (req, res) => {
    const { email, precio } = req.body;

    try {
        // Verificar si el valor del Precio es válido (puedes adaptar esto según tu lógica)
        if (!precio || typeof precio !== 'string' || precio.trim() === '') {
          return res.status(400).json({ error: 'Precio no válido' });
        }


        // Actualiza el campo Precio del usuario
        const user = await User.findOneAndUpdate(
          { email },
          { precio },
          { new: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.status(200).json({ message: 'Precio asignado exitosamente', precio });
    } catch (error) {
        res.status(500).json({ error: 'Error al asignar el Precio', details: error.message });
    }
};

exports.getPrecio = async (req, res) => {
    try {
        // Obtener el email desde el cuerpo de la solicitud o la sesión
        const email = req.body.email;

        if (!email) {
            return res.status(400).json({ error: 'Email no proporcionado' });
        }

        // Buscar al usuario por email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Devolver el Precio del usuario
        res.status(200).json({ precio: user.precio });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el Precio' });
    }
};

// Direccion
exports.saveDirec = async (req, res) => {
    const { email, direccion } = req.body;

    try {
        // Verificar si el valor de la direccion es válido
        if (!direccion || typeof direccion !== 'string' || direccion.trim() === '') {
            return res.status(400).json({ error: 'Direccion no válida' });
        }

        // Actualizar el campo direccion del usuario
        const user = await User.findOneAndUpdate(
            { email }, // Filtro para encontrar al usuario por email
            { direccion }, // Campo a actualizar
            { new: true } // Retorna el documento actualizado
        );

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.status(200).json({ message: 'Direccion asignada exitosamente', user });
    } catch (error) {
        res.status(500).json({ error: 'Error al asignar la Direccion', details: error.message });
    }
};


exports.getDirec = async (req, res) => {
    try {
        // Obtener el email desde el cuerpo de la solicitud o la sesión
        const email = req.body.email;

        if (!email) {
            return res.status(400).json({ error: 'Email no proporcionado' });
        }

        // Buscar al usuario por email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Devolver la Direccion del usuario
        res.status(200).json({ direccion: user.direccion });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener la Direccion' });
    }
};

// CalendarID

exports.saveCalenID = async (req, res) => {
    const { email, calendarid } = req.body;

    try {
        // Verificar si el valor de el calendarid es válido (puedes adaptar esto según tu lógica)
        if (!calendarid || typeof calendarid !== 'string' || calendarid.trim() === '') {
            return res.status(400).json({ error: 'CalendarID no válida' });
        }

        // Actualiza el campo CalendarID del usuario
        const user = await User.findOneAndUpdate(
          { email },
          { calendarid },
          {new: true }
        );

        if (!user) {
          return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.status(200).json({ message: 'Id calendar asignada exitosamente', calendarid });
    } catch (error) {
        res.status(500).json({ error: 'Error al asignar el calendarid', details: error.message });
    }
};

exports.getCalenID = async (req, res) => {
    try {
        // Obtener el email desde el cuerpo de la solicitud o la sesión
        const fullName = req.body.fullName;

        if (!fullName) {
            return res.status(400).json({ error: 'Email no proporcionado' });
        }

        // Buscar al usuario por email
        const user = await User.findOne({ fullName });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Devolver el CalendarID del usuario
        res.status(200).json({ calendarid: user.calendarid });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el calendarid' });
    }
};

// Foto Perfil

exports.getImg = async (req, res) => {
  try {
    const dni = req.body.dni;
    if (!dni) {
      return res.status(400).json({ error: 'dni no proporcionado.' });
    }

    const user = await User.findOne({ dni });

    if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.status(200).json({ image: user.image });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener la imagen' });
  }
};
