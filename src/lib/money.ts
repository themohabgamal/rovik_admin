/** Shared money helpers (avoid circular imports between finance/orders). */

export function roundMoney(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function formatEgp(value: number) {
  return `${new Intl.NumberFormat("en-EG", {
    maximumFractionDigits: 2,
  }).format(value)} EGP`;
}

export function formatSignedEgp(value: number) {
  if (value < 0) return `−${formatEgp(Math.abs(value))}`;
  return formatEgp(value);
}

export function formatUsd(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)} USD`;
}
