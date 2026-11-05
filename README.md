# Savoy Gallery · Meta Ads dashboard

A server-rendered dashboard showing live Meta Ads performance for Savoy Gallery in Bangladesh.

The ad account is shared with other brands, so every query only includes campaigns whose name
contains "Savoy Gallery". A campaign without those words in its name won't appear. The keyword is
set in `lib/config.js`.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the three values below
npm run dev                  # http://localhost:3000
```

Add your logo as `public/logo.png`. Until it exists, the header shows an "S" monogram and the
browser console logs a harmless 404.

### Environment variables

All three are server-only. Never prefix them with `NEXT_PUBLIC_`. `.env*` files are git-ignored.

| Variable | Example | What it is |
| --- | --- | --- |
| `META_ACCESS_TOKEN` | | Access token with `ads_read` (see below) |
| `META_AD_ACCOUNT_ID` | `act_1234567890` | The ad account ID, including the `act_` prefix |
| `META_API_VERSION` | `v26.0` | Graph API version |

If one is missing, the dashboard shows an error naming it, and the API routes return HTTP 503.

### Generating an access token

Use a System User token, because it doesn't expire the way a personal token does.

1. In [Business Settings](https://business.facebook.com/settings), open **Users → System users**
   and create one (or pick an existing one).
2. Under **Assign assets**, give it the ad account. To enable video playback, also give it the
   Facebook Page that runs the ads (see below).
3. Click **Generate token**, choose your Meta app, and select `ads_read`. To enable video playback,
   also select `pages_read_engagement`.
4. Copy the token into `.env.local`. It's only shown once.

The dashboard only reads data. It never creates or changes anything in the ad account.

### Video playback

Video cards play only if the token can read each video's source file. Without that access, Meta
returns `(#10) Application does not have permission for this action`, the card shows the poster
with a "Video · poster only" label, and the server logs how many videos were affected. All other
figures are unaffected.

To fix it, give the token access to the Page as in steps 2 and 3. No code change is needed. Meta
may still refuse some videos, such as ones owned by another Page.

## Deploying to Netlify

`netlify.toml` already sets the build command and the `@netlify/plugin-nextjs` plugin.

1. Push the repository to your Git host and import it in Netlify. The settings are picked up
   automatically.
2. Under **Site configuration → Environment variables**, add the three variables above.
3. Deploy, then check `/` and `/api/insights`.

Three things to watch on Netlify, none of which have been tested there yet:

- **Timeouts.** A first load takes about 6 to 9 seconds for most ranges and about 45 seconds for
  **Lifetime**, which covers roughly 490 ads. Serverless functions have an execution limit, so
  Lifetime, and possibly other ranges on a cold start, may time out.
- **Caching.** The 5-minute cache is held in memory per server instance. A new serverless instance
  starts empty, so it may call Meta more often than every 5 minutes and load more slowly.
- **Access.** There is no login, so anyone with the URL can see the dashboard and `/api/*`. Consider
  Netlify's password protection if the figures are confidential.

## How the numbers work

- **Reach is never summed.** The summary comes from Meta's account-level figure for the filtered
  campaigns, and the Reach group's total is a separate request across that group's campaigns,
  because the same person can see several ads.
- **Rates are calculated from totals.** Raw counts are summed first, then divided (`lib/metrics.js`).
  A division by zero shows "—".
- **Date presets** use Meta's own presets, so they follow the ad account's time zone and match Ads
  Manager. "Last 14 days" excludes today.
- **Campaign type** is the first of Reach, Engagement, Traffic, Page Visit or Page Like found in the
  campaign name, otherwise Other. "Video View" campaigns are therefore Other.

## API routes

Both accept `range` (`today`, `yesterday`, `last_7`, `last_14`, `last_30`, `last_90`, `this_month`,
`last_month`, `lifetime`, `custom`), and `start` and `end` (`YYYY-MM-DD`) for `custom`.

- `GET /api/insights` returns the summary metrics.
- `GET /api/creatives` returns ads, campaign-type groups and Top Content.

## Scripts

`npm run dev`, `npm run build`, `npm run start`, `npm run lint`.
