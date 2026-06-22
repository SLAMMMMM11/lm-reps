import { supabase } from './supabase-client.js';

// Edicion de datos del perfil (nombre, telefono, correo) y cambio de contrasena.
// Se reutiliza en el panel de cliente y en el de admin: ambos usan los mismos
// IDs de formulario. El RLS de "profiles" permite que cada usuario actualice
// su propia fila; el correo de login y la contrasena se cambian via Auth.

// Misma funcion que en dashboard.js (compresion antes de subir a Storage);
// se duplica aqui en vez de compartir modulo, siguiendo el patron del repo
// de no crear abstracciones compartidas para helpers pequenos.
async function compressImage(file, maxDimension = 600, quality = 0.8) {
  if (!file.type.startsWith('image/')) return file;

  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = URL.createObjectURL(file);
  });

  let { width, height } = img;
  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  URL.revokeObjectURL(img.src);
  return blob || file;
}

function setAvatarPhoto(url) {
  const avatar = document.getElementById('sidebarAvatar');
  if (!avatar) return;
  if (url) {
    avatar.style.backgroundImage = `url(${url})`;
    avatar.classList.add('has-photo');
    avatar.innerHTML = '';
  } else {
    avatar.style.backgroundImage = '';
    avatar.classList.remove('has-photo');
    avatar.innerHTML = '<i class="bi bi-person-fill"></i>';
  }
}

const avatarInput = document.getElementById('avatarInput');
const avatarEditBtn = document.getElementById('avatarEditBtn');
const avatarAlert = document.getElementById('avatarAlert');

if (avatarInput && avatarEditBtn) {
  let avatarUserId = null;

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) avatarUserId = session.user.id;
  });

  avatarEditBtn.addEventListener('click', () => avatarInput.click());

  avatarInput.addEventListener('change', async () => {
    const file = avatarInput.files[0];
    avatarInput.value = '';
    if (!file || !avatarUserId) return;

    avatarAlert.className = 'small text-danger mb-3 d-none';

    if (!file.type.startsWith('image/')) {
      avatarAlert.textContent = 'Selecciona un archivo de imagen.';
      avatarAlert.className = 'small text-danger mb-3';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      avatarAlert.textContent = 'La imagen no debe superar los 8 MB.';
      avatarAlert.className = 'small text-danger mb-3';
      return;
    }

    try {
      const blob = await compressImage(file);
      const path = `${avatarUserId}/avatar-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, blob, {
        contentType: 'image/jpeg',
      });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', avatarUserId);
      if (updateError) throw updateError;

      setAvatarPhoto(data.publicUrl);
    } catch (err) {
      console.error(err);
      avatarAlert.textContent = 'No se pudo subir la foto. Intenta de nuevo.';
      avatarAlert.className = 'small text-danger mb-3';
    }
  });
}

const perfilForm = document.getElementById('perfilForm');
if (perfilForm) {
  const nombre = document.getElementById('perfilNombre');
  const telefono = document.getElementById('perfilTelefono');
  const correo = document.getElementById('perfilCorreo');
  const alertBox = document.getElementById('perfilAlert');
  const submitBtn = document.getElementById('perfilSubmitBtn');

  let userId = null;
  let currentEmail = '';

  async function loadProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    userId = session.user.id;
    currentEmail = session.user.email || '';
    if (correo) correo.value = currentEmail;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone, avatar_url')
      .eq('id', userId)
      .single();

    if (profile) {
      if (nombre) nombre.value = profile.full_name || '';
      if (telefono) telefono.value = profile.phone || '';
      setAvatarPhoto(profile.avatar_url);
    }
  }

  perfilForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.className = 'alert d-none';
    submitBtn.disabled = true;

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: nombre.value.trim(), phone: telefono.value.trim() })
        .eq('id', userId);
      if (profileError) throw profileError;

      let emailNote = '';
      const newEmail = correo.value.trim();
      if (newEmail && newEmail !== currentEmail) {
        const { error: emailError } = await supabase.auth.updateUser({ email: newEmail });
        if (emailError) throw emailError;
        emailNote = ' Te enviamos un enlace a tu nuevo correo para confirmar el cambio.';
      }

      alertBox.textContent = 'Datos actualizados correctamente.' + emailNote;
      alertBox.className = 'alert alert-success';
    } catch (err) {
      console.error(err);
      alertBox.textContent = 'No se pudieron guardar los cambios. Intenta de nuevo.';
      alertBox.className = 'alert alert-danger';
    } finally {
      submitBtn.disabled = false;
    }
  });

  loadProfile();
}

const passwordForm = document.getElementById('passwordForm');
if (passwordForm) {
  const p1 = document.getElementById('newPassword');
  const p2 = document.getElementById('newPasswordConfirm');
  const alertBox = document.getElementById('passwordAlert');
  const submitBtn = document.getElementById('passwordSubmitBtn');

  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.className = 'alert d-none';

    if (p1.value.length < 8) {
      alertBox.textContent = 'La contraseña debe tener al menos 8 caracteres.';
      alertBox.className = 'alert alert-danger';
      return;
    }
    if (p1.value !== p2.value) {
      alertBox.textContent = 'Las contraseñas no coinciden.';
      alertBox.className = 'alert alert-danger';
      return;
    }

    submitBtn.disabled = true;
    const { error } = await supabase.auth.updateUser({ password: p1.value });
    submitBtn.disabled = false;

    if (error) {
      console.error(error);
      alertBox.textContent = 'No se pudo actualizar la contraseña. Vuelve a iniciar sesión e intenta de nuevo.';
      alertBox.className = 'alert alert-danger';
      return;
    }

    alertBox.textContent = 'Contraseña actualizada correctamente.';
    alertBox.className = 'alert alert-success';
    passwordForm.reset();
  });
}
