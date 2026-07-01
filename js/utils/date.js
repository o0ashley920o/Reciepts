function toDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toIso8601(value = new Date()) {
  const date = toDate(value);
  return date ? date.toISOString() : '';
}

export function toDateInput(value) {
  const date = toDate(value);
  return date ? date.toISOString().slice(0, 10) : '';
}

export function toDateTimeInput(value) {
  const date = toDate(value);
  if (!date) return '';
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDisplayDate(value, locale = 'en-AU') {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date) : '';
}

export function formatDisplayDateTime(value, locale = 'en-AU') {
  const date = toDate(value);
  return date
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    : '';
}
