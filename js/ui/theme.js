const KEY = 'receipt-platform-theme';

export function getStoredTheme() {
  return localStorage.getItem(KEY) || 'light';
}

export function applyTheme(theme = 'light') {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function initTheme() {
  const current = getStoredTheme();
  applyTheme(current);

  const toggle = document.querySelector('#theme-toggle');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(KEY, next);
  });
}
