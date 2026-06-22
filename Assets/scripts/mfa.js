import { supabase } from './supabase-client.js';

const mfaButtonLabel = document.getElementById('mfaButtonLabel');
const mfaModalEl = document.getElementById('mfaModal');
const mfaAlert = document.getElementById('mfaAlert');
const mfaEnabledState = document.getElementById('mfaEnabledState');
const mfaEnrollState = document.getElementById('mfaEnrollState');
const mfaLoadingState = document.getElementById('mfaLoadingState');
const mfaQrImg = document.getElementById('mfaQrImg');
const mfaSecret = document.getElementById('mfaSecret');
const mfaVerifyCode = document.getElementById('mfaVerifyCode');

let pendingFactorId = null;

function showAlert(message, type = 'danger') {
  mfaAlert.textContent = message;
  mfaAlert.className = `alert alert-${type}`;
}

function setState(state) {
  mfaLoadingState.classList.toggle('d-none', state !== 'loading');
  mfaEnabledState.classList.toggle('d-none', state !== 'enabled');
  mfaEnrollState.classList.toggle('d-none', state !== 'enroll');
}

async function refreshButtonLabel() {
  const { data } = await supabase.auth.mfa.listFactors();
  const hasVerified = data?.totp?.some((f) => f.status === 'verified');
  mfaButtonLabel.textContent = hasVerified ? '2FA activo' : 'Verificación en 2 pasos';
  return hasVerified;
}

async function loadMfaState() {
  setState('loading');
  mfaAlert.className = 'alert d-none';

  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) { showAlert('No se pudo cargar el estado de MFA.'); return; }

  const verified = data.totp.find((f) => f.status === 'verified');
  if (verified) {
    pendingFactorId = verified.id;
    setState('enabled');
    return;
  }

  // Limpiar factores sin verificar previos antes de enrolar uno nuevo
  for (const f of data.totp.filter((f) => f.status === 'unverified')) {
    await supabase.auth.mfa.unenroll({ factorId: f.id });
  }

  const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
  if (enrollError) { showAlert('No se pudo iniciar el enrolamiento.'); return; }

  pendingFactorId = enrollData.id;
  mfaQrImg.src = enrollData.totp.qr_code;
  mfaSecret.textContent = enrollData.totp.secret;
  setState('enroll');
}

mfaModalEl.addEventListener('show.bs.modal', loadMfaState);

document.getElementById('mfaVerifyBtn').addEventListener('click', async () => {
  const code = mfaVerifyCode.value.trim();
  if (!/^\d{6}$/.test(code)) {
    showAlert('Ingresa un código de 6 dígitos.');
    return;
  }

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: pendingFactorId });
  if (challengeError) { showAlert('No se pudo generar el desafío.'); return; }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: pendingFactorId,
    challengeId: challenge.id,
    code,
  });

  if (verifyError) {
    showAlert('Código incorrecto, intenta de nuevo.');
    return;
  }

  showAlert('Verificación en 2 pasos activada correctamente.', 'success');
  await refreshButtonLabel();
  setTimeout(loadMfaState, 1000);
});

document.getElementById('mfaDisableBtn').addEventListener('click', async () => {
  if (!confirm('¿Seguro que quieres desactivar la verificación en 2 pasos?')) return;

  const { error } = await supabase.auth.mfa.unenroll({ factorId: pendingFactorId });
  if (error) { showAlert('No se pudo desactivar.'); return; }

  await refreshButtonLabel();
  loadMfaState();
});

refreshButtonLabel();
