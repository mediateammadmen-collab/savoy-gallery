import { format as formatDate, parseISO } from "date-fns";

const DASH = "—";
const isMissing = (value) => value === null || value === undefined || !Number.isFinite(value);

export function formatMoney(value, currency = "USD") {
  if (isMissing(value)) return DASH;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

// Below one cent, show 2 significant figures instead of "$0.00".
export function formatCostPer(value, currency = "USD") {
  if (isMissing(value)) return DASH;
  if (value > 0 && value < 0.01) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumSignificantDigits: 2,
    }).format(value);
  }
  return formatMoney(value, currency);
}

export function formatCount(value) {
  if (isMissing(value)) return DASH;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function formatCompact(value) {
  if (isMissing(value)) return DASH;
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value) {
  if (isMissing(value)) return DASH;
  return `${value.toFixed(2)}%`;
}

export function formatRatio(value) {
  if (isMissing(value)) return DASH;
  return value.toFixed(2);
}

export function formatDay(isoDate) {
  if (!isoDate) return DASH;
  return formatDate(parseISO(isoDate.slice(0, 10)), "d MMM yyyy");
}

export function formatDayRange(since, until) {
  if (!since || !until) return null;
  if (since === until) return formatDay(since);
  return `${formatDay(since)} – ${formatDay(until)}`;
}
