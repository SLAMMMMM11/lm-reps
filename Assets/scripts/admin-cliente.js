import { supabase } from './supabase-client.js';
import { requireAdmin } from './auth-guard.js';

const loadingState = document.getElementById('loadingState');
const clienteContent = document.getElementById('clienteContent');
const cuentasContainer = document.getElementById('cuentasContainer');

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

function formatMoney(amount) {
  return `S/ ${Number(amount).toFixed(2)}`;
}

const customerId = new URLSearchParams(window.location.search).get('id');

async function loadCliente() {
  const { data } = await supabase.from('profiles').select('*').eq('id', customerId).single();
  return data;
}

async function loadCuentas() {
  const { data, error } = await supabase
    .from('credit_accounts')
    .select('*, installments(*)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}

function renderCuentas(cuentas) {
  cuentasContainer.innerHTML = cuentas.map((acc) => {
    const installments = [...acc.installments].sort((a, b) => a.installment_number - b.installment_number);
    return `
      <div class="balance-card mb-4">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div>
            <p class="fw-bold mb-0">${escapeHtml(acc.description)}</p>
            <p class="small text-muted mb-0">${formatMoney(acc.principal_amount)} — estado: ${escapeHtml(acc.status)}</p>
          </div>
        </div>
        <div class="table-responsive">
          <table class="table table-sm align-middle">
            <thead><tr><th>#</th><th>Fecha</th><th>Monto</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              ${installments.map((inst) => `
                <tr data-installment="${inst.id}" data-original='${JSON.stringify({ due_date: inst.due_date, amount: inst.amount, status: inst.status })}'>
                  <td>${inst.installment_number}</td>
                  <td><input type="date" class="form-control form-control-sm inst-fecha" value="${inst.due_date}"></td>
                  <td><input type="number" step="0.01" class="form-control form-control-sm inst-monto" value="${inst.amount}"></td>
                  <td>
                    <select class="form-select form-select-sm inst-estado">
                      <option value="pending" ${inst.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                      <option value="paid" ${inst.status === 'paid' ? 'selected' : ''}>Pagada</option>
                      <option value="rejected" ${inst.status === 'rejected' ? 'selected' : ''}>Rechazada</option>
                    </select>
                  </td>
                  <td><button class="btn btn-sm btn-outline-secondary save-installment-btn">Guardar</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }).join('') || '<p class="text-muted">Este cliente no tiene cuentas de crédito.</p>';

  document.querySelectorAll('.save-installment-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('tr');
      const installmentId = row.dataset.installment;
      const due_date = row.querySelector('.inst-fecha').value;
      const amount = Number(row.querySelector('.inst-monto').value);
      const status = row.querySelector('.inst-estado').value;

      btn.disabled = true;
      btn.textContent = 'Guardando...';

      const update = { due_date, amount, status, updated_at: new Date().toISOString() };
      if (status === 'paid') update.paid_at = new Date().toISOString();

      const { data: { session } } = await supabase.auth.getSession();
      update.updated_by = session.user.id;

      const { error } = await supabase.from('installments').update(update).eq('id', installmentId);

      if (!error) {
        const before = JSON.parse(row.dataset.original);
        await supabase.from('audit_log').insert({
          actor_id: session.user.id,
          action: 'update_installment',
          target_table: 'installments',
          target_id: installmentId,
          details: { before, after: { due_date, amount, status } },
        });
        row.dataset.original = JSON.stringify({ due_date, amount, status });
      }

      btn.disabled = false;
      btn.textContent = error ? 'Error' : 'Guardado ✓';
      if (error) console.error(error);
      setTimeout(() => { btn.textContent = 'Guardar'; }, 1500);
    });
  });
}

async function init() {
  const session = await requireAdmin();
  if (!session) return;

  if (!customerId) {
    cuentasContainer.innerHTML = '<p class="text-danger">Falta el parámetro ?id= en la URL.</p>';
    loadingState.classList.add('d-none');
    clienteContent.classList.remove('d-none');
    return;
  }

  const [cliente, cuentas] = await Promise.all([loadCliente(), loadCuentas()]);

  document.getElementById('clienteNombre').textContent = cliente?.full_name || 'Cliente';
  document.getElementById('clienteContacto').textContent = `${cliente?.email || ''} — ${cliente?.phone || ''}`;
  document.getElementById('clienteDni').textContent = `DNI: ${cliente?.dni || '—'}`;

  renderCuentas(cuentas);

  loadingState.classList.add('d-none');
  clienteContent.classList.remove('d-none');
}

init();
