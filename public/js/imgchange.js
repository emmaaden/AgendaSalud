document.addEventListener('DOMContentLoaded', async () => {
  const saveButton = document.getElementById('save-img');
  const fileInput = document.getElementById('img-upload');  
  const modalImg = document.getElementById('modal-img');
  const modal = new bootstrap.Modal(document.getElementById('imageModal'));

  // Traer datos del usuario para obtener su user_id
    const responseUser = await fetch('/api/user');
    const userData = await responseUser.json();
    const user_id = userData.id;

  // Cuando se selecciona una nueva imagen, actualizar la vista en el modal
  fileInput.addEventListener('change', function () {
    const file = fileInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        modalImg.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // Traer la imagen actual del usuario desde Supabase
  const responseImg = await fetch('/avatars/get-img', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id })
  });
  const data = await responseImg.json();

  const profileImg = document.getElementById('profile-img');
  if (responseImg.ok && profileImg) {
    profileImg.src = data.image;
    modalImg.src = data.image;
  }

  // Subir nueva imagen al hacer clic en "Guardar"
  saveButton.addEventListener('click', async function () {
    const file = fileInput.files[0];
    if (!file) {
      alert('Por favor selecciona una imagen');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);   // <-- coincide con multer en backend
    formData.append('user_id', user_id); // enviamos user_id

    try {
      const uploadResponse = await fetch('/avatars/upload', {
        method: 'POST',
        body: formData
      });

      const uploadData = await uploadResponse.json();

      if (uploadData.url) {
        modal.hide();
        profileImg.src = uploadData.url;
        modalImg.src = uploadData.url;
      } else {
        alert('Error al subir la imagen');
        console.error(uploadData.error);
      }
    } catch (error) {
      console.error('Error al subir la imagen:', error);
      alert('Hubo un problema al intentar subir la imagen');
    }
  });
});
