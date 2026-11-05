import "server-only";
import { BRAND, CAMPAIGN_TYPES } from "./config.js";
import { metaPresetFor } from "./filters.js";
import { formatDay } from "./format.js";
import { fetchAdDetails, fetchInsights, getAccount } from "./meta.js";
import { parseAdName } from "./ad-name.js";
import {
  RESULT_BY_TYPE,
  campaignTypeOf,
  deriveMetrics,
  rowToCounts,
  sumSpend,
} from "./metrics.js";

const COUNT_FIELDS = ["spend", "impressions", "reach", "clicks", "actions"];
const BRAND_FILTER = [
  { field: "campaign.name", operator: "CONTAIN", value: BRAND.campaignKeyword },
];

// Ad-level insights leave out deleted and archived ads unless asked. They still spent
// money, so without this the cards wouldn't add up to the summary.
const ALL_AD_STATUSES = {
  field: "ad.effective_status",
  operator: "IN",
  value: [
    "ACTIVE",
    "PAUSED",
    "DELETED",
    "ARCHIVED",
    "CAMPAIGN_PAUSED",
    "ADSET_PAUSED",
    "IN_PROCESS",
    "WITH_ISSUES",
    "PENDING_REVIEW",
    "DISAPPROVED",
    "PREAPPROVED",
    "PENDING_BILLING_INFO",
  ],
};

function toMetaRange(filters) {
  return filters.range === "custom"
    ? { since: filters.start, until: filters.end }
    : { metaPreset: metaPresetFor(filters.range) };
}

// Headline numbers come from account-level insights filtered by campaign name,
// so Meta keeps reach de-duplicated. Reach is never summed here.
export async function getSummary(filters) {
  const [account, rows] = await Promise.all([
    getAccount(),
    fetchInsights({
      level: "account",
      range: toMetaRange(filters),
      fields: [...COUNT_FIELDS, "date_start", "date_stop"],
      filtering: BRAND_FILTER,
    }),
  ]);
  const row = rows[0];
  return {
    brand: BRAND.name,
    market: BRAND.market,
    currency: account.currency,
    filters,
    range: {
      since: row?.date_start ?? filters.start ?? null,
      until: row?.date_stop ?? filters.end ?? null,
    },
    metrics: deriveMetrics(rowToCounts(row)),
  };
}

function toAd(row, details) {
  const name = details?.name ?? row.ad_name ?? "";
  const { format, title } = parseAdName(name);
  const campaignType = campaignTypeOf(row.campaign_name);
  const metrics = deriveMetrics(rowToCounts(row));
  const result = RESULT_BY_TYPE[campaignType];
  return {
    id: row.ad_id,
    name,
    title,
    format,
    isVideo: details?.isVideo ?? false,
    status: details?.effectiveStatus ?? null,
    image: details?.image ?? null,
    videoSource: details?.videoSource ?? null,
    campaignName: row.campaign_name,
    campaignId: row.campaign_id,
    campaignType,
    objective: row.objective ?? null,
    adsetName: details?.adsetName ?? null,
    adsetStart: details?.adsetStart ? formatDay(details.adsetStart) : null,
    adsetEnd: details?.adsetEnd ? formatDay(details.adsetEnd) : null,
    result: { label: result.label, value: metrics[result.key] },
    metrics,
  };
}

// A Reach group's result can't be added up from its ads, because one person seen by
// two ads would count twice. Ask Meta for it across exactly that group's campaigns.
async function fetchDedupedReach(ads, filters) {
  const campaignIds = [...new Set(ads.map((ad) => ad.campaignId))];
  if (!campaignIds.length) return 0;
  const rows = await fetchInsights({
    level: "account",
    range: toMetaRange(filters),
    fields: ["reach"],
    filtering: [{ field: "campaign.id", operator: "IN", value: campaignIds }],
  });
  return Number(rows[0]?.reach ?? 0);
}

function sumResult(ads) {
  return ads.reduce((sum, ad) => sum + (ad.result.value ?? 0), 0);
}

export async function getCreatives(filters) {
  const [account, rows] = await Promise.all([
    getAccount(),
    fetchInsights({
      level: "ad",
      range: toMetaRange(filters),
      fields: ["ad_id", "ad_name", "campaign_id", "campaign_name", "objective", ...COUNT_FIELDS],
      filtering: [...BRAND_FILTER, ALL_AD_STATUSES],
    }),
  ]);

  const details = await fetchAdDetails(rows.map((row) => row.ad_id));
  const ads = rows
    .map((row) => toAd(row, details.get(row.ad_id)))
    .sort((a, b) => b.metrics.spend - a.metrics.spend);

  const groups = await Promise.all(
    CAMPAIGN_TYPES.map(async (type) => {
      const groupAds = ads.filter((ad) => ad.campaignType === type);
      if (!groupAds.length) return null;
      return {
        type,
        count: groupAds.length,
        spend: sumSpend(groupAds.map((ad) => ad.metrics)),
        resultLabel: RESULT_BY_TYPE[type].label,
        resultValue:
          type === "Reach" ? await fetchDedupedReach(groupAds, filters) : sumResult(groupAds),
        adIds: groupAds.map((ad) => ad.id),
      };
    }),
  );

  const topContent = ads
    .filter((ad) => ad.campaignType === "Engagement" && ad.metrics.costPerEngagement !== null)
    .sort((a, b) => a.metrics.costPerEngagement - b.metrics.costPerEngagement)
    .slice(0, 3);

  return {
    currency: account.currency,
    filters,
    totalSpend: sumSpend(ads.map((ad) => ad.metrics)),
    ads,
    groups: groups.filter(Boolean),
    topContent: {
      count: topContent.length,
      spend: sumSpend(topContent.map((ad) => ad.metrics)),
      resultLabel: "Engagements",
      resultValue: sumResult(topContent),
      adIds: topContent.map((ad) => ad.id),
    },
  };
}
