// Neon Cover Studio — page wiring.
//
// Loads photos (uploaded files stay on this machine; samples ship with the
// app), keeps the scene in state.js, paints the preview through the same
// renderCover() the export uses, and handles the shot mode the screenshots
// are taken with (./shots.js).

import {
  EXPORT_PRESETS,
  SAMPLES,
  UndoStack,
  defaultScene,
  fitPlacements,
  makePhoto,
} from './state.js';
import { TEMPLATES, panelsFor, templateById } from './templates.js';
import { GRADES, gradeById, panelRectsAt, renderCover } from './render.js';
import { markShotReady, readShotConfig, sceneFromShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const ctx = canvas.getContext('2d');
const status = $('status');

const photos = new Map(); // id -> { id, name, img }
let scene = defaultScene();
const undo = new UndoStack(40);
const shot = readShotConfig(new URLSearchParams(location.search));
const shotCover = shot && shot.mode === 'cover';

/** Load an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/** Load one of the bundled samples into the library, once. */
async function ensureSample(sample) {
  if (photos.has(sample.id)) return photos.get(sample.id);
  const img = await loadImage(sample.src);
  const photo = makePhoto(img, sample.name, sample.id);
  photos.set(photo.id, photo);
  return photo;
}

async function ensureSamples(list) {
  for (const sample of list) await ensureSample(sample);
}

/** Snapshot the scene so the change about to happen can be undone. */
function beginChange() {
  undo.push(scene);
  $('undo').disabled = false;
}

/**
 * Give a placement a sensible focal point for its panel's shape: a tall
 * photo squeezed into a short, wide panel favours the upper third, where
 * faces usually are, instead of a blind centre crop.
 */
function smartFocal(placement, panelIndex, target = scene) {
  const photo = placement.photoId && photos.get(placement.photoId);
  if (!photo) return;
  const rects = panelsFor(target.templateId, target.exportW / target.exportH);
  const r = rects[panelIndex];
  if (!r) return;
  const pw = r.w * target.exportW;
  const ph = r.h * target.exportH;
  const scale = Math.max(pw / photo.img.naturalWidth, ph / photo.img.naturalHeight);
  const drawnH = photo.img.naturalHeight * scale * (placement.zoom || 1);
  placement.fy = drawnH > ph * 1.6 ? 0.25 : 0.5;
}

/** Apply smartFocal to every placement of a scene. */
function smartFocalAll(target = scene) {
  target.placements.forEach((p, i) => smartFocal(p, i, target));
}

/* ---------------- painting ---------------- */

/** The preview canvas's pixel size: the export size, capped for speed. */
function previewSize() {
  if (shotCover) return { w: scene.exportW, h: scene.exportH };
  const cap = 980;
  const s = Math.min(1, cap / Math.max(scene.exportW, scene.exportH));
  return { w: Math.max(60, Math.round(scene.exportW * s)), h: Math.max(60, Math.round(scene.exportH * s)) };
}

/** Paint the preview (with the selection outline, unless shooting a cover). */
function render() {
  const { w, h } = previewSize();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  renderCover(ctx, w, h, scene, photos, { highlight: shotCover ? -1 : scene.selected });
  $('stage-label').textContent =
    `Preview — ${templateById(scene.templateId).label} · ${gradeById(scene.gradeId).label}`;
  $('stage-size').textContent = `exports at ${scene.exportW} × ${scene.exportH}`;
}

/* ---------------- control synchronisation ---------------- */

function buildTemplateList() {
  const host = $('template-list');
  host.innerHTML = '';
  for (const t of TEMPLATES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'template-btn' + (t.id === scene.templateId ? ' active' : '');
    const glyph = document.createElement('span');
    glyph.className = 'template-glyph';
    glyph.style.gridTemplateColumns = 'repeat(12, 1fr)';
    glyph.style.gridTemplateRows = 'repeat(12, 1fr)';
    for (const p of t.panels(1)) {
      const cell = document.createElement('i');
      cell.style.gridColumn = `${Math.round(p.x * 12) + 1} / ${Math.round((p.x + p.w) * 12) + 1}`;
      cell.style.gridRow = `${Math.round(p.y * 12) + 1} / ${Math.round((p.y + p.h) * 12) + 1}`;
      glyph.appendChild(cell);
    }
    const name = document.createElement('span');
    name.textContent = t.label;
    btn.append(glyph, name);
    btn.addEventListener('click', () => {
      if (scene.templateId === t.id) return;
      beginChange();
      scene.templateId = t.id;
      fitPlacements(scene);
      syncAll();
    });
    host.appendChild(btn);
  }
  $('template-blurb').textContent = templateById(scene.templateId).blurb;
}

function buildGradeList() {
  const host = $('grade-list');
  host.innerHTML = '';
  for (const g of GRADES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'grade-btn' + (g.id === scene.gradeId ? ' active' : '');
    const swatch = document.createElement('span');
    swatch.className = 'grade-swatch';
    swatch.style.background = `linear-gradient(135deg, ${g.titleStops[1]}, ${g.titleStops[2]} 60%, ${g.accent})`;
    const name = document.createElement('span');
    name.textContent = g.label;
    btn.append(swatch, name);
    btn.addEventListener('click', () => {
      if (scene.gradeId === g.id) return;
      beginChange();
      scene.gradeId = g.id;
      syncAll();
    });
    host.appendChild(btn);
  }
}

function buildThumbs() {
  const sampleRow = $('sample-row');
  sampleRow.innerHTML = '';
  for (const sample of SAMPLES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb';
    btn.title = `Load sample: ${sample.name}`;
    const img = document.createElement('img');
    img.src = sample.src;
    img.alt = sample.name;
    const label = document.createElement('span');
    label.className = 'thumb-name';
    label.textContent = sample.name.replace(/^The /, '').split(' ')[0];
    btn.append(img, label);
    btn.addEventListener('click', async () => {
      await ensureSample(sample);
      assignToSelected(sample.id);
    });
    sampleRow.appendChild(btn);
  }
  const lib = $('library-row');
  lib.innerHTML = '';
  const userPhotos = [...photos.values()].filter((p) => !p.id.startsWith('sample-'));
  if (!userPhotos.length) {
    const empty = document.createElement('p');
    empty.className = 'library-empty';
    empty.textContent = 'Nothing yet — drop a photo above.';
    lib.appendChild(empty);
  }
  for (const photo of userPhotos) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb';
    btn.title = photo.name;
    const img = document.createElement('img');
    img.src = photo.img.src;
    img.alt = photo.name;
    btn.appendChild(img);
    btn.addEventListener('click', () => assignToSelected(photo.id));
    lib.appendChild(btn);
  }
}

function assignToSelected(photoId) {
  beginChange();
  const placement = scene.placements[scene.selected];
  placement.photoId = photoId;
  placement.zoom = 1;
  placement.fx = 0.5;
  placement.fy = 0.5;
  smartFocal(placement, scene.selected);
  syncAll();
  status.textContent = 'Photo placed in the selected panel.';
}

function buildPanelControls() {
  const panels = panelsFor(scene.templateId, scene.exportW / scene.exportH);
  $('panel-name').textContent = panels[scene.selected]?.name ?? 'Panel';
  const tabs = $('panel-tabs');
  tabs.innerHTML = '';
  panels.forEach((p, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'panel-tab' + (i === scene.selected ? ' active' : '');
    btn.textContent = `${i + 1} · ${p.name}`;
    btn.addEventListener('click', () => {
      scene.selected = i;
      syncAll();
    });
    tabs.appendChild(btn);
  });
  const select = $('panel-photo');
  select.innerHTML = '';
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = '— Empty panel —';
  select.appendChild(empty);
  for (const photo of photos.values()) {
    const opt = document.createElement('option');
    opt.value = photo.id;
    opt.textContent = photo.name;
    select.appendChild(opt);
  }
  const placement = scene.placements[scene.selected];
  select.value = placement?.photoId ?? '';
  $('panel-zoom').value = placement?.zoom ?? 1;
  $('panel-fx').value = placement?.fx ?? 0.5;
  $('panel-fy').value = placement?.fy ?? 0.5;
}

function buildCaptionControls() {
  const [line1 = '', line2 = ''] = String(scene.caption.title || '').split('\n');
  $('cap-title-1').value = line1;
  $('cap-title-2').value = line2;
  $('cap-sub').value = scene.caption.subtitle || '';
  $('cap-scale').value = scene.captionScale || 1;
}

function buildExportControls() {
  const select = $('export-size');
  if (!select.options.length) {
    for (const preset of EXPORT_PRESETS) {
      const opt = document.createElement('option');
      opt.value = preset.id;
      opt.textContent = preset.label;
      select.appendChild(opt);
    }
  }
  const match = EXPORT_PRESETS.find((p) => p.w === scene.exportW && p.h === scene.exportH);
  select.value = match ? match.id : 'custom';
  $('custom-size').hidden = select.value !== 'custom';
  $('export-w').value = scene.exportW;
  $('export-h').value = scene.exportH;
}

/** Rebuild every control from the scene, then paint. */
function syncAll() {
  buildTemplateList();
  buildGradeList();
  buildThumbs();
  buildPanelControls();
  buildCaptionControls();
  buildExportControls();
  $('undo').disabled = undo.size === 0;
  render();
}

/* ---------------- photo intake ---------------- */

async function addFiles(files) {
  const images = [...files].filter((f) => f.type.startsWith('image/'));
  if (!images.length) return;
  beginChange();
  let first = null;
  for (const file of images) {
    try {
      const img = await loadImage(URL.createObjectURL(file));
      const photo = makePhoto(img, file.name.replace(/\.[^.]+$/, '') || 'Photo');
      photos.set(photo.id, photo);
      first = first ?? photo;
    } catch {
      status.textContent = `Could not read ${file.name}.`;
    }
  }
  if (first) {
    // Fill the selected panel first, then any empty panels, in order.
    const order = [scene.selected, ...scene.placements.keys()];
    const added = [...photos.values()].filter((p) => !p.id.startsWith('sample-')).slice(-images.length);
    let ai = 0;
    for (const idx of order) {
      if (ai >= added.length) break;
      if (idx === scene.selected || !scene.placements[idx].photoId) {
        scene.placements[idx].photoId = added[ai].id;
        smartFocal(scene.placements[idx], idx);
        ai += 1;
      }
    }
    status.textContent = `${added.length} photo${added.length === 1 ? '' : 's'} added — click a panel to arrange.`;
  }
  syncAll();
}

/* ---------------- wiring ---------------- */

function wire() {
  $('file-input').addEventListener('change', (e) => {
    addFiles(e.target.files);
    e.target.value = '';
  });
  const dz = $('dropzone');
  const onDrag = (e) => {
    e.preventDefault();
    dz.classList.toggle('dragging', e.type === 'dragover');
  };
  dz.addEventListener('dragover', onDrag);
  dz.addEventListener('dragleave', onDrag);
  dz.addEventListener('drop', (e) => {
    dz.classList.remove('dragging');
    addFiles(e.dataTransfer.files);
  });
  canvas.addEventListener('dragover', (e) => e.preventDefault());
  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  });

  // Caption fields: one snapshot per editing session (on focus).
  const snapOnFocus = (el) => el.addEventListener('focus', beginChange);
  const readCaption = () => {
    const l1 = $('cap-title-1').value.trim();
    const l2 = $('cap-title-2').value.trim();
    scene.caption.title = [l1, l2].filter(Boolean).join('\n');
    scene.caption.subtitle = $('cap-sub').value;
    render();
  };
  for (const id of ['cap-title-1', 'cap-title-2', 'cap-sub']) {
    snapOnFocus($(id));
    $(id).addEventListener('input', readCaption);
  }
  $('cap-scale').addEventListener('pointerdown', beginChange);
  $('cap-scale').addEventListener('input', (e) => {
    scene.captionScale = Number(e.target.value);
    render();
  });

  // Panel controls.
  $('panel-photo').addEventListener('change', (e) => {
    beginChange();
    scene.placements[scene.selected].photoId = e.target.value || null;
    syncAll();
  });
  const bindSlider = (id, key) => {
    const el = $(id);
    el.addEventListener('pointerdown', beginChange);
    el.addEventListener('input', () => {
      scene.placements[scene.selected][key] = Number(el.value);
      render();
    });
  };
  bindSlider('panel-zoom', 'zoom');
  bindSlider('panel-fx', 'fx');
  bindSlider('panel-fy', 'fy');

  // Canvas: click selects a panel; drag slides its photo.
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const rects = panelRectsAt(scene, canvas.width, canvas.height);
    const hit = rects.findIndex((r) => x >= r.left && x <= r.left + r.width && y >= r.top && y <= r.top + r.height);
    if (hit === -1) return;
    if (hit !== scene.selected) {
      scene.selected = hit;
      buildPanelControls();
      render();
    }
    beginChange();
    drag = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const placement = scene.placements[scene.selected];
    const photo = placement && photos.get(placement.photoId);
    if (!photo) return;
    const rects = panelRectsAt(scene, canvas.width, canvas.height);
    const r = rects[scene.selected];
    const base = Math.max(r.width / photo.img.naturalWidth, r.height / photo.img.naturalHeight);
    const dw = photo.img.naturalWidth * base * placement.zoom;
    const dh = photo.img.naturalHeight * base * placement.zoom;
    const dx = ((e.clientX - drag.x) / canvas.getBoundingClientRect().width) * canvas.width;
    const dy = ((e.clientY - drag.y) / canvas.getBoundingClientRect().height) * canvas.height;
    if (dw > r.width) placement.fx = clamp01(placement.fx + dx / (r.width - dw));
    if (dh > r.height) placement.fy = clamp01(placement.fy + dy / (r.height - dh));
    drag = { x: e.clientX, y: e.clientY };
    $('panel-fx').value = placement.fx;
    $('panel-fy').value = placement.fy;
    render();
  });
  const endDrag = () => {
    drag = null;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  // Export size + export.
  $('export-size').addEventListener('change', (e) => {
    const preset = EXPORT_PRESETS.find((p) => p.id === e.target.value);
    beginChange();
    if (preset && preset.id !== 'custom') {
      scene.exportW = preset.w;
      scene.exportH = preset.h;
    }
    buildExportControls();
    render();
  });
  const readCustom = () => {
    const w = Math.round(Number($('export-w').value));
    const h = Math.round(Number($('export-h').value));
    if (w >= 240 && w <= 4096 && h >= 240 && h <= 4096) {
      scene.exportW = w;
      scene.exportH = h;
      render();
    }
  };
  $('export-w').addEventListener('focus', beginChange);
  $('export-h').addEventListener('focus', beginChange);
  $('export-w').addEventListener('input', readCustom);
  $('export-h').addEventListener('input', readCustom);
  $('export').addEventListener('click', () => {
    const off = document.createElement('canvas');
    off.width = scene.exportW;
    off.height = scene.exportH;
    renderCover(off.getContext('2d'), off.width, off.height, scene, photos, { highlight: -1 });
    off.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `neon-cover-${scene.exportW}x${scene.exportH}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      status.textContent = `Saved neon-cover-${scene.exportW}x${scene.exportH}.png`;
    }, 'image/png');
  });

  $('undo').addEventListener('click', () => {
    const prev = undo.undo();
    if (!prev) return;
    scene = prev;
    fitPlacements(scene);
    syncAll();
  });
  $('reset').addEventListener('click', async () => {
    beginChange();
    await ensureSamples(SAMPLES);
    scene = defaultScene();
    smartFocalAll();
    syncAll();
    status.textContent = 'Back to the opening scene.';
  });
}

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

/* ---------------- start ---------------- */

async function start() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('90px NeonDisplay'), document.fonts.ready]),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  } catch {
    /* the fallback stack in the renderer still paints */
  }
  if (shot) {
    scene = sceneFromShot(shot);
    const wanted = SAMPLES.filter((s) => scene.placements.some((p) => p.photoId === s.id));
    await ensureSamples(wanted.length ? wanted : SAMPLES);
    smartFocalAll(scene);
    if (shotCover) {
      document.body.classList.add('shot-cover');
      if (!shot.w || !shot.h) {
        scene.exportW = window.innerWidth;
        scene.exportH = window.innerHeight;
      }
      render();
    } else {
      wire();
      syncAll();
    }
    markShotReady();
    return;
  }
  await ensureSamples(SAMPLES);
  smartFocalAll();
  wire();
  syncAll();
}

start();
