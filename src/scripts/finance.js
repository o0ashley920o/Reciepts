export function getFinancialYearLabel(dateInput) {
  const date = new Date(dateInput || Date.now());
  if (Number.isNaN(date.getTime())) {
    return getFinancialYearLabel(new Date().toISOString());
  }
  const year = date.getUTCMonth() >= 6 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
  return `${year}-${String(year + 1).slice(-2)}`;
}

export function listFinancialYears(anchorDate = new Date(), span = 6) {
  const current = new Date(anchorDate);
  const baseYear = current.getUTCMonth() >= 6 ? current.getUTCFullYear() : current.getUTCFullYear() - 1;
  return Array.from({ length: span }, (_, offset) => {
    const year = baseYear - offset;
    return `${year}-${String(year + 1).slice(-2)}`;
  });
}

export function getCurrentFY() {
  return getFinancialYearLabel(new Date().toISOString());
}

export function getFYRange(fy) {
  if (!fy || !/^\d{4}-\d{2}$/.test(fy)) return null;
  const startYear = Number(fy.split('-')[0]);
  return {
    start: new Date(Date.UTC(startYear, 6, 1)),
    end: new Date(Date.UTC(startYear + 1, 5, 30, 23, 59, 59, 999)),
  };
}

export function isInFY(dateInput, fy) {
  const range = getFYRange(fy);
  if (!range) return false;
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return false;
  return date >= range.start && date <= range.end;
}
