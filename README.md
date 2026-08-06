# Flag Film Analyzer 🏈

A local-first web app that turns flag football game film into coaching feedback —
for the team as a whole and for individual players.

## How it works

1. **Roster** — enter your players' names, jersey numbers, and positions.
2. **Analyze film** — upload a game video, sample frames from it right in the
   browser, and pick what you want the AI to focus on (run blocking, flag-pulling
   technique, QB decision-making, penalties, etc.).
3. The sampled frames, your roster, and your focus areas are sent to Claude
   (Anthropic's API), which returns structured feedback: team strengths/weaknesses,
   findings per focus area, per-player notes (matched to your roster by jersey
   number when visible), and a prioritized list for the next practice.
4. Every game and analysis is saved locally (IndexedDB) so you can revisit team
   reports or pull up a single player's notes across every game they've appeared in.

## Privacy / data handling

This is a **local-first, no-backend app**. There is no server component — it's a
static single-page app. All roster, game, and analysis data lives in your
browser's IndexedDB. Your Anthropic API key lives in `localStorage`. When you run
an analysis, the browser calls the Anthropic API directly with your key; the raw
video is never uploaded anywhere — only the small sampled frames used for that
analysis are sent, straight to Anthropic.

Because the API key is used client-side, treat this as a personal/local tool
rather than something you deploy publicly with your key baked in.

## Getting started

```bash
npm install
npm run dev
```

Open the app, go to **Settings**, and add an Anthropic API key (get one at
[console.anthropic.com](https://console.anthropic.com/settings/keys)). Then add
some players in **Roster** and start a new analysis from **Analyze Film**.

## Tech stack

- React + TypeScript + Vite
- Tailwind CSS
- IndexedDB (via `idb`) for local persistence
- `@anthropic-ai/sdk` called directly from the browser for film analysis

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check and build for production
- `npm run preview` — preview the production build
- `npm run lint` — run Oxlint
