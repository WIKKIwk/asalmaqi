# SHIFA ALEASAL

Honey website with a persistent catalog and an owner-only Telegram bot. Hosted at https://shifa-aleasal.abdulfattox.chatgpt.site. The original design, images, motion and dialog fixes are preserved.

GitHub repository: https://github.com/WIKKIwk/asalmaqi. See [DEPLOYMENT.md](DEPLOYMENT.md) for running a clone and deploying under your own account. The backend currently uses Cloudflare Workers, D1 and R2. Production database records and uploaded R2 images need a separate migration; secrets are excluded from Git.

## Source

- `lib/site-template.html`, `public/`: page, original styles, browser scripts and assets.
- `public/catalog-view.mjs`, `public/catalog-carousel.mjs`: shared catalog markup and seamless looping carousels with 5.2-second autoplay, pause/play, swipe, arrows and keyboard navigation. Playback pauses while hovered, focused, dragged, offscreen, in a hidden tab or behind an open product dialog; reduced-motion preferences disable autoplay. Live updates retain the leading product and explicit pause.
- `public/vendor/`: the already-installed Embla Carousel 8.6.0 ESM distribution and its MIT license, served locally. No external carousel CDN is required.
- `lib/catalog-store.mjs`: D1 catalog, one-time seed, drafts, retry records.
- `lib/telegram-bot.mjs`: private-chat allowlist, draft editing and explicit saves.
- `lib/telegram-client.mjs`: bounded downloads and content-addressed R2 images.
- `app/route.ts`, `app/api/catalog/route.ts`: HTML and read-only catalog JSON.
- `app/api/telegram/webhook/route.ts`: authenticated webhook.
- `app/media/[key]/route.ts`: uploaded image delivery.
- `db/schema.ts`, `drizzle/`: schema and append-only migrations.
- `BOT-QOLLANMA.md`: owner instructions in Uzbek.

Uses the supported Sites Vinext starter and its `sites()` build integration. Sites provisions `DB` and `BUCKET`. Existing products are seeded once in an atomic batch after migrations, outside migration SQL. Hiding all products never restores the seed.

## Run and verify

The page supports Uzbek and Russian through `?lang=uz` / `?lang=ru`. Header links retain the current section, and a one-year first-party cookie remembers an explicit selection. HTML, metadata, accessibility labels, catalog controls and product details render in the chosen language on the server. Known original product text is translated; owner-edited text remains authoritative. Translation does not change prices or database records. Static translations live in `lib/site-ru.mjs`, shared catalog/UI translations in `public/i18n.mjs`.

Use Node.js 22.13 or newer and install with `npm ci`. `npm test` runs real-SQL bot integration tests, localization, autoplay and dialog/motion regressions. `npm run build` creates `dist/`. `npm start -- --port 4177` previews the built Worker; `npm run dev -- --hostname 127.0.0.1 --port 4177` starts development mode.

After building, apply each pending migration once to the local DB:

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_wandering_sphinx.sql
```

Local and hosted databases are separate. Sites applies hosted migrations on deployment. Publishing uses the Sites source workflow helper to commit, push and package the verified source.

## Bot configuration

Set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` and comma-separated `TELEGRAM_ADMIN_IDS` as secret runtime values using native Sites tools. `SITE_ORIGIN` is the exact deployed origin. Deploy after environment changes. Local `.dev.vars` is ignored; never commit or package it. The tracked example contains key names only.

Register `/api/telegram/webhook` with Telegram `setWebhook`, the matching `secret_token`, `max_connections: 1` and `allowed_updates: ["message", "callback_query"]`. Do not drop pending updates on routine changes. This bot must be dedicated to the catalog.

An empty owner allowlist denies catalog writes. Private-chat visitors receive a welcome, their own Telegram ID and setup instructions on Start or other input; they never receive editing controls. Verify the intended owner before adding its ID; usernames are not authorization. The public channel `@chotqol_asal` remains separate from this admin bot.

Updates require a webhook secret and a private chat. Leases, a reply outbox, revision checks and last-update markers protect against retries and interrupted processing. A reply may repeat if Telegram accepted it but its response was lost; the catalog mutation remains idempotent. Processed IDs are retained to prevent replay. Drafts expire after 24 hours. Two owners cannot overwrite the same old revision.

JPEG, PNG and WebP magic bytes are checked; downloads are capped at 8 MB. Images are copied to R2, so token-bearing Telegram URLs never reach browsers. Cancelled draft uploads can remain unreferenced; no destructive cleanup runs automatically. Catalog is limited to 100 products.

References: https://core.telegram.org/bots/api#setwebhook and https://core.telegram.org/bots/api#getfile.
