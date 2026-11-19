// Fixed scenes for screenshots.
//   ?shot=editor  the full editor with a sample photo loaded, for the app shot.
//   ?shot=cover   the cover alone at export size, for the exported-cover shots.
// `photo` picks the sample (pier, boulevard or both), `caption` the title,
// `layout`, `grade` and `size` pick the cover. window.__shotReady is set
// once painted, and window.__exported holds the PNG the app itself wrote.
import { SIZES, panelRects, renderCover } from './cover.js';

export async function runShot(shot, query, app) {
  const { state } = app;
  const title = query.get('caption');
  if (title) state.title = title;
  const subtitle = query.get('subtitle');
  if (subtitle) state.subtitle = subtitle;
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('size')) state.size = query.get('size');

  const photo = query.get('photo') ?? 'both';
  if (photo === 'pier') state.panels.forEach((p) => { p.photo = 0; });
  if (photo === 'boulevard') state.panels.forEach((p) => { p.photo = 1; });
  if (photo === 'both') state.panels.forEach((p, i) => { p.photo = i === 0 ? 0 : 1; });
  // Fresh crops for the shot so every panel shows its subject: a wide panel
  // frames the face (top of the photo), a tall one the centre.
  const size0 = SIZES[state.size];
  const bandH0 = Math.round(size0.h * (state.size === 'wide' ? 0.24 : 0.2));
  const rects0 = panelRects(state.layout, { x: 0, y: 0, w: size0.w, h: size0.h - bandH0 });
  state.panels.forEach((p, i) => {
    p.zoom = 1;
    p.ox = 0.5;
    p.oy = rects0[i] && rects0[i].w > rects0[i].h * 1.2 ? 0.18 : 0.5;
  });

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const canvas = document.getElementById('preview');
    const size = SIZES[state.size];
    canvas.width = size.w;
    canvas.height = size.h;
    canvas.style.width = `${Math.min(size.w, 1100)}px`;
    canvas.style.height = 'auto';
    renderCover(canvas, state);
    app.exportPNG(state.size).then((shot2) => {
      window.__exported = shot2;
      window.__shotReady = true;
    });
    return;
  }

  // Editor scene: the caption fields show the shot's words.
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  app.syncPickers();
  app.renderPreview();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
