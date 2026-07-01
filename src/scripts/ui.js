import { PAYMENT_METHODS, RECEIPT_STATUSES } from './constants.js';
import { listFinancialYears } from './finance.js';
import { buildLookupMap, escapeHtml, toCurrency, toDateTimeInput } from './utils.js';

function setSelectOptions(select, items, placeholder) {
  const current = select.value;
  select.innerHTML = '';
  if (placeholder) {
    const option = document.createElement('option');
    option.value = 'all';
    option.textContent = placeholder;
    select.append(option);
  }
  for (const item of items) {
    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = item.label;
    select.append(option);
  }
  if ([...select.options].some((option) => option.value === current)) {
    select.value = current;
  }
}

export function showToast(message, tone = 'info') {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.classList.add('visible');
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => toast.classList.remove('visible'), 3200);
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function updateStatus(elements, message, percent = 0) {
  elements.uploadStatus.textContent = message;
  elements.uploadProgress.value = percent;
}

export function populateFilters(elements, lookups, receipts) {
  const years = new Set(listFinancialYears());
  receipts.forEach((receipt) => years.add(receipt.financialYear));
  setSelectOptions(
    elements.yearFilter,
    [...years].filter(Boolean).sort().reverse().map((year) => ({ value: year, label: year })),
    'All years',
  );
  setSelectOptions(
    elements.businessFilter,
    lookups.businesses.map((business) => ({ value: business.id, label: business.name })),
    'All businesses',
  );
  setSelectOptions(
    elements.categoryFilter,
    lookups.categories.map((category) => ({ value: category.id, label: category.name })),
    'All categories',
  );
  setSelectOptions(
    elements.paymentFilter,
    PAYMENT_METHODS.map((method) => ({ value: method, label: method })),
    'All methods',
  );
}

export function populateLookupManagers(elements, lookups, handlers) {
  const businessesMarkup = lookups.businesses
    .map((business) => `<li><span>${escapeHtml(business.name)}</span><button data-lookup="business" data-id="${business.id}" type="button">×</button></li>`)
    .join('');
  const categoriesMarkup = lookups.categories
    .map((category) => `<li><span>${escapeHtml(category.name)}</span><button data-lookup="category" data-id="${category.id}" type="button">×</button></li>`)
    .join('');
  elements.businessList.innerHTML = businessesMarkup;
  elements.categoryList.innerHTML = categoriesMarkup;
  [elements.businessList, elements.categoryList].forEach((list) => {
    list.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => handlers.remove(button.dataset.lookup, button.dataset.id)));
  });
}

export function populateEditorSelects(form, lookups, receipt) {
  setSelectOptions(
    form.elements.paymentMethod,
    PAYMENT_METHODS.map((method) => ({ value: method, label: method })),
  );
  const years = new Set(listFinancialYears());
  if (receipt?.financialYear) years.add(receipt.financialYear);
  setSelectOptions(
    form.elements.financialYear,
    [...years].sort().reverse().map((year) => ({ value: year, label: year })),
  );
  setSelectOptions(form.elements.businessId, lookups.businesses.map((business) => ({ value: business.id, label: business.name })));
  setSelectOptions(form.elements.categoryId, lookups.categories.map((category) => ({ value: category.id, label: category.name })));
  setSelectOptions(form.elements.status, RECEIPT_STATUSES.map((status) => ({ value: status, label: status })));
}

export function renderReceiptList(elements, receipts, selectedId, lookups, settings) {
  const categories = buildLookupMap(lookups.categories);
  const businesses = buildLookupMap(lookups.businesses);
  elements.receiptCount.textContent = `${receipts.length} shown`;
  if (!receipts.length) {
    elements.receiptList.innerHTML = '<p class="empty-state">Upload receipts to populate your offline library.</p>';
    return;
  }
  elements.receiptList.innerHTML = receipts
    .map((receipt) => `
      <button class="receipt-card ${receipt.id === selectedId ? 'active' : ''}" type="button" data-id="${receipt.id}">
        <div class="receipt-card-image">
          ${receipt.thumbnailDataUrl ? `<img src="${receipt.thumbnailDataUrl}" alt="${escapeHtml(receipt.merchantName || receipt.sourceName)}" />` : '<span>PDF</span>'}
        </div>
        <div class="receipt-card-body">
          <strong>${escapeHtml(receipt.merchantName || receipt.sourceName || 'Untitled receipt')}</strong>
          <span>${escapeHtml(receipt.financialYear || 'Unknown FY')} · ${escapeHtml(businesses[receipt.businessId] || 'No business')}</span>
          <span>${escapeHtml(categories[receipt.categoryId] || 'No category')} · ${toCurrency(receipt.total, settings.locale, settings.currency)}</span>
          <span class="muted">${escapeHtml(receipt.paymentMethod || 'Unknown')} · ${escapeHtml(receipt.status || 'new')}</span>
        </div>
      </button>
    `)
    .join('');
}

export function attachReceiptListHandlers(container, onSelect) {
  container.querySelectorAll('[data-id]').forEach((button) => button.addEventListener('click', () => onSelect(button.dataset.id)));
}

export function renderReceiptDetails(elements, receipt, lookups) {
  populateEditorSelects(elements.receiptForm, lookups, receipt);
  if (!receipt) {
    elements.viewerStage.classList.add('empty');
    elements.viewerStage.innerHTML = '<p>Select a receipt to preview it.</p>';
    elements.receiptForm.reset();
    elements.ocrConfidence.textContent = '—';
    elements.extractionConfidence.textContent = '—';
    elements.duplicateStatus.textContent = '—';
    return;
  }
  elements.viewerStage.classList.remove('empty');
  elements.viewerStage.innerHTML = `<img alt="Receipt preview" src="${receipt.previewDataUrl}" />`;
  const form = elements.receiptForm;
  form.elements.merchantName.value = receipt.merchantName ?? '';
  form.elements.abn.value = receipt.abn ?? '';
  form.elements.dateTime.value = toDateTimeInput(receipt.dateTime);
  form.elements.total.value = receipt.total ?? '';
  form.elements.gst.value = receipt.gst ?? '';
  form.elements.paymentMethod.value = receipt.paymentMethod ?? 'Unknown';
  form.elements.financialYear.value = receipt.financialYear ?? '';
  form.elements.businessId.value = receipt.businessId ?? '';
  form.elements.categoryId.value = receipt.categoryId ?? '';
  form.elements.status.value = receipt.status ?? 'new';
  form.elements.tags.value = (receipt.tags ?? []).join(', ');
  form.elements.notes.value = receipt.notes ?? '';
  form.elements.ocrText.value = receipt.ocrText ?? '';
  elements.ocrConfidence.textContent = `${receipt.ocrConfidence ?? 0}%`;
  elements.extractionConfidence.textContent = `${receipt.extractionConfidence ?? 0}%`;
  elements.duplicateStatus.textContent = receipt.duplicateOf ? `Duplicate of ${receipt.duplicateOf}` : 'No duplicate detected';
}

export function updateViewerTransform(elements, zoom, rotation) {
  const media = elements.viewerStage.querySelector('img');
  if (!media) return;
  media.style.transform = `scale(${zoom}) rotate(${rotation}deg)`;
}

export function updateStats(elements, receipts, lookups, settings) {
  const totalSpend = receipts.reduce((sum, receipt) => sum + Number(receipt.total || 0), 0);
  const totalGst = receipts.reduce((sum, receipt) => sum + Number(receipt.gst || 0), 0);
  const duplicates = receipts.filter((receipt) => receipt.duplicateOf).length;
  elements.statTotalReceipts.textContent = String(receipts.length);
  elements.statTotalSpend.textContent = toCurrency(totalSpend, settings.locale, settings.currency);
  elements.statTotalGst.textContent = toCurrency(totalGst, settings.locale, settings.currency);
  elements.statDuplicates.textContent = String(duplicates);

  const categoryMap = buildLookupMap(lookups.categories);
  const categoryTotals = receipts.reduce((accumulator, receipt) => {
    const key = categoryMap[receipt.categoryId] ?? 'Uncategorised';
    accumulator[key] = (accumulator[key] ?? 0) + Number(receipt.total || 0);
    return accumulator;
  }, {});
  const yearCounts = receipts.reduce((accumulator, receipt) => {
    const key = receipt.financialYear ?? 'Unknown';
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});

  const categoryEntries = Object.entries(categoryTotals);
  const yearEntries = Object.entries(yearCounts).sort((left, right) => left[0].localeCompare(right[0]));

  renderChart(elements.categoryChart, 'doughnut', {
    labels: categoryEntries.map(([label]) => label),
    datasets: [{
      label: 'Spend',
      data: categoryEntries.map(([, value]) => Number(value.toFixed(2))),
      backgroundColor: ['#2563eb', '#14b8a6', '#f59e0b', '#f43f5e', '#8b5cf6', '#0f766e'],
    }],
  });

  renderChart(elements.yearChart, 'bar', {
    labels: yearEntries.map(([label]) => label),
    datasets: [{
      label: 'Receipts',
      data: yearEntries.map(([, value]) => value),
      backgroundColor: '#2563eb',
      borderRadius: 12,
    }],
  });
}

function renderChart(canvas, type, data) {
  if (!globalThis.Chart || !canvas) return;
  const current = canvas.__chartInstance;
  if (current) current.destroy();
  canvas.__chartInstance = new globalThis.Chart(canvas, {
    type,
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
      },
      scales: type === 'bar' ? {
        y: { beginAtZero: true, ticks: { precision: 0 } },
      } : undefined,
    },
  });
}

export function populateSettingsForm(form, settings, installPromptReady) {
  form.elements.currency.value = settings.currency ?? 'AUD';
  form.elements.locale.value = settings.locale ?? 'en-AU';
  form.elements.googleClientId.value = settings.googleClientId ?? '';
  form.elements.googleBackupFileName.value = settings.googleBackupFileName ?? 'receipt-backup.json';
  form.elements.googleDriveFolder.value = settings.googleDriveFolder ?? 'appDataFolder';
  document.querySelector('#install-status').value = installPromptReady ? 'Ready to install' : 'Use browser install controls if supported';
}
