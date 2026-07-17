import { supabase } from './supabase-client.js';
import { requireAdmin } from './auth-guard.js';

const ASESOR_RESTRICTED_TABS = ['auditoria', 'promociones'];
const SUPER_ADMIN_ONLY_TABS = ['admins'];

const loadingState = document.getElementById('loadingState');
const panelContent = document.getElementById('panelContent');
const clientesTableBody = document.getElementById('clientesTableBody');
const vouchersQueue = document.getElementById('vouchersQueue');
const pendingVouchersBadge = document.getElementById('pendingVouchersBadge');
const clienteSelect = document.getElementById('clienteSelect');
const cuotasPreviewBody = document.getElementById('cuotasPreviewBody');

const nuevoCreditoModal = new bootstrap.Modal(document.getElementById('nuevoCreditoModal'));
const rechazarVoucherModal = new bootstrap.Modal(document.getElementById('rechazarVoucherModal'));
const voucherPreviewModal = new bootstrap.Modal(document.getElementById('voucherPreviewModal'));

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

function formatMoney(amount) {
  return `S/ ${Number(amount).toFixed(2)}`;
}

function isOverdue(installment) {
  return installment.status === 'pending' && new Date(installment.due_date) < new Date();
}

let session;
let profiles = [];
let accounts = [];

async function loadProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, email, is_admin, created_at')
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}

async function loadAccounts() {
  const { data, error } = await supabase.from('credit_accounts').select('*, installments(*)');
  if (error) { console.error(error); return []; }
  return data;
}

async function loadPendingVouchers() {
  const { data, error } = await supabase
    .from('vouchers')
    .select('*, installments(*, credit_accounts(*)), profiles!vouchers_customer_id_fkey(full_name, email)')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true });
  if (error) { console.error(error); return []; }
  return data;
}

function renderKpis() {
  let prestado = 0, cobrado = 0, pendiente = 0, vencido = 0;
  for (const acc of accounts) {
    for (const inst of acc.installments) {
      prestado += Number(inst.amount);
      if (inst.status === 'paid') cobrado += Number(inst.amount);
      else {
        pendiente += Number(inst.amount);
        if (isOverdue(inst)) vencido += Number(inst.amount);
      }
    }
  }
  document.getElementById('kpiTotalPrestado').textContent = formatMoney(prestado);
  document.getElementById('kpiTotalCobrado').textContent = formatMoney(cobrado);
  document.getElementById('kpiTotalPendiente').textContent = formatMoney(pendiente);
  document.getElementById('kpiTotalVencido').textContent = formatMoney(vencido);
}

function renderClientes() {
  const byCustomer = new Map();
  for (const acc of accounts) {
    if (!byCustomer.has(acc.customer_id)) byCustomer.set(acc.customer_id, { pending: 0, overdue: 0 });
    const agg = byCustomer.get(acc.customer_id);
    for (const inst of acc.installments) {
      if (inst.status !== 'paid') {
        agg.pending += Number(inst.amount);
        if (isOverdue(inst)) agg.overdue += Number(inst.amount);
      }
    }
  }

  const clientes = profiles.filter((p) => !p.is_admin);

  clientesTableBody.innerHTML = clientes.map((p) => {
    const agg = byCustomer.get(p.id);
    return `
      <tr>
        <td>${escapeHtml(p.full_name)}<br><span class="small text-muted">${escapeHtml(p.email)}</span></td>
        <td>${escapeHtml(p.phone)}</td>
        <td class="small text-muted">${new Date(p.created_at).toLocaleDateString('es-PE')}</td>
        <td>${agg ? formatMoney(agg.pending) : '<span class="badge bg-light text-muted border">Sin crédito</span>'}</td>
        <td>${agg && agg.overdue > 0 ? `<span class="text-danger fw-bold">${formatMoney(agg.overdue)}</span>` : '—'}</td>
        <td><a href="/admin/cliente?id=${p.id}" class="btn btn-sm btn-outline-secondary">Ver / Gestionar</a></td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="6" class="text-center text-muted py-4">Aún no hay clientes registrados</td></tr>';
}

function populateClienteSelect() {
  clienteSelect.innerHTML = '<option value="">Selecciona un cliente...</option>' +
    profiles.filter((p) => !p.is_admin).map((p) => `<option value="${p.id}">${escapeHtml(p.full_name)} — ${escapeHtml(p.email)}</option>`).join('');
}

document.getElementById('generarCuotasBtn').addEventListener('click', () => {
  const monto = Number(document.getElementById('montoInput').value);
  const numCuotas = Number(document.getElementById('numCuotasInput').value);
  const primeraFecha = document.getElementById('primeraFechaInput').value;
  const frecuencia = document.getElementById('frecuenciaSelect').value;

  if (!monto || !numCuotas || !primeraFecha) {
    alert('Completa monto, número de cuotas y primera fecha.');
    return;
  }

  const baseAmount = Math.floor((monto / numCuotas) * 100) / 100;
  const rows = [];
  let date = new Date(primeraFecha + 'T00:00:00');

  for (let i = 1; i <= numCuotas; i++) {
    const amount = i === numCuotas ? Math.round((monto - baseAmount * (numCuotas - 1)) * 100) / 100 : baseAmount;
    rows.push({ number: i, date: date.toISOString().slice(0, 10), amount });
    date = new Date(date);
    if (frecuencia === 'monthly') date.setMonth(date.getMonth() + 1);
    else date.setDate(date.getDate() + 14);
  }

  cuotasPreviewBody.innerHTML = rows.map((r, idx) => `
    <tr>
      <td>${r.number}</td>
      <td><input type="date" class="form-control form-control-sm cuota-fecha" value="${r.date}"></td>
      <td><input type="number" class="form-control form-control-sm cuota-monto" step="0.01" value="${r.amount.toFixed(2)}"></td>
    </tr>
  `).join('');
});

document.getElementById('guardarCreditoBtn').addEventListener('click', async () => {
  const alertBox = document.getElementById('nuevoCreditoAlert');
  const customerId = clienteSelect.value;
  const description = document.getElementById('descripcionInput').value.trim();
  const fechas = [...document.querySelectorAll('.cuota-fecha')].map((i) => i.value);
  const montos = [...document.querySelectorAll('.cuota-monto')].map((i) => Number(i.value));

  if (!customerId || !description || fechas.length === 0) {
    alertBox.textContent = 'Selecciona cliente, descripción, y genera el cronograma de cuotas.';
    alertBox.className = 'alert alert-danger';
    return;
  }

  const principal = montos.reduce((s, m) => s + m, 0);

  const { data: account, error: accError } = await supabase
    .from('credit_accounts')
    .insert({ customer_id: customerId, created_by: session.user.id, description, principal_amount: principal })
    .select()
    .single();

  if (accError) {
    alertBox.textContent = 'No se pudo crear la cuenta de crédito.';
    alertBox.className = 'alert alert-danger';
    console.error(accError);
    return;
  }

  const installmentsPayload = fechas.map((fecha, idx) => ({
    credit_account_id: account.id,
    installment_number: idx + 1,
    due_date: fecha,
    amount: montos[idx],
  }));

  const { error: instError } = await supabase.from('installments').insert(installmentsPayload);

  if (instError) {
    alertBox.textContent = 'Cuenta creada, pero hubo un error guardando las cuotas.';
    alertBox.className = 'alert alert-danger';
    console.error(instError);
    return;
  }

  await supabase.from('audit_log').insert({
    actor_id: session.user.id,
    action: 'create_credit_account',
    target_table: 'credit_accounts',
    target_id: account.id,
    details: { customer_id: customerId, description, principal_amount: principal, installments: installmentsPayload.length },
  });

  nuevoCreditoModal.hide();
  await refreshAccounts();
});

async function renderVouchersQueue() {
  const vouchers = await loadPendingVouchers();
  pendingVouchersBadge.textContent = vouchers.length;
  pendingVouchersBadge.classList.toggle('d-none', vouchers.length === 0);

  if (vouchers.length === 0) {
    vouchersQueue.innerHTML = '<p class="text-muted">No hay vouchers pendientes de revisión.</p>';
    return;
  }

  const withUrls = await Promise.all(vouchers.map(async (v) => {
    const { data } = await supabase.storage.from('vouchers').createSignedUrl(v.storage_path, 300);
    return { ...v, signedUrl: data?.signedUrl };
  }));

  vouchersQueue.innerHTML = withUrls.map((v) => `
    <div class="balance-card mb-3 d-flex gap-3 align-items-center">
      <img src="${v.signedUrl}" class="rounded voucher-thumb" style="width:90px;height:90px;object-fit:cover;cursor:pointer;" data-fullsrc="${v.signedUrl}">
      <div class="flex-grow-1">
        <p class="fw-bold mb-1">${escapeHtml(v.profiles?.full_name)} <span class="small text-muted">${escapeHtml(v.profiles?.email)}</span></p>
        <p class="small text-muted mb-1">Cuota #${v.installments.installment_number} — ${formatMoney(v.installments.amount)} — ${v.payment_method.toUpperCase()}</p>
        ${v.note ? `<p class="small mb-0">Nota: ${escapeHtml(v.note)}</p>` : ''}
      </div>
      <div class="d-flex flex-column gap-2">
        <button class="btn btn-sm btn-success approve-voucher-btn" data-id="${v.id}">Aprobar</button>
        <button class="btn btn-sm btn-outline-danger reject-voucher-btn" data-id="${v.id}">Rechazar</button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.voucher-thumb').forEach((img) => {
    img.addEventListener('click', () => {
      document.getElementById('voucherPreviewImg').src = img.dataset.fullsrc;
      voucherPreviewModal.show();
    });
  });

  document.querySelectorAll('.approve-voucher-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const { error } = await supabase.rpc('approve_voucher', { voucher_id: btn.dataset.id });
      if (error) { console.error(error); alert('No se pudo aprobar el voucher.'); btn.disabled = false; return; }
      await refreshAccounts();
      await renderVouchersQueue();
      showVouchersAlert('Voucher aprobado, la cuota quedó marcada como pagada.', 'success');
    });
  });

  document.querySelectorAll('.reject-voucher-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('rechazarVoucherId').value = btn.dataset.id;
      document.getElementById('rechazoMotivo').value = '';
      rechazarVoucherModal.show();
    });
  });
}

document.getElementById('confirmarRechazoBtn').addEventListener('click', async () => {
  const voucherId = document.getElementById('rechazarVoucherId').value;
  const motivo = document.getElementById('rechazoMotivo').value.trim();
  if (!motivo) { alert('Escribe un motivo.'); return; }

  const { error } = await supabase.from('vouchers').update({
    status: 'rejected',
    rejection_reason: motivo,
    reviewed_by: session.user.id,
    reviewed_at: new Date().toISOString(),
  }).eq('id', voucherId);

  if (error) { console.error(error); alert('No se pudo rechazar el voucher.'); return; }

  await supabase.from('audit_log').insert({
    actor_id: session.user.id,
    action: 'reject_voucher',
    target_table: 'vouchers',
    target_id: voucherId,
    details: { reason: motivo },
  });

  rechazarVoucherModal.hide();
  await renderVouchersQueue();
  showVouchersAlert('Voucher rechazado. El cliente podrá volver a subirlo.', 'warning');
});

function showVouchersAlert(message, type) {
  const alertBox = document.getElementById('vouchersActionAlert');
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type}`;
  setTimeout(() => alertBox.classList.add('d-none'), 4000);
}

const STATUS_LABEL_ES = { pending: 'pendiente', paid: 'pagada', rejected: 'rechazada' };

function formatAuditDetails(action, details) {
  if (!details) return '—';

  if (action === 'update_installment') {
    const { before, after } = details;
    const changes = [];
    if (before.amount !== after.amount) {
      changes.push(`Monto: S/${before.amount} → S/${after.amount}`);
    }
    if (before.status !== after.status) {
      changes.push(`Estado: ${STATUS_LABEL_ES[before.status] || before.status} → ${STATUS_LABEL_ES[after.status] || after.status}`);
    }
    if (before.due_date !== after.due_date) {
      changes.push(`Fecha: ${new Date(before.due_date).toLocaleDateString('es-PE')} → ${new Date(after.due_date).toLocaleDateString('es-PE')}`);
    }
    return changes.length ? changes.join(' · ') : 'Sin cambios';
  }

  if (action === 'create_credit_account') {
    return `"${details.description}" — S/${details.principal_amount} en ${details.installments} cuotas`;
  }

  if (action === 'approve_voucher') {
    return `Cuota por S/${details.amount} marcada como pagada`;
  }

  if (action === 'reject_voucher') {
    return `Motivo: ${details.reason}`;
  }

  return JSON.stringify(details);
}

async function renderAuditLog() {
  const tbody = document.getElementById('auditLogTableBody');
  const { data, error } = await supabase
    .from('audit_log')
    .select('*, profiles!audit_log_actor_id_fkey(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) { console.error(error); tbody.innerHTML = '<tr><td colspan="4" class="text-danger">No se pudo cargar la auditoría.</td></tr>'; return; }

  const ACTION_LABEL = {
    create_credit_account: 'Creó cuenta de crédito',
    update_installment: 'Editó cuota',
    approve_voucher: 'Aprobó voucher',
    reject_voucher: 'Rechazó voucher',
  };

  tbody.innerHTML = data.map((row) => `
    <tr>
      <td class="small">${new Date(row.created_at).toLocaleString('es-PE')}</td>
      <td class="small">${escapeHtml(row.profiles?.full_name || '—')}</td>
      <td class="small">${ACTION_LABEL[row.action] || escapeHtml(row.action)}</td>
      <td class="small text-muted">${escapeHtml(formatAuditDetails(row.action, row.details))}</td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="text-center text-muted py-4">Sin actividad registrada todavía</td></tr>';
}

document.querySelectorAll('.app-sidebar .nav-link[data-tab]').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.app-sidebar .nav-link').forEach((l) => l.classList.toggle('active', l === link));
    document.getElementById('tab-clientes').classList.toggle('d-none', link.dataset.tab !== 'clientes');
    document.getElementById('tab-vouchers').classList.toggle('d-none', link.dataset.tab !== 'vouchers');
    document.getElementById('tab-auditoria').classList.toggle('d-none', link.dataset.tab !== 'auditoria');
    document.getElementById('tab-promociones').classList.toggle('d-none', link.dataset.tab !== 'promociones');
    document.getElementById('tab-solicitudes').classList.toggle('d-none', link.dataset.tab !== 'solicitudes');
    document.getElementById('tab-reclamos')?.classList.toggle('d-none', link.dataset.tab !== 'reclamos');
    document.getElementById('tab-admins')?.classList.toggle('d-none', link.dataset.tab !== 'admins');
    if (link.dataset.tab === 'vouchers') renderVouchersQueue();
    if (link.dataset.tab === 'auditoria') renderAuditLog();
    if (link.dataset.tab === 'promociones') document.dispatchEvent(new CustomEvent('admin:show-promociones'));
    if (link.dataset.tab === 'solicitudes') document.dispatchEvent(new CustomEvent('admin:show-solicitudes'));
    if (link.dataset.tab === 'reclamos') document.dispatchEvent(new CustomEvent('admin:show-reclamos'));
    if (link.dataset.tab === 'admins') document.dispatchEvent(new CustomEvent('admin:show-admins'));
  });
});

function applyRoleVisibility(adminRole) {
  const hidden = adminRole === 'super_admin'
    ? []
    : adminRole === 'admin'
      ? SUPER_ADMIN_ONLY_TABS
      : [...ASESOR_RESTRICTED_TABS, ...SUPER_ADMIN_ONLY_TABS];

  document.querySelectorAll('.app-sidebar .nav-link[data-tab]').forEach((link) => {
    if (hidden.includes(link.dataset.tab)) link.closest('.nav-item')?.classList.add('d-none');
  });
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = '/login';
});

async function refreshAccounts() {
  accounts = await loadAccounts();
  renderKpis();
  renderClientes();
}

async function init() {
  session = await requireAdmin();
  if (!session) return;

  document.getElementById('userEmailLabel').textContent = session.user.email;

  const { data: ownProfile } = await supabase.from('profiles').select('admin_role').eq('id', session.user.id).single();
  applyRoleVisibility(ownProfile?.admin_role);

  profiles = await loadProfiles();
  populateClienteSelect();
  await refreshAccounts();

  loadingState.classList.add('d-none');
  panelContent.classList.remove('d-none');
}

init();
