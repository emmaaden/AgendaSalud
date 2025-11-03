// Función para agregar un nuevo profesional y área
async function addProfessional() {
    const area = document.getElementById('area').value;
    const professional = document.getElementById('professional').value;

    if (area && professional) {
        const data = {
            area: area,
            professional: professional
        };

        try {
            // Enviar datos a la API
            const response = await fetch('https://agendasalud.onrender.com/add-professional', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                alert('Área y profesional agregados exitosamente');
                document.getElementById('area').value = '';
                document.getElementById('professional').value = '';
                loadProfessionals(); // Cargar la lista actualizada
            } else {
                alert('Error al agregar el área y profesional');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    } else {
        alert('Por favor, ingresa tanto el área como el profesional.');
    }
}

// Función para cargar las áreas y profesionales desde la base de datos
async function loadProfessionals() {
    try {
        const response = await fetch('https://agendasalud.onrender.com/professionals');
        const professionals = await response.json();

        const areaList = document.getElementById('areaList');
        areaList.innerHTML = ''; // Limpiar la lista

        professionals.forEach(prof => {
            const li = document.createElement('li');
            li.textContent = `${prof.area}: ${prof.professionals.join(', ')}`;
            areaList.appendChild(li);
        });
    } catch (error) {
        console.error('Error al cargar los datos:', error);
    }
}

// dashboard.js
document.addEventListener('DOMContentLoaded', async () => {
    const response = await fetch('/api/user');
    const userData = await response.json();

    if (userData.fullName) {
        document.getElementById('userName').textContent = `Te damos la bienvenida, ${userData.fullName}!`;
        document.getElementById('name').textContent = `${userData.fullName}`;
    }

    const responseArea = await fetch('/auth/get-area', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userData.email }), // Cambia este email por el de la sesión si corresponde
    });
    const data = await responseArea.json();

    const areaElement = document.getElementById('Area');

    if (responseArea.ok) {
        // Asignar el valor del área al elemento con el ID 'Area'
        if (areaElement) {
            areaElement.textContent = data.area; // Asigna el valor del área
        } else {
            console.error('El elemento con el ID "Area" no se encontró en el DOM.');
        }
    } else {
        console.error('Error:', data.error);
    }

    document.getElementById('editar').addEventListener('click', function () {
        document.getElementById('perfilProf').style.display = 'none';
        document.getElementById('perfilProfEdit').style.display = 'block';
    });

    document.getElementById('volver').addEventListener('click', function () {
        document.getElementById('perfilProf').style.display = 'block';
        document.getElementById('perfilProfEdit').style.display = 'none';
    });

    const fullName = userData.fullName
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
                    `${horario.startHour} - ${horario.endHour}`
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

// Cargar los datos al iniciar la página
loadProfessionals();
