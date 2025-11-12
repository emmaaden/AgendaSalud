const host = "localhost:3000"
/* 
// Función para agregar un nuevo profesional y área
async function addProfessional() {
  const especialidad = document.getElementById("registerEspecialidad").value;
  const dni = document.getElementById("registerDNI").value;

  if (area && professional && email) {-[]

    const data = { area: area, professional: professional };

    try {
      // Enviar datos a la API para agregar profesional
      const addProfessionalResponse = await fetch(
        `http://${host}/add-professional`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );

      if (!addProfessionalResponse.ok) {
        throw new Error("Error al agregar profesional.");
      }

      // Enviar datos a la API para guardar el área
      const saveAreaResponse = await fetch("/auth/save-area", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, area }),
      });

      if (!saveAreaResponse.ok) {
        throw new Error("Error al guardar el área.");
      }

      const result = await saveAreaResponse.json();
      document.getElementById("areaNameDash").value = ""; // Limpiar el input
      return true;
    } catch (error) {
      console.error("Error:", error);
      alert(error.message);
      return false;
    }
  } else {
    alert("Por favor, ingresa el área, profesional y email.");
    return false;
  }
}
 */
// Función para obtener áreas y profesionales desde la base de datos y llenar el menú desplegable de áreas
async function populateAreaList(registerEspecialidad) {
  const select = registerEspecialidad;

  try {
    const response = await fetch("/especialidades/get-especialidades", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      }
    });
    const req = await response.json();
    console.log(req.especialidades)
    req.especialidades.forEach((esp) => {
      const option = document.createElement("option");
      option.value = esp.id;
      option.textContent = esp.nombre;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Error al cargar las áreas:", error);
  }
}

function test() {
  const area = document.getElementById("registerEspecialidad").value;
};

document.addEventListener("DOMContentLoaded", function () {
  registerEspecialidad = document.getElementById("registerEspecialidad");
  populateAreaList(registerEspecialidad);

});

document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  // Obtener los valores del formulario
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;
  const activationCode = document.getElementById("activationCode").value;
  const dni = document.getElementById("registerDNI").value;
  const nombre = document.getElementById("registerNombre").value;
  const apellido = document.getElementById("registerApellido").value;
  const telefono = document.getElementById("registerTelefono").value;
  const matricula = document.getElementById("registerMatricula").value;
  const direccion = document.getElementById("registerDireccion").value;
  const sexo = document.getElementById("registerSexo").value;
  const especialidad = document.getElementById("registerEspecialidad").value;
  const fechaNacimiento = document.getElementById("registerFechaNacimiento").value;
  const role = "PROFESIONAL"

  try {
    // Enviar datos para registrar al usuario
    const response = await fetch("/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, activationCode, dni, nombre, apellido, fechaNacimiento, telefono, especialidad, matricula, direccion, sexo, role }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Error en el registro.");
    } else if (response.ok) {
      window.location.href = "/dashboard";
    }

  } catch (error) {
    alert(error.message || "Ocurrió un error inesperado.");
  }
});
