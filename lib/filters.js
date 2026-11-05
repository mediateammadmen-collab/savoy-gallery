import { isValid, parseISO } from "date-fns";
import { DATE_PRESETS, DEFAULT_PRESET } from "./config.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value) {
  return typeof value === "string" && ISO_DATE.test(value) && isValid(parseISO(value));
}

// Turns raw URL params into a valid filter. Anything malformed falls back to the default.
export function parseFilters(params = {}) {
  const { range, start, end } = params;
  if (range === "custom" && isIsoDate(start) && isIsoDate(end) && start <= end) {
    return { range: "custom", start, end };
  }
  if (DATE_PRESETS.some((preset) => preset.id === range)) {
    return { range };
  }
  return { range: DEFAULT_PRESET };
}

export function filtersToQuery(filters) {
  const query = new URLSearchParams({ range: filters.range });
  if (filters.range === "custom") {
    query.set("start", filters.start);
    query.set("end", filters.end);
  }
  return query.toString();
}

export function metaPresetFor(rangeId) {
  return DATE_PRESETS.find((preset) => preset.id === rangeId)?.metaPreset ?? null;
}
