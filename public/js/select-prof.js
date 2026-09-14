// Selección de profesional para reservar turno.
// El calendarId del profesional elegido se publica en window.CALENDAR_ID,
// que main.js usa en cada request (ya no existe /set-calendar).
window.CALENDAR_ID = window.CALENDAR_ID || '';

// Función para cargar las áreas y profesionales desde la base de datos
async function loadProfessionals() {
    try {
        const response = await fetch(`/professionals`);
        const professionals = await response.json();

        const areaList = document.getElementById('areaList');
        if (!areaList) return;
        areaList.innerHTML = ''; // Limpiar la lista

        professionals.forEach(prof => {
            const li = document.createElement('li');
            const nombres = prof.professionals.map(p => p.nombre).join(', ');
            li.textContent = `${prof.area}: ${nombres}`;
            areaList.appendChild(li);
        });
    } catch (error) {
        console.error('Error al cargar los datos:', error);
    }
}

// Llenar el menú desplegable de áreas
async function populateAreaList(area) {
    const select = area;

    try {
        const response = await fetch(`/professionals`);
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

// Llenar el menú de profesionales según el área seleccionada.
// El value de cada opción es el id del profesional (no el nombre).
async function populateProfessionalList(area, selectProf) {
    const select = selectProf;
    select.innerHTML = ''; // Limpiar las opciones existentes

    try {
        const response = await fetch(`/professionals`);
        const professionals = await response.json();

        const selectedArea = professionals.find(prof => prof.area === area);
        if (selectedArea && selectedArea.professionals.length > 0) {
            selectedArea.professionals.forEach(professional => {
                const option = document.createElement('option');
                option.value = professional.id;          // id del profesional
                option.textContent = professional.nombre; // nombre visible
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

// Obtener el id_calendario del profesional (por id) y publicarlo en window.CALENDAR_ID.
async function updateCalendarId(professionalId) {
    try {
        const responseCalenID = await fetch('/auth/get-calenID', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: professionalId }),
        });
        const dataCalenID = await responseCalenID.json();

        if (!responseCalenID.ok) {
            console.error('Error:', dataCalenID.error);
            window.CALENDAR_ID = '';
            return;
        }

        window.CALENDAR_ID = dataCalenID.calendarid || '';
        if (window.CALENDAR_ID) {
            console.log('Calendario del profesional seleccionado.');
        } else {
            console.warn('El profesional no tiene un calendario configurado.');
        }
    } catch (error) {
        console.error('Error al obtener el calendario del profesional:', error);
        window.CALENDAR_ID = '';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const area = document.getElementById('areaName');
    const selectProf = document.getElementById('profName');
    populateAreaList(area);

    document.getElementById('areaName').addEventListener('change', function() {
        const selectedArea = this.value;
        populateProfessionalList(selectedArea, selectProf); // Cargar profesionales según área
    });

    document.getElementById('select-prof-form').addEventListener('submit', function(event) {
        event.preventDefault();
        const professionalId = document.getElementById('profName').value;
        if (professionalId) {
            updateCalendarId(professionalId);
        } else {
            alert('Por favor, selecciona un profesional.');
        }
    });
});
