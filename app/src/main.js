// ViceFrame editor: wires the controls to the cover engine, owns the photo
// list and the per-panel crop state, and handles PNG export at post sizes.
//
// Photos are read with the file picker and drawn from memory only; nothing
// is uploaded anywhere. The built-in samples under app/samples/ are original
// AI-generated illustrations bundled so the app can be tried instantly.

import { GRADES, LAYOUTS, LETTERING, renderCover } from './cover.js';

const canvas = document.getElementById('cover-canvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const EXPORT_SIZES = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  wide: [1920, 1080],
};

const state = {
  layout: 'hero-split',
  grade: 'sunset',
  lettering: 'sunset',
  fill: 'each',
  caption: 'Sunset Heist',
  kicker: 'Vice Frame Original',
  titleScale: 1,
  photos: [],
  photoNames: [],
  panels: [],
  leadPhoto: 0,
  selectedPanel: 0,
  showSelection: true,
};

let lastRects = [];
window.__vfRenders = 0;

function defaultPanel(index) {
  return { photo: index, x: 0.5, y: 0.42, zoom: 1 };
}

function ensurePanels() {
  const count = LAYOUTS[state.layout].panels.length;
  while (state.panels.length < count) state.panels.push(defaultPanel(state.panels.length));
  if (state.selectedPanel >= count) state.selectedPanel = 0;
}

function render() {
  ensurePanels();
  lastRects = renderCover(ctx, canvas.width, canvas.height, state);
  window.__vfRenders += 1;
  syncPanelEditor();
}

function setStatus(text) {
  statusEl.textContent = text;
}

// -------------------------------------------------------------- photo in
function addPhoto(img, name) {
  state.photos.push(img);
  state.photoNames.push(name);
  ensurePanels();
  state.panels.forEach((panel, i) => {
    if (panel.photo >= state.photos.length) panel.photo = i % state.photos.length;
  });
  refreshPhotoList();
  render();
}

function loadSamplePhoto(name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `./samples/${name}.jpg`;
  });
}

async function addSample(name, label) {
  const existing = state.photoNames.indexOf(label);
  if (existing >= 0) {
    setStatus(`${label} is already loaded.`);
    return state.photos[existing];
  }
  const img = await loadSamplePhoto(name);
  addPhoto(img, label);
  setStatus(`${label} loaded — it fills the panels in order.`);
  return img;
}

function refreshPhotoList() {
  const list = document.getElementById('photo-list');
  list.innerHTML = '';
  state.photoNames.forEach((name, i) => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = `${i + 1}. ${name}`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Remove';
    btn.addEventListener('click', () => {
      state.photos.splice(i, 1);
      state.photoNames.splice(i, 1);
      state.panels.forEach((panel) => {
        if (panel.photo >= state.photos.length) panel.photo = 0;
      });
      refreshPhotoList();
      render();
    });
    li.append(span, btn);
    list.append(li);
  });
  const select = document.getElementById('panel-photo-select');
  select.innerHTML = '';
  state.photoNames.forEach((name, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${i + 1}. ${name}`;
    select.append(opt);
  });
  if (state.photos.length === 0) {
    const opt = document.createElement('option');
    opt.value = '0';
    opt.textContent = '(no photo yet)';
    select.append(opt);
  }
}

// ---------------------------------------------------------- panel editor
function syncPanelEditor() {
  ensurePanels();
  const panel = state.panels[state.selectedPanel];
  document.getElementById('panel-title').textContent =
    state.fill === 'spread' ? 'Spread photo (all panels)' : `Panel ${state.selectedPanel + 1}`;
  const select = document.getElementById('panel-photo-select');
  select.value = String(Math.min(panel.photo, Math.max(0, state.photos.length - 1)));
  document.getElementById('panel-zoom').value = String(panel.zoom);
  document.getElementById('zoom-value').textContent = `${panel.zoom.toFixed(2)}×`;
  document.getElementById('panel-x').value = String(panel.x);
  document.getElementById('panel-y').value = String(panel.y);
}

function selectedPanelState() {
  ensurePanels();
  return state.fill === 'spread' ? state.panels[0] : state.panels[state.selectedPanel];
}

// -------------------------------------------------------------- controls
document.getElementById('photo-input').addEventListener('change', (event) => {
  const files = Array.from(event.target.files ?? []);
  files.forEach((file) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => addPhoto(img, file.name);
    img.src = url;
  });
  if (files.length > 0) setStatus(`Loading ${files.length} photo(s) from this machine…`);
});

document.querySelectorAll('[data-sample]').forEach((btn) => {
  btn.addEventListener('click', () => {
    addSample(btn.dataset.sample, `${btn.textContent.trim()} sample`);
  });
});

document.getElementById('layout-select').addEventListener('change', (event) => {
  state.layout = event.target.value;
  state.selectedPanel = 0;
  render();
});
document.getElementById('fill-select').addEventListener('change', (event) => {
  state.fill = event.target.value;
  render();
});
document.getElementById('grade-select').addEventListener('change', (event) => {
  state.grade = event.target.value;
  render();
});
document.getElementById('lettering-select').addEventListener('change', (event) => {
  state.lettering = event.target.value;
  render();
});
document.getElementById('caption-input').addEventListener('input', (event) => {
  state.caption = event.target.value;
  render();
});
document.getElementById('kicker-input').addEventListener('input', (event) => {
  state.kicker = event.target.value;
  render();
});
document.getElementById('title-scale').addEventListener('input', (event) => {
  state.titleScale = Number(event.target.value);
  render();
});
document.getElementById('size-select').addEventListener('change', (event) => {
  const [w, h] = event.target.value.split('x').map(Number);
  canvas.width = w;
  canvas.height = h;
  render();
});

document.getElementById('panel-photo-select').addEventListener('change', (event) => {
  selectedPanelState().photo = Number(event.target.value);
  state.leadPhoto = selectedPanelState().photo;
  render();
});
document.getElementById('panel-zoom').addEventListener('input', (event) => {
  selectedPanelState().zoom = Number(event.target.value);
  render();
});
document.getElementById('panel-x').addEventListener('input', (event) => {
  selectedPanelState().x = Number(event.target.value);
  render();
});
document.getElementById('panel-y').addEventListener('input', (event) => {
  selectedPanelState().y = Number(event.target.value);
  render();
});
document.getElementById('panel-reset').addEventListener('click', () => {
  const index = state.fill === 'spread' ? 0 : state.selectedPanel;
  state.panels[index] = defaultPanel(index);
  render();
});

// ------------------------------------------------- drag & zoom on canvas
function canvasPoint(event) {
  const box = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - box.left) * (canvas.width / box.width),
    y: (event.clientY - box.top) * (canvas.height / box.height),
  };
}

function panelAt(point) {
  for (let i = lastRects.length - 1; i >= 0; i -= 1) {
    const r = lastRects[i];
    if (point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (event) => {
  const point = canvasPoint(event);
  const hit = panelAt(point);
  if (hit < 0) return;
  state.selectedPanel = state.fill === 'spread' ? 0 : hit;
  const panel = selectedPanelState();
  drag = { startX: point.x, startY: point.y, focalX: panel.x, focalY: panel.y, rect: lastRects[hit] };
  try {
    canvas.setPointerCapture(event.pointerId);
  } catch {
    // A pointer that is already gone (or a synthetic event) needs no capture;
    // the drag still tracks through the move handler below.
  }
  render();
});
canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const point = canvasPoint(event);
  const panel = selectedPanelState();
  panel.x = Math.min(1, Math.max(0, drag.focalX - (point.x - drag.startX) / drag.rect.w));
  panel.y = Math.min(1, Math.max(0, drag.focalY - (point.y - drag.startY) / drag.rect.h));
  render();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (event) => {
  const point = canvasPoint(event);
  const hit = panelAt(point);
  if (hit < 0) return;
  event.preventDefault();
  state.selectedPanel = state.fill === 'spread' ? 0 : hit;
  const panel = selectedPanelState();
  panel.zoom = Math.min(3, Math.max(1, panel.zoom * Math.exp(-event.deltaY * 0.0012)));
  render();
}, { passive: false });

// ---------------------------------------------------------------- export
function renderExportCanvas(w, h) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const offCtx = off.getContext('2d');
  renderCover(offCtx, w, h, { ...state, showSelection: false, selectedPanel: -1 });
  return off;
}

function exportPNG(w, h) {
  const off = renderExportCanvas(w, h);
  const link = document.createElement('a');
  link.download = `viceframe-cover-${w}x${h}.png`;
  link.href = off.toDataURL('image/png');
  link.click();
  setStatus(`Exported a ${w} × ${h} PNG cover.`);
}

document.getElementById('export-square').addEventListener('click', () => exportPNG(...EXPORT_SIZES.square));
document.getElementById('export-portrait').addEventListener('click', () => exportPNG(...EXPORT_SIZES.portrait));
document.getElementById('export-wide').addEventListener('click', () => exportPNG(...EXPORT_SIZES.wide));

// Hooks used by the maker's own screenshot driver: render any post size on
// demand and hand back the very PNG the export button would download.
window.ViceFrame = {
  state,
  exportDataURL(w, h) {
    return renderExportCanvas(w, h).toDataURL('image/png');
  },
  renderNow: render,
};

// ------------------------------------------------------------- shot mode
// The maker photographs the app with scenes such as
// ?shot=editor&lead=boulevard&caption=Sunset%20Heist — the same scenes a
// person could dial in by hand. Readiness is flagged once a render with the
// scene's photo has actually been painted.
async function applyShotScene(params) {
  const pick = (key, allowed, target) => {
    const value = params.get(key);
    if (value && allowed[value]) target(value);
  };
  pick('layout', LAYOUTS, (v) => { state.layout = v; document.getElementById('layout-select').value = v; });
  pick('grade', GRADES, (v) => { state.grade = v; document.getElementById('grade-select').value = v; });
  pick('lettering', LETTERING, (v) => { state.lettering = v; document.getElementById('lettering-select').value = v; });
  if (params.get('fill') === 'each' || params.get('fill') === 'spread') {
    state.fill = params.get('fill');
    document.getElementById('fill-select').value = state.fill;
  }
  if (params.get('caption') !== null) {
    state.caption = params.get('caption');
    document.getElementById('caption-input').value = state.caption;
  }
  if (params.get('kicker') !== null) {
    state.kicker = params.get('kicker');
    document.getElementById('kicker-input').value = state.kicker;
  }
  const sizeName = params.get('size');
  if (sizeName && EXPORT_SIZES[sizeName]) {
    const [w, h] = EXPORT_SIZES[sizeName];
    canvas.width = w;
    canvas.height = h;
    document.getElementById('size-select').value = `${w}x${h}`;
  }
  state.showSelection = false;
  if (params.get('shot') === 'cover') document.body.classList.add('shot-cover');

  const lead = params.get('lead') ?? params.get('photo');
  const wanted = lead ? [lead] : ['boulevard', 'marina', 'rooftop'];
  for (const name of wanted) {
    await addSample(name, `${name[0].toUpperCase()}${name.slice(1)} sample`);
  }
  if (lead && params.get('fill') !== 'spread') {
    // Extra scenes can name two more photos with &more=marina,rooftop.
    const more = (params.get('more') ?? '').split(',').filter(Boolean);
    for (const name of more) await addSample(name, `${name[0].toUpperCase()}${name.slice(1)} sample`);
  }
  state.panels.forEach((panel, i) => { panel.photo = i % Math.max(1, state.photos.length); });
  render();
  requestAnimationFrame(() => {
    window.__shotReady = true;
  });
}

const params = new URLSearchParams(window.location.search);
if (params.has('shot')) {
  applyShotScene(params).catch((err) => {
    setStatus(`Scene failed: ${err.message}`);
    window.__shotReady = true;
  });
} else {
  render();
}
