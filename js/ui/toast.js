let timeoutId;

export function showToast(message, tone = 'info') {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = String(message || '');
  toast.dataset.tone = tone;
  toast.classList.add('visible');
  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => toast.classList.remove('visible'), 4000);
}
