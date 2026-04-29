export function formatCurrency(
  amount: number | string,
  currency = "KES"
): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatChallengeFormat(format: string, short = false): string {
  if (format === "BEST_OF_1") return short ? "Bo1" : "Best of 1";
  if (format === "BEST_OF_3") return short ? "Bo3" : "Best of 3";
  return short ? "Bo5" : "Best of 5";
}

export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}
