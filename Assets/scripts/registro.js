import { supabase } from './supabase-client.js';

const form = document.getElementById('registroForm');
const alertBox = document.getElementById('registroAlert');
const submitBtn = document.getElementById('registroSubmitBtn');

function showAlert(message, type = 'danger') {
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type}`;
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

  const captchaToken = window.hcaptcha ? window.hcaptcha.getResponse() : '';
  if (!captchaToken) {
    showAlert('Por favor completa el captcha.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creando cuenta...';

  const { error } = await supabase.auth.signUp({
    email: formData.get('email'),
    password,
    options: {
      captchaToken,
      data: {
        full_name: formData.get('full_name'),
        phone: formData.get('phone'),
        dni: formData.get('dni'),
      },
    },
  });

  if (error) {
    showAlert(error.message === 'User already registered'
      ? 'Ya existe una cuenta con ese correo.'
      : 'No se pudo crear la cuenta. Intenta de nuevo.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Crear cuenta';
    if (window.hcaptcha) window.hcaptcha.reset();
    return;
  }

  window.location.href = '/cuenta';
});
