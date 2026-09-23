function updatePhoneCode() {
    var countrySelect = document.getElementById("country");
    var phoneCodeInput = document.getElementById("number-code");

    // Cambia el valor del campo de código de área según la selección del país
    phoneCodeInput.value = countrySelect.value;
  }

document.addEventListener('DOMContentLoaded', async () => {

  document.getElementById('ag-turn').addEventListener('click', function(){
    document.getElementById('selectButton2').style.display = 'none';
    document.getElementById('selectButton1').style.display = 'inline-block';
    document.getElementById('select-prof-form').style.display = 'block';
    document.getElementById('prim').style.display = 'none';
  });

  document.getElementById('bus-turn').addEventListener('click', function(){
    document.getElementById('select-prof-form').style.display = 'block';
    document.getElementById('prim').style.display = 'none';
    document.getElementById('selectButton1').style.display = 'none';
    document.getElementById('selectButton2').style.display = 'inline-block';
    document.getElementById('title').textContent = 'Buscar Citas';
  });

  document.getElementById('selectButton1').addEventListener('click', function(){
    document.getElementById('select-prof-form').style.display = 'none';
    document.getElementById('appointment-form').style.display = 'block';
  });

  document.getElementById('selectButton2').addEventListener('click', function(){
    document.getElementById('select-prof-form').style.display = 'none';
    document.getElementById('sectsearchAppointmentForm').style.display = 'block';
  });

  document.getElementById('volver').addEventListener('click', function(){
    document.getElementById('sectsearchAppointmentForm').style.display = 'none';
    document.getElementById('select-prof-form').style.display = 'block';
  });

  document.getElementById('volver2').addEventListener('click', function(){
    document.getElementById('title').textContent = 'Agenda de Citas';
    document.getElementById('select-prof-form').style.display = 'none';
    document.getElementById('prim').style.display = 'block';
  });

  document.getElementById('volver3').addEventListener('click', function(){
    document.getElementById('appointment-form').style.display = 'none';
    document.getElementById('select-prof-form').style.display = 'block';
  });



  document.getElementById('enviar-datos').addEventListener('click', function() {
    const name = document.getElementById('patientName').value;
    const email = document.getElementById('email').value;
    const number = document.getElementById('number').value;
    const numberCode = document.getElementById('number-code').value;
    const selectedSlot = document.getElementById('available-slots').value;

    // Convertir la fecha en un formato más legible
    const date = new Date(selectedSlot);
    const formattedDate = date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Asignar los valores a los spans correspondientes
    document.getElementById('v-name').textContent = name;
    document.getElementById('v-email').textContent = email;
    document.getElementById('v-number').textContent = `${numberCode} ${number}`;
    document.getElementById('v-cita').textContent = formattedDate;
    const datosModal = new bootstrap.Modal(document.getElementById('datosModal'));
    datosModal.show();
  }); 
});