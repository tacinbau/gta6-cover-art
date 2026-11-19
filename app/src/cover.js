// Vice City Cover Studio — the cover engine.
// Draws a multi-panel GTA-poster-style cover on any 2D canvas: panels of the
// person's photos, a sunset/neon colour grade, bold original lettering and a
// title band. Every letter, panel and gradient here is drawn by this file;
// nothing is copied from any game.

export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 x 1350' },
  wide: { w: 1920, h: 1080, label: '1920 x 1080' },
};

export const LAYOUTS = {
  hero: { label: 'Hero grid', panels: 4 },
  strip: { label: 'Comic strip', panels: 3 },
  duo: { label: 'Split duo', panels: 2 },
  bleed: { label: 'Full bleed', panels: 1 },
};

export const GRADES = {
  sunset: { label: 'Sunset', swatch: '#ff7a3d' },
  neon: { label: 'Neon nights', swatch: '#ff2e88' },
  dusk: { label: 'Palm dusk', swatch: '#7b2ff7' },
  noir: { label: 'Noir', swatch: '#222222' },
};

/** A small deterministic random source so grain looks the same every render. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Panel rectangles in unit space (0..1 of the photo area), per layout. */
export function panelRects(layout, area) {
  const { x, y, w, h } = area;
  if (layout === 'hero') {
    const right = x + w * 0.62;
    const third = h / 3;
    return [
      { x, y, w: w * 0.62, h },
      { x: right, y, w: w * 0.38, h: third },
      { x: right, y: y + third, w: w * 0.38, h: third },
      { x: right, y: y + third * 2, w: w * 0.38, h: third },
    ];
  }
  if (layout === 'strip') {
    const third = w / 3;
    return [
      { x, y, w: third, h },
      { x: x + third, y, w: third, h },
      { x: x + third * 2, y, w: third, h },
    ];
  }
  if (layout === 'duo') {
    return [
      { x, y, w: w * 0.55, h: h * 0.94 },
      { x: x + w * 0.55, y: y + h * 0.06, w: w * 0.45, h: h * 0.94 },
    ];
  }
  return [{ x, y, w, h }];
}

/** Draw one photo into a panel rect, cover-fit, with the panel's crop state. */
function drawPhotoPanel(ctx, img, rect, crop, grade) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (img) {
    const zoom = crop.zoom || 1;
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    let dx = x + w / 2 - (crop.ox ?? 0.5) * dw;
    let dy = y + h / 2 - (crop.oy ?? 0.5) * dh;
    dx = Math.min(x, Math.max(x + w - dw, dx));
    dy = Math.min(y, Math.max(y + h - dh, dy));
    if (grade === 'noir') ctx.filter = 'grayscale(0.75) contrast(1.18) brightness(1.04)';
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = 'none';
  } else {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#2a1b4d');
    g.addColorStop(1, '#120e26');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = `900 ${Math.round(h * 0.055)}px 'Arial Black', Impact, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD PHOTO', x + w / 2, y + h / 2);
  }
  applyGradeWash(ctx, rect, grade);
  ctx.restore();
}

/** The colour grade washed over a finished panel. */
function applyGradeWash(ctx, rect, grade) {
  const { x, y, w, h } = rect;
  if (grade === 'sunset') {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, 'rgba(255,122,61,0.28)');
    g.addColorStop(0.55, 'rgba(255,46,136,0.10)');
    g.addColorStop(1, 'rgba(123,47,247,0.30)');
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(255,150,60,0.10)';
    ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'source-over';
  } else if (grade === 'neon') {
    const g = ctx.createLinearGradient(x, y + h, x + w, y);
    g.addColorStop(0, 'rgba(255,46,136,0.42)');
    g.addColorStop(0.5, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,229,255,0.38)');
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'source-over';
  } else if (grade === 'dusk') {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(96,52,180,0.28)';
    ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createLinearGradient(x, y + h, x, y);
    g.addColorStop(0, 'rgba(255,122,61,0.22)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }
}

/** A halftone dot corner, the comic-print touch, in one panel corner. */
function halftoneCorner(ctx, rect, seed) {
  const rand = mulberry32(seed);
  const s = Math.min(rect.w, rect.h) * 0.16;
  const x0 = rect.x + rect.w - s;
  const y0 = rect.y + rect.h - s;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  const step = s / 6;
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      const r = step * 0.16 * (1 + (i + j) / 5) * (0.7 + rand() * 0.6);
      ctx.beginPath();
      ctx.arc(x0 + i * step + step / 2, y0 + j * step + step / 2, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** The title band: sunset gradient, bold outlined title, neon subtitle. */
function drawTitleBand(ctx, state, W, H, bandY, bandH) {
  const g = ctx.createLinearGradient(0, bandY, W, bandY + bandH);
  g.addColorStop(0, '#ff9a3d');
  g.addColorStop(0.45, '#ff2e88');
  g.addColorStop(1, '#7b2ff7');
  ctx.fillStyle = g;
  ctx.fillRect(0, bandY, W, bandH);
  // Thin white rules above and below the band.
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(0, bandY, W, Math.max(3, H * 0.004));
  ctx.fillRect(0, bandY + bandH - Math.max(3, H * 0.004), W, Math.max(3, H * 0.004));

  const pad = W * 0.045;
  const title = (state.title || 'VICE CITY').toUpperCase();
  const sub = state.subtitle || '';
  // Size the title by measuring it: shrink until the words fit the band.
  const maxTitleW = W - pad * 2;
  let titleSize = Math.round(bandH * 0.52);
  const setTitleFont = (s) => {
    ctx.font = `900 ${s}px 'Arial Black', Impact, 'Helvetica Neue', sans-serif`;
    try { ctx.letterSpacing = `${Math.round(s * 0.02)}px`; } catch { /* older canvas */ }
  };
  setTitleFont(titleSize);
  const titleW = ctx.measureText(title).width;
  if (titleW > maxTitleW) titleSize = Math.max(12, Math.floor((titleSize * maxTitleW) / titleW));
  setTitleFont(titleSize);
  ctx.save();
  ctx.translate(pad, bandY + bandH * 0.52);
  ctx.transform(1, 0, -0.045, 1, 0, 0);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#12081f';
  ctx.lineWidth = Math.max(4, titleSize * 0.14);
  ctx.strokeText(title, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(title, 0, 0);
  ctx.restore();

  if (sub) {
    const subSize = Math.round(bandH * 0.17);
    ctx.save();
    ctx.font = `italic 900 ${subSize}px 'Arial Black', Impact, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.32)}px`; } catch { /* older canvas */ }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = Math.round(subSize * 0.7);
    ctx.fillStyle = '#8ef6ff';
    ctx.fillText(sub.toUpperCase(), pad, bandY + bandH * 0.9);
    ctx.restore();
  }
}

/** A soft dark vignette and a whisper of grain over the whole cover. */
function finishCover(ctx, W, H) {
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(10,4,24,0.34)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  const rand = mulberry32(20261119);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  const dots = Math.round((W * H) / 9000);
  for (let i = 0; i < dots; i++) {
    ctx.fillRect(rand() * W, rand() * H, 1.4, 1.4);
  }
}

/**
 * Render the cover described by `state` onto `canvas` at its pixel size.
 * state: { layout, grade, title, subtitle, photos: HTMLImageElement[],
 *          panels: [{ photo, zoom, ox, oy }] }
 */
export function renderCover(canvas, state) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d');
  const bandH = Math.round(H * (state.size === 'wide' ? 0.24 : 0.2));
  const bandY = H - bandH;
  const margin = Math.round(W * 0.016);
  const gutter = Math.round(W * 0.011);

  ctx.fillStyle = '#0d0b1e';
  ctx.fillRect(0, 0, W, H);

  const area = { x: margin, y: margin, w: W - margin * 2, h: bandY - margin };
  const rects = panelRects(state.layout, area);
  rects.forEach((r, i) => {
    const crop = state.panels[i] || { photo: 0, zoom: 1, ox: 0.5, oy: 0.5 };
    const img = crop.photo >= 0 ? state.photos[crop.photo] : null;
    const inset = {
      x: r.x + (i === 0 ? 0 : gutter / 2),
      y: r.y + (i === 0 || state.layout === 'strip' ? 0 : gutter / 2),
      w: r.w - gutter / 2,
      h: r.h - gutter / 2,
    };
    // First panel keeps the outer gutter; the rest share it.
    if (state.layout === 'hero' && i > 0) inset.y = r.y + gutter / 2;
    if (state.layout === 'strip' && i > 0) inset.x = r.x + gutter / 2;
    drawPhotoPanel(ctx, img || null, inset, crop, state.grade);
    // Poster frame: a black drop edge then a white rule around each panel.
    ctx.strokeStyle = 'rgba(10,4,24,0.85)';
    ctx.lineWidth = Math.max(3, W * 0.004);
    ctx.strokeRect(inset.x, inset.y, inset.w, inset.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = Math.max(2, W * 0.0025);
    ctx.strokeRect(inset.x + 2, inset.y + 2, inset.w - 4, inset.h - 4);
    halftoneCorner(ctx, inset, 100 + i * 37);
  });

  drawTitleBand(ctx, state, W, H, bandY, bandH);
  finishCover(ctx, W, H);
  return canvas;
}

/** A fresh export canvas at one of the three post sizes. */
export function exportCover(state, sizeKey) {
  const size = SIZES[sizeKey] || SIZES.square;
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  renderCover(canvas, { ...state, size: sizeKey });
  return canvas;
}
