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
