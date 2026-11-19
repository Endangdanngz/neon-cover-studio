// Editor state for Neon Cover Studio.
//
// Two kinds of data live here:
//   - the photo library: every picture the person has added, keyed by id,
//     holding the loaded Image element. Photos are never serialised into
//     undo snapshots; only their ids travel.
//   - the scene: everything that describes the cover itself (template,
//     grade, caption, which photo sits in which panel and how it is
//     cropped). The scene is plain data, so undo is just a stack of deep
//     copies of it.

import { panelsFor, templateById } from './templates.js';

/** The built-in sample pictures, in the order the default scene uses them. */
export const SAMPLES = [
  { id: 'sample-neon-woman', name: 'Neon Woman', src: 'samples/neon-woman.jpg' },
  { id: 'sample-driver', name: 'The Driver', src: 'samples/driver.jpg' },
  { id: 'sample-boulevard', name: 'Boulevard', src: 'samples/boulevard.jpg' },
  { id: 'sample-pier', name: 'The Pier', src: 'samples/pier.jpg' },
];

/** Export size presets offered in the UI. */
export const EXPORT_PRESETS = [
  { id: 'sq', label: '1080 × 1080 · Square post', w: 1080, h: 1080 },
  { id: 'portrait', label: '1080 × 1350 · Portrait post', w: 1080, h: 1350 },
  { id: 'wide', label: '1920 × 1080 · Wide banner', w: 1920, h: 1080 },
  { id: 'custom', label: 'Custom size…', w: 0, h: 0 },
];

let photoSeq = 0;

/** A fresh photo-library entry around a loaded image. */
export function makePhoto(img, name, id) {
  photoSeq += 1;
  return { id: id ?? `photo-${photoSeq}`, name, img };
}

/** One panel's placement: which photo, how far zoomed, where the crop sits. */
export function makePlacement(photoId) {
  return { photoId: photoId ?? null, zoom: 1, fx: 0.5, fy: 0.5 };
}

/** The scene the app opens with: the samples arranged on Poster Five. */
export function defaultScene() {
  const order = ['sample-neon-woman', 'sample-driver', 'sample-boulevard', 'sample-pier'];
  return {
    templateId: 'poster-five',
    gradeId: 'sunset',
    caption: { title: 'NEON HARBOR', subtitle: 'ONE CITY • ONE SCORE' },
    captionScale: 1,
    placements: order.concat(order).slice(0, 8).map((id) => makePlacement(id)),
    selected: 0,
    exportW: 1080,
    exportH: 1080,
  };
}

/**
 * Make sure the scene has a placement for every panel of its template,
 * cycling the photos already in use so a bigger grid never opens empty.
 */
export function fitPlacements(scene) {
  const count = panelsFor(scene.templateId, scene.exportW / scene.exportH).length;
  const used = scene.placements.map((p) => p.photoId).filter(Boolean);
  while (scene.placements.length < count) {
    const next = used.length ? used[scene.placements.length % used.length] : null;
    scene.placements.push(makePlacement(next));
  }
  scene.placements.length = count;
  if (scene.selected >= count) scene.selected = count - 1;
  return scene;
}

/** Deep-copy a scene (placements and caption included). */
export function cloneScene(scene) {
  return {
    ...scene,
    caption: { ...scene.caption },
    placements: scene.placements.map((p) => ({ ...p })),
  };
}

/**
 * A small undo stack of scene snapshots. push() is called before a change
 * is committed; undo() hands back the previous scene, if there is one.
 */
export class UndoStack {
  constructor(limit = 40) {
    this.limit = limit;
    this.stack = [];
  }

  push(scene) {
    this.stack.push(cloneScene(scene));
    if (this.stack.length > this.limit) this.stack.shift();
  }

  undo() {
    return this.stack.pop() ?? null;
  }

  get size() {
    return this.stack.length;
  }

  clear() {
    this.stack = [];
  }
}

/** The template object a scene is currently using. */
export function sceneTemplate(scene) {
  return templateById(scene.templateId);
}
