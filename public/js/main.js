const host = '192.168.100.23:3000';

document.getElementById('enviar').addEventListener('click', handleFormSubmit);
document.getElementById('appointmentDate').addEventListener('change', updateAvailableSlots);

let professionalWorkHours = {};

fetch(`http://${host}/api/get-hours`)
    .then(response => response.json())
    .then(data => {
        professionalWorkHours = data.reduce((acc, { fullName, startHour, endHour }) => {
            acc[fullName] = { start: startHour, end: endHour };
            return acc;
        }, {});
    })
    .catch(error => {
        console.error('Error al obtener los horarios:', error);
        Swal.fire({
            icon: "error",
            title: "Oops...",
            text: `Error de sistema, le pedimos disculpas.`,
            footer: '<a href="https://wa.me/2615930274">Ayuda</a>'
          });
    });

function handleFormSubmit(event) {
  try {
    event.preventDefault();

    const name = document.getElementById('patientName').value;
    const email = document.getElementById('email').value;
    const number = document.getElementById('number').value;
    const numberCode = document.getElementById('number-code').value;
    const selectedSlot = document.getElementById('available-slots').value;
    const date = new Date(selectedSlot);

    const now = new Date();

    // Verificar si la fecha seleccionada es anterior a la actual
    if (date < now) {
      Swal.fire({
        icon: "error",
        title: "Fecha inválida",
        text: "No puedes elegir una fecha pasada.",
      });
      return; // Detener el procesamiento del formulario
    }

    const eventDetails = {
        summary: `Cita con ${name}`,
        description: `Correo del paciente: ${email}, Numero de teléfono: ${number}`,
        start: {
            dateTime: date.toISOString(),
            timeZone: 'America/Argentina/Buenos_Aires'
        },
        end: {
            dateTime: new Date(date.getTime() + 30 * 60000).toISOString(), // Añadir 30 minutos a la hora de inicio
            timeZone: 'America/Argentina/Buenos_Aires'
        },
        email: email, // Añadir el correo del cliente
        number: number, // Añadir el número de teléfono del cliente
        numberCode: numberCode // Añadir el area de país del teléfono del cliente
    };

    fetch(`http://${host}/create-event`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventDetails)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('appointmentDate').value = '';
                document.getElementById('available-slots').value = '';
                // Mostrar el modal de éxito
                Swal.fire({
                  title: "Turno Agendado con Éxito",
                  icon: "success",
                  confirmButtonColor: "#3085d6",
                  confirmButtonText: "Ok!"
                  }).then((result) => {
                    if (result.isConfirmed) {
                      location.reload()
                    }
                  });
            } else {
                // Mostrar el modal de error
                Swal.fire({
                  icon: "error",
                  title: "Oops...",
                  text: "Turno no agendado",
                  footer: '<a href="https://wa.me/2615930274">Ayuda</a>'
                });
            }
        })
        .catch(error => {
            console.error('Error al enviar la solicitud:', error);
            // Mostrar el modal de error en caso de fallo
            // Mostrar el modal de error
            Swal.fire({
              icon: "error",
              title: "Oops...",
              text: `Turno no agendado: ${e.message}`,
              footer: '<a href="https://wa.me/2615930274">Ayuda</a>'
            });
        });
      } catch (e) {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: `Turno no agendado: ${e.message}`,
          footer: '<a href="https://wa.me/2615930274">Ayuda</a>'
        });
      }
}

function getAvailableSlots(occupiedSlots, selectedDate, workHours) {
    const availableSlots = [];

    const [startHour, startMinute] = workHours.start.split(':').map(Number);
    const [endHour, endMinute] = workHours.end.split(':').map(Number);

    // Se suma + 3 para corregir la zona horaria
    const adjustedStartHour = (startHour) % 24 + 3;
    const adjustedEndtHour = (endHour) % 24 + 3;

    const timeMin = new Date(selectedDate);
    timeMin.setUTCHours(adjustedStartHour, startMinute); // Establece la hora al inicio del día
    const timeMax = new Date(selectedDate);
    timeMax.setUTCHours(adjustedEndtHour, endMinute); // Establece la hora al final del día

    let currentTime = new Date(timeMin);
    // Recorrer cada franja de 30 minutos
    while (currentTime < timeMax) {
        const nextSlot = new Date(currentTime.getTime() + 30 * 60000);
        const currentSlot = currentTime.toISOString();

        // Comprobar si el slot está ocupado
        const isSlotnotOccupied = occupiedSlots.includes(currentSlot);

        // Si no está ocupado, añadir a los slots disponibles
        if (isSlotnotOccupied) {
            availableSlots.push(currentTime.toISOString()); // Devuelve en formato UTC
        }
        // Avanzar al siguiente slot
        currentTime = nextSlot;
    }

    return availableSlots;
}

// Función para encontrar el turno más cercano, incluso si es en una fecha futura
function findNearestSlot(availableSlots) {
    const now = new Date(); // Hora actual
    let nearestSlot = null;

    for (const slot of availableSlots) {
        const slotDate = new Date(slot);

        // Si el slot es posterior a la hora actual
        if (slotDate > now) {
            if (!nearestSlot || slotDate < new Date(nearestSlot)) {
                nearestSlot = slot;
            }
        }else{
            document.getElementById('nearest-slot').textContent = `Elija una fecha valida.`;
            findNearestSlot();
        }
    }

    return nearestSlot;
}

// Función para buscar turnos en fechas futuras si no hay en la fecha seleccionada
function searchForNearestSlot(professionalName) {
    const workHours = professionalWorkHours[professionalName];
    let currentDate = new Date();

    // Buscar hasta encontrar el turno más cercano, avanzando un día cada vez
    const fetchNearestSlot = () => {
        const formattedDate = currentDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD

        // Verificar si es sábado o domingo
        const dayOfWeek = currentDate.getDay();  // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
        if (dayOfWeek === 0 || dayOfWeek === 6) { // Si es domingo (0) o sábado (6)
            currentDate.setDate(currentDate.getDate() + 1); // Avanzar al siguiente día
            fetchNearestSlot(); // Volver a intentar
            return; // Salir de la función
        }

        fetch(`http://${host}/available-slots?date=${encodeURIComponent(formattedDate)}`)
            .then(response => response.json())
            .then(occupiedSlots => {
                const availableSlots = getAvailableSlots(occupiedSlots, formattedDate, workHours);

                if (availableSlots.length > 0) {
                    const nearestSlot = findNearestSlot(availableSlots);

                    if (nearestSlot) {
                        const nearestSlotDate = new Date(nearestSlot).toLocaleString('es-AR', {
                            timeZone: 'America/Argentina/Mendoza',
                            hour12: false,
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                        });
                        document.getElementById('nearest-slot').textContent = `El turno más cercano es: ${nearestSlotDate}hs`;
                    }
                } else {
                    document.getElementById('nearest-slot').textContent = `Buscando turno mas cercano...`;
                    // Si no hay turnos en el día actual, buscar en el siguiente día
                    currentDate.setDate(currentDate.getDate() + 1);
                    fetchNearestSlot();
                }
            })
            .catch(error => {
                console.error('Error al obtener los horarios disponibles:', error);
            });
    };

    fetchNearestSlot();
}


function updateAvailableSlots() {
    const selectedDate = document.getElementById('appointmentDate').value;
    const professionalName = document.getElementById('profName').value;

    if (selectedDate && professionalName) {
        const workHours = professionalWorkHours[professionalName];

        if (!workHours) {
            console.error('No se encontraron horarios de trabajo para el profesional seleccionado');
            return;
        }

        // Crear un objeto Date a partir de la fecha seleccionada
        const date = new Date(selectedDate);
        const dayOfWeek = date.getDay();  // Obtener el día de la semana (0 = Domingo, 6 = Sábado)

        // Si es sábado o domingo, mostrar mensaje de que no se trabaja
        if (dayOfWeek === 6 || dayOfWeek === 5) {  // 0 = Domingo, 6 = Sábado
            document.getElementById('nearest-slot').textContent = 'No se trabaja los sábados ni los domingos.';
            document.getElementById('available-slots').innerHTML = '<option value="">Selecciona un horario</option>';
            return; // Salir de la función
        }

        // Hacer la petición al servidor para obtener los horarios disponibles
        fetch(`http://${host}/available-slots?date=${encodeURIComponent(selectedDate)}`)
            .then(response => response.json())
            .then(occupiedSlots => {
                const availableSlots = getAvailableSlots(occupiedSlots, selectedDate, workHours);
                const selectElement = document.getElementById('available-slots');
                selectElement.innerHTML = '<option value="">Selecciona un horario</option>';

                availableSlots.forEach(slot => {
                    // Convertir el horario a la zona horaria de Argentina/Mendoza
                    const localSlot = new Date(slot).toLocaleString('es-AR', {
                        timeZone: 'America/Argentina/Mendoza',
                        hour12: false,
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                    });

                    const option = document.createElement('option');
                    option.value = slot; // Mantener el valor en UTC para enviar al servidor
                    option.textContent = localSlot; // Mostrar en la zona horaria local
                    selectElement.appendChild(option);
                });

                // Buscar el turno más cercano en caso de que no haya en el día seleccionado
                if (availableSlots.length > 0) {
                    const nearestSlot = findNearestSlot(availableSlots);
                    const nearestSlotDate = new Date(nearestSlot).toLocaleString('es-AR', {
                        timeZone: 'America/Argentina/Mendoza',
                        hour12: false,
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                    });
                    document.getElementById('nearest-slot').textContent = `El turno más cercano es: ${nearestSlotDate}hs`;
                } else {
                    // Si no hay turnos en la fecha seleccionada, buscar en fechas futuras
                    searchForNearestSlot(professionalName);
                }
            })
            .catch(error => {
                console.error('Error al obtener los horarios disponibles:', error);
                Swal.fire({
                    icon: "error",
                    title: "Oops...",
                    text: `Error de sistema, le pedimos disculpas.`,
                    footer: '<a href="https://wa.me/2615930274">Ayuda</a>'
                  });
            });
    }
}


// Busca Turnos
document.getElementById('searchAppointmentForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const email = document.getElementById('searchEmail').value;

    // Asegurarse de que el email no esté vacío
    if (!email) {
        alert('Por favor, introduce un correo electrónico para buscar los turnos.');
        return;
    }

    // Realizar la búsqueda solo con el email
    fetch(`http://${host}/search-appointment?email=${email}`)
        .then(response => response.json())
        .then(data => {
            const appointmentsDiv = document.getElementById('appointments');
            appointmentsDiv.innerHTML = '';

            if (data.length > 0) {
                data.forEach(appointment => {
                    const appointmentDiv = document.createElement('div');

                    // Tratar la fecha
                    const fecha = new Date(appointment.start.dateTime)
                    fecha.setHours(fecha.getHours() - 3);
                    const opciones = {
                        weekday: 'long', // día de la semana
                        year: 'numeric', // año
                        month: 'long', // mes completo
                        day: 'numeric', // día del mes
                        hour: '2-digit', // hora con 2 dígitos
                        minute: '2-digit', // minutos con 2 dígitos
                        hour12: true // formato 12 horas (AM/PM)
                    };
                    const fechaFormateada = fecha.toLocaleString('es-ES', opciones);
                    appointmentDiv.innerHTML = `
                    <div class="my-4 border-start border-primary pe-2">
                      <p class="d-inline ms-3 me-3">Turno: ${fechaFormateada}</p>
                      <button class="btn btn-danger text-white d-inline" onclick="deleteAppointment('${appointment.id}')"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                    `;
                    appointmentsDiv.appendChild(appointmentDiv);
                });
            } else {
                appointmentsDiv.innerHTML =
                    '<p class="mt-4">No se encontraron turnos disponibles.</p>' +
                    '<p class="mt-4">Recuerde que únicamente aparecerán los turnos solicitados a través de nuestro sistema. Si ha solicitado un turno de manera presencial, le recomendamos que se comunique directamente con el centro médico donde realizó la solicitud.</p>';
            }
        })
        .catch(error => {
            console.error('Error al buscar turnos:', error);
            Swal.fire({
                icon: "error",
                title: "Oops...",
                text: `Error de sistema, le pedimos disculpas.`,
                footer: '<a href="https://wa.me/2615930274">Ayuda</a>'
              });
        });
});

function deleteAppointment(eventId) {
    fetch(`http://${host}/delete-appointment/${eventId}`, { method: 'DELETE' })
        .then(response => response.json())
        .then(data => {
          Swal.fire({
          title: "Turno eliminado con éxito",
          icon: "success",
          confirmButtonColor: "#3085d6",
          confirmButtonText: "Ok!"
          }).then((result) => {
            if (result.isConfirmed) {
              location.reload()
            }
          });
        })
        .catch(error => {
            console.error('Error al eliminar turno:', error);
            Swal.fire({
                icon: "error",
                title: "Oops...",
                text: `Error de sistema, le pedimos disculpas.`,
                footer: '<a href="https://wa.me/2615930274">Ayuda</a>'
              });
        });
}
