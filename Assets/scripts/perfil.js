import { supabase } from './supabase-client.js';

// Edicion de datos del perfil (nombre, telefono, correo) y cambio de contrasena.
// Se reutiliza en el panel de cliente y en el de admin: ambos usan los mismos
// IDs de formulario. El RLS de "profiles" permite que cada usuario actualice
// su propia fila; el correo de login y la contrasena se cambian via Auth.

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
      .select('full_name, phone')
      .eq('id', userId)
      .single();

    if (profile) {
      if (nombre) nombre.value = profile.full_name || '';
      if (telefono) telefono.value = profile.phone || '';
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
