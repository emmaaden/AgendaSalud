// Devuelve el nombre del mes actual y del próximo mes
function obtenerMeses() {
    const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const fecha = new Date();
    const mesActual = meses[fecha.getMonth()];
    const mesProximo = meses[(fecha.getMonth() + 1) % 12];
    return { mesActual, mesProximo };
}

// Simula consulta al backend (acá luego harías el fetch real)
async function obtenerValoresPorDNI(dni) {
    const response = await fetch("/ortodoncia/get-data", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ dni })
    });

    if (!response.ok) {
        console.error("Error al obtener el valor de ortodoncia del paciente:", response.status);
        return;
    }

    const data = await response.json();

    const datos = {
        valor: data.valor,   // valor actual
        aumento: data.aumento,     // porcentaje de aumento
        nombre: data.nombre,
        apellido: data.apellido
    };
    return new Promise(resolve => {
        setTimeout(() => resolve(datos), 700); // Simula tiempo de consulta
    });
}

document.getElementById("consultaForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const dni = document.getElementById("dni").value.trim();
    if (!dni) return alert("Por favor ingrese un DNI válido.");

    const { mesActual, mesProximo } = obtenerMeses();

    // Mostramos que está cargando (opcional)
    const resultado = document.getElementById("resultado");
    resultado.style.display = "block";
    resultado.innerHTML = "<p class='text-muted'>Buscando información...</p>";

    // Simula consulta backend
    const datos = await obtenerValoresPorDNI(dni);

    const valorActual = datos.valor;
    const valorProximo = valorActual + (valorActual * (datos.aumento / 100));
    const fullName = `${datos.nombre} ${datos.apellido}`;
    // Renderiza los resultados
    resultado.innerHTML = `
  <div class="card shadow-sm border-0 mt-4">
    <div class="card-body">
      <h5 class="fw-bold text-primary mb-3">
        <i class="fa-solid fa-tooth me-2"></i>Resultados
      </h5>

      <div class="mb-3">
        <p class="mb-0 text-secondary fw-semibold">Paciente</p>
        <h6 class="fw-bold text-dark">${fullName}</h6>
      </div>

      <hr>

      <div class="d-flex justify-content-between align-items-center mb-2">
        <p class="mb-0 fw-semibold">${mesActual}</p>
        <span class="badge bg-success-subtle text-success fs-6">
          $${valorActual.toLocaleString()}
        </span>
      </div>

      <div class="d-flex justify-content-between align-items-center">
        <p class="mb-0 fw-semibold">${mesProximo}</p>
        <span class="badge bg-info-subtle text-info fs-6">
          $${valorProximo.toLocaleString()} (+${datos.aumento}%)
        </span>
      </div>
    </div>
  </div>
`;
});