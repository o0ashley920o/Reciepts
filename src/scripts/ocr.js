import { getFinancialYearLabel } from './finance.js';
import { blobToDataUrl, createThumbnailDataUrl, fileToArrayBuffer, normaliseText } from './utils.js';

let pdfjsPromise;
let opencvPromise;
let tesseractWorkerPromise;

export async function ensurePdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('../vendor/pdf.min.mjs').then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = './src/vendor/pdf.worker.min.mjs';
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

export async function ensureOpenCv() {
  if (globalThis.cv?.Mat) return globalThis.cv;
  if (!opencvPromise) {
    opencvPromise = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => reject(new Error('OpenCV failed to initialise.')), 15000);
      const poll = () => {
        if (globalThis.cv?.Mat) {
          clearTimeout(timeoutId);
          resolve(globalThis.cv);
          return;
        }
        if (globalThis.cv && typeof globalThis.cv === 'object') {
          globalThis.cv.onRuntimeInitialized = () => {
            clearTimeout(timeoutId);
            resolve(globalThis.cv);
          };
        }
        setTimeout(poll, 150);
      };
      poll();
    });
  }
  return opencvPromise;
}

export async function normaliseUploadFile(file) {
  const extension = (file.name.split('.').pop() || '').toLowerCase();
  if (file.type.includes('heic') || file.type.includes('heif') || ['heic', 'heif'].includes(extension)) {
    if (!globalThis.heic2any) {
      throw new Error('HEIC conversion library is unavailable.');
    }
    const converted = await globalThis.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
    const output = Array.isArray(converted) ? converted[0] : converted;
    return new File([output], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg', lastModified: file.lastModified });
  }
  return file;
}

async function canvasFromImageBlob(blob) {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas;
}

async function canvasFromPdf(file) {
  const pdfjs = await ensurePdfJs();
  const pdf = await pdfjs.getDocument({ data: await fileToArrayBuffer(file) }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext('2d');
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
}

export async function preprocessCanvas(sourceCanvas) {
  try {
    const cv = await ensureOpenCv();
    const mat = cv.imread(sourceCanvas);
    const gray = new cv.Mat();
    const blur = new cv.Mat();
    const thresh = new cv.Mat();
    cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.GaussianBlur(gray, blur, new cv.Size(3, 3), 0, 0, cv.BORDER_DEFAULT);
    cv.adaptiveThreshold(blur, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 31, 12);
    const output = document.createElement('canvas');
    cv.imshow(output, thresh);
    mat.delete();
    gray.delete();
    blur.delete();
    thresh.delete();
    return output;
  } catch {
    return sourceCanvas;
  }
}

export async function buildPreviewAsset(file) {
  const canvas = file.type === 'application/pdf' ? await canvasFromPdf(file) : await canvasFromImageBlob(file);
  const processedCanvas = await preprocessCanvas(canvas);
  const previewBlob = await new Promise((resolve) => processedCanvas.toBlob(resolve, 'image/jpeg', 0.92));
  const thumbnailDataUrl = await createThumbnailDataUrl(previewBlob ?? file);
  return {
    canvas: processedCanvas,
    previewBlob: previewBlob ?? file,
    thumbnailDataUrl,
  };
}

export async function runOcr(source) {
  if (!globalThis.Tesseract) {
    throw new Error('Tesseract.js is unavailable.');
  }
  if (!tesseractWorkerPromise) {
    tesseractWorkerPromise = globalThis.Tesseract.createWorker('eng', 1, {
      workerPath: './src/vendor/worker.min.js',
      corePath: './src/vendor/tesseract-core/tesseract-core-simd-lstm.js',
      langPath: './src/vendor/tessdata/4.0.0',
    });
  }
  const worker = await tesseractWorkerPromise;
  const result = await worker.recognize(source);
  return {
    text: result.data.text ?? '',
    confidence: Number(result.data.confidence ?? 0),
  };
}

function parseAmount(line) {
  const matches = [...line.matchAll(/(\d+[\d,]*\.\d{2})/g)].map((match) => Number(match[1].replaceAll(',', '')));
  return matches.length ? Math.max(...matches) : null;
}

function parseDate(text) {
  const match = text.match(/(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})(?:\s+|\s*T?)(\d{1,2}:\d{2}(?:\s?[APMapm]{2})?)?/);
  if (!match) return '';
  const [day, month, yearRaw] = match[1].split(/[\/.-]/).map((value) => value.trim());
  const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
  const time = match[2] ? ` ${match[2].toUpperCase()}` : ' 12:00';
  const iso = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}${time}`);
  return Number.isNaN(iso.getTime()) ? '' : iso.toISOString();
}

export function extractReceiptFields(text, fallbackDate = new Date().toISOString()) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => normaliseText(line))
    .filter(Boolean);
  const joined = lines.join(' | ');
  const merchantName = lines.find((line) => /[a-z]/i.test(line) && !/tax invoice|receipt|abn/i.test(line)) ?? lines[0] ?? 'Unknown merchant';
  const abnMatch = joined.match(/ABN\D{0,4}(\d{2}\s?\d{3}\s?\d{3}\s?\d{3})/i) || joined.match(/(\d{2}\s?\d{3}\s?\d{3}\s?\d{3})/);
  const paymentMatch = joined.match(/(cash|visa|mastercard|master card|amex|american express|eftpos|apple pay|google pay|paypal|bank transfer|card)/i);
  const totalCandidates = lines
    .filter((line) => /(total|amount due|balance due|eftpos|visa|mastercard|master card|subtotal|sale)/i.test(line))
    .map(parseAmount)
    .filter((value) => Number.isFinite(value));
  const allCandidates = lines.map(parseAmount).filter((value) => Number.isFinite(value));
  const total = totalCandidates[0] ?? Math.max(0, ...allCandidates, 0);
  const gstLine = lines.find((line) => /\bgst\b/i.test(line));
  const gst = parseAmount(gstLine || '') ?? (total ? Number((total / 11).toFixed(2)) : 0);
  const dateTime = parseDate(joined) || fallbackDate;
  const coverage = [merchantName, abnMatch?.[1], dateTime, gst, total, paymentMatch?.[1]].filter(Boolean).length;
  return {
    merchantName,
    abn: abnMatch?.[1] ? abnMatch[1].replace(/\s+/g, ' ') : '',
    dateTime,
    gst,
    total,
    paymentMethod: paymentMatch?.[1] ? paymentMatch[1].replace(/\b\w/g, (character) => character.toUpperCase()) : 'Unknown',
    financialYear: getFinancialYearLabel(dateTime),
    extractionConfidence: Math.round((coverage / 6) * 100),
  };
}

export async function analyseReceiptFile(file) {
  const preparedFile = await normaliseUploadFile(file);
  const previewAsset = await buildPreviewAsset(preparedFile);
  const ocrResult = await runOcr(previewAsset.canvas);
  const extracted = extractReceiptFields(ocrResult.text, new Date(preparedFile.lastModified || Date.now()).toISOString());
  return {
    file: preparedFile,
    previewBlob: previewAsset.previewBlob,
    previewDataUrl: await blobToDataUrl(previewAsset.previewBlob),
    thumbnailDataUrl: previewAsset.thumbnailDataUrl,
    ocrText: ocrResult.text,
    ocrConfidence: Math.round(ocrResult.confidence),
    ...extracted,
  };
}
