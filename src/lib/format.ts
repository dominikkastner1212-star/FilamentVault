export const currencyFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2
});

export const numberFormatter = new Intl.NumberFormat('de-DE', {
  maximumFractionDigits: 0
});

export const decimalFormatter = new Intl.NumberFormat('de-DE', {
  maximumFractionDigits: 1
});

export function formatCurrency(value: number) {
  return currencyFormatter.format(value || 0);
}

export function formatGrams(value: number) {
  return `${numberFormatter.format(Math.max(0, value || 0))} g`;
}

export function formatKg(value: number) {
  return `${decimalFormatter.format((value || 0) / 1000)} kg`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

export function displayName(profile?: { full_name: string | null; email: string | null } | null) {
  return profile?.full_name || profile?.email || 'Unbekannt';
}
