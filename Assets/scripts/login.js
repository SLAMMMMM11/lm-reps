import { supabase } from './supabase-client.js';

const form = document.getElementById('loginForm');
const mfaForm = document.getElementById('mfaChallengeForm');
const alertBox = document.getElementById('loginAlert');
const submitBtn = document.getElementById('loginSubmitBtn');
const mfaSubmitBtn = document.getElementById('mfaChallengeSubmitBtn');

function showAlert(message, type = 'danger') {
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type}`;
}

// Si el guard de una pagina protegida te trajo aqui, ?next= guarda a donde
// volver tras el login. Solo se aceptan rutas internas (que empiecen con "/"
// pero no "//") para que nadie pueda armar un enlace que redirija afuera.
function postLoginDestination() {
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/cuenta';
}

async function goToAccountIfFullyAuthenticated() {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) return false;

  if (data.nextLevel === 'aal2' && data.currentLevel !== data.nextLevel) {
    form.classList.add('d-none');
    mfaForm.classList.remove('d-none');
    return false;
  }

  window.location.href = postLoginDestination();
  return true;
}

// Si ya hay sesion activa, redirigir directo a la cuenta (o pedir el segundo factor si falta).
const { data: { session } } = await supabase.auth.getSession();
if (session) {
  await goToAccountIfFullyAuthenticated();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const captchaToken = window.hcaptcha ? window.hcaptcha.getResponse() : '';
  if (!captchaToken) {
    showAlert('Por favor completa el captcha.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Ingresando...';

  const formData = new FormData(form);
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email'),
    password: formData.get('password'),
    options: { captchaToken },
  });

  if (error) {
    showAlert(error.message === 'captcha protection: request disallowed (no captcha_token found)'
      ? 'Por favor completa el captcha.'
      : 'Correo o contraseña incorrectos.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Iniciar sesión';
    if (window.hcaptcha) window.hcaptcha.reset();
    return;
  }

  await goToAccountIfFullyAuthenticated();
});

mfaForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = document.getElementById('mfaCodeInput').value.trim();

  if (!/^\d{6}$/.test(code)) {
    showAlert('Ingresa un código de 6 dígitos.');
    return;
  }

  mfaSubmitBtn.disabled = true;
  mfaSubmitBtn.textContent = 'Verificando...';

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp?.find((f) => f.status === 'verified');

  if (!factor) {
    showAlert('No se encontró un factor de verificación activo.');
    mfaSubmitBtn.disabled = false;
    mfaSubmitBtn.textContent = 'Verificar';
    return;
  }

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
  if (challengeError) {
    showAlert('No se pudo iniciar la verificación. Intenta de nuevo.');
    mfaSubmitBtn.disabled = false;
    mfaSubmitBtn.textContent = 'Verificar';
    return;
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challenge.id,
    code,
  });

  if (verifyError) {
    showAlert('Código incorrecto, intenta de nuevo.');
    mfaSubmitBtn.disabled = false;
    mfaSubmitBtn.textContent = 'Verificar';
    return;
  }

  window.location.href = postLoginDestination();
});
