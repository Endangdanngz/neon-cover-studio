// Layout templates for Neon Cover Studio.
//
// Every template is a set of panels in normalised cover space (x, y, w, h
// each in 0..1). The renderer multiplies them by the real pixel size of the
// cover being drawn, so one template works at 1080x1080, 1080x1350,
// 1920x1080 or any custom size. A few templates nudge their hero panel wider
// or narrower with the aspect ratio so the grid still feels composed on a
// landscape banner and on a tall portrait.

/** Clamp a number into a range. */
function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

/** One panel: a display name plus its normalised rectangle. */
function panel(name, x, y, w, h) {
  return { name, x, y, w, h };
}

export const TEMPLATES = [
  {
    id: 'poster-five',
    label: 'Poster Five',
    blurb: 'The classic cover grid: one tall hero, two stacked beats, a wide base strip.',
    panels(aspect) {
      const heroW = clamp(0.40 + aspect * 0.045, 0.42, 0.50);
      return [
        panel('Hero', 0, 0, heroW, 0.76),
        panel('Beat One', heroW, 0, 1 - heroW, 0.38),
        panel('Beat Two', heroW, 0.38, 1 - heroW, 0.38),
        panel('Base Left', 0, 0.76, 0.52, 0.24),
        panel('Base Right', 0.52, 0.76, 0.48, 0.24),
      ];
    },
  },
  {
    id: 'triptych',
    label: 'Triptych',
    blurb: 'Three full-height columns, like a cinema triptych poster.',
    panels() {
      const third = 1 / 3;
      return [
        panel('Left Column', 0, 0, third, 1),
        panel('Centre Column', third, 0, third, 1),
        panel('Right Column', 2 * third, 0, third, 1),
      ];
    },
  },
  {
    id: 'hero-strip',
    label: 'Hero Strip',
    blurb: 'One wide cinematic panel on top, three story beats underneath.',
    panels(aspect) {
      const topH = clamp(0.66 - aspect * 0.03, 0.56, 0.64);
      const third = 1 / 3;
      return [
        panel('Headline Panel', 0, 0, 1, topH),
        panel('Beat One', 0, topH, third, 1 - topH),
        panel('Beat Two', third, topH, third, 1 - topH),
        panel('Beat Three', 2 * third, topH, third, 1 - topH),
      ];
    },
  },
  {
    id: 'quad-grid',
    label: 'Quad Grid',
    blurb: 'A bold two-by-two grid; four equal stories, one cover.',
    panels() {
      return [
        panel('Top Left', 0, 0, 0.5, 0.5),
        panel('Top Right', 0.5, 0, 0.5, 0.5),
        panel('Bottom Left', 0, 0.5, 0.5, 0.5),
        panel('Bottom Right', 0.5, 0.5, 0.5, 0.5),
      ];
    },
  },
  {
    id: 'mural',
    label: 'Mural Duet',
    blurb: 'Two sweeping panels split by a diagonal-feel offset seam.',
    panels() {
      return [
        panel('Lead', 0, 0, 0.58, 1),
        panel('Counterpoint Top', 0.58, 0, 0.42, 0.55),
        panel('Counterpoint Base', 0.58, 0.55, 0.42, 0.45),
      ];
    },
  },
];

/** Look a template up by id, falling back to the first one. */
export function templateById(id) {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

/** The panel rectangles of a template at a given cover aspect (w / h). */
export function panelsFor(templateId, aspect) {
  return templateById(templateId).panels(aspect);
}
