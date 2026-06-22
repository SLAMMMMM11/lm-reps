import { supabase } from './supabase-client.js';

// Controla el menu de cuenta del navbar (icono + dropdown). El markup es
// estatico en cada pagina: por defecto muestra el estado "no logueado"
// (Iniciar sesion / Crear cuenta) y este script lo ajusta segun la sesion.
const toggle = document.getElementById('navAccountToggle');
if (toggle) {
  const label = document.querySelector('.account-label');
  const greeting = document.getElementById('navAccountName');
  const outItems = document.querySelectorAll('.account-out');
  const inItems = document.querySelectorAll('.account-in');
  const adminItems = document.querySelectorAll('.account-admin');
  const logoutBtn = document.getElementById('navLogout');

  const show = (els) => els.forEach((el) => el.classList.remove('d-none'));
  const hide = (els) => els.forEach((el) => el.classList.add('d-none'));

  async function applySessionState() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      show(outItems);
      hide(inItems);
      if (label) label.textContent = 'Mi cuenta';
      return;
    }

    hide(outItems);
    show(inItems);

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, full_name')
      .eq('id', session.user.id)
      .single();

    if (!profile?.is_admin) hide(adminItems);

    const fullName = profile?.full_name || '';
    if (greeting) greeting.textContent = fullName || session.user.email;
    if (label) label.textContent = fullName.split(' ')[0] || 'Mi cuenta';
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await supabase.auth.signOut();
      window.location.href = '/';
    });
  }

  applySessionState();
  supabase.auth.onAuthStateChange(() => applySessionState());
}
