// cambiar la direccion
async function saveDireccion() {
    const response = await fetch('/api/user');
    const userData = await response.json();
    const email = userData.email;
    const direccion = document.getElementById("save-direccion").value;


    const responseDirec = await fetch('/auth/save-direccion', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, direccion }),
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
    const email = userData.email;
    const precio = document.getElementById("save-precio").value;


    const responsePrecio = await fetch('/auth/save-precio', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, precio }),
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
    const email = userData.email;
    const descripcion = document.getElementById("save-descripcion").value;


    const responsedescripcion = await fetch('/auth/save-descripcion', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, descripcion }),
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
    const user_id = userData.id;
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



// dashboard.js
document.addEventListener('DOMContentLoaded', async () => {
    const response = await fetch('/api/user');
    const userData = await response.json();
    const user_id = userData.id;

    const responseName = await fetch('/profesional/get-name', {
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

    // Obtener ID Calendar del prof
    const responseCalenID = await fetch('/profesional/get-calenID', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id }),
    });
    
    const calendIdElement = document.getElementById('idCalendar');
    const dataIdCalen = await responseCalenID.json();

    if (responseCalenID.ok) {
        if (calendIdElement) {
            calendIdElement.textContent = dataIdCalen.id_calendario;
        } else {
            console.error('El elemento con el ID "idCalendar" no se encontró en el DOM.');
        }
    } else {
        console.error('Error:', dataIdCalen.error);
    }

    // Obtener la especialidad del prof
    const responseEspProf = await fetch('/auth/get-Esp-Prof', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id }),
    });

    const espProfElement = document.getElementById('espProf');
    const dataEspProf = await responseEspProf.json();

    if (responseEspProf.ok) {        
        if (espProfElement) {
            espProfElement.textContent = dataEspProf.especialidad_profesional; // Asigna el valor del área
        } else {
            console.error('El elemento con el ID "espProf" no se encontró en el DOM.');
        }
    } else {
        console.error('Error:', dataEspProf.error);
    }

    // Obtener la descripción del prof
    const responseDirec = await fetch('/auth/get-direccion', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userData.email }),
    });
    const dataDirec = await responseDirec.json();

    const direcElement = document.getElementById('cont-direccion');

    if (responseDirec.ok) {
        if (direcElement) {
            direcElement.textContent = dataDirec.direccion;
        } else {
            console.error('El elemento con el ID "cont-direccion" no se encontró en el DOM.');
        }
    } else {
        console.error('Error:', dataDirec.error);
    }

    // Obtener el precio del prof
    const responsePrecio = await fetch('/auth/get-precio', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userData.email }),
    });
    const dartaPrecio = await responsePrecio.json();

    const precioElement = document.getElementById('cont-precio');

    if (responsePrecio.ok) {
        if (precioElement) {
            precioElement.textContent = dartaPrecio.precio;
        } else {
            console.error('El elemento con el ID "cont-precio" no se encontró en el DOM.');
        }
    } else {
        console.error('Error:', dartaPrecio.error);
    }

    // Obtener la descripcion del prof
    const responseDescripcion = await fetch('/auth/get-descripcion', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userData.email }),
    });
    const dartaDescripcion = await responseDescripcion.json();

    const descripcionElement = document.getElementById('cont-descripcion');

    if (responseDescripcion.ok) {
        if (descripcionElement) {
            descripcionElement.textContent = dartaDescripcion.descripcion;
        } else {
            console.error('El elemento con el ID "cont-Descripcion" no se encontró en el DOM.');
        }
    } else {
        console.error('Error:', dartaDescripcion.error);
    }

    document.getElementById('editar').addEventListener('click', function () {
        document.getElementById('perfilProf').style.display = 'none';
        document.getElementById('perfilProfEdit').style.display = 'block';
        document.getElementById('editCalen').style.display = 'none';
    });

    document.getElementById('volver').addEventListener('click', function () {
        document.getElementById('perfilProf').style.display = 'block';
        document.getElementById('perfilProfEdit').style.display = 'none';
        document.getElementById('editCalen').style.display = 'block';
    });

    document.getElementById('volver2').addEventListener('click', function () {
        document.getElementById('perfilProf').style.display = 'block';
        document.getElementById('perfilProfEdit').style.display = 'none';
        document.getElementById('editCalen').style.display = 'block';
    });

    document.getElementById('volver3').addEventListener('click', function () {
        document.getElementById('perfilProf').style.display = 'block';
        document.getElementById('perfilProfEdit').style.display = 'none';
        document.getElementById('editCalen').style.display = 'block';
    });

    document.getElementById('volver4').addEventListener('click', function () {
        document.getElementById('perfilProf').style.display = 'block';
        document.getElementById('perfilProfEdit').style.display = 'none';
        document.getElementById('editCalen').style.display = 'block';
    });

    //    const fullName = userData.fullName
    // Realizar la petición a /api/get-hours con el nombre del profesional
    fetch(`/api/get-hours-prof?fullName=${encodeURIComponent(fullName)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al obtener los horarios.');
            }
            return response.json();
        })
        .then(data => {
            // Mostrar los horarios en el <span> con id "horarios"
            const horariosSpan = document.getElementById('horarios');

            if (data.length > 0) {
                const horariosText = data.map(horario =>
                    `${horario.startHour}hs - ${horario.endHour}hs`
                ).join(', ');

                horariosSpan.textContent = horariosText;
            } else {
                horariosSpan.textContent = 'No hay horarios disponibles.';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('horarios').textContent = 'Error al cargar los horarios.';
        });

});

document.getElementById('professionalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const responseUser = await fetch('/api/user');
    const userData = await responseUser.json();

    const fullName = userData.fullName
    const startHour = document.getElementById('startHour').value;
    const endHour = document.getElementById('endHour').value;

    // Determina si es una actualización o una creación
    const response = await fetch('/api/save-hours', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fullName, startHour, endHour }),
    });
    const result = await response.json();
    location.reload()
});


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
