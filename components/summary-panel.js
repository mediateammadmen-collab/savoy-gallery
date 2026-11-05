import { DATE_PRESETS } from "@/lib/config";
import {
  formatCompact,
  formatCount,
  formatDayRange,
  formatMoney,
  formatPercent,
  formatRatio,
} from "@/lib/format";

function Headline({ label, value, exact, lead = false, wide = false }) {
  return (
    <div className={`bg-wall p-6 sm:p-7 ${lead || wide ? "col-span-2 lg:col-span-1" : ""}`}>
      <dt className="eyebrow">{label}</dt>
      <dd
        title={exact}
        className={`mt-3 font-medium leading-none tracking-tight ${
          lead ? "text-5xl text-accent sm:text-6xl" : "text-4xl sm:text-[2.75rem]"
        }`}
      >
        {value}
      </dd>
      {exact && <dd className="mt-2 text-xs tabular-nums text-ink-3">{exact}</dd>}
    </div>
  );
}

function Ledger({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-rule py-3">
      <dt className="text-[13px] text-ink-2">{label}</dt>
      <dd className="text-[15px] font-medium tabular-nums">{value}</dd>
    </div>
  );
}

export function SummaryPanel({ data }) {
  const { metrics: m, currency, brand, market, range, filters } = data;
  const presetLabel =
    filters.range === "custom"
      ? "Custom range"
      : DATE_PRESETS.find((preset) => preset.id === filters.range)?.label;
  const dates = formatDayRange(range.since, range.until);

  const secondary = [
    ["Frequency", formatRatio(m.frequency)],
    ["Engagement rate", formatPercent(m.engagementRate)],
    ["Post interactions", formatCount(m.interactions)],
    ["Interaction rate", formatPercent(m.interactionRate)],
    ["Link clicks", formatCount(m.linkClicks)],
    ["CTR", formatPercent(m.ctr)],
    ["CPM", formatMoney(m.cpm, currency)],
    ...(m.pageLikes > 0 ? [["Page likes", formatCount(m.pageLikes)]] : []),
    ...(m.postReactions > 0 ? [["Post reactions", formatCount(m.postReactions)]] : []),
    ...(m.comments > 0 ? [["Comments", formatCount(m.comments)]] : []),
    ...(m.profileVisits > 0 ? [["Profile visits", formatCount(m.profileVisits)]] : []),
  ];

  return (
    <section aria-labelledby="summary-heading">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
        <div>
          <p className="eyebrow">
            Meta Ads · {market}
          </p>
          <h1 id="summary-heading" className="mt-2 font-display text-5xl leading-none sm:text-6xl">
            {brand}
          </h1>
        </div>
        <p className="text-sm text-ink-2">
          {presetLabel}
          {dates && <span className="text-ink-3"> · {dates}</span>}
        </p>
      </div>

      <dl className="mt-7 grid grid-cols-2 gap-px border border-rule bg-rule shadow-frame lg:grid-cols-4">
        <Headline lead label="Spend" value={formatMoney(m.spend, currency)} />
        <Headline label="Unique reach" value={formatCompact(m.reach)} exact={formatCount(m.reach)} />
        <Headline
          label="Impressions"
          value={formatCompact(m.impressions)}
          exact={formatCount(m.impressions)}
        />
        <Headline
          wide
          label="Engagements"
          value={formatCompact(m.engagements)}
          exact={formatCount(m.engagements)}
        />
      </dl>

      <dl className="mt-6 grid grid-cols-1 gap-x-10 sm:grid-cols-2 lg:grid-cols-4">
        {secondary.map(([label, value]) => (
          <Ledger key={label} label={label} value={value} />
        ))}
      </dl>
    </section>
  );
}
