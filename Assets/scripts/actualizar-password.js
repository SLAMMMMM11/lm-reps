import { supabase } from './supabase-client.js';

const form = document.getElementById('actualizarForm');
const alertBox = document.getElementById('actualizarAlert');
const submitBtn = document.getElementById('actualizarSubmitBtn');

function showAlert(message, type = 'danger') {
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type}`;
}

// supabase-js detecta el token de recuperacion en la URL automaticamente
// y crea una sesion temporal; si no hay sesion, el enlace es invalido/expiro.
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  showAlert('Este enlace ya no es válido. Solicita uno nuevo.');
  submitBtn.disabled = true;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(form);
  const password = formData.get('password');
  const password2 = formData.get('password2');

  if (password !== password2) {
    showAlert('Las contraseñas no coinciden.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Guardando...';

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    showAlert('No se pudo actualizar la contraseña. Intenta de nuevo.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Guardar nueva contraseña';
    return;
  }

  showAlert('Contraseña actualizada. Ya puedes iniciar sesión.', 'success');
  setTimeout(() => { window.location.href = '/login'; }, 1500);
});
