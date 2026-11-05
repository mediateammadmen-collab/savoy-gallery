// The one place that says whose data this dashboard shows.
// The ad account is shared with other brands, so every insights query is
// scoped to campaigns whose name contains this keyword.
export const BRAND = {
  name: "Savoy Gallery",
  market: "Bangladesh",
  campaignKeyword: "savoy gallery",
};

export const CAMPAIGN_TYPES = [
  "Reach",
  "Engagement",
  "Traffic",
  "Page Visit",
  "Page Like",
  "Other",
];

export const DATE_PRESETS = [
  { id: "today", label: "Today", metaPreset: "today" },
  { id: "yesterday", label: "Yesterday", metaPreset: "yesterday" },
  { id: "last_7", label: "7 days", metaPreset: "last_7d" },
  { id: "last_14", label: "14 days", metaPreset: "last_14d" },
  { id: "last_30", label: "30 days", metaPreset: "last_30d" },
  { id: "last_90", label: "90 days", metaPreset: "last_90d" },
  { id: "this_month", label: "This month", metaPreset: "this_month" },
  { id: "last_month", label: "Last month", metaPreset: "last_month" },
  { id: "lifetime", label: "Lifetime", metaPreset: "maximum" },
];

export const DEFAULT_PRESET = "last_14";
