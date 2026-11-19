// ViceFrame cover engine: pure canvas drawing for a multi-panel poster.
//
// Everything here is original drawing code. A cover is a set of photo panels
// laid over a near-black plum ground, each panel colour-graded with a sunset
// or neon wash, framed in cream, and finished with bold poster lettering for
// the caption plus a letter-spaced kicker line above it. The same render
// function draws the live preview and every exported PNG, so what a person
// sees in the editor is exactly the file they download.

// ---------------------------------------------------------------- layouts
// Each layout is a list of panel rectangles in fractions of the canvas.
// Panels are drawn in order; the title block is painted over the bottom.
export const LAYOUTS = {
  'hero-split': {
    label: 'Hero split',
    panels: [
      { x: 0, y: 0, w: 0.625, h: 1 },
      { x: 0.625, y: 0, w: 0.375, h: 0.5 },
      { x: 0.625, y: 0.5, w: 0.375, h: 0.5 },
    ],
  },
  'top-story': {
    label: 'Top story',
    panels: [
      { x: 0, y: 0, w: 1, h: 0.6 },
      { x: 0, y: 0.6, w: 1 / 3, h: 0.4 },
      { x: 1 / 3, y: 0.6, w: 1 / 3, h: 0.4 },
      { x: 2 / 3, y: 0.6, w: 1 / 3, h: 0.4 },
    ],
  },
  'grid-four': {
    label: 'Grid of four',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  'trio': {
    label: 'Trio columns',
    panels: [
      { x: 0, y: 0, w: 1 / 3, h: 1 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
  },
  'six-pack': {
    label: 'Six pack',
    panels: [
      { x: 0, y: 0, w: 1 / 3, h: 0.5 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 0.5 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 0.5 },
      { x: 0, y: 0.5, w: 1 / 3, h: 0.5 },
      { x: 1 / 3, y: 0.5, w: 1 / 3, h: 0.5 },
      { x: 2 / 3, y: 0.5, w: 1 / 3, h: 0.5 },
    ],
  },
  'full-bleed': {
    label: 'Full bleed',
    panels: [{ x: 0, y: 0, w: 1, h: 1 }],
  },
};

// ----------------------------------------------------------------- grades
// A grade is a canvas filter applied while the photo is drawn, a two-stop
// colour wash blended over it, and a vignette strength.
export const GRADES = {
  sunset: {
    label: 'Vice sunset',
    filter: 'saturate(1.32) contrast(1.1) brightness(1.02)',
    top: 'rgba(86, 30, 140, 0.38)',
    bottom: 'rgba(255, 96, 54, 0.4)',
    blend: 'soft-light',
    vignette: 0.34,
  },
  neon: {
    label: 'Neon nights',
    filter: 'saturate(1.5) contrast(1.18) brightness(0.96)',
    top: 'rgba(255, 43, 166, 0.34)',
    bottom: 'rgba(20, 200, 220, 0.36)',
    blend: 'overlay',
    vignette: 0.42,
  },
  golden: {
    label: 'Golden hour',
    filter: 'sepia(0.32) saturate(1.25) contrast(1.06) brightness(1.05)',
    top: 'rgba(255, 176, 66, 0.28)',
    bottom: 'rgba(190, 62, 120, 0.3)',
    blend: 'soft-light',
    vignette: 0.28,
  },
  dusk: {
    label: 'Dusk patrol',
    filter: 'saturate(1.12) contrast(1.24) brightness(0.9)',
    top: 'rgba(30, 20, 90, 0.45)',
    bottom: 'rgba(0, 128, 140, 0.32)',
    blend: 'overlay',
    vignette: 0.5,
  },
  noir: {
    label: 'Noir ink',
    filter: 'grayscale(0.92) contrast(1.32) brightness(1.02)',
    top: 'rgba(20, 20, 34, 0.3)',
    bottom: 'rgba(70, 10, 30, 0.34)',
    blend: 'soft-light',
    vignette: 0.46,
  },
};

// ------------------------------------------------------------- lettering
// Poster lettering drawn with the fonts every desktop browser ships; no font
// file is bundled and no game font is imitated by name or file.
export const LETTERING = {
  sunset: { label: 'Sunset gradient', stops: ['#ffe259', '#ffa751', '#ff5e8a'], stroke: '#2a1140', glow: 'rgba(255, 94, 138, 0)' },
  neon: { label: 'Neon sign', stops: ['#fff6ff', '#ff71ce', '#b967ff'], stroke: '#1c0b33', glow: 'rgba(255, 113, 206, 0.85)' },
  chrome: { label: 'Chrome white', stops: ['#ffffff', '#e8ecf4', '#9aa7bd'], stroke: '#10131c', glow: 'rgba(0, 0, 0, 0)' },
  gold: { label: 'Gold leaf', stops: ['#fff3b0', '#ffd166', '#e09f3e'], stroke: '#3a1c04', glow: 'rgba(255, 209, 102, 0)' },
};

const POSTER_FONT = '"Arial Black", Impact, "Franklin Gothic Heavy", Arial, sans-serif';
const KICKER_FONT = '700 %spx "Trebuchet MS", Verdana, Arial, sans-serif';

// ----------------------------------------------------------------- grain
let grainPattern = null;
function getGrainPattern(ctx) {
  if (grainPattern) return grainPattern;
  const tile = document.createElement('canvas');
  tile.width = 140;
  tile.height = 140;
  const tctx = tile.getContext('2d');
  const data = tctx.createImageData(140, 140);
  let seed = 1234567;
  for (let i = 0; i < data.data.length; i += 4) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const v = 118 + (seed % 120);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  tctx.putImageData(data, 0, 0);
  grainPattern = ctx.createPattern(tile, 'repeat');
  return grainPattern;
}

// ------------------------------------------------------------ photo draw
// Draw one photo into a rectangle, cover-fitted around a focal point: the
// photo is scaled so it always covers the panel, and the focal point (0..1
// across the photo) decides which part of the slack is cropped away.
// zoom 1 fills the rectangle exactly; larger zooms crop in further.
function drawPhotoFitted(ctx, img, rect, focal, filter) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * focal.zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const slackX = dw - rect.w;
  const slackY = dh - rect.h;
  const dx = rect.x - slackX * focal.x;
  const dy = rect.y - slackY * focal.y;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.filter = filter;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.filter = 'none';
  ctx.restore();
}

// ------------------------------------------------------------ panel wash
function washPanel(ctx, rect, grade) {
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  grad.addColorStop(0, grade.top);
  grad.addColorStop(0.52, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, grade.bottom);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.globalCompositeOperation = grade.blend;
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'source-over';
  const rad = Math.max(rect.w, rect.h) * 0.75;
  const vig = ctx.createRadialGradient(
    rect.x + rect.w / 2, rect.y + rect.h / 2, rad * 0.45,
    rect.x + rect.w / 2, rect.y + rect.h / 2, rad,
  );
  vig.addColorStop(0, 'rgba(10, 4, 24, 0)');
  vig.addColorStop(1, `rgba(10, 4, 24, ${grade.vignette})`);
  ctx.fillStyle = vig;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

// -------------------------------------------------------------- lettering
function fitCaptionLines(ctx, caption, maxWidth, startSize) {
  const words = caption.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { lines: [], size: startSize };
  let size = startSize;
  for (; size > 18; size -= 4) {
    ctx.font = `italic ${size}px ${POSTER_FONT}`;
    const lines = [];
    let line = '';
    let ok = true;
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth || !line) {
        line = next;
      } else {
        lines.push(line);
        line = word;
      }
      if (ctx.measureText(word).width > maxWidth) ok = false;
    }
    if (line) lines.push(line);
    if (ok && lines.length <= 2) return { lines, size };
  }
  ctx.font = `italic ${size}px ${POSTER_FONT}`;
  return { lines: [caption.trim()], size };
}

function drawTitleBlock(ctx, state, W, H) {
  const style = LETTERING[state.lettering] ?? LETTERING.sunset;
  const caption = (state.caption || '').trim();
  const kicker = (state.kicker || '').trim();
  if (!caption && !kicker) return;
  const unit = Math.min(W, H) / 1080;
  const maxWidth = W * 0.92;
  const baseSize = Math.round(132 * unit * (state.titleScale || 1));
  const { lines, size } = fitCaptionLines(ctx, caption.toUpperCase(), maxWidth, baseSize);
  const lineHeight = size * 1.04;
  const kickerSize = Math.max(15, Math.round(30 * unit));
  const blockH = (kicker ? kickerSize * 1.9 : 0) + lines.length * lineHeight;
  const baseY = H - Math.round(44 * unit) - blockH;

  // Soft dark plinth behind the words so lettering reads on any photo.
  const plinth = ctx.createLinearGradient(0, baseY - kickerSize * 1.4, 0, H);
  plinth.addColorStop(0, 'rgba(12, 5, 26, 0)');
  plinth.addColorStop(0.45, 'rgba(12, 5, 26, 0.42)');
  plinth.addColorStop(1, 'rgba(12, 5, 26, 0.66)');
  ctx.fillStyle = plinth;
  ctx.fillRect(0, baseY - kickerSize * 1.4, W, H - baseY + kickerSize * 1.4);

  let y = baseY;
  if (kicker) {
    ctx.font = KICKER_FONT.replace('%s', String(kickerSize));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const spaced = kicker.toUpperCase().split('').join('  ');
    ctx.fillStyle = '#ffd166';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 6 * unit;
    ctx.shadowOffsetY = 2 * unit;
    ctx.fillText(`◆ ${spaced} ◆`, W / 2, y + kickerSize);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    y += kickerSize * 1.9;
  }
  lines.forEach((line, i) => {
    const cy = y + (i + 1) * lineHeight - size * 0.18;
    ctx.font = `italic ${size}px ${POSTER_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const grad = ctx.createLinearGradient(0, cy - size, 0, cy + size * 0.2);
    style.stops.forEach((stop, s) => grad.addColorStop(s / (style.stops.length - 1), stop));
    ctx.lineJoin = 'round';
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = size * 0.16;
    ctx.shadowColor = style.glow !== 'rgba(255, 94, 138, 0)' && style.glow !== 'rgba(0, 0, 0, 0)' ? style.glow : 'rgba(10, 4, 24, 0.55)';
    ctx.shadowBlur = style.glow.includes('0.85') ? 26 * unit : 10 * unit;
    ctx.shadowOffsetY = size * 0.045;
    ctx.strokeText(line, W / 2, cy);
    ctx.fillStyle = grad;
    ctx.shadowBlur = 0;
    ctx.fillText(line, W / 2, cy);
    // Thin top highlight for a printed-poster sheen.
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line, W / 2, cy - size * 0.03);
    ctx.restore();
    ctx.shadowOffsetY = 0;
  });
}

// ------------------------------------------------------------ main render
// state: { layout, grade, lettering, fill, caption, kicker, titleScale,
//          photos: [HTMLImageElement], panels: [{photo, x, y, zoom}] }
export function renderCover(ctx, W, H, state) {
  const layout = LAYOUTS[state.layout] ?? LAYOUTS['hero-split'];
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const margin = Math.round(Math.min(W, H) * 0.014);
  const gap = Math.round(Math.min(W, H) * 0.012);
  const frame = Math.max(3, Math.round(Math.min(W, H) * 0.006));

  ctx.save();
  ctx.fillStyle = '#17102a';
  ctx.fillRect(0, 0, W, H);

  const rects = layout.panels.map((p) => ({
    x: margin + p.x * (W - margin * 2) + (p.x > 0 ? gap / 2 : 0),
    y: margin + p.y * (H - margin * 2) + (p.y > 0 ? gap / 2 : 0),
    w: p.w * (W - margin * 2) - (p.w < 1 ? gap : 0) + (p.x > 0 && p.w < 1 ? gap / 2 : 0),
    h: p.h * (H - margin * 2) - (p.h < 1 ? gap : 0) + (p.y > 0 && p.h < 1 ? gap / 2 : 0),
  }));

  if (state.fill === 'spread' && state.photos.length > 0) {
    // One photo across the whole poster: every panel is a window into the
    // same full-canvas cover-fit, offset by the panel's own position.
    const img = state.photos[state.leadPhoto % state.photos.length];
    const focal = state.panels[0] ?? { x: 0.5, y: 0.5, zoom: 1 };
    const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight) * focal.zoom;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const originX = (W - dw) / 2 - (focal.x - 0.5) * (dw - W);
    const originY = (H - dh) / 2 - (focal.y - 0.5) * (dh - H);
    rects.forEach((rect) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.w, rect.h);
      ctx.clip();
      ctx.filter = grade.filter;
      ctx.drawImage(img, originX, originY, dw, dh);
      ctx.filter = 'none';
      ctx.restore();
      washPanel(ctx, rect, grade);
    });
  } else {
    rects.forEach((rect, i) => {
      const panel = state.panels[i] ?? { photo: i, x: 0.5, y: 0.5, zoom: 1 };
      ctx.save();
      ctx.fillStyle = '#241539';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
      if (state.photos.length > 0) {
        const img = state.photos[Math.abs(panel.photo) % state.photos.length];
        drawPhotoFitted(ctx, img, rect, panel, grade.filter);
        washPanel(ctx, rect, grade);
      } else {
        drawEmptyPanel(ctx, rect, i);
      }
    });
  }

  // Cream frames around every panel and the whole sheet.
  ctx.strokeStyle = '#f6ead2';
  ctx.lineWidth = frame;
  rects.forEach((rect) => ctx.strokeRect(rect.x, rect.y, rect.w, rect.h));
  ctx.strokeStyle = '#0d0819';
  ctx.lineWidth = frame * 2.4;
  ctx.strokeRect(0, 0, W, H);
  ctx.strokeStyle = '#f6ead2';
  ctx.lineWidth = frame;
  ctx.strokeRect(frame * 1.2, frame * 1.2, W - frame * 2.4, H - frame * 2.4);

  // Film grain over the art, under the lettering.
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = getGrainPattern(ctx);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  drawTitleBlock(ctx, state, W, H);

  if (state.selectedPanel >= 0 && state.showSelection) {
    const rect = rects[state.selectedPanel];
    if (rect) {
      ctx.save();
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = Math.max(3, frame * 1.1);
      ctx.setLineDash([18, 12]);
      ctx.strokeRect(rect.x - frame, rect.y - frame, rect.w + frame * 2, rect.h + frame * 2);
      ctx.restore();
    }
  }
  ctx.restore();
  return rects;
}

function drawEmptyPanel(ctx, rect, index) {
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  grad.addColorStop(0, '#3b2064');
  grad.addColorStop(0.55, '#8a2a6d');
  grad.addColorStop(1, '#ff7a4d');
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.save();
  ctx.fillStyle = 'rgba(246, 234, 210, 0.85)';
  ctx.font = `700 ${Math.max(14, Math.round(rect.w * 0.055))}px "Trebuchet MS", Verdana, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`PANEL ${index + 1}`, rect.x + rect.w / 2, rect.y + rect.h / 2 - 6);
  ctx.font = `400 ${Math.max(11, Math.round(rect.w * 0.038))}px "Trebuchet MS", Verdana, sans-serif`;
  ctx.fillStyle = 'rgba(246, 234, 210, 0.65)';
  ctx.fillText('add a photo to fill this panel', rect.x + rect.w / 2, rect.y + rect.h / 2 + Math.max(16, rect.w * 0.05));
  ctx.restore();
}
