import { DEFAULT_BUSINESSES, DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from './constants.js';
import { apiDelete, apiGet, apiPut, isHostedMode } from './auth.js';
import { blobToDataUrl, sortByLabel } from './utils.js';
import { runMigrations } from './migrate.js';

const stores = {};

function ensureLocalForage() {
  if (!globalThis.localforage) {
    throw new Error('LocalForage is not available.');
  }
}

function createStore(name) {
  ensureLocalForage();
  if (!stores[name]) {
    stores[name] = globalThis.localforage.createInstance({
      name: 'receipt-management-platform',
      storeName: name,
      description: 'Offline receipt management data',
    });
  }
  return stores[name];
}

const receiptsStore = () => createStore('receipts');
const filesStore = () => createStore('receipt-files');
const lookupsStore = () => createStore('lookups');
const settingsStore = () => createStore('settings');
const metaStore = () => createStore('meta');

async function dataUrlToBlob(value) {
  if (!value || !String(value).startsWith('data:')) return value;
  const response = await fetch(value);
  return response.blob();
}

export async function initialiseStorage() {
  if (isHostedMode()) return;
  ensureLocalForage();
  const lookups = await lookupsStore().getItem('lookups');
  if (!lookups) {
    await lookupsStore().setItem('lookups', {
      businesses: DEFAULT_BUSINESSES,
      categories: DEFAULT_CATEGORIES,
    });
  }
  const settings = await settingsStore().getItem('settings');
  if (!settings) {
    await settingsStore().setItem('settings', DEFAULT_SETTINGS);
  }

  await runMigrations({
    getMeta: () => metaStore().getItem('meta').then((v) => v ?? {}),
    setMeta: (value) => metaStore().setItem('meta', value),
  });
}

export async function getLookups() {
  if (isHostedMode()) return apiGet('./api/lookups');
  return (await lookupsStore().getItem('lookups')) ?? {
    businesses: DEFAULT_BUSINESSES,
    categories: DEFAULT_CATEGORIES,
  };
}

export async function saveLookups(lookups) {
  if (isHostedMode()) {
    return apiPut('./api/lookups', {
      businesses: sortByLabel(lookups.businesses ?? []),
      categories: sortByLabel(lookups.categories ?? []),
    });
  }
  const normalised = {
    businesses: sortByLabel(lookups.businesses ?? []),
    categories: sortByLabel(lookups.categories ?? []),
  };
  await lookupsStore().setItem('lookups', normalised);
  return normalised;
}

export async function getSettings() {
  if (isHostedMode()) return apiGet('./api/settings');
  return { ...DEFAULT_SETTINGS, ...((await settingsStore().getItem('settings')) ?? {}) };
}

export async function saveSettings(settings) {
  if (isHostedMode()) return apiPut('./api/settings', settings);
  const merged = { ...(await getSettings()), ...settings };
  await settingsStore().setItem('settings', merged);
  return merged;
}

export async function getAllReceipts() {
  if (isHostedMode()) {
    const payload = await apiGet('./api/receipts');
    return payload.receipts ?? [];
  }
  const items = [];
  await receiptsStore().iterate((value) => items.push(value));
  return items.sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

export async function saveReceipt(receipt) {
  if (isHostedMode()) {
    const payload = await apiPut(`./api/receipts/${encodeURIComponent(receipt.id)}`, receipt);
    return payload.receipt;
  }
  await receiptsStore().setItem(receipt.id, receipt);
  return receipt;
}

export async function saveReceiptFile(receiptId, filePayload) {
  if (isHostedMode()) {
    await apiPut(`./api/receipts/${encodeURIComponent(receiptId)}/file`, {
      sourceBlob: filePayload.sourceBlob ? await blobToDataUrl(filePayload.sourceBlob) : '',
      previewBlob: filePayload.previewBlob ? await blobToDataUrl(filePayload.previewBlob) : '',
    });
    return filePayload;
  }
  await filesStore().setItem(receiptId, filePayload);
  return filePayload;
}

export async function getReceiptFile(receiptId) {
  if (isHostedMode()) {
    const payload = await apiGet(`./api/receipts/${encodeURIComponent(receiptId)}/file`);
    return {
      sourceBlob: await dataUrlToBlob(payload.sourceBlob),
      previewBlob: await dataUrlToBlob(payload.previewBlob),
    };
  }
  return filesStore().getItem(receiptId);
}

export async function deleteReceipt(receiptId) {
  if (isHostedMode()) {
    await apiDelete(`./api/receipts/${encodeURIComponent(receiptId)}`);
    return;
  }
  await receiptsStore().removeItem(receiptId);
  await filesStore().removeItem(receiptId);
}

export async function findDuplicateByFingerprint(fingerprint) {
  if (isHostedMode()) {
    const payload = await apiGet(`./api/receipts/duplicates?fingerprint=${encodeURIComponent(fingerprint)}`);
    return payload.receipt ?? null;
  }
  if (!fingerprint) return null;
  let duplicate = null;
  await receiptsStore().iterate((value) => {
    if (!duplicate && value.fingerprint === fingerprint) {
      duplicate = value;
    }
  });
  return duplicate;
}

export async function exportBackupSnapshot() {
  const receipts = await getAllReceipts();
  const files = {};
  for (const receipt of receipts) {
    files[receipt.id] = await getReceiptFile(receipt.id);
  }
  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    lookups: await getLookups(),
    settings: await getSettings(),
    receipts,
    files,
  };
}

export async function importBackupSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.receipts)) {
    throw new Error('Backup file is missing receipt data.');
  }
  await saveLookups(snapshot.lookups ?? { businesses: DEFAULT_BUSINESSES, categories: DEFAULT_CATEGORIES });
  await saveSettings(snapshot.settings ?? DEFAULT_SETTINGS);
  for (const receipt of snapshot.receipts) {
    await saveReceipt(receipt);
    if (snapshot.files?.[receipt.id]) {
      const filePayload = snapshot.files[receipt.id];
      const sourceBlob = await dataUrlToBlob(filePayload.sourceBlob);
      const previewBlob = await dataUrlToBlob(filePayload.previewBlob);
      await saveReceiptFile(receipt.id, {
        sourceBlob,
        previewBlob,
      });
    }
  }
}
