// cambiar la direccion
async function saveDireccion() {
    const response = await fetch('/api/user');
    const userData = await response.json();
    const user_id = userData.idRole;
    const direccion = document.getElementById("save-direccion").value;


    const responseDirec = await fetch('/profesional/save-direc', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id, direccion }),
    });
    const data = await responseDirec.json();

    const direcElement = document.getElementById('save-direccion');

    if (responseDirec.ok) {
        if (direcElement) {
            direcElement.textContent = data.direccion;
            document.getElementById("save-direccion").value = '';
            location.reload();
        } else {
            console.error('El elemento con el ID "save-direccion" no se encontró en el DOM.');
        }
    } else {
        console.error('Error:', data.error);
    }
};

// cambiar el precio
async function savePrecio() {
    const response = await fetch('/api/user');
    const userData = await response.json();
    const user_id = userData.idRole;
    const precio = document.getElementById("save-precio").value;


    const responsePrecio = await fetch('/profesional/save-precio', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id, precio }),
    });
    const data = await responsePrecio.json();

    const precioElement = document.getElementById('save-precio');

    if (responsePrecio.ok) {
        if (precioElement) {
            precioElement.textContent = data.precio;
            document.getElementById("save-precio").value = '';
            location.reload();
        } else {
            console.error('El elemento con el ID "save-precio" no se encontró en el DOM.');
        }
    } else {
        console.error('Error:', data.error);
    }
};

// cambiar el descripción
async function saveDescripcion() {
    const response = await fetch('/api/user');
    const userData = await response.json();
    const user_id = userData.idRole;
    const descripcion = document.getElementById("save-descripcion").value;


    const responsedescripcion = await fetch('/profesional/save-desc', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id, descripcion }),
    });
    const data = await responsedescripcion.json();

    const descripcionElement = document.getElementById('save-descripcion');

    if (responsedescripcion.ok) {
        if (descripcionElement) {
            descripcionElement.textContent = data.descripcion;
            document.getElementById("save-descripcion").value = '';
            location.reload();
        } else {
            console.error('El elemento con el ID "save-descripcion" no se encontró en el DOM.');
        }
    } else {
        console.error('Error:', data.error);
    }
};

//

// cambiar ID calendarid
async function saveIdCalendar() {
    const response = await fetch('/api/user');
    const userData = await response.json();
    const user_id = userData.idRole;
    const calendarid = document.getElementById("save-calendarid").value;


    const responseCalenID = await fetch('/profesional/save-calenID', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id, calendarid }),
    });
    const data = await responseCalenID.json();

    const direcElement = document.getElementById('save-calendarid');

    if (responseCalenID.ok) {
        if (direcElement) {
            direcElement.textContent = data.calendarid;
            document.getElementById("save-calendarid").value = '';
            location.reload();
        } else {
            console.error('El elemento con el ID "save-calendarid" no se encontró en el DOM.');
        }
    } else {
        console.error('Error:', data.error);
    }
};

async function fetchAndSetElement(url, elementId, field, id) {
    try {
        const responseUser = await fetch('/api/user');
        const userData = await responseUser.json();
        const user_id = userData[id];

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id }),
        });

        const data = await response.json();
        const element = document.getElementById(elementId);

        if (response.ok) {
            if (element) {
                element.textContent = data[field];
            } else {
                console.error(`El elemento con id "${elementId}" no existe en el DOM.`);
            }
        } else {
            console.log(url, elementId, field, id, "userID", user_id, data)
            console.error('Error en la petición:', data.error);
        }
    } catch (err) {
        console.error('Error inesperado:', err);
    }
}


// dashboard.js
document.addEventListener('DOMContentLoaded', async () => {
    const response = await fetch('/api/user');
    const userData = await response.json();
    const user_id = userData.id;

    const responseName = await fetch('/profesional/get-datos-prof', {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id }),
    });

    if (!responseName.ok) {
        console.error("Error al obtener el nombre:", res.status);
        return;
    }

    const nameElement = document.getElementById('name');
    const fullNameData = await responseName.json();
    const nombre = fullNameData.nombre;
    const apellido = fullNameData.apellido;
    nameElement.textContent = `${nombre}  ${apellido}`;

    //async function fetchAndSetElement(url, elementId, field) {
    await fetchAndSetElement('/profesional/get-datos-prof', 'idCalendar', 'id_calendario', 'id');
    await fetchAndSetElement('/profesional/get-datos-prof', 'idDireccion', 'direccion', 'id');
    await fetchAndSetElement('/profesional/get-datos-prof', 'idDescripcion', 'descripcion', 'id');
    await fetchAndSetElement('/profesional/get-datos-prof', 'idPrecio', 'precio', 'id');
    await fetchAndSetElement('/profesional/get-esp-prof', 'idEspProf', 'especialidad_profesional', 'idRole');

    const responseCalen = await fetch('/profesional/get-datos-prof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id }),
    });

    const dataCalen = await responseCalen.json();
    const elementCalen = document.getElementById('linkCalender');

    const dataCalenSet = dataCalen.id_calendario.split("@")[0];

    elementCalen.innerHTML = ` 
    <iframe
        src="https://calendar.google.com/calendar/embed?src=${dataCalenSet}%40group.calendar.google.com&ctz=America%2FArgentina%2FMendoza"
        style="border: 0" width="100%" height="600" frameborder="0" scrolling="no"></iframe>
    `;

    document.getElementById('editar').addEventListener('click', function () {
        document.getElementById('perfilProf').style.display = 'none';
        document.getElementById('perfilProfEdit').style.display = 'block';
        document.getElementById('editCalen').style.display = 'none';
        loadHorarios(1, horariosTableEditBody);
    });

    document.getElementById('volver').addEventListener('click', function () {
        document.getElementById('perfilProf').style.display = 'block';
        document.getElementById('perfilProfEdit').style.display = 'none';
        document.getElementById('editCalen').style.display = 'block';
        loadHorarios(0, horariosTableProfileBody);
    });

    document.getElementById('volver2').addEventListener('click', function () {
        document.getElementById('perfilProf').style.display = 'block';
        document.getElementById('perfilProfEdit').style.display = 'none';
        document.getElementById('editCalen').style.display = 'block';
        loadHorarios(0, horariosTableProfileBody);
    });

    document.getElementById('volver3').addEventListener('click', function () {
        document.getElementById('perfilProf').style.display = 'block';
        document.getElementById('perfilProfEdit').style.display = 'none';
        document.getElementById('editCalen').style.display = 'block';
        loadHorarios(0, horariosTableProfileBody);
    });

    document.getElementById('volver4').addEventListener('click', function () {
        document.getElementById('perfilProf').style.display = 'block';
        document.getElementById('perfilProfEdit').style.display = 'none';
        document.getElementById('editCalen').style.display = 'block';
        loadHorarios(0, horariosTableProfileBody);
    });

});
let editHorarioId = null;

// Elementos
const horarioForm = document.getElementById('horarioForm');
const addHorarioBtn = document.getElementById('addHorarioBtn');
const cancelHorarioBtn = document.getElementById('cancelHorarioBtn');
const horariosTableEditBody = document.querySelector('#horariosTableEdit tbody');
const horariosTableProfileBody = document.querySelector('#horariosTableProfile tbody');

// Mostrar el formulario para agregar
addHorarioBtn.addEventListener('click', () => {
    editHorarioId = null;
    horarioForm.style.display = 'block';
    horarioForm.reset();
});

// Cancelar agregar/editar
cancelHorarioBtn.addEventListener('click', () => {
    horarioForm.style.display = 'none';
    editHorarioId = null;
});


// Cargar horarios desde backend
async function loadHorarios(opcion, id) {
    // 1. Obtener user_id
    const responseUser = await fetch('/api/user');
    const userData = await responseUser.json();
    const user_id = userData.idRole;

    // 2. Llamar al backend (GET con query param)
    const response = await fetch(`/hour/get-horarios?user_id=${user_id}`);
    const data = await response.json();

    // 3. Renderizar tabla
    id.innerHTML = '';
    if (data.length === 0) {
        id.innerHTML = `<tr><td colspan="4">No hay horarios disponibles.</td></tr>`;
        return;
    }

    if (opcion === 1) {
        data.forEach(h => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
            <td>${h.dia}</td>
            <td>${h.horario_inicio}</td>
            <td>${h.horario_fin}</td>
            <td>
                <button class="btn btn-primary btn-sm me-2" onclick="editHorario('${h.id}','${h.dia}','${h.horario_inicio}','${h.horario_fin}')">Editar</button>
                <button class="btn btn-danger btn-sm" onclick="deleteHorario('${h.id}')">Borrar</button>
            </td>
        `;
            id.appendChild(tr);
        });
    } else {
        data.forEach(h => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
            <td>${h.dia}</td>
            <td>${h.horario_inicio}</td>
            <td>${h.horario_fin}</td>
        `;
            id.appendChild(tr);
        });
    }
}


// Editar horario: llena el formulario con datos existentes
function editHorario(id, dia, start, end) {
    editHorarioId = id;
    horarioForm.style.display = 'block';
    document.getElementById('dia').value = dia;
    document.getElementById('startHour').value = start;
    document.getElementById('endHour').value = end;
}

// Guardar nuevo horario o actualizar existente
horarioForm.addEventListener('submit', async e => {
    e.preventDefault();

    const responseUser = await fetch('/api/user');
    const userData = await responseUser.json();
    const user_id = userData.idRole;

    const dia = document.getElementById('dia').value;
    const startHour = document.getElementById('startHour').value;
    const endHour = document.getElementById('endHour').value;

    const url = editHorarioId ? '/hour/save-hours' : '/hour/insert-hours';
    const body = editHorarioId
        ? { id: editHorarioId, user_id: user_id, dia, startHour, endHour }
        : { user_id: user_id, dia, startHour, endHour };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const result = await response.json();
    if (result.success) {
        alert(result.message);
        horarioForm.style.display = 'none';
        editHorarioId = null;
        loadHorarios(1, horariosTableEditBody);
    } else {
        alert(result.error);
    }
});

// Borrar horario
async function deleteHorario(id) {
    if (!confirm('¿Querés borrar este horario?')) return;

    const responseUser = await fetch('/api/user');
    const userData = await responseUser.json();
    const user_id = userData.idRole;

    const response = await fetch('/hour/delete-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, user_id })
    });

    const result = await response.json();
    if (result.success) {
        alert(result.message);
        loadHorarios(1, horariosTableEditBody);
    } else {
        alert(result.error);
    }
}


// Inicializar tabla al cargar el carrusel
loadHorarios(0, horariosTableProfileBody);

document.querySelectorAll("#perfilTabs li").forEach(function (tab) {
    tab.addEventListener("click", function () {
        const target = this.getAttribute("data-target");

        // Obtener el índice del carrusel para moverse
        const items = document.querySelectorAll(".carousel-item");
        let index = 0;

        items.forEach(function (item, i) {
            if (item.id === target) {
                index = i;
            }
        });

        const carrusel = new bootstrap.Carousel(document.querySelector("#perfilCarrusel"), {
            interval: false, // Evitar que se desplace automáticamente
            ride: false      // Evitar que se active automáticamente
        });
        carrusel.to(index); // Mover al índice seleccionado
    });
});
