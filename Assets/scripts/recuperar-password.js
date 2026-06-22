import { supabase } from './supabase-client.js';

const form = document.getElementById('recuperarForm');
const alertBox = document.getElementById('recuperarAlert');
const submitBtn = document.getElementById('recuperarSubmitBtn');

function showAlert(message, type = 'danger') {
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type}`;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const captchaToken = window.hcaptcha ? window.hcaptcha.getResponse() : '';
  if (!captchaToken) {
    showAlert('Por favor completa el captcha.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando...';

  const formData = new FormData(form);
  const redirectTo = new URL('/actualizar-password', window.location.origin).toString();

  const { error } = await supabase.auth.resetPasswordForEmail(formData.get('email'), { redirectTo, captchaToken });

  if (error) {
    showAlert('No se pudo enviar el enlace. Intenta de nuevo.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enviar enlace';
    if (window.hcaptcha) window.hcaptcha.reset();
    return;
  }

  showAlert('Si el correo existe, te enviamos un enlace para restablecer tu contraseña.', 'success');
  submitBtn.textContent = 'Enlace enviado';
});
