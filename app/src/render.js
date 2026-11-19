// The cover renderer for Neon Cover Studio.
//
// One function, renderCover(), paints a whole cover onto any 2D context at
// any pixel size. The editor preview and the PNG export both call it with
// the same scene, so what you see is exactly what you download. Everything
// here is deterministic: the film grain comes from a seeded generator, and
// no clock or random source is consulted while painting.

import { panelsFor } from './templates.js';

/** Colour grade presets: photo filter, washes, glow, and title colours. */
export const GRADES = [
  {
    id: 'sunset',
    label: 'Sunset Boulevard',
    filter: 'saturate(1.3) contrast(1.08) brightness(1.03)',
    topWash: 'rgba(70, 24, 120, 0.20)',
    glow: 'rgba(255, 122, 60, 0.30)',
    bottomWash: 'rgba(190, 30, 110, 0.34)',
    tint: 'rgba(255, 150, 80, 0.10)',
    vignette: 0.42,
    accent: '#ffb03a',
    accent2: '#ff4f8b',
    titleStops: ['#fff6da', '#ffc46b', '#ff5e8a'],
    placeholder: ['#3a1654', '#8a2a63'],
  },
  {
    id: 'neon',
    label: 'Neon Nights',
    filter: 'saturate(1.22) contrast(1.12) brightness(0.99)',
    topWash: 'rgba(16, 10, 70, 0.30)',
    glow: 'rgba(40, 200, 255, 0.20)',
    bottomWash: 'rgba(150, 20, 190, 0.36)',
    tint: 'rgba(70, 120, 255, 0.10)',
    vignette: 0.5,
    accent: '#3ae7ff',
    accent2: '#ff4fd8',
    titleStops: ['#eafdff', '#5ff2ff', '#ff4fd8'],
    placeholder: ['#0d1440', '#3c1a6e'],
  },
  {
    id: 'chrome',
    label: 'Chrome Mirage',
    filter: 'saturate(0.92) contrast(1.1) brightness(1.06)',
    topWash: 'rgba(30, 50, 80, 0.22)',
    glow: 'rgba(170, 225, 255, 0.16)',
    bottomWash: 'rgba(20, 60, 110, 0.34)',
    tint: 'rgba(160, 200, 235, 0.10)',
    vignette: 0.4,
    accent: '#a8dcff',
    accent2: '#7fb2ff',
    titleStops: ['#ffffff', '#cfeaff', '#8fb7ff'],
    placeholder: ['#1c2f47', '#3d5a7a'],
  },
  {
    id: 'pastel',
    label: 'Pastel Vice',
    filter: 'saturate(1.12) contrast(0.98) brightness(1.1)',
    topWash: 'rgba(150, 110, 220, 0.16)',
    glow: 'rgba(255, 190, 120, 0.20)',
    bottomWash: 'rgba(240, 110, 180, 0.26)',
    tint: 'rgba(255, 200, 225, 0.10)',
    vignette: 0.3,
    accent: '#ff9ecf',
    accent2: '#c9b8ff',
    titleStops: ['#ffffff', '#ffd7ec', '#c9b8ff'],
    placeholder: ['#4a2a6e', '#9a5f9e'],
  },
];

/** Look a grade up by id, falling back to the first one. */
export function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

/** A tiny seeded PRNG (mulberry32) so the grain is the same on every run. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainTile = null;

/** A small tile of monochrome noise, generated once and reused as a pattern. */
function getGrainTile() {
  if (grainTile) return grainTile;
  const size = 140;
  const tile = document.createElement('canvas');
  tile.width = size;
  tile.height = size;
  const tctx = tile.getContext('2d');
  const data = tctx.createImageData(size, size);
  const rand = mulberry32(0x9e3779b9);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(rand() * 255);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  tctx.putImageData(data, 0, 0);
  grainTile = tile;
  return tile;
}

/** Pixel rectangle of a normalised panel, inset by half the gutter per shared edge. */
function panelRect(r, W, H, gap) {
  const x0 = r.x * W;
  const y0 = r.y * H;
  const x1 = (r.x + r.w) * W;
  const y1 = (r.y + r.h) * H;
  const left = x0 + (r.x > 0.001 ? gap / 2 : 0);
  const top = y0 + (r.y > 0.001 ? gap / 2 : 0);
  const right = x1 - (r.x + r.w < 0.999 ? gap / 2 : 0);
  const bottom = y1 - (r.y + r.h < 0.999 ? gap / 2 : 0);
  return { left, top, width: right - left, height: bottom - top };
}

/** Paint one panel: its photo with cover-crop math, or a designed placeholder. */
function paintPanel(ctx, rect, placement, photo, grade) {
  const { left, top, width, height } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, width, height);
  ctx.clip();
  if (photo && photo.img && photo.img.naturalWidth > 0) {
    const img = photo.img;
    const base = Math.max(width / img.naturalWidth, height / img.naturalHeight);
    const scale = base * (placement ? placement.zoom : 1);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const fx = placement ? placement.fx : 0.5;
    const fy = placement ? placement.fy : 0.5;
    ctx.filter = grade.filter;
    ctx.drawImage(img, left + (width - dw) * fx, top + (height - dh) * fy, dw, dh);
    ctx.filter = 'none';
  } else {
    const grad = ctx.createLinearGradient(left, top, left + width, top + height);
    grad.addColorStop(0, grade.placeholder[0]);
    grad.addColorStop(1, grade.placeholder[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(left, top, width, height);
    // A soft sun disc and the panel's name keep an empty panel looking designed.
    const cx = left + width / 2;
    const cy = top + height * 0.42;
    const rad = Math.min(width, height) * 0.22;
    const sun = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    sun.addColorStop(0, 'rgba(255, 220, 160, 0.85)');
    sun.addColorStop(0.7, 'rgba(255, 140, 120, 0.35)');
    sun.addColorStop(1, 'rgba(255, 140, 120, 0)');
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  // Inner shading: a whisper of shadow at the panel's top and bottom edges.
  const edge = Math.min(height * 0.16, 90);
  const topShade = ctx.createLinearGradient(0, top, 0, top + edge);
  topShade.addColorStop(0, 'rgba(5, 0, 12, 0.28)');
  topShade.addColorStop(1, 'rgba(5, 0, 12, 0)');
  ctx.fillStyle = topShade;
  ctx.fillRect(left, top, width, edge);
  const botShade = ctx.createLinearGradient(0, top + height - edge, 0, top + height);
  botShade.addColorStop(0, 'rgba(5, 0, 12, 0)');
  botShade.addColorStop(1, 'rgba(5, 0, 12, 0.30)');
  ctx.fillStyle = botShade;
  ctx.fillRect(left, top + height - edge, width, edge);
  ctx.restore();
  // Hairline of light inside the panel edge.
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = Math.max(1, Math.min(width, height) * 0.004);
  ctx.strokeRect(left + 0.5, top + 0.5, width - 1, height - 1);
  ctx.restore();
}

/** The grade's washes, glow band, vignette and grain over the whole cover. */
function paintGrade(ctx, W, H, grade) {
  ctx.save();
  const top = ctx.createLinearGradient(0, 0, 0, H * 0.45);
  top.addColorStop(0, grade.topWash);
  top.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, W, H * 0.45);

  ctx.globalCompositeOperation = 'screen';
  const band = ctx.createLinearGradient(0, H * 0.42, 0, H * 0.78);
  band.addColorStop(0, 'rgba(0,0,0,0)');
  band.addColorStop(0.5, grade.glow);
  band.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = band;
  ctx.fillRect(0, H * 0.42, W, H * 0.36);
  ctx.globalCompositeOperation = 'source-over';

  const bottom = ctx.createLinearGradient(0, H * 0.5, 0, H);
  bottom.addColorStop(0, 'rgba(0,0,0,0)');
  bottom.addColorStop(1, grade.bottomWash);
  ctx.fillStyle = bottom;
  ctx.fillRect(0, H * 0.5, W, H * 0.5);

  ctx.fillStyle = grade.tint;
  ctx.fillRect(0, 0, W, H);

  const vig = ctx.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.36, W / 2, H * 0.52, Math.max(W, H) * 0.78);
  vig.addColorStop(0, 'rgba(4, 0, 10, 0)');
  vig.addColorStop(1, `rgba(4, 0, 10, ${grade.vignette})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = 0.05;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(getGrainTile(), 'repeat');
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** The caption block: scrim, big gradient title, neon rule, subtitle, credit. */
function paintCaption(ctx, W, H, scene, grade) {
  const caption = scene.caption;
  const lines = String(caption.title || '')
    .toUpperCase()
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2);
  const subtitle = String(caption.subtitle || '').toUpperCase().trim();

  // Scrim so the lettering reads over any photograph.
  const scrimTop = H * 0.58;
  const scrim = ctx.createLinearGradient(0, scrimTop, 0, H);
  scrim.addColorStop(0, 'rgba(7, 2, 14, 0)');
  scrim.addColorStop(0.55, 'rgba(7, 2, 14, 0.55)');
  scrim.addColorStop(1, 'rgba(7, 2, 14, 0.88)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, scrimTop, W, H - scrimTop);

  const scale = scene.captionScale || 1;
  let titleBottom = H * 0.965;
  if (subtitle) titleBottom = H * 0.9;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (lines.length) {
    let size = (lines.length > 1 ? H * 0.098 : H * 0.122) * scale;
    const fontFor = (s) => `900 ${s}px NeonDisplay, "Arial Black", Arial, sans-serif`;
    ctx.font = fontFor(size);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (widest > W * 0.92) {
      size = Math.max(10, size * ((W * 0.92) / widest));
      ctx.font = fontFor(size);
    }
    const lineHeight = size * 0.96;
    let baseline = titleBottom - (lines.length - 1) * lineHeight;
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const y = baseline;
      const fill = ctx.createLinearGradient(0, y - size, 0, y);
      fill.addColorStop(0, grade.titleStops[0]);
      fill.addColorStop(0.55, grade.titleStops[1]);
      fill.addColorStop(1, grade.titleStops[2]);
      ctx.font = fontFor(size);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(10, 2, 16, 0.92)';
      ctx.lineWidth = size * 0.14;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = size * 0.16;
      ctx.shadowOffsetY = size * 0.045;
      ctx.strokeText(lines[i], W / 2, y);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = fill;
      ctx.fillText(lines[i], W / 2, y);
      baseline -= lineHeight;
    }
    // Neon rule between title and subtitle.
    if (subtitle) {
      const ruleW = W * 0.3;
      const ruleY = titleBottom + H * 0.026;
      const rule = ctx.createLinearGradient(W / 2 - ruleW / 2, 0, W / 2 + ruleW / 2, 0);
      rule.addColorStop(0, grade.accent);
      rule.addColorStop(1, grade.accent2);
      ctx.fillStyle = rule;
      ctx.shadowColor = grade.accent;
      ctx.shadowBlur = H * 0.012;
      ctx.fillRect(W / 2 - ruleW / 2, ruleY, ruleW, Math.max(2, H * 0.004));
      ctx.shadowBlur = 0;
    }
  }
  if (subtitle) {
    const subSize = Math.max(10, H * 0.026 * scale);
    ctx.font = `700 ${subSize}px "Segoe UI", Arial, sans-serif`;
    try {
      ctx.letterSpacing = `${Math.max(2, subSize * 0.32)}px`;
    } catch {
      /* older engines: spacing is a nicety, not a requirement */
    }
    ctx.fillStyle = 'rgba(255, 244, 230, 0.92)';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = subSize * 0.4;
    ctx.fillText(subtitle, W / 2, H * 0.972);
    ctx.shadowBlur = 0;
    try {
      ctx.letterSpacing = '0px';
    } catch {
      /* ignore */
    }
  }
  ctx.restore();

  // Studio credit, bottom-right, small and quiet.
  ctx.save();
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  const creditSize = Math.max(8, H * 0.0135);
  ctx.font = `700 ${creditSize}px "Segoe UI", Arial, sans-serif`;
  try {
    ctx.letterSpacing = `${creditSize * 0.28}px`;
  } catch {
    /* ignore */
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.fillText('NEON COVER STUDIO', W * 0.985, H * 0.988);
  ctx.restore();
}

/**
 * Paint the whole cover described by `scene` onto ctx at W x H pixels.
 * photosById maps photo ids to photo entries ({ img }). opts.highlight, when
 * >= 0, outlines that panel (editor only; exports pass nothing).
 */
export function renderCover(ctx, W, H, scene, photosById, opts = {}) {
  const grade = gradeById(scene.gradeId);
  const rects = panelsFor(scene.templateId, W / H);
  ctx.save();
  ctx.fillStyle = '#0d0616';
  ctx.fillRect(0, 0, W, H);
  const gap = Math.max(3, Math.round(Math.min(W, H) * 0.007));
  rects.forEach((r, i) => {
    const placement = scene.placements[i] ?? null;
    const photo = placement && placement.photoId ? photosById.get(placement.photoId) : null;
    paintPanel(ctx, panelRect(r, W, H, gap), placement, photo ?? null, grade);
  });
  paintGrade(ctx, W, H, grade);
  paintCaption(ctx, W, H, scene, grade);
  // A slim neon frame line across the very top of the poster.
  const frame = ctx.createLinearGradient(0, 0, W, 0);
  frame.addColorStop(0, grade.accent);
  frame.addColorStop(0.5, grade.accent2);
  frame.addColorStop(1, grade.accent);
  ctx.fillStyle = frame;
  ctx.fillRect(0, 0, W, Math.max(2, H * 0.004));
  if (opts.highlight != null && opts.highlight >= 0 && rects[opts.highlight]) {
    const r = panelRect(rects[opts.highlight], W, H, gap);
    ctx.strokeStyle = grade.accent;
    ctx.lineWidth = Math.max(2, Math.min(W, H) * 0.005);
    ctx.shadowColor = grade.accent;
    ctx.shadowBlur = Math.min(W, H) * 0.02;
    ctx.strokeRect(r.left, r.top, r.width, r.height);
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

/** The pixel rectangles of a scene's panels at W x H (for click hit-testing). */
export function panelRectsAt(scene, W, H) {
  const gap = Math.max(3, Math.round(Math.min(W, H) * 0.007));
  return panelsFor(scene.templateId, W / H).map((r) => panelRect(r, W, H, gap));
}
