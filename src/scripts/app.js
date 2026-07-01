import { getSession, initialiseRuntimeConfig, isHostedMode, listAuditLogs, loginUser, logoutUser, registerUser, setSessionToken } from './auth.js';
import { APP_VERSION } from './constants.js';
import { exportBackupJson, exportCsv, exportReceiptZip, exportWorkbook } from './exports.js';
import { getFinancialYearLabel } from './finance.js';
import { analyseReceiptFile } from './ocr.js';
import {
  deleteReceipt,
  findDuplicateByFingerprint,
  getAllReceipts,
  getLookups,
  getReceiptFile,
  getSettings,
  importBackupSnapshot,
  initialiseStorage,
  saveLookups,
  saveReceipt,
  saveReceiptFile,
  saveSettings,
} from './storage.js';
import {
  applyTheme,
  attachReceiptListHandlers,
  populateFilters,
  populateLookupManagers,
  populateSettingsForm,
  renderReceiptDetails,
  renderReceiptList,
  showToast,
  updateStats,
  updateStatus,
  updateViewerTransform,
} from './ui.js';
import { debounce, escapeHtml, fromDateTimeInput, safeJsonParse, sha256, sortByLabel, uid } from './utils.js';
import { connectGoogleDrive, uploadBackupToDrive } from './drive.js';

const state = {
  receipts: [],
  lookups: { businesses: [], categories: [] },
  settings: { theme: 'light', locale: 'en-AU', currency: 'AUD' },
  selectedReceiptId: '',
  filters: {
    search: '',
    year: 'all',
    business: 'all',
    category: 'all',
    payment: 'all',
    status: 'all',
  },
  viewer: { zoom: 1, rotation: 0 },
  installPrompt: null,
  runtime: {
    mode: 'offline',
    allowRegistration: false,
    version: APP_VERSION,
    user: null,
  },
  auditLogs: [],
};

const elements = {
  authShell: document.querySelector('#auth-shell'),
  authPhase: document.querySelector('#auth-phase'),
  authCopy: document.querySelector('#auth-copy'),
  loginForm: document.querySelector('#login-form'),
  registerForm: document.querySelector('#register-form'),
  appShell: document.querySelector('#app-shell'),
  modeBadge: document.querySelector('#mode-badge'),
  platformStatus: document.querySelector('#platform-status'),
  accountSummary: document.querySelector('#account-summary'),
  logoutButton: document.querySelector('#logout-button'),
  auditPanel: document.querySelector('#audit-panel'),
  auditList: document.querySelector('#audit-list'),
  uploadInput: document.querySelector('#upload-input'),
  cameraInput: document.querySelector('#camera-input'),
  importJsonInput: document.querySelector('#import-json-input'),
  dropZone: document.querySelector('#drop-zone'),
  uploadStatus: document.querySelector('#upload-status'),
  uploadProgress: document.querySelector('#upload-progress'),
  searchInput: document.querySelector('#search-input'),
  yearFilter: document.querySelector('#year-filter'),
  businessFilter: document.querySelector('#business-filter'),
  categoryFilter: document.querySelector('#category-filter'),
  paymentFilter: document.querySelector('#payment-filter'),
  statusFilter: document.querySelector('#status-filter'),
  receiptList: document.querySelector('#receipt-list'),
  receiptCount: document.querySelector('#receipt-count'),
  receiptForm: document.querySelector('#receipt-form'),
  viewerStage: document.querySelector('#viewer-stage'),
  statTotalReceipts: document.querySelector('#stat-total-receipts'),
  statTotalSpend: document.querySelector('#stat-total-spend'),
  statTotalGst: document.querySelector('#stat-total-gst'),
  statDuplicates: document.querySelector('#stat-duplicates'),
  categoryChart: document.querySelector('#category-chart'),
  yearChart: document.querySelector('#year-chart'),
  businessForm: document.querySelector('#business-form'),
  businessName: document.querySelector('#business-name'),
  businessList: document.querySelector('#business-list'),
  categoryForm: document.querySelector('#category-form'),
  categoryName: document.querySelector('#category-name'),
  categoryList: document.querySelector('#category-list'),
  settingsForm: document.querySelector('#settings-form'),
  themeToggle: document.querySelector('#theme-toggle'),
  ocrConfidence: document.querySelector('#ocr-confidence'),
  extractionConfidence: document.querySelector('#extraction-confidence'),
  duplicateStatus: document.querySelector('#duplicate-status'),
  exportCsvButton: document.querySelector('#export-csv-button'),
  exportXlsxButton: document.querySelector('#export-xlsx-button'),
  exportJsonButton: document.querySelector('#export-json-button'),
  exportZipButton: document.querySelector('#export-zip-button'),
  importJsonButton: document.querySelector('#import-json-button'),
  driveConnectButton: document.querySelector('#drive-connect-button'),
  driveBackupButton: document.querySelector('#drive-backup-button'),
  deleteButton: document.querySelector('#delete-button'),
  zoomInButton: document.querySelector('#zoom-in-button'),
  zoomOutButton: document.querySelector('#zoom-out-button'),
  zoomResetButton: document.querySelector('#zoom-reset-button'),
  rotateButton: document.querySelector('#rotate-button'),
  reprocessButton: document.querySelector('#reprocess-button'),
  installButton: document.querySelector('#install-button'),
};

function selectedReceipt() {
  return state.receipts.find((receipt) => receipt.id === state.selectedReceiptId) ?? null;
}

function hostedModeActive() {
  return state.runtime.mode === 'server';
}

function authenticatedHostedMode() {
  return hostedModeActive() && Boolean(state.runtime.user);
}

function getFilteredReceipts() {
  const query = state.filters.search.toLowerCase().trim();
  return state.receipts.filter((receipt) => {
    const haystack = [
      receipt.merchantName,
      receipt.abn,
      receipt.paymentMethod,
      receipt.notes,
      receipt.ocrText,
      ...(receipt.tags ?? []),
      String(receipt.total ?? ''),
    ]
      .join(' ')
      .toLowerCase();

    return (!query || haystack.includes(query))
      && (state.filters.year === 'all' || receipt.financialYear === state.filters.year)
      && (state.filters.business === 'all' || receipt.businessId === state.filters.business)
      && (state.filters.category === 'all' || receipt.categoryId === state.filters.category)
      && (state.filters.payment === 'all' || receipt.paymentMethod === state.filters.payment)
      && (state.filters.status === 'all' || receipt.status === state.filters.status);
  });
}

function syncSelection() {
  if (!state.receipts.some((receipt) => receipt.id === state.selectedReceiptId)) {
    state.selectedReceiptId = state.receipts[0]?.id ?? '';
  }
}

async function hydrateState() {
  await initialiseStorage();
  state.lookups = await getLookups();
  state.settings = await getSettings();
  state.receipts = await getAllReceipts();
  syncSelection();
}

function resetHostedState() {
  state.receipts = [];
  state.lookups = { businesses: [], categories: [] };
  state.selectedReceiptId = '';
  state.auditLogs = [];
}

function renderAuditLog() {
  if (!elements.auditList) return;
  if (!hostedModeActive()) {
    elements.auditList.innerHTML = '';
    return;
  }
  if (!state.auditLogs.length) {
    elements.auditList.innerHTML = '<li><strong>No recent activity</strong><span class="muted">Changes, sign-ins, and data updates will appear here.</span></li>';
    return;
  }
  const locale = state.settings.locale || 'en-AU';
  const labels = {
    'lookups.updated': 'Updated lookup lists',
    'receipt.deleted': 'Deleted a receipt',
    'receipt.file_saved': 'Stored receipt source file',
    'receipt.saved': 'Saved a receipt',
    'settings.updated': 'Updated workspace settings',
    'user.logged_in': 'Signed in',
    'user.logged_out': 'Signed out',
    'user.registered': 'Created a new account',
  };
  elements.auditList.innerHTML = state.auditLogs
    .map((entry) => `
      <li>
        <strong>${escapeHtml(labels[entry.action] || entry.action)}</strong>
        <span class="muted">${escapeHtml(entry.targetType || 'workspace')}${entry.targetId ? ` · ${escapeHtml(entry.targetId)}` : ''}</span>
        <time datetime="${escapeHtml(entry.createdAt || '')}">${escapeHtml(new Date(entry.createdAt).toLocaleString(locale))}</time>
      </li>
    `)
    .join('');
}

function renderRuntimeState() {
  const hosted = hostedModeActive();
  document.body.dataset.runtime = hosted ? 'hosted' : 'offline';
  document.title = `Receipt Hub ${state.runtime.version || APP_VERSION}`;
  elements.modeBadge.textContent = hosted ? 'Phase 2' : 'Phase 1';
  elements.authPhase.textContent = hosted ? 'Phase 2' : 'Phase 1';
  elements.platformStatus.textContent = hosted
    ? 'Self-hosted multi-user workspace with secure sign-in, per-user storage, and audit logging.'
    : 'Offline-first receipt capture with OCR, Australian financial year logic, local storage, and export tools.';
  elements.accountSummary.textContent = hosted && state.runtime.user
    ? `${state.runtime.user.displayName} · ${state.runtime.user.email}`
    : hosted
      ? 'Sign in to open your hosted workspace.'
      : 'Offline workspace active.';
  elements.authCopy.textContent = state.runtime.allowRegistration
    ? 'Sign in to access the shared self-hosted receipt workspace, or create a new account for your team.'
    : 'Sign in to access the shared self-hosted receipt workspace. Public registration is disabled.';
  elements.logoutButton.hidden = !authenticatedHostedMode();
  elements.auditPanel.hidden = !hosted;
  elements.registerForm.hidden = !state.runtime.allowRegistration;
  elements.authShell.hidden = !hosted || authenticatedHostedMode();
  elements.appShell.hidden = hosted && !authenticatedHostedMode();
}

function render() {
  applyTheme(state.settings.theme ?? 'light');
  renderRuntimeState();
  if (hostedModeActive() && !authenticatedHostedMode()) {
    renderAuditLog();
    return;
  }
  populateFilters(elements, state.lookups, state.receipts);
  populateLookupManagers(elements, state.lookups, {
    remove: async (type, id) => {
      const key = type === 'business' ? 'businesses' : 'categories';
      state.lookups = await saveLookups({
        ...state.lookups,
        [key]: state.lookups[key].filter((item) => item.id !== id),
      });
      state.receipts = await Promise.all(
        state.receipts.map(async (receipt) => {
          if ((key === 'businesses' && receipt.businessId !== id) || (key === 'categories' && receipt.categoryId !== id)) {
            return receipt;
          }
          const updated = {
            ...receipt,
            businessId: key === 'businesses' ? state.lookups.businesses[0]?.id ?? '' : receipt.businessId,
            categoryId: key === 'categories' ? state.lookups.categories[0]?.id ?? '' : receipt.categoryId,
          };
          return saveReceipt(updated);
        }),
      );
      await refreshAuditLogs();
      render();
    },
  });
  populateSettingsForm(elements.settingsForm, state.settings, Boolean(state.installPrompt));
  const filteredReceipts = getFilteredReceipts();
  if (!filteredReceipts.some((receipt) => receipt.id === state.selectedReceiptId)) {
    state.selectedReceiptId = filteredReceipts[0]?.id ?? state.selectedReceiptId;
  }
  renderReceiptList(elements, filteredReceipts, state.selectedReceiptId, state.lookups, state.settings);
  attachReceiptListHandlers(elements.receiptList, (receiptId) => {
    state.selectedReceiptId = receiptId;
    state.viewer.zoom = 1;
    state.viewer.rotation = 0;
    render();
  });
  renderReceiptDetails(elements, selectedReceipt(), state.lookups);
  updateViewerTransform(elements, state.viewer.zoom, state.viewer.rotation);
  updateStats(elements, filteredReceipts, state.lookups, state.settings);
  renderAuditLog();
}

function buildReceiptRecord(file, analysis, fingerprint, duplicate) {
  const defaultBusinessId = state.lookups.businesses[0]?.id ?? '';
  const defaultCategoryId = state.lookups.categories[0]?.id ?? '';
  return {
    id: uid('receipt'),
    sourceName: file.name,
    mimeType: file.type,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    merchantName: analysis.merchantName,
    abn: analysis.abn,
    dateTime: analysis.dateTime,
    gst: analysis.gst,
    total: analysis.total,
    paymentMethod: analysis.paymentMethod,
    financialYear: analysis.financialYear || getFinancialYearLabel(analysis.dateTime),
    businessId: defaultBusinessId,
    categoryId: defaultCategoryId,
    status: duplicate ? 'duplicate' : 'reviewed',
    notes: duplicate ? `Possible duplicate of ${duplicate.id}` : '',
    tags: [],
    ocrText: analysis.ocrText,
    ocrConfidence: analysis.ocrConfidence,
    extractionConfidence: analysis.extractionConfidence,
    fingerprint,
    duplicateOf: duplicate?.id ?? '',
    previewDataUrl: analysis.previewDataUrl,
    thumbnailDataUrl: analysis.thumbnailDataUrl,
  };
}

async function refreshAuditLogs() {
  if (!authenticatedHostedMode()) {
    state.auditLogs = [];
    return;
  }
  state.auditLogs = await listAuditLogs(12);
}

async function processFiles(fileList) {
  const files = [...fileList];
  if (!files.length) return;
  updateStatus(elements, `Processing ${files.length} receipt(s)...`, 0);
  for (const [index, file] of files.entries()) {
    try {
      const fingerprint = await sha256(file);
      const duplicate = await findDuplicateByFingerprint(fingerprint);
      const analysis = await analyseReceiptFile(file);
      const receipt = buildReceiptRecord(file, analysis, fingerprint, duplicate);
      const savedReceipt = await saveReceipt(receipt);
      await saveReceiptFile(savedReceipt.id, {
        sourceBlob: analysis.file,
        previewBlob: analysis.previewBlob,
      });
      state.receipts.unshift(savedReceipt);
      state.selectedReceiptId = savedReceipt.id;
      showToast(`${file.name} processed successfully.`, duplicate ? 'warning' : 'success');
    } catch (error) {
      console.error(error);
      showToast(`Could not process ${file.name}: ${error.message}`, 'error');
    }
    updateStatus(elements, `Processed ${index + 1} of ${files.length} files.`, Math.round(((index + 1) / files.length) * 100));
  }
  await refreshAuditLogs();
  syncSelection();
  render();
  updateStatus(elements, `Finished processing ${files.length} receipt(s).`, 100);
}

async function saveReceiptForm(event) {
  event.preventDefault();
  const receipt = selectedReceipt();
  if (!receipt) return;
  const form = new FormData(elements.receiptForm);
  const updated = {
    ...receipt,
    merchantName: String(form.get('merchantName') || '').trim(),
    abn: String(form.get('abn') || '').trim(),
    dateTime: fromDateTimeInput(String(form.get('dateTime') || '')),
    total: Number(form.get('total') || 0),
    gst: Number(form.get('gst') || 0),
    paymentMethod: String(form.get('paymentMethod') || 'Unknown'),
    financialYear: String(form.get('financialYear') || getFinancialYearLabel(new Date().toISOString())),
    businessId: String(form.get('businessId') || ''),
    categoryId: String(form.get('categoryId') || ''),
    status: String(form.get('status') || 'reviewed'),
    tags: String(form.get('tags') || '').split(',').map((value) => value.trim()).filter(Boolean),
    notes: String(form.get('notes') || ''),
    ocrText: String(form.get('ocrText') || ''),
    updatedAt: new Date().toISOString(),
  };
  const saved = await saveReceipt(updated);
  state.receipts = state.receipts.map((item) => (item.id === saved.id ? saved : item));
  await refreshAuditLogs();
  render();
  showToast('Receipt saved.', 'success');
}

async function rerunSelectedReceiptOcr() {
  const receipt = selectedReceipt();
  if (!receipt) return;
  const filePayload = await getReceiptFile(receipt.id);
  if (!filePayload?.sourceBlob) {
    showToast('No stored receipt file found for OCR.', 'error');
    return;
  }
  updateStatus(elements, `Reprocessing ${receipt.sourceName}...`, 0);
  try {
    const analysis = await analyseReceiptFile(filePayload.sourceBlob);
    const updated = await saveReceipt({
      ...receipt,
      ...analysis,
      updatedAt: new Date().toISOString(),
    });
    await saveReceiptFile(receipt.id, {
      ...filePayload,
      previewBlob: analysis.previewBlob,
    });
    state.receipts = state.receipts.map((item) => (item.id === updated.id ? updated : item));
    await refreshAuditLogs();
    render();
    showToast('OCR updated.', 'success');
  } catch (error) {
    console.error(error);
    showToast(`OCR failed: ${error.message}`, 'error');
  }
  updateStatus(elements, 'OCR ready.', 100);
}

async function addLookupItem(type, name) {
  if (!name) return;
  const key = type === 'business' ? 'businesses' : 'categories';
  const idPrefix = type === 'business' ? 'business' : 'category';
  const nextItems = sortByLabel([...state.lookups[key], { id: uid(idPrefix), name }]);
  state.lookups = await saveLookups({ ...state.lookups, [key]: nextItems });
  await refreshAuditLogs();
  render();
}

async function handleImportBackup(file) {
  const text = await file.text();
  const parsed = safeJsonParse(text, null);
  if (!parsed) {
    showToast('Backup file is not valid JSON.', 'error');
    return;
  }
  await importBackupSnapshot(parsed);
  await hydrateState();
  await refreshAuditLogs();
  render();
  showToast('Backup imported.', 'success');
}

async function backupToDrive() {
  const snapshot = await exportBackupJson();
  await uploadBackupToDrive({
    clientId: state.settings.googleClientId,
    fileName: state.settings.googleBackupFileName,
    folder: state.settings.googleDriveFolder,
    content: JSON.stringify(snapshot, null, 2),
  });
  showToast('Backup uploaded to Google Drive.', 'success');
}

async function activateHostedSession(sessionPayload, successMessage) {
  state.runtime.user = sessionPayload.user;
  await hydrateState();
  await refreshAuditLogs();
  render();
  showToast(successMessage, 'success');
}

function attachEvents() {
  elements.loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const form = new FormData(elements.loginForm);
      const sessionPayload = await loginUser({
        email: String(form.get('email') || '').trim(),
        password: String(form.get('password') || ''),
      });
      elements.loginForm.reset();
      await activateHostedSession(sessionPayload, 'Signed in to the hosted workspace.');
    } catch (error) {
      console.error(error);
      showToast(error.message, 'error');
    }
  });

  elements.registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const form = new FormData(elements.registerForm);
      const sessionPayload = await registerUser({
        displayName: String(form.get('displayName') || '').trim(),
        email: String(form.get('email') || '').trim(),
        password: String(form.get('password') || ''),
      });
      elements.registerForm.reset();
      await activateHostedSession(sessionPayload, 'Account created and signed in.');
    } catch (error) {
      console.error(error);
      showToast(error.message, 'error');
    }
  });

  elements.logoutButton.addEventListener('click', async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error(error);
    }
    state.runtime.user = null;
    resetHostedState();
    render();
    showToast('Signed out.', 'success');
  });

  elements.uploadInput.addEventListener('change', (event) => processFiles(event.target.files));
  elements.cameraInput.addEventListener('change', (event) => processFiles(event.target.files));
  elements.importJsonInput.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (file) handleImportBackup(file);
  });
  elements.importJsonButton.addEventListener('click', () => elements.importJsonInput.click());
  elements.dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    elements.dropZone.classList.add('dragover');
  });
  elements.dropZone.addEventListener('dragleave', () => elements.dropZone.classList.remove('dragover'));
  elements.dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove('dragover');
    processFiles(event.dataTransfer.files);
  });
  elements.dropZone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      elements.uploadInput.click();
    }
  });

  const syncFilter = debounce(() => {
    state.filters.search = elements.searchInput.value;
    state.filters.year = elements.yearFilter.value;
    state.filters.business = elements.businessFilter.value;
    state.filters.category = elements.categoryFilter.value;
    state.filters.payment = elements.paymentFilter.value;
    state.filters.status = elements.statusFilter.value;
    render();
  }, 100);

  [elements.searchInput, elements.yearFilter, elements.businessFilter, elements.categoryFilter, elements.paymentFilter, elements.statusFilter].forEach((element) => {
    element.addEventListener('input', syncFilter);
    element.addEventListener('change', syncFilter);
  });

  elements.receiptForm.addEventListener('submit', saveReceiptForm);
  elements.reprocessButton.addEventListener('click', rerunSelectedReceiptOcr);
  elements.deleteButton.addEventListener('click', async () => {
    const receipt = selectedReceipt();
    if (!receipt) return;
    await deleteReceipt(receipt.id);
    state.receipts = state.receipts.filter((item) => item.id !== receipt.id);
    await refreshAuditLogs();
    syncSelection();
    render();
    showToast('Receipt deleted.', 'success');
  });

  elements.zoomInButton.addEventListener('click', () => {
    state.viewer.zoom = Math.min(3, Number((state.viewer.zoom + 0.1).toFixed(2)));
    updateViewerTransform(elements, state.viewer.zoom, state.viewer.rotation);
  });
  elements.zoomOutButton.addEventListener('click', () => {
    state.viewer.zoom = Math.max(0.5, Number((state.viewer.zoom - 0.1).toFixed(2)));
    updateViewerTransform(elements, state.viewer.zoom, state.viewer.rotation);
  });
  elements.zoomResetButton.addEventListener('click', () => {
    state.viewer.zoom = 1;
    state.viewer.rotation = 0;
    updateViewerTransform(elements, state.viewer.zoom, state.viewer.rotation);
  });
  elements.rotateButton.addEventListener('click', () => {
    state.viewer.rotation = (state.viewer.rotation + 90) % 360;
    updateViewerTransform(elements, state.viewer.zoom, state.viewer.rotation);
  });

  elements.businessForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await addLookupItem('business', elements.businessName.value.trim());
    elements.businessForm.reset();
    showToast('Business added.', 'success');
  });

  elements.categoryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await addLookupItem('category', elements.categoryName.value.trim());
    elements.categoryForm.reset();
    showToast('Category added.', 'success');
  });

  elements.settingsForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(elements.settingsForm);
    state.settings = await saveSettings({
      currency: String(form.get('currency') || 'AUD').trim() || 'AUD',
      locale: String(form.get('locale') || 'en-AU').trim() || 'en-AU',
      googleClientId: String(form.get('googleClientId') || '').trim(),
      googleBackupFileName: String(form.get('googleBackupFileName') || 'receipt-backup.json').trim() || 'receipt-backup.json',
      googleDriveFolder: String(form.get('googleDriveFolder') || 'appDataFolder').trim() || 'appDataFolder',
      theme: state.settings.theme,
    });
    await refreshAuditLogs();
    render();
    showToast('Settings saved.', 'success');
  });

  elements.themeToggle.addEventListener('click', async () => {
    state.settings = await saveSettings({ ...state.settings, theme: state.settings.theme === 'dark' ? 'light' : 'dark' });
    if (hostedModeActive()) await refreshAuditLogs();
    render();
  });

  elements.exportCsvButton.addEventListener('click', () => exportCsv(getFilteredReceipts()));
  elements.exportXlsxButton.addEventListener('click', () => exportWorkbook(getFilteredReceipts()));
  elements.exportJsonButton.addEventListener('click', () => exportBackupJson());
  elements.exportZipButton.addEventListener('click', () => exportReceiptZip(getFilteredReceipts()));
  elements.driveConnectButton.addEventListener('click', async () => {
    try {
      await connectGoogleDrive(state.settings.googleClientId);
      showToast('Google Drive connected.', 'success');
    } catch (error) {
      console.error(error);
      showToast(error.message, 'error');
    }
  });
  elements.driveBackupButton.addEventListener('click', async () => {
    try {
      await backupToDrive();
    } catch (error) {
      console.error(error);
      showToast(error.message, 'error');
    }
  });
  elements.installButton.addEventListener('click', async () => {
    if (!state.installPrompt) {
      showToast('Use your browser menu to install this app.', 'info');
      return;
    }
    state.installPrompt.prompt();
    await state.installPrompt.userChoice;
    state.installPrompt = null;
    render();
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.installPrompt = event;
    render();
  });
}

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch (error) {
      console.error(error);
      showToast('Service worker registration failed.', 'error');
    }
  }
}

async function bootstrap() {
  state.runtime = { ...state.runtime, ...(await initialiseRuntimeConfig()) };
  attachEvents();

  if (isHostedMode()) {
    try {
      const sessionPayload = await getSession();
      await activateHostedSession(sessionPayload, 'Receipt Hub is ready in self-hosted mode.');
    } catch (error) {
      console.error(error);
      setSessionToken('');
      resetHostedState();
      render();
      showToast('Sign in to access the hosted workspace.', 'info');
    }
  } else {
    await hydrateState();
    render();
    showToast('Receipt Hub is ready for offline use.', 'success');
  }

  await registerServiceWorker();
}

bootstrap().catch((error) => {
  console.error(error);
  showToast(error.message, 'error');
});
