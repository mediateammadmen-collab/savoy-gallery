// Pure metric functions. Raw counts are summed first and only then divided;
// per-row rates are never averaged.

const num = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

// Returns null (shown as "—") rather than Infinity or NaN when the denominator is 0.
export function safeDivide(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : null;
}

export function actionValue(actions, ...types) {
  if (!Array.isArray(actions)) return 0;
  return actions.reduce(
    (sum, action) => (types.includes(action.action_type) ? sum + num(action.value) : sum),
    0,
  );
}

// No "profile visit" action has been seen on this account yet. These are the
// candidate action types; the metric stays hidden while they total 0.
const PROFILE_VISIT_ACTIONS = ["onsite_conversion.ig_profile_visit", "ig_profile_visit"];

// Raw additive counts from one Meta insights row. Reach is carried along for
// that row only: it must never be summed across campaigns or ads.
export function rowToCounts(row = {}) {
  const actions = row.actions;
  return {
    spend: num(row.spend),
    impressions: num(row.impressions),
    reach: num(row.reach),
    clicks: num(row.clicks),
    engagements: actionValue(actions, "post_engagement"),
    postReactions: actionValue(actions, "post_reaction"),
    comments: actionValue(actions, "comment"),
    shares: actionValue(actions, "post"),
    saves: actionValue(actions, "onsite_conversion.post_save"),
    linkClicks: actionValue(actions, "link_click"),
    pageLikes: actionValue(actions, "like"),
    profileVisits: actionValue(actions, ...PROFILE_VISIT_ACTIONS),
    videoViews: actionValue(actions, "video_view"),
  };
}

export function deriveMetrics(counts) {
  const interactions = counts.postReactions + counts.comments + counts.shares + counts.saves;
  const percent = (a, b) => {
    const ratio = safeDivide(a, b);
    return ratio === null ? null : ratio * 100;
  };
  const cpmRatio = safeDivide(counts.spend, counts.impressions);
  return {
    ...counts,
    interactions,
    engagementRate: percent(counts.engagements, counts.impressions),
    interactionRate: percent(interactions, counts.reach),
    ctr: percent(counts.clicks, counts.impressions),
    cpm: cpmRatio === null ? null : cpmRatio * 1000,
    cpc: safeDivide(counts.spend, counts.clicks),
    frequency: safeDivide(counts.impressions, counts.reach),
    costPerEngagement: safeDivide(counts.spend, counts.engagements),
  };
}

// Sums money in whole cents so long lists don't pick up floating point drift.
export function sumSpend(items) {
  const cents = items.reduce((sum, item) => sum + Math.round(item.spend * 100), 0);
  return cents / 100;
}

// Campaign type is the keyword that appears earliest in the campaign name.
const TYPE_PATTERNS = [
  ["Reach", /\breach\b/i],
  ["Engagement", /\bengagements?\b/i],
  ["Traffic", /\btraffic\b/i],
  ["Page Visit", /\bpage[\s_-]*visits?\b/i],
  ["Page Like", /\bpage[\s_-]*likes?\b/i],
];

export function campaignTypeOf(campaignName = "") {
  let best = { type: "Other", index: Infinity };
  for (const [type, pattern] of TYPE_PATTERNS) {
    const index = campaignName.search(pattern);
    if (index !== -1 && index < best.index) best = { type, index };
  }
  return best.type;
}

// The headline result for each campaign type.
export const RESULT_BY_TYPE = {
  Reach: { label: "Reach", key: "reach" },
  Engagement: { label: "Engagements", key: "engagements" },
  Traffic: { label: "Link clicks", key: "linkClicks" },
  "Page Visit": { label: "Profile visits", key: "profileVisits" },
  "Page Like": { label: "Page likes", key: "pageLikes" },
  Other: { label: "Engagements", key: "engagements" },
};
