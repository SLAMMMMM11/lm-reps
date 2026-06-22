import { supabase } from './supabase-client.js';
import { requireAuth } from './auth-guard.js';

const loadingState = document.getElementById('loadingState');
const dashboardContent = document.getElementById('dashboardContent');
const emptyState = document.getElementById('emptyState');
const tabResumen = document.getElementById('tab-resumen');
const tabHistorial = document.getElementById('tab-historial');
const accountSelectorWrapper = document.getElementById('accountSelectorWrapper');
const accountSelector = document.getElementById('accountSelector');
const installmentsTableBody = document.getElementById('installmentsTableBody');
const historialList = document.getElementById('historialList');
const voucherModalEl = document.getElementById('voucherModal');
const voucherModal = new bootstrap.Modal(voucherModalEl);

const STATUS_LABEL = { pending: 'Pendiente', paid: 'Pagada', rejected: 'Rechazada' };

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

function statusBadgeClass(installment) {
  if (isOverdue(installment)) return 'status-badge-overdue';
  return `status-badge-${installment.status}`;
}

function statusLabel(installment) {
  if (isOverdue(installment)) return 'Vencida';
  return STATUS_LABEL[installment.status] || installment.status;
}

async function compressImage(file, maxDimension = 1600, quality = 0.75) {
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

let session;
let creditAccounts = [];
let currentAccount = null;
let latestVoucherByInstallment = new Map();

async function loadAccounts() {
  const { data, error } = await supabase
    .from('credit_accounts')
    .select('*, installments(*)')
    .eq('customer_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }
  return data;
}

async function loadLatestVouchers() {
  const { data, error } = await supabase
    .from('vouchers')
    .select('installment_id, status, created_at')
    .eq('customer_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  latestVoucherByInstallment = new Map();
  for (const v of data) {
    if (!latestVoucherByInstallment.has(v.installment_id)) {
      latestVoucherByInstallment.set(v.installment_id, v);
    }
  }
}

function renderAccountSelector() {
  if (creditAccounts.length <= 1) {
    accountSelectorWrapper.style.display = 'none';
    return;
  }
  accountSelectorWrapper.style.display = 'block';
  accountSelector.innerHTML = creditAccounts
    .map((acc) => `<option value="${acc.id}">${escapeHtml(acc.description)}</option>`)
    .join('');
  accountSelector.value = currentAccount.id;
}

function renderResumen() {
  document.getElementById('accountDescription').textContent = currentAccount.description;

  const installments = [...currentAccount.installments].sort((a, b) => a.installment_number - b.installment_number);
  const totalPaid = installments.filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0);
  const totalPending = installments.filter((i) => i.status !== 'paid').reduce((s, i) => s + Number(i.amount), 0);

  document.getElementById('balanceAmount').textContent = formatMoney(totalPending);

  const badge = document.getElementById('accountStatusBadge');
  const statusMap = { active: ['Activa', 'status-badge-pending'], paid_off: ['Pagada', 'status-badge-paid'], cancelled: ['Cancelada', 'status-badge-rejected'] };
  const [label, cls] = statusMap[currentAccount.status] || [currentAccount.status, ''];
  badge.textContent = label;
  badge.className = `badge rounded-pill px-3 py-2 ${cls}`;

  const nextDue = installments.find((i) => i.status === 'pending');
  document.getElementById('nextDueLabel').textContent = nextDue
    ? `Próxima cuota: ${formatMoney(nextDue.amount)} — vence ${new Date(nextDue.due_date).toLocaleDateString('es-PE')}`
    : 'Sin cuotas pendientes';

  installmentsTableBody.innerHTML = installments.map((inst) => {
    const voucher = latestVoucherByInstallment.get(inst.id);
    const hasPendingVoucher = voucher?.status === 'pending_review';

    let actionCell = '';
    if (inst.status !== 'paid') {
      if (hasPendingVoucher) {
        actionCell = '<span class="small text-muted"><i class="bi bi-clock-history me-1"></i>En revisión</span>';
      } else {
        actionCell = `<button class="btn btn-sm btn-outline-danger upload-voucher-btn" data-installment="${inst.id}">Subir Voucher</button>`;
        if (voucher?.status === 'rejected') {
          actionCell = `<span class="small text-danger d-block mb-1">Voucher rechazado, vuelve a intentar</span>${actionCell}`;
        }
      }
    }

    return `
    <tr>
      <td>${inst.installment_number}</td>
      <td>${new Date(inst.due_date).toLocaleDateString('es-PE')}</td>
      <td>${formatMoney(inst.amount)}</td>
      <td><span class="badge rounded-pill px-3 py-1 ${statusBadgeClass(inst)}">${statusLabel(inst)}</span></td>
      <td>${actionCell}</td>
    </tr>
  `;
  }).join('') || '<tr><td colspan="5" class="text-center text-muted py-4">Sin cuotas registradas</td></tr>';

  document.querySelectorAll('.upload-voucher-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('voucherInstallmentId').value = btn.dataset.installment;
      document.getElementById('voucherForm').reset();
      document.getElementById('voucherAlert').className = 'alert d-none';
      voucherModal.show();
    });
  });
}

function renderHistorial() {
  historialList.innerHTML = creditAccounts.map((acc) => {
    const paidCount = acc.installments.filter((i) => i.status === 'paid').length;
    return `
      <div class="balance-card mb-3">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <p class="fw-bold mb-1">${escapeHtml(acc.description)}</p>
            <p class="small text-muted mb-0">Monto total: ${formatMoney(acc.principal_amount)} — ${paidCount}/${acc.installments.length} cuotas pagadas</p>
          </div>
          <span class="badge rounded-pill px-3 py-2">${acc.status}</span>
        </div>
      </div>
    `;
  }).join('') || '<p class="text-muted">Sin historial todavía.</p>';
}

function switchTab(tab) {
  document.querySelectorAll('.app-sidebar .nav-link').forEach((l) => l.classList.toggle('active', l.dataset.tab === tab));
  document.querySelectorAll('[id^="tab-"]').forEach((s) => s.classList.toggle('d-none', s.id !== `tab-${tab}`));
}

document.querySelectorAll('.app-sidebar .nav-link').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    switchTab(link.dataset.tab);
  });
});

accountSelector.addEventListener('change', () => {
  currentAccount = creditAccounts.find((a) => a.id === accountSelector.value);
  renderResumen();
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = '/login';
});

document.getElementById('voucherForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById('voucherSubmitBtn');
  const alertBox = document.getElementById('voucherAlert');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando...';

  try {
    const installmentId = document.getElementById('voucherInstallmentId').value;
    const fileInput = document.getElementById('voucherFile');
    const rawFile = fileInput.files[0];
    const compressed = await compressImage(rawFile);

    const path = `${session.user.id}/${installmentId}/${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage.from('vouchers').upload(path, compressed, {
      contentType: 'image/jpeg',
    });
    if (uploadError) throw uploadError;

    const { error: insertError } = await supabase.from('vouchers').insert({
      installment_id: installmentId,
      customer_id: session.user.id,
      storage_path: path,
      payment_method: document.getElementById('voucherPaymentMethod').value,
      note: document.getElementById('voucherNote').value || null,
    });
    if (insertError) throw insertError;

    alertBox.textContent = 'Voucher enviado, será revisado por el equipo.';
    alertBox.className = 'alert alert-success';
    await loadLatestVouchers();
    renderResumen();
    setTimeout(() => voucherModal.hide(), 1500);
  } catch (err) {
    console.error(err);
    alertBox.textContent = 'No se pudo enviar el voucher. Intenta de nuevo.';
    alertBox.className = 'alert alert-danger';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enviar comprobante';
  }
});

async function init() {
  session = await requireAuth();
  if (!session) return;

  document.getElementById('userEmailLabel').textContent = session.user.email;

  creditAccounts = await loadAccounts();
  await loadLatestVouchers();
  loadingState.classList.add('d-none');
  dashboardContent.classList.remove('d-none');

  if (creditAccounts.length === 0) {
    emptyState.classList.remove('d-none');
    tabResumen.classList.add('d-none');
    return;
  }

  currentAccount = creditAccounts.find((a) => a.status === 'active') || creditAccounts[0];
  renderAccountSelector();
  renderResumen();
  renderHistorial();
}

init();
