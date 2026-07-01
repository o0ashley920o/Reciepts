const CACHE_NAME = 'receipt-platform-cache-v2';
const APP_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './src/styles/main.css',
  './src/assets/icon.svg',
  './src/vendor/localforage.min.js',
  './src/vendor/chart.umd.js',
  './src/vendor/tesseract.min.js',
  './src/vendor/worker.min.js',
  './src/vendor/heic2any.min.js',
  './src/vendor/opencv.js',
  './src/vendor/jszip.min.js',
  './src/vendor/write-excel-file.min.js',
  './src/vendor/pdf.min.mjs',
  './src/vendor/pdf.worker.min.mjs',
  './src/vendor/tesseract-core/tesseract-core-simd-lstm.js',
  './src/vendor/tesseract-core/tesseract-core-simd-lstm.wasm',
  './src/vendor/tesseract-core/tesseract-core-simd-lstm.wasm.js',
  './src/vendor/tessdata/4.0.0/eng.traineddata.gz',
  './src/scripts/app.js',
  './src/scripts/constants.js',
  './src/scripts/auth.js',
  './src/scripts/utils.js',
  './src/scripts/finance.js',
  './src/scripts/storage.js',
  './src/scripts/ocr.js',
  './src/scripts/exports.js',
  './src/scripts/drive.js',
  './src/scripts/ui.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES.map((file) => new Request(file, { mode: 'no-cors' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (new URL(event.request.url).pathname.startsWith('/api/')) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
