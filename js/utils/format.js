export function formatAudCents(cents = 0, locale = 'en-AU') {
  const amount = Number(cents || 0) / 100;
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'AUD' }).format(amount);
}

export function formatAbn(value = '') {
  const digits = String(value).replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 8), digits.slice(8, 11)].filter(Boolean).join(' ');
}
