// Vice City Cover Studio — the editor.
// Loads the person's photos, lets them pick a layout, a grade and a size,
// crop and position each panel, edit the caption, and export a PNG.
// Photos are read on this machine and never uploaded anywhere.

import { SIZES, LAYOUTS, GRADES, panelRects, renderCover, exportCover } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const query = new URLSearchParams(location.search);

/** The editor state. panels[i] is the crop for panel i of the current layout. */
const state = {
  layout: 'hero',
  grade: 'sunset',
  size: 'square',
  title: 'PIER PRESSURE',
  subtitle: 'vice city nights',
  photos: [],
  panels: [],
};

let selectedPanel = 0;

function defaultPanels() {
  const count = LAYOUTS[state.layout].panels;
  const next = [];
  for (let i = 0; i < count; i++) {
    const old = state.panels[i];
    next.push(old || { photo: i === 0 ? 0 : 1, zoom: 1, ox: 0.5, oy: 0.5 });
  }
  state.panels = next;
  if (selectedPanel >= count) selectedPanel = 0;
}

function photoName(i) {
  return state.photos[i]?.name ?? `Photo ${i + 1}`;
}

function loadImage(src, name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      img.name = name;
      resolve(img);
    };
    img.onerror = () => reject(new Error(`could not load ${name}`));
    img.src = src;
  });
}

async function loadSample(name) {
  const img = await loadImage(`samples/${name}.jpg`, name);
  state.photos.push(img);
  syncPhotoControls();
  renderPreview();
  return img;
}

async function loadFiles(files) {
  let added = 0;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const img = await loadImage(URL.createObjectURL(file), file.name.replace(/\.[^.]+$/, ''));
    state.photos.push(img);
    added++;
  }
  if (added > 0) {
    syncPhotoControls();
    renderPreview();
  }
  return added;
}

/** Re-mark the layout/grade/size pickers from the current state. */
function syncPickers() {
  const mark = (boxId, keys, current) => {
    const box = $(boxId);
    [...box.querySelectorAll('.pick')].forEach((el, i) => {
      el.classList.toggle('active', keys[i] === current);
    });
  };
  mark('layouts', Object.keys(LAYOUTS), state.layout);
  mark('grades', Object.keys(GRADES), state.grade);
  mark('sizes', Object.keys(SIZES), state.size);
}
function renderPreview() {
  const canvas = $('preview');
  const size = SIZES[state.size];
  const scale = Math.min(560 / size.w, 560 / size.h, 1);
  canvas.width = Math.round(size.w * scale);
  canvas.height = Math.round(size.h * scale);
  renderCover(canvas, state);
  $('previewSize').textContent = `${size.label} — ${state.layout} layout`;
  syncPanelChips();
}

/** Panel chips under the preview: click one to edit that panel. */
function syncPanelChips() {
  const box = $('panels');
  box.innerHTML = '';
  state.panels.forEach((panel, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `chip${i === selectedPanel ? ' active' : ''}`;
    b.textContent = `Panel ${i + 1} · ${panel.photo >= 0 ? photoName(panel.photo) : 'empty'}`;
    b.addEventListener('click', () => {
      selectedPanel = i;
      syncPanelControls();
      renderPreview();
    });
    box.appendChild(b);
  });
}

function syncPhotoControls() {
  const sel = $('panelPhoto');
  sel.innerHTML = '';
  const empty = document.createElement('option');
  empty.value = '-1';
  empty.textContent = 'Empty panel';
  sel.appendChild(empty);
  state.photos.forEach((img, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = photoName(i);
    sel.appendChild(o);
  });
  syncPanelControls();
}

function syncPanelControls() {
  const panel = state.panels[selectedPanel];
  if (!panel) return;
  $('panelPhoto').value = String(panel.photo);
  $('zoom').value = String(panel.zoom);
  $('posX').value = String(panel.ox * 100);
  $('posY').value = String(panel.oy * 100);
  $('zoomVal').textContent = `${Math.round(panel.zoom * 100)}%`;
}

function buildPickers() {
  const layoutBox = $('layouts');
  for (const [key, def] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `pick${state.layout === key ? ' active' : ''}`;
    b.textContent = def.label;
    b.addEventListener('click', () => {
      state.layout = key;
      defaultPanels();
      layoutBox.querySelectorAll('.pick').forEach((el) => el.classList.remove('active'));
      b.classList.add('active');
      renderPreview();
    });
    layoutBox.appendChild(b);
  }
  const gradeBox = $('grades');
  for (const [key, def] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `pick${state.grade === key ? ' active' : ''}`;
    b.innerHTML = `<span class="swatch" style="background:${def.swatch}"></span>${def.label}`;
    b.addEventListener('click', () => {
      state.grade = key;
      gradeBox.querySelectorAll('.pick').forEach((el) => el.classList.remove('active'));
      b.classList.add('active');
      renderPreview();
    });
    gradeBox.appendChild(b);
  }
  const sizeBox = $('sizes');
  for (const [key, def] of Object.entries(SIZES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `pick${state.size === key ? ' active' : ''}`;
    b.textContent = def.label;
    b.addEventListener('click', () => {
      state.size = key;
      sizeBox.querySelectorAll('.pick').forEach((el) => el.classList.remove('active'));
      b.classList.add('active');
      renderPreview();
    });
    sizeBox.appendChild(b);
  }
}

/** Hit-test the preview canvas: which panel is under this canvas point? */
function panelAt(cx, cy) {
  const canvas = $('preview');
  const W = canvas.width;
  const H = canvas.height;
  const bandH = Math.round(H * (state.size === 'wide' ? 0.24 : 0.2));
  const margin = Math.round(W * 0.016);
  const area = { x: margin, y: margin, w: W - margin * 2, h: H - bandH - margin };
  const rects = panelRects(state.layout, area);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) return i;
  }
  return -1;
}

function bindPreviewDrag() {
  const canvas = $('preview');
  let dragging = null;
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const cy = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const hit = panelAt(cx, cy);
    if (hit < 0) return;
    selectedPanel = hit;
    syncPanelControls();
    renderPreview();
    canvas.setPointerCapture(e.pointerId);
    dragging = { x: cx, y: cy, panel: state.panels[hit] };
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const cy = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const panel = dragging.panel;
    const img = state.photos[panel.photo];
    if (img) {
      const scale = Math.max(1, panel.zoom);
      panel.ox = Math.min(1, Math.max(0, panel.ox - (cx - dragging.x) / (canvas.width * scale)));
      panel.oy = Math.min(1, Math.max(0, panel.oy - (cy - dragging.y) / (canvas.height * scale)));
      dragging.x = cx;
      dragging.y = cy;
      syncPanelControls();
      renderPreview();
    }
  });
  canvas.addEventListener('pointerup', () => { dragging = null; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const panel = state.panels[selectedPanel];
    if (!panel) return;
    panel.zoom = Math.min(3, Math.max(1, panel.zoom * (1 - e.deltaY * 0.001)));
    syncPanelControls();
    renderPreview();
  }, { passive: false });
}

function bindControls() {
  $('photo').addEventListener('change', async (e) => {
    const n = await loadFiles(e.target.files);
    $('status').textContent = n > 0 ? `${n} photo${n > 1 ? 's' : ''} loaded.` : 'Pick an image file.';
    e.target.value = '';
  });
  $('sampleBoulevard').addEventListener('click', async () => {
    await loadSample('boulevard');
    $('status').textContent = 'Sample photo loaded: boulevard.';
  });
  $('samplePier').addEventListener('click', async () => {
    await loadSample('pier');
    $('status').textContent = 'Sample photo loaded: pier.';
  });
  $('fillAll').addEventListener('click', () => {
    const photo = state.panels[selectedPanel]?.photo ?? 0;
    state.panels.forEach((p) => { p.photo = photo; });
    syncPhotoControls();
    renderPreview();
    $('status').textContent = 'One photo in every panel.';
  });
  $('panelPhoto').addEventListener('change', (e) => {
    const panel = state.panels[selectedPanel];
    if (panel) panel.photo = Number(e.target.value);
    renderPreview();
  });
  $('zoom').addEventListener('input', (e) => {
    const panel = state.panels[selectedPanel];
    if (panel) panel.zoom = Number(e.target.value);
    syncPanelControls();
    renderPreview();
  });
  $('posX').addEventListener('input', (e) => {
    const panel = state.panels[selectedPanel];
    if (panel) panel.ox = Number(e.target.value) / 100;
    renderPreview();
  });
  $('posY').addEventListener('input', (e) => {
    const panel = state.panels[selectedPanel];
    if (panel) panel.oy = Number(e.target.value) / 100;
    renderPreview();
  });
  $('title').addEventListener('input', (e) => {
    state.title = e.target.value;
    renderPreview();
  });
  $('subtitle').addEventListener('input', (e) => {
    state.subtitle = e.target.value;
    renderPreview();
  });
  $('exportBtn').addEventListener('click', async () => {
    const canvas = exportCover(state, state.size);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-city-cover-${state.size}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    $('status').textContent = `Exported ${SIZES[state.size].label} PNG.`;
  });
}

/** The export path the screenshot scenes use: a real PNG, as data. */
async function exportPNG(sizeKey) {
  const canvas = exportCover(state, sizeKey);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  const dataURL = await new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.readAsDataURL(blob);
  });
  return { dataURL, width: canvas.width, height: canvas.height };
}

async function init() {
  defaultPanels();
  buildPickers();
  bindControls();
  bindPreviewDrag();
  // A cover on screen immediately: the two kit sample photos, free to use.
  await loadSample('pier');
  await loadSample('boulevard');
  state.panels.forEach((p, i) => { p.photo = i === 0 ? 0 : 1; });
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  syncPhotoControls();
  renderPreview();

  window.__viceCity = { state, exportPNG, loadSample, loadFiles, renderPreview, syncPickers };
  if (query.get('shot')) {
    await runShot(query.get('shot'), query, window.__viceCity);
  }
}

init().catch((err) => {
  $('status').textContent = `Something went wrong: ${err.message}`;
});
