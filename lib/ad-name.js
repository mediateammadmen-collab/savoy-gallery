// Ad names carry a format tag, as in "iPhone | Static | ..." or "Static - iPhone ...".
// A tag only counts when it fills a whole segment, so "Dynamic Island" in body copy
// is never mistaken for one. Longest tags come first so "Influencer Reel" beats "Reel".
const FORMATS = [
  ["Influencer Reel", /^influ(?:e|c)n?c?er\s+reels?$/i],
  ["Influencer Video", /^influ(?:e|c)n?c?er\s+videos?$/i],
  ["Carousel", /^carousels?$/i],
  ["Dynamic", /^(?:dynamic|dyanmic)$/i],
  ["Static", /^static$/i],
  ["Reel", /^reels?$/i],
];

// Segments are split on "|" anywhere, or on "-", "–", "—" and ":" when spaced out as
// separators, so hyphenated words and times are left alone.
const SEPARATOR = /(\s*\|\s*|\s+[-–—:]\s+|\s+:|:\s+)/;

function detectFormat(segment) {
  const text = segment.trim();
  return FORMATS.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

const stripEdges = (text) => text.replace(/^[\s\-–—:|]+|[\s\-–—:|]+$/g, "");

export function parseAdName(rawName = "") {
  const name = rawName.trim();
  const parts = name.split(SEPARATOR); // odd indexes hold the separators

  for (let i = 0; i < parts.length; i += 2) {
    const format = detectFormat(parts[i]);
    if (!format) continue;
    // Drop the tag and the separator after it (or before it, for a final segment).
    const kept = parts.slice();
    if (i + 1 < parts.length) kept.splice(i, 2);
    else if (i > 0) kept.splice(i - 1, 2);
    else kept.splice(i, 1);
    return { format, title: stripEdges(kept.join("")) || format };
  }

  return { format: null, title: stripEdges(name) || name };
}
