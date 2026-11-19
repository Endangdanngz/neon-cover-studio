# Neon Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Endangdanngz/neon-cover-studio/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Endangdanngz/neon-cover-studio/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns your own photos and a caption into
multi-panel, neon-noir cover art — the bold grid-poster look of a Vice
City game cover, drawn entirely in your browser and exported as a PNG.
Everything is original: no game artwork, logos or fonts are used or
copied.

Open it, drop in photos, pick a layout and a colour grade, slide each
photo into its panel, write your headline, and export a print-sharp PNG
at 1080 × 1080, 1080 × 1350, 1920 × 1080, or any custom size. Photos are
read from your machine and never uploaded anywhere; the app makes no
network requests at all.

## Features

- **Five multi-panel layouts** — Poster Five (the classic cover grid),
  Triptych, Hero Strip, Quad Grid and Mural Duet — defined as normalised
  rectangles, so they compose correctly at any aspect ratio.
- **Any photo, every panel** — upload or drag-and-drop as many photos as
  you like, fill panels from your library or the four bundled samples,
  and reuse one photo across panels.
- **Per-panel art direction** — click a panel (or its tab) and adjust
  zoom and X/Y position with sliders, or simply drag the photo on the
  cover itself.
- **Four colour grades** — Sunset Boulevard, Neon Nights, Chrome Mirage
  and Pastel Vice: photo filtering plus layered sunset washes, a glow
  band, vignette and seeded film grain.
- **Poster typography** — a two-line gradient headline in a heavy
  display face with a dark outline, a neon rule, and a letter-spaced
  subtitle, all sized to fit automatically.
- **One renderer, honest exports** — the preview and the exported PNG
  are painted by the same `renderCover()` function, so the download is
  exactly what you saw, pixel for pixel at the chosen size.
- **Undo and reset** — a 40-step undo stack for scene changes, and a
  one-click return to the opening scene.

## Run it

```sh
node serve.ts            # then open http://localhost:8080
```

Any static file server pointed at `app/` works just as well; there is no
build step. Requires a desktop browser with ES module and canvas
support (Chrome is the reference).

## How it is built

- `app/index.html` — the editor page; `app/style.css` — the dark neon
  editor theme.
- `app/src/templates.js` — the layout templates as normalised panel
  rectangles.
- `app/src/state.js` — the photo library model, the scene, and the undo
  stack.
- `app/src/render.js` — the deterministic cover renderer (panels, grade,
  grain, caption) shared by preview and export.
- `app/src/main.js` — UI wiring: photo intake, panel selection and
  dragging, controls, PNG export.
- `app/src/shots.js` — the deterministic `?shot=` screenshot mode.
- `app/fonts/NeonDisplay.ttf` — the headline typeface (see below).
- `main.ts` — the hand-in program: copies `app/` and `screenshots/` to
  the output directory and writes `dossier.json` with the vendored
  make.fun library. `vendor/makefun-app.ts` is the competition kit's
  file, unchanged.

## Credits and license

The application code is MIT-licensed (see `LICENSE`).

The headline typeface `app/fonts/NeonDisplay.ttf` is the Noto Sans
Display Black font from Google's Noto project, renamed for bundling and
licensed under the SIL Open Font License 1.1 — the full text is in
`app/fonts/OFL.txt`.

Sample photos: `boulevard.jpg` and `pier.jpg` were made by make.fun
with an image model for the competition kit and are free to use;
`neon-woman.jpg` and `driver.jpg` were AI-generated for this entry. No
photograph of a real person is included.
