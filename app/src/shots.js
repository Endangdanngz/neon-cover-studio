// Shot mode: fixed, deterministic scenes for screenshots.
//
// The editor reads its configuration from the URL when a `shot` parameter
// is present, so a screenshot is just a URL:
//   ?shot=cover&template=triptych&photos=pier,neon-woman,boulevard
//     &caption=MIDNIGHT|PIER&sub=AFTER%20DARK&grade=neon&w=1080&h=1080
//
//   shot     "cover" shows only the cover, filling the window;
//            "editor" shows the full editor with the scene loaded.
//   photos   comma-separated sample names (samples/<name>.jpg); `photo`
//            alone names a single one. Panels are filled in order, cycling.
//   caption  the title; a "|" separates the two title lines.
//   sub      the subtitle line.  grade / template pick by id.
//   w, h     the cover's pixel size in cover mode.
//
// When the scene is painted, window.__shotReady is set so the screenshot
// tooling knows the frame is final.

import { defaultScene, fitPlacements, makePlacement } from './state.js';

/** Parse the shot configuration out of URLSearchParams, or null if absent. */
export function readShotConfig(params) {
  const mode = params.get('shot');
  if (!mode) return null;
  const many = params.get('photos');
  const one = params.get('photo');
  const photoNames = many
    ? many.split(',').map((s) => s.trim()).filter(Boolean)
    : one
      ? [one]
      : [];
  return {
    mode,
    templateId: params.get('template') || 'poster-five',
    gradeId: params.get('grade') || 'sunset',
    photoNames,
    caption: (params.get('caption') || 'NEON HARBOR').replace(/\|/g, '\n'),
    subtitle: params.get('sub') || '',
    scale: Number(params.get('scale')) || 1,
    w: Number(params.get('w')) || 0,
    h: Number(params.get('h')) || 0,
  };
}

/** Build the scene a shot configuration describes. */
export function sceneFromShot(config) {
  const scene = defaultScene();
  scene.templateId = config.templateId;
  scene.gradeId = config.gradeId;
  scene.caption = { title: config.caption, subtitle: config.subtitle };
  scene.captionScale = config.scale;
  if (config.w > 0 && config.h > 0) {
    scene.exportW = config.w;
    scene.exportH = config.h;
  }
  fitPlacements(scene);
  const ids = config.photoNames.map((name) => `sample-${name}`);
  scene.placements = scene.placements.map((_, i) =>
    ids.length ? makePlacement(ids[i % ids.length]) : makePlacement(null),
  );
  scene.selected = 0;
  return scene;
}

/** Signal, after two animation frames, that the shot has been painted. */
export function markShotReady() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.__shotReady = true;
    });
  });
}
