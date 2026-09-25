# The Ultra of Us

A wedding adventure website for Christoph and Ari: eight challenges, an immediately earned marriage badge, activity photo or Strava-link submissions, and WebGL badge celebrations.

## Run locally

The interface is plain HTML, CSS and JavaScript. A Cloudflare Worker provides password authentication, shared D1 progress and private R2 photo storage.

From the repository root, with Node 22.13+ installed:

```sh
npm install
# Copy .env.example to .dev.vars and set a local password and random session secret.
npm run build
npm run dev
```

Open http://127.0.0.1:4174. Serve it over HTTP rather than opening the HTML directly.

## Where to edit

- `public/index.html`: page structure and names.
- `public/style.css`: responsive styling, forms and celebration layout.
- `public/app.js`: challenge content, badges, dialogs and completion flow. The `challenges` array contains `video` and `gift` fields; these are currently empty.
- `public/evidence.js`: validates Strava links and sends activity evidence to the authenticated API.
- `public/celebration.js`: WebGL medal rotation, metallic light sweep and sparks, with a fallback and reduced-motion support.
- `public/photos/`: three selected personal photos used on the site.

Video fields accept browser-playable video file URLs (not YouTube page URLs). Gift fields accept a destination URL. Do not put secret redemption codes or confidential rewards in this client-side source: reveal states are presentation, not access controls.

## Current behavior and limits

- The marriage badge is already earned. Each of the eight challenge badges requires an activity photo or a supported Strava activity URL.
- Strava URL format is checked; the app does not verify activity ownership, content or existence.
- One shared couple account: progress and links live in D1, photos in R2. Sessions use a signed HttpOnly cookie. Progress refreshes on page focus and every 30 seconds.
- Password and session signing key are secret environment variables, never client source. Login attempts are rate limited.
- Existing browser progress can be explicitly imported after login. Existing server records and undone challenges take precedence.
- Selected photos are resized in the browser and saved as JPEG. Unsupported image formats show an error.
- The couple is reminded to share evidence in the WhatsApp group. Nothing is sent automatically.
- Earned badges have a replay control. Undo restores the challenge and removes its saved evidence.
- Explicitly imported legacy completions may lack activity evidence. Undo keeps a server tombstone and retains earlier evidence for recovery.
- Gift descriptions stay hidden. Personal videos and final gift destinations still need to be added.

## Collaborating

Clone this private repository, create a branch, make changes and open a pull request. Friends can use their preferred editor or coding assistant.

Before merging, check the page on desktop and mobile, submit a photo and a Strava link, check invalid input, reload to verify persistence, try the badge reveal and undo your test completion.

JavaScript syntax checks:

```sh
npm run build
npm test
```

## Publishing

Current hosted site: https://the-ultra-of-us-wedding.tensordyne-i-6594.chatgpt.site/

The site is hosted privately with Sites. `.openai/hosting.json` identifies that existing deployment; it contains no credential. GitHub access does not grant access to publish that site, and pushing here does not deploy automatically. Coordinate publishing with Lukas. An independent deployment needs compatible D1/R2 bindings and APP_PASSWORD and SESSION_SECRET secrets. Do not host public/ directly: it bypasses the password gate and cannot save progress.

This repository includes personal photos. Keep access limited to the intended collaborators.

## Server and database

- `server/worker.js`: authentication, protected asset serving and activity API.
- `db/schema.ts` and `drizzle/`: schema and versioned migrations. Run `npm run db:generate` after schema edits; never rewrite applied migrations.
- `scripts/build.mjs`: embeds client assets in the Worker so direct asset URLs also require login.
- `scripts/dev.mjs`: local preview with SQLite and filesystem storage under ignored `.local-data/`.
- `tests/server.test.mjs`: login, cross-session saves, private photo access, database reopening, undo/import and rate-limit checks.

Sites access policy is separate from the password gate. Keep its audience unchanged unless the owner explicitly requests password-only public access.
