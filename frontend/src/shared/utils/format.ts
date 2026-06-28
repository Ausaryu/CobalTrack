export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits }).format(value);
}
