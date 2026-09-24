# The Ultra of Us

A wedding adventure website for Christoph and Ari: seven challenges, an immediately earned marriage badge, activity photo or Strava-link submissions, and WebGL badge celebrations.

## Run locally

This is a plain HTML, CSS and JavaScript site. No dependency installation or build is required.

From the repository root, with Python 3 installed:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:4173. Serve it over HTTP rather than opening the HTML directly.

## Where to edit

- `dist/index.html`: page structure and names.
- `dist/style.css`: responsive styling, forms and celebration layout.
- `dist/app.js`: challenge content, badges, dialogs and completion flow. The `challenges` array contains `video` and `gift` fields; these are currently empty.
- `dist/evidence.js`: validates Strava links and saves activity evidence locally.
- `dist/celebration.js`: WebGL medal rotation, metallic light sweep and sparks, with a fallback and reduced-motion support.
- `dist/photos/`: three selected personal photos used on the site.

Video fields accept browser-playable video file URLs (not YouTube page URLs). Gift fields accept a destination URL. Do not put secret redemption codes or confidential rewards in this client-side source: reveal states are presentation, not access controls.

## Current behavior and limits

- The marriage badge is already earned. Each of the seven challenge badges requires an activity photo or a supported Strava activity URL.
- Strava URL format is checked; the app does not verify activity ownership, content or existence.
- Completion is stored in localStorage; submitted photos/links are stored in IndexedDB. There is no shared database, upload server or cross-device sync. Clearing browser data removes these records.
- Selected photos are resized in the browser and saved as JPEG. Unsupported image formats show an error.
- The couple is reminded to share evidence in the WhatsApp group. Nothing is sent automatically.
- Earned badges have a replay control. Undo restores the challenge and removes its saved evidence.
- Existing completed badges from earlier prototypes remain completed even if they lack evidence.
- Gift descriptions stay hidden. Personal videos and final gift destinations still need to be added.

## Collaborating

Clone this private repository, create a branch, make changes and open a pull request. Friends can use their preferred editor or coding assistant.

Before merging, check the page on desktop and mobile, submit a photo and a Strava link, check invalid input, reload to verify persistence, try the badge reveal and undo your test completion.

JavaScript syntax checks:

```sh
node --check dist/app.js
node --check dist/evidence.js
node --check dist/celebration.js
```

## Publishing

Current hosted site: https://the-ultra-of-us-wedding.tensordyne-i-6594.chatgpt.site/

The site is hosted privately with Sites. `.openai/hosting.json` identifies that existing deployment; it contains no credential. GitHub access does not grant access to publish that site, and pushing here does not deploy automatically. Coordinate publishing with Lukas. To host an independent copy elsewhere, serve `dist/` as a static site.

This repository includes personal photos. Keep access limited to the intended collaborators.
