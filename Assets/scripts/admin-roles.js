import { supabase } from './supabase-client.js';
import { requireSuperAdmin } from './auth-guard.js';

const tableBody = document.getElementById('adminsTableBody');
const alertBox = document.getElementById('adminRolesAlert');
const form = document.getElementById('asignarRolForm');
const emailInput = document.getElementById('asignarRolEmail');
const roleSelect = document.getElementById('asignarRolSelect');
const submitBtn = document.getElementById('asignarRolBtn');

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

function showAlert(message, type = 'danger') {
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type}`;
}

const ROLE_LABEL = { super_admin: 'Super admin', admin: 'Admin', asesor: 'Admin asesor' };

async function loadAdmins() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, admin_role')
    .eq('is_admin', true);

  if (error) {
    console.error(error);
    tableBody.innerHTML = '<tr><td colspan="4" class="text-danger">No se pudieron cargar los admins.</td></tr>';
    return;
  }
  renderTable(data || []);
}

function renderTable(rows) {
  tableBody.innerHTML = rows.map((p) => `
    <tr>
      <td class="small">${escapeHtml(p.full_name || '—')}</td>
      <td class="small">${escapeHtml(p.email || '—')}</td>
      <td class="small">${ROLE_LABEL[p.admin_role] || '—'}</td>
      <td><button type="button" class="btn btn-sm btn-outline-danger quitar-admin-btn" data-id="${p.id}">Quitar admin</button></td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="text-center text-muted py-4">No hay admins registrados</td></tr>';

  document.querySelectorAll('.quitar-admin-btn').forEach((btn) => {
    btn.addEventListener('click', () => quitarAdmin(btn.dataset.id));
  });
}

async function asignarRol(email, role) {
  const { data: profile, error: findError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (findError) throw findError;
  if (!profile) {
    showAlert('No existe un usuario registrado con ese correo. Debe registrarse primero como cliente.');
    return;
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_admin: true, admin_role: role })
    .eq('id', profile.id);
  if (error) throw error;

  showAlert('Rol asignado correctamente.', 'success');
  emailInput.value = '';
  await loadAdmins();
}

async function quitarAdmin(id) {
  if (!confirm('¿Quitar el rol de admin a este usuario?')) return;
  const { error } = await supabase
    .from('profiles')
    .update({ is_admin: false, admin_role: null })
    .eq('id', id);

  if (error) {
    console.error(error);
    showAlert('No se pudo quitar el rol de admin.');
    return;
  }
  await loadAdmins();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  alertBox.className = 'alert d-none';
  submitBtn.disabled = true;
  try {
    await asignarRol(emailInput.value.trim(), roleSelect.value);
  } catch (err) {
    console.error(err);
    showAlert('No se pudo asignar el rol. Intenta de nuevo.');
  } finally {
    submitBtn.disabled = false;
  }
});

document.addEventListener('admin:show-admins', loadAdmins);

await requireSuperAdmin();
