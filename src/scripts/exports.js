import { exportBackupSnapshot, getLookups, getReceiptFile } from './storage.js';
import { blobToDataUrl, buildLookupMap, downloadBlob, downloadText, makeReceiptFileName } from './utils.js';

function getExportRows(receipts, lookups) {
  const businesses = buildLookupMap(lookups.businesses);
  const categories = buildLookupMap(lookups.categories);
  return receipts.map((receipt) => ({
    id: receipt.id,
    merchantName: receipt.merchantName,
    abn: receipt.abn,
    dateTime: receipt.dateTime,
    total: receipt.total,
    gst: receipt.gst,
    paymentMethod: receipt.paymentMethod,
    financialYear: receipt.financialYear,
    business: businesses[receipt.businessId] ?? '',
    category: categories[receipt.categoryId] ?? '',
    status: receipt.status,
    notes: receipt.notes,
    tags: (receipt.tags ?? []).join(', '),
    ocrConfidence: receipt.ocrConfidence,
    extractionConfidence: receipt.extractionConfidence,
    duplicateOf: receipt.duplicateOf ?? '',
  }));
}

export async function exportCsv(receipts) {
  const lookups = await getLookups();
  const rows = getExportRows(receipts, lookups);
  const headers = Object.keys(rows[0] ?? { id: '', merchantName: '' });
  const csv = [headers.join(',')]
    .concat(
      rows.map((row) =>
        headers
          .map((header) => `"${String(row[header] ?? '').replaceAll('"', '""')}"`)
          .join(','),
      ),
    )
    .join('\n');
  downloadText(csv, 'receipts-export.csv', 'text/csv;charset=utf-8');
}

export async function exportWorkbook(receipts) {
  if (!globalThis.writeXlsxFile) {
    throw new Error('Excel export library is unavailable.');
  }
  const lookups = await getLookups();
  const rows = getExportRows(receipts, lookups);
  const headers = Object.keys(rows[0] ?? { id: '', merchantName: '' });
  const data = [
    headers.map((header) => ({ value: header, fontWeight: 'bold' })),
    ...rows.map((row) => headers.map((header) => ({ value: row[header] ?? '' }))),
  ];
  await globalThis.writeXlsxFile(data, { fileName: 'receipts-export.xlsx' });
}

async function serialiseBackup(snapshot) {
  const entries = await Promise.all(
    Object.entries(snapshot.files).map(async ([receiptId, payload]) => [
      receiptId,
      payload
        ? {
            sourceBlob: payload.sourceBlob ? await blobToDataUrl(payload.sourceBlob) : '',
            previewBlob: payload.previewBlob ? await blobToDataUrl(payload.previewBlob) : '',
          }
        : null,
    ]),
  );
  return {
    ...snapshot,
    files: Object.fromEntries(entries),
  };
}

export async function exportBackupJson() {
  const serialised = await serialiseBackup(await exportBackupSnapshot());
  downloadText(JSON.stringify(serialised, null, 2), 'receipts-backup.json', 'application/json;charset=utf-8');
  return serialised;
}

export async function exportReceiptZip(receipts) {
  if (!globalThis.JSZip) {
    throw new Error('ZIP export library is unavailable.');
  }
  const lookups = await getLookups();
  const businesses = buildLookupMap(lookups.businesses);
  const zip = new globalThis.JSZip();
  for (const receipt of receipts) {
    const filePayload = await getReceiptFile(receipt.id);
    if (!filePayload?.sourceBlob) continue;
    const business = businesses[receipt.businessId] ?? 'unassigned';
    const financialYear = receipt.financialYear ?? 'unassigned-year';
    const folder = zip.folder(`${financialYear}/${business}`);
    const extension = receipt.mimeType === 'application/pdf' ? 'pdf' : 'jpg';
    folder.file(`${makeReceiptFileName(receipt)}.${extension}`, filePayload.sourceBlob);
  }
  zip.file('metadata.json', JSON.stringify(await serialiseBackup(await exportBackupSnapshot()), null, 2));
  const content = await zip.generateAsync({ type: 'blob' });
  downloadBlob(content, 'receipts-archive.zip');
}
