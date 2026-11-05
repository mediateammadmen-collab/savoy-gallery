"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ImageOff, Play, X } from "lucide-react";
import { Dialog, Tabs } from "radix-ui";
import {
  formatCompact,
  formatCostPer,
  formatCount,
  formatMoney,
  formatPercent,
  formatRatio,
} from "@/lib/format";

const PAGE_SIZE = 48;

const STATUS = {
  ACTIVE: { label: "Active", tone: "good" },
  PAUSED: { label: "Paused", tone: "muted" },
  CAMPAIGN_PAUSED: { label: "Campaign paused", tone: "muted" },
  ADSET_PAUSED: { label: "Ad set paused", tone: "muted" },
  ARCHIVED: { label: "Archived", tone: "muted" },
  DELETED: { label: "Deleted", tone: "muted" },
  IN_PROCESS: { label: "Processing", tone: "warn" },
  PENDING_REVIEW: { label: "In review", tone: "warn" },
  PENDING_BILLING_INFO: { label: "Billing pending", tone: "warn" },
  PREAPPROVED: { label: "Pre-approved", tone: "warn" },
  WITH_ISSUES: { label: "With issues", tone: "warn" },
  DISAPPROVED: { label: "Disapproved", tone: "warn" },
};

const TONE = {
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  muted: "bg-muted-soft text-ink-2",
};

const OBJECTIVES = {
  OUTCOME_AWARENESS: "Awareness",
  OUTCOME_ENGAGEMENT: "Engagement",
  OUTCOME_TRAFFIC: "Traffic",
  OUTCOME_LEADS: "Leads",
  OUTCOME_SALES: "Sales",
  OUTCOME_APP_PROMOTION: "App promotion",
};

function objectiveLabel(objective) {
  if (!objective) return "Objective unknown";
  return OBJECTIVES[objective] ?? objective.replaceAll("_", " ").toLowerCase();
}

function StatusBadge({ status }) {
  const info = STATUS[status] ?? { label: status ? status.replaceAll("_", " ").toLowerCase() : "Unknown", tone: "muted" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium ${TONE[info.tone]}`}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {info.label}
    </span>
  );
}

function FormatBadge({ ad }) {
  const label = ad.format ?? (ad.isVideo ? "Video" : "Image");
  return (
    <span className="border border-rule px-2 py-0.5 text-[11px] font-medium text-ink-2">{label}</span>
  );
}

function adDates(ad) {
  if (!ad.adsetStart) return "Dates unavailable";
  return `${ad.adsetStart} – ${ad.adsetEnd ?? "ongoing"}`;
}

function Poster({ ad, sizes, priority = false }) {
  if (!ad.image) {
    return (
      <div className="flex h-full items-center justify-center text-ink-3">
        <ImageOff className="size-6" aria-label="No preview available" />
      </div>
    );
  }
  return (
    <Image
      src={ad.image}
      alt=""
      fill
      unoptimized
      sizes={sizes}
      priority={priority}
      className="object-cover"
    />
  );
}

// Effects are cleaned up when the route is hidden, and display:none doesn't stop playback.
function VideoPlayer({ ad, autoPlay = false }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const video = ref.current;
    return () => video?.pause();
  }, []);
  return (
    <video
      ref={ref}
      src={ad.videoSource}
      poster={ad.image ?? undefined}
      controls
      autoPlay={autoPlay}
      playsInline
      preload="none"
      className="absolute inset-0 size-full bg-black object-contain"
    />
  );
}

function Media({ ad, sizes }) {
  if (ad.videoSource) return <VideoPlayer ad={ad} />;
  return (
    <>
      <Poster ad={ad} sizes={sizes} />
      {ad.isVideo && (
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
          <Play className="size-2.5 fill-current" aria-hidden />
          Video · poster only
        </span>
      )}
    </>
  );
}

function CardStat({ label, value, exact }) {
  return (
    <div className="flex items-baseline justify-between gap-2" title={exact}>
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="text-[13px] font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function AdCard({ ad, currency, onOpen }) {
  const m = ad.metrics;
  return (
    <article className="group relative flex flex-col border border-rule bg-wall p-2.5 shadow-frame transition-transform duration-200 hover:-translate-y-0.5">
      <div className="relative aspect-[4/5] overflow-hidden bg-mat">
        {/* Sits above the card's stretched button, so video controls stay clickable. */}
        <div className={ad.videoSource ? "absolute inset-0 z-10" : "absolute inset-0"}>
          <Media ad={ad} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" />
        </div>
      </div>
      <div className="flex flex-1 flex-col px-1.5 pb-1.5 pt-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={ad.status} />
          <FormatBadge ad={ad} />
        </div>
        <h3 className="mt-2.5 line-clamp-2 min-h-11 text-[15px] font-medium leading-snug">
          <button
            type="button"
            onClick={() => onOpen(ad.id)}
            className="text-left after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-accent"
          >
            {ad.title}
          </button>
        </h3>
        <dl className="mt-3 grid grid-cols-1 gap-y-1 border-t border-rule pt-3">
          <CardStat label="Spend" value={formatMoney(m.spend, currency)} />
          <CardStat label="Impressions" value={formatCompact(m.impressions)} exact={formatCount(m.impressions)} />
          <CardStat label="Clicks" value={formatCount(m.clicks)} />
          <CardStat label="CTR" value={formatPercent(m.ctr)} />
          {ad.campaignType === "Reach" ? (
            <CardStat label="Frequency" value={formatRatio(m.frequency)} />
          ) : (
            <CardStat label="CPC" value={formatCostPer(m.cpc, currency)} />
          )}
          <CardStat label={ad.result.label} value={formatCompact(ad.result.value)} exact={formatCount(ad.result.value)} />
          {ad.isVideo && (
            <CardStat label="3s views" value={formatCompact(m.videoViews)} exact={formatCount(m.videoViews)} />
          )}
        </dl>
        <p className="mt-3 border-t border-rule pt-2.5 text-[11px] leading-relaxed text-ink-3">
          {objectiveLabel(ad.objective)}
          <br />
          {adDates(ad)}
        </p>
      </div>
    </article>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-rule py-2">
      <dt className="text-[13px] text-ink-2">{label}</dt>
      <dd className="text-right text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function AdDialog({ ad, currency, onClose }) {
  const m = ad?.metrics;
  return (
    <Dialog.Root open={Boolean(ad)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="dialog-content fixed inset-2 z-50 m-auto flex max-h-[calc(100dvh-1rem)] max-w-5xl flex-col overflow-y-auto border border-rule bg-wall shadow-frame sm:inset-6 sm:h-fit md:flex-row md:overflow-hidden"
        >
          {ad && (
            <>
              <div className="relative aspect-[4/5] w-full shrink-0 bg-mat md:aspect-auto md:min-h-[560px] md:w-[46%]">
                <Media ad={ad} sizes="(max-width: 768px) 100vw, 460px" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-7 md:max-h-[calc(100dvh-3rem)] md:overflow-y-auto">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={ad.status} />
                    <FormatBadge ad={ad} />
                  </div>
                  <Dialog.Close aria-label="Close" className="-m-1 p-1 text-ink-2 hover:text-ink">
                    <X className="size-5" aria-hidden />
                  </Dialog.Close>
                </div>
                <Dialog.Title className="mt-4 font-display text-3xl leading-tight">
                  {ad.title}
                </Dialog.Title>
                <dl className="mt-5">
                  <DetailRow label="Spend" value={formatMoney(m.spend, currency)} />
                  <DetailRow label="Impressions" value={formatCount(m.impressions)} />
                  <DetailRow label="Reach" value={formatCount(m.reach)} />
                  <DetailRow label="Frequency" value={formatRatio(m.frequency)} />
                  <DetailRow label="Clicks (all)" value={formatCount(m.clicks)} />
                  <DetailRow label="CTR" value={formatPercent(m.ctr)} />
                  <DetailRow label="CPC" value={formatCostPer(m.cpc, currency)} />
                  <DetailRow label="CPM" value={formatMoney(m.cpm, currency)} />
                  <DetailRow label="Link clicks" value={formatCount(m.linkClicks)} />
                  <DetailRow label="Engagements" value={formatCount(m.engagements)} />
                  <DetailRow label="Engagement rate" value={formatPercent(m.engagementRate)} />
                  <DetailRow label="Cost per engagement" value={formatCostPer(m.costPerEngagement, currency)} />
                  <DetailRow label="Post interactions" value={formatCount(m.interactions)} />
                  <DetailRow label="Interaction rate" value={formatPercent(m.interactionRate)} />
                  {ad.isVideo && <DetailRow label="3s views" value={formatCount(m.videoViews)} />}
                </dl>
                <dl className="mt-5 space-y-2.5 text-[13px]">
                  <Provenance label="Ad name" value={ad.name} />
                  <Provenance label="Campaign" value={ad.campaignName} />
                  <Provenance label="Ad set" value={ad.adsetName ?? "Unavailable"} />
                  <Provenance label="Campaign type" value={ad.campaignType} />
                  <Provenance label="Objective" value={objectiveLabel(ad.objective)} />
                  <Provenance label="Ad set dates" value={adDates(ad)} />
                </dl>
                {ad.isVideo && !ad.videoSource && (
                  <p className="mt-5 border-l-2 border-warn pl-3 text-xs leading-relaxed text-ink-2">
                    Meta did not allow this access token to read the video file, so only the poster
                    is shown. See &ldquo;Video playback&rdquo; in the README.
                  </p>
                )}
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Provenance({ label, value }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-0.5 break-words text-ink-2">{value}</dd>
    </div>
  );
}

function GroupStat({ title, count, spend, resultLabel, resultValue, currency }) {
  return (
    <div className="bg-wall px-4 py-3.5">
      <p className="text-[13px] font-medium">
        {title} <span className="font-normal text-ink-3">· {count} ads</span>
      </p>
      <dl className="mt-1.5 flex flex-wrap gap-x-5 gap-y-0.5 text-xs text-ink-2">
        <div className="flex gap-1.5">
          <dt>Spend</dt>
          <dd className="font-medium tabular-nums text-ink">{formatMoney(spend, currency)}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>{resultLabel}</dt>
          <dd className="font-medium tabular-nums text-ink" title={formatCount(resultValue)}>
            {formatCompact(resultValue)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function AdGrid({ ads, currency, onOpen }) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  return (
    <>
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {ads.slice(0, visible).map((ad) => (
          <AdCard key={ad.id} ad={ad} currency={currency} onOpen={onOpen} />
        ))}
      </div>
      {visible < ads.length && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((count) => count + PAGE_SIZE)}
            className="border border-rule bg-wall px-4 py-2 text-[13px] text-ink-2 hover:text-ink"
          >
            Show more ({ads.length - visible} left)
          </button>
        </div>
      )}
    </>
  );
}

const TAB_CLASS =
  "-mb-px whitespace-nowrap border-b-2 border-transparent px-1 pb-3 text-sm text-ink-2 transition-colors " +
  "hover:text-ink data-[state=active]:border-accent data-[state=active]:font-medium data-[state=active]:text-ink";

export function CreativeGallery({ data }) {
  const { ads, groups, topContent, currency, totalSpend } = data;
  const [openId, setOpenId] = useState(null);

  const byId = useMemo(() => new Map(ads.map((ad) => [ad.id, ad])), [ads]);
  const pick = (ids) => ids.map((id) => byId.get(id));
  const openAd = openId ? byId.get(openId) : null;

  return (
    <section aria-labelledby="creatives-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="creatives-heading" className="font-display text-4xl leading-none">
          On the wall
        </h2>
        <p className="text-sm text-ink-3">
          {ads.length} ad creatives · {formatMoney(totalSpend, currency)} · by spend
        </p>
      </div>

      {ads.length === 0 ? (
        <p className="mt-6 border border-dashed border-rule p-10 text-center text-sm text-ink-2">
          No Savoy Gallery ads delivered in this date range.
        </p>
      ) : (
        <Tabs.Root defaultValue="all" className="mt-6">
          <Tabs.List
            aria-label="Filter ads by campaign type"
            className="flex gap-6 overflow-x-auto border-b border-rule"
          >
            <Tabs.Trigger value="all" className={TAB_CLASS}>
              All <span className="text-ink-3">{ads.length}</span>
            </Tabs.Trigger>
            <Tabs.Trigger value="top" className={TAB_CLASS}>
              Top Content <span className="text-ink-3">{topContent.count}</span>
            </Tabs.Trigger>
            {groups.map((group) => (
              <Tabs.Trigger key={group.type} value={group.type} className={TAB_CLASS}>
                {group.type} <span className="text-ink-3">{group.count}</span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="all" className="mt-5">
            {/* auto-fit stretches the cells across the row, so no empty cell shows through. */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-px border border-rule bg-rule">
              {groups.map((group) => (
                <GroupStat key={group.type} title={group.type} currency={currency} {...group} />
              ))}
            </div>
            <AdGrid ads={ads} currency={currency} onOpen={setOpenId} />
          </Tabs.Content>

          <Tabs.Content value="top" className="mt-5">
            <div className="border border-rule">
              <GroupStat title="Top Content" currency={currency} {...topContent} />
            </div>
            <p className="mt-2 text-xs text-ink-3">
              The 3 Engagement ads with the lowest cost per engagement.
            </p>
            {topContent.count === 0 ? (
              <p className="mt-6 border border-dashed border-rule p-10 text-center text-sm text-ink-2">
                No Engagement ads earned engagements in this date range.
              </p>
            ) : (
              <AdGrid ads={pick(topContent.adIds)} currency={currency} onOpen={setOpenId} />
            )}
          </Tabs.Content>

          {groups.map((group) => (
            <Tabs.Content key={group.type} value={group.type} className="mt-5">
              <div className="border border-rule">
                <GroupStat title={group.type} currency={currency} {...group} />
              </div>
              <AdGrid ads={pick(group.adIds)} currency={currency} onOpen={setOpenId} />
            </Tabs.Content>
          ))}
        </Tabs.Root>
      )}

      <AdDialog ad={openAd} currency={currency} onClose={() => setOpenId(null)} />
    </section>
  );
}
