let CALENDAR_ID = ''; // Variable global para almacenar el ID del calendario seleccionado

// Función para cargar las áreas y profesionales desde la base de datos
async function loadProfessionals() {
    try {
        const response = await fetch(`http://${host}/professionals`);
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

// Función para obtener áreas y profesionales desde la base de datos y llenar el menú desplegable de áreas
async function populateAreaList(area) {
    const select = area;

    try {
        const response = await fetch(`http://${host}/professionals`);
        const professionals = await response.json();

        professionals.forEach(prof => {
            const option = document.createElement('option');
            option.value = prof.area;
            option.textContent = prof.area;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar las áreas:', error);
    }
}

// Función para llenar el menú desplegable de profesionales basado en el área seleccionada
async function populateProfessionalList(area, selectProf) {
    const select = selectProf;
    select.innerHTML = ''; // Limpiar las opciones existentes

    try {
        const response = await fetch(`http://${host}/professionals`);
        const professionals = await response.json();

        // Filtrar el área seleccionada
        const selectedArea = professionals.find(prof => prof.area === area);
        if (selectedArea && selectedArea.professionals.length > 0) {
            selectedArea.professionals.forEach(professional => {
                const option = document.createElement('option');
                option.value = professional;
                option.textContent = professional;
                select.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No hay profesionales disponibles';
            select.appendChild(option);
        }
    } catch (error) {
        console.error('Error al cargar los profesionales:', error);
    }
}

// Función para actualizar el ID del calendario basado en el profesional seleccionado
async function updateCalendarId(professionalName) {
    const responseCalenID = await fetch('/auth/get-calenID', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fullName: professionalName }),
    });
    const dataCalenID = await responseCalenID.json();

    let newCalendarId = "";

    if (responseCalenID.ok) {
        newCalendarId = dataCalenID.calendarid;
    } else {
        console.error('Error:', dataCalenID.error);
    }

    if (newCalendarId) {
        fetch(`http://${host}/set-calendar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ calendarId: newCalendarId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('ID del calendario actualizado.');
            } else {
                console.error('Error al actualizar el ID del calendario.');
            }
        })
        .catch(error => {
            console.error('Error en la solicitud de actualización del calendario:', error);
        });
    } else {
        console.error('Nombre de profesional no válido');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    area =  document.getElementById('areaName');
    selectProf = document.getElementById('profName');
    populateAreaList(area);

    document.getElementById('areaName').addEventListener('change', function() {
        const selectedArea = this.value;
        populateProfessionalList(selectedArea, selectProf); // Cargar profesionales según área
    });

    document.getElementById('select-prof-form').addEventListener('submit', function(event) {
        event.preventDefault();
        const professionalName = document.getElementById('profName').value;
        if (professionalName) {
            updateCalendarId(professionalName);
        } else {
            alert('Por favor, selecciona un profesional.');
        }
    });
});
