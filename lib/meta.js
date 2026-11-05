import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";

// Every Meta call goes through this module. Access is read-only: the only POST
// is the Graph batch endpoint, and every request inside it is a GET.

const REQUIRED_ENV = ["META_ACCESS_TOKEN", "META_AD_ACCOUNT_ID", "META_API_VERSION"];
const RATE_LIMIT_CODES = new Set([4, 17, 32, 613]);
const MAX_RETRIES = 4;
const BACKOFF_BASE_MS = 1000;
const PAGE_LIMIT = "500";
const MAX_PAGES = 20;
const BATCH_SIZE = 50;
const BATCH_CONCURRENCY = 4;
// Per-node failures that shouldn't take the whole dashboard down, such as a video the
// token can't read. Anything else, including an expired token, is thrown.
const TOLERATED_ITEM_CODES = new Set([10, 100, 200]);

// `expire` must be longer than `revalidate`, so nothing is served past 5 minutes + 1s.
const CACHE_PROFILE = { stale: 300, revalidate: 300, expire: 301 };
// A failure is only kept long enough to cross the cache boundary, so the next request retries.
const FAILURE_CACHE_PROFILE = { stale: 30, revalidate: 1, expire: 2 };

export function getMissingEnv() {
  return REQUIRED_ENV.filter((name) => !process.env[name]?.trim());
}

// The token must never reach a log line, an error message or the client.
function redact(text) {
  const token = process.env.META_ACCESS_TOKEN?.trim();
  const safe = String(text ?? "").replace(/access_token=[^&\s"']+/gi, "access_token=[redacted]");
  return token ? safe.split(token).join("[redacted]") : safe;
}

export class MetaApiError extends Error {
  constructor(message, { code, subcode, status } = {}) {
    super(redact(message));
    this.name = "MetaApiError";
    this.code = code;
    this.subcode = subcode;
    this.status = status;
  }
}

export function isMetaApiError(error) {
  return error?.name === "MetaApiError";
}

function readEnv() {
  const missing = getMissingEnv();
  if (missing.length) {
    throw new MetaApiError(`Missing environment variable: ${missing.join(", ")}`, { code: "ENV" });
  }
  return {
    token: process.env.META_ACCESS_TOKEN.trim(),
    account: process.env.META_AD_ACCOUNT_ID.trim(),
    baseUrl: `https://graph.facebook.com/${process.env.META_API_VERSION.trim()}`,
  };
}

function toMetaError(payload, status) {
  return new MetaApiError(payload?.message ?? `Meta API request failed (HTTP ${status})`, {
    code: payload?.code,
    subcode: payload?.error_subcode,
    status,
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const backoffMs = (attempt) => BACKOFF_BASE_MS * 2 ** attempt;

async function withRateLimitRetry(request) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      if (!RATE_LIMIT_CODES.has(error?.code) || attempt >= MAX_RETRIES) throw error;
      console.warn(`[meta] rate limited (code ${error.code}), retry ${attempt + 1}/${MAX_RETRIES}`);
      await sleep(backoffMs(attempt));
    }
  }
}

async function parseResponse(response) {
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.error) throw toMetaError(body?.error, response.status);
  return body;
}

async function requestGet(path, params) {
  const { token, baseUrl } = readEnv();
  const url = new URL(`${baseUrl}/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  // The token travels in a header so it stays out of URLs and anything that logs them.
  // Next memoizes identical GETs during a render, which would replay a rate-limit error to
  // every retry. Passing a signal opts out.
  const { signal } = new AbortController();
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal });
  return parseResponse(response);
}

// Errors lose their type and message crossing a "use cache" boundary in production, so
// cached functions return an outcome and callers rethrow on the outside.
async function cachedOutcome(work) {
  cacheTag("meta");
  try {
    const value = await work();
    cacheLife(CACHE_PROFILE);
    return { ok: true, value };
  } catch (error) {
    if (!isMetaApiError(error)) throw error;
    cacheLife(FAILURE_CACHE_PROFILE);
    return {
      ok: false,
      message: error.message,
      code: error.code,
      subcode: error.subcode,
      status: error.status,
    };
  }
}

function unwrap(outcome) {
  if (outcome.ok) return outcome.value;
  throw new MetaApiError(outcome.message, outcome);
}

async function cachedGet(path, paramsJson) {
  "use cache";
  return cachedOutcome(() => withRateLimitRetry(() => requestGet(path, JSON.parse(paramsJson))));
}

const get = async (path, params) => unwrap(await cachedGet(path, JSON.stringify(params)));

// paging.next embeds every query param, and sometimes the token. Keep the params, drop the token.
function paramsFromNextUrl(nextUrl) {
  const params = Object.fromEntries(new URL(nextUrl).searchParams);
  delete params.access_token;
  return params;
}

async function getAllPages(path, params) {
  const rows = [];
  let pageParams = { ...params, limit: PAGE_LIMIT };
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await get(path, pageParams);
    rows.push(...(result.data ?? []));
    if (!result.paging?.next) return rows;
    pageParams = paramsFromNextUrl(result.paging.next);
  }
  console.warn(
    `[meta] page cap of ${MAX_PAGES} hit on ${path}: data past ${rows.length} rows was NOT fetched`,
  );
  return rows;
}

async function cachedBatch(relativeUrlsJson) {
  "use cache";
  return cachedOutcome(() => requestBatch(JSON.parse(relativeUrlsJson)));
}

// One POST batch. Each item is { ok: true, body } or { ok: false, code, message }.
// Rate-limited or timed-out items are retried with backoff.
async function requestBatch(relativeUrls) {
  const { token, baseUrl } = readEnv();
  const results = new Array(relativeUrls.length).fill(null);
  let pending = relativeUrls.map((_, index) => index);

  for (let attempt = 0; pending.length > 0; attempt += 1) {
    const form = new URLSearchParams({
      include_headers: "false",
      batch: JSON.stringify(
        pending.map((index) => ({ method: "GET", relative_url: relativeUrls[index] })),
      ),
    });
    const replies = await withRateLimitRetry(async () =>
      parseResponse(
        await fetch(`${baseUrl}/`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        }),
      ),
    );

    const retry = [];
    replies.forEach((reply, position) => {
      const index = pending[position];
      // Graph returns null for items it didn't get to before timing out.
      if (reply === null) {
        retry.push(index);
        return;
      }
      const body = JSON.parse(reply.body ?? "null");
      if (!body?.error) {
        results[index] = { ok: true, body };
      } else if (RATE_LIMIT_CODES.has(body.error.code)) {
        retry.push(index);
      } else if (TOLERATED_ITEM_CODES.has(body.error.code)) {
        results[index] = { ok: false, code: body.error.code, message: redact(body.error.message) };
      } else {
        throw toMetaError(body.error, reply.code);
      }
    });

    if (retry.length && attempt >= MAX_RETRIES) {
      throw new MetaApiError("Meta rate limit did not clear after 4 retries", { code: 4 });
    }
    if (retry.length) await sleep(backoffMs(attempt));
    pending = retry;
  }
  return results;
}

// Runs relative URLs through batches of 50, at most 4 batches at a time, keeping order.
async function runBatched(relativeUrls) {
  const chunks = [];
  for (let i = 0; i < relativeUrls.length; i += BATCH_SIZE) {
    chunks.push(relativeUrls.slice(i, i + BATCH_SIZE));
  }
  const output = new Array(chunks.length);
  let next = 0;
  async function worker() {
    while (next < chunks.length) {
      const current = next;
      next += 1;
      output[current] = unwrap(await cachedBatch(JSON.stringify(chunks[current])));
    }
  }
  await Promise.all(Array.from({ length: Math.min(BATCH_CONCURRENCY, chunks.length) }, worker));
  return output.flat();
}

export async function getAccount() {
  const { account } = readEnv();
  return get(account, { fields: "currency,timezone_name" });
}

function todayIn(timeZone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

// Turns a { metaPreset } or { since, until } range into Graph params. Returns null for
// a range that hasn't started, since Meta rejects a `since` in the future.
function timeParams(range, timeZone) {
  if (range.metaPreset) return { date_preset: range.metaPreset };
  const today = todayIn(timeZone);
  if (range.since > today) return null;
  return {
    time_range: JSON.stringify({
      since: range.since,
      until: range.until > today ? today : range.until,
    }),
  };
}

export async function fetchInsights({ level, range, fields, filtering }) {
  const { account } = readEnv();
  const { timezone_name: timeZone } = await getAccount();
  // Reading today's date has to wait for a real request under Cache Components.
  await connection();
  const time = timeParams(range, timeZone);
  if (!time) return [];
  return getAllPages(`${account}/insights`, {
    level,
    fields: fields.join(","),
    filtering: JSON.stringify(filtering),
    ...time,
  });
}

const AD_FIELDS =
  "name,effective_status,adset{name,start_time,end_time}," +
  "creative{id,object_type,video_id,thumbnail_url,image_url," +
  "object_story_spec{video_data{video_id}},asset_feed_spec{videos{video_id}}}";

function videoIdOf(creative) {
  return (
    creative?.video_id ??
    creative?.object_story_spec?.video_data?.video_id ??
    creative?.asset_feed_spec?.videos?.[0]?.video_id ??
    null
  );
}

// Details for the given ad IDs only, which come from a date-ranged insights response.
// Returns a Map of adId -> details. An ad whose details can't be read is simply absent,
// so its spend still counts and its card still renders.
export async function fetchAdDetails(adIds) {
  const ids = [...new Set(adIds)].sort();
  const adReplies = await runBatched(
    ids.map((id) => `${id}?fields=${encodeURIComponent(AD_FIELDS)}`),
  );

  const ads = new Map();
  ids.forEach((id, index) => {
    if (adReplies[index]?.ok) ads.set(id, adReplies[index].body);
  });
  const unreadableAds = ids.length - ads.size;
  if (unreadableAds) console.warn(`[meta] could not read details for ${unreadableAds} ad(s)`);

  // Nested thumbnails come back at 64x64, so re-fetch each on its creative node.
  const creativeIds = [...new Set([...ads.values()].map((ad) => ad.creative?.id).filter(Boolean))];
  const thumbReplies = await runBatched(
    creativeIds.map((id) => `${id}?fields=thumbnail_url&thumbnail_width=1200&thumbnail_height=1200`),
  );
  const thumbnails = new Map();
  creativeIds.forEach((id, index) => {
    const url = thumbReplies[index]?.ok ? thumbReplies[index].body.thumbnail_url : null;
    if (url) thumbnails.set(id, url);
  });

  const videoIds = [...new Set([...ads.values()].map((ad) => videoIdOf(ad.creative)).filter(Boolean))];
  const videoReplies = await runBatched(videoIds.map((id) => `${id}?fields=source,picture`));
  const videos = new Map();
  let unreadableVideos = 0;
  videoIds.forEach((id, index) => {
    if (videoReplies[index]?.ok) videos.set(id, videoReplies[index].body);
    else unreadableVideos += 1;
  });
  if (unreadableVideos) {
    console.warn(
      `[meta] ${unreadableVideos}/${videoIds.length} video node(s) unreadable; showing posters only. ` +
        "The token needs page access to read video sources (see README).",
    );
  }

  const details = new Map();
  for (const [id, ad] of ads) {
    const creative = ad.creative ?? {};
    const videoId = videoIdOf(creative);
    const video = videoId ? videos.get(videoId) : null;
    details.set(id, {
      name: ad.name,
      effectiveStatus: ad.effective_status ?? null,
      adsetName: ad.adset?.name ?? null,
      adsetStart: ad.adset?.start_time ?? null,
      adsetEnd: ad.adset?.end_time ?? null,
      isVideo: Boolean(videoId),
      videoSource: video?.source ?? null,
      image:
        thumbnails.get(creative.id) ??
        video?.picture ??
        creative.image_url ??
        creative.thumbnail_url ??
        null,
    });
  }
  return details;
}
