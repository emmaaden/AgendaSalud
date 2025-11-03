document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  // Obtener los valores del formulario
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;
  const dni = document.getElementById("registerDNI").value;
  const nombre = document.getElementById("registerNombre").value;
  const apellido = document.getElementById("registerApellido").value;
  const telefono = document.getElementById("registerPhone").value;
  const fechaNacimiento = document.getElementById("registerNacimiento").value;
  const direccion = document.getElementById("registerDireccion").value;
  const obraSocial = document.getElementById("registerObraSocial").value;
  const role = "PACIENTE"

  try {
    // Enviar datos para registrar al usuario
    const response = await fetch("/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, dni, nombre, apellido, telefono, fechaNacimiento, direccion, obraSocial, role  }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Error en el registro.");
    }
    window.location.href = "/";
  } catch (error) {
    alert(error.message || "Ocurrió un error inesperado.");
  }
});
