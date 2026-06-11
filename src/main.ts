import { defaultParams, screenToPlane, type Mode, type Params } from "./params";
import { PRESETS } from "./presets";
import { render2d } from "./render2d";
import { Renderer3D } from "./renderer3d";
import { loadSprites } from "./sprites";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const canvas2d = $<HTMLCanvasElement>("canvas2d");
const canvas3d = $<HTMLCanvasElement>("canvas3d");
const ctx2d = canvas2d.getContext("2d")!;
const stage = $<HTMLElement>("stage");
const status = $<HTMLElement>("status");

const params: Params = defaultParams();
const sprites = await loadSprites();

let renderer3d: Renderer3D | null = null;
function get3d(): Renderer3D {
  if (!renderer3d) renderer3d = new Renderer3D(canvas3d);
  return renderer3d;
}

// ---- 2D rendering, debounced to one render per frame ----

let renderQueued = false;
function requestRender() {
  if (renderQueued || params.mode === "3d") return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (canvas2d.width !== w || canvas2d.height !== h) {
      canvas2d.width = w;
      canvas2d.height = h;
    }
    const stats = render2d(ctx2d, params, sprites, w, h);
    status.textContent = `${stats.drawn}/${stats.cells} sprites · ${stats.ms.toFixed(0)} ms`;
  });
}

// ---- controls ----

interface SliderSpec {
  id: string;
  key: keyof Params;
  fmt?: (v: number) => string;
}

const sliders: SliderSpec[] = [
  { id: "cre", key: "cre", fmt: (v) => v.toFixed(4) },
  { id: "cim", key: "cim", fmt: (v) => v.toFixed(4) },
  { id: "iter", key: "iterations" },
  { id: "cell", key: "cellSize" },
  { id: "spriteScale", key: "spriteScale", fmt: (v) => v.toFixed(2) },
  { id: "chaos", key: "chaos", fmt: (v) => v.toFixed(2) },
  { id: "hueBase", key: "hueBase" },
  { id: "hueSpread", key: "hueSpread" },
  { id: "warpX", key: "warpX", fmt: (v) => v.toFixed(2) },
  { id: "warpY", key: "warpY", fmt: (v) => v.toFixed(2) },
  { id: "warpRot", key: "warpRot" },
  { id: "detail", key: "detail" },
  { id: "hue3d", key: "hue3d" },
];

function syncControls() {
  for (const s of sliders) {
    const input = $<HTMLInputElement>(s.id);
    const v = params[s.key] as number;
    input.value = String(v);
    const label = document.querySelector<HTMLElement>(`span[data-val="${s.id}"]`);
    if (label) label.textContent = s.fmt ? s.fmt(v) : String(Math.round(v));
  }
  $<HTMLSelectElement>("mode").value = params.mode;
  $<HTMLSelectElement>("solid").value = String(params.solid);
  $<HTMLInputElement>("bifurcation").checked = params.bifurcation;
  $<HTMLInputElement>("spin").checked = params.spin;
  document.body.dataset.mode = params.mode;
}

for (const s of sliders) {
  $<HTMLInputElement>(s.id).addEventListener("input", (e) => {
    (params[s.key] as number) = Number((e.target as HTMLInputElement).value);
    syncControls();
    requestRender();
  });
}

$<HTMLInputElement>("bifurcation").addEventListener("change", (e) => {
  params.bifurcation = (e.target as HTMLInputElement).checked;
  requestRender();
});

$<HTMLInputElement>("spin").addEventListener("change", (e) => {
  params.spin = (e.target as HTMLInputElement).checked;
});

$<HTMLSelectElement>("solid").addEventListener("change", (e) => {
  params.solid = Number((e.target as HTMLSelectElement).value);
});

function setMode(mode: Mode) {
  params.mode = mode;
  document.body.dataset.mode = mode;
  const is3d = mode === "3d";
  canvas3d.hidden = !is3d;
  canvas2d.hidden = is3d;
  if (is3d) {
    get3d().run(() => params);
  } else {
    renderer3d?.stop();
    requestRender();
  }
  syncControls();
}

$<HTMLSelectElement>("mode").addEventListener("change", (e) => {
  setMode((e.target as HTMLSelectElement).value as Mode);
});

// presets
const presetSel = $<HTMLSelectElement>("preset");
for (let i = 0; i < PRESETS.length; i++) {
  const opt = document.createElement("option");
  opt.value = String(i);
  opt.textContent = PRESETS[i].name;
  presetSel.appendChild(opt);
}
presetSel.addEventListener("change", () => {
  const preset = PRESETS[Number(presetSel.value)];
  Object.assign(params, preset.apply);
  setMode(params.mode);
});

$<HTMLButtonElement>("reseed").addEventListener("click", () => {
  params.seed = (Math.random() * 2 ** 31) | 0;
  requestRender();
});

$<HTMLButtonElement>("resetView").addEventListener("click", () => {
  const d = defaultParams();
  params.centerX = params.mode === "mandelbrot" ? -0.6 : 0;
  params.centerY = 0;
  params.scale = d.scale;
  params.warpX = 1;
  params.warpY = 1;
  params.warpRot = 0;
  if (renderer3d) {
    renderer3d.orbitYaw = 0.6;
    renderer3d.orbitPitch = 0.4;
    renderer3d.dist = 3.2;
  }
  syncControls();
  requestRender();
});

// ---- pan / zoom (2D) and orbit / dolly (3D) ----

let dragging = false;
let lastX = 0;
let lastY = 0;

stage.addEventListener("pointerdown", (e) => {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  (e.target as HTMLElement).setPointerCapture(e.pointerId);
});

stage.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;

  if (params.mode === "3d") {
    const r = get3d();
    r.orbitYaw -= dx * 0.008;
    r.orbitPitch += dy * 0.008;
  } else {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    const [ax, ay] = screenToPlane(params, 0, 0, w, h);
    const [bx, by] = screenToPlane(params, dx, dy, w, h);
    params.centerX -= bx - ax;
    params.centerY -= by - ay;
    requestRender();
  }
});

stage.addEventListener("pointerup", () => {
  dragging = false;
});

stage.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
    if (params.mode === "3d") {
      const r = get3d();
      r.dist = Math.min(20, Math.max(1.2, r.dist * factor));
      return;
    }
    // zoom about the cursor: keep the plane point under it fixed
    const rect = stage.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    const [beforeX, beforeY] = screenToPlane(params, px, py, w, h);
    params.scale *= factor;
    const [afterX, afterY] = screenToPlane(params, px, py, w, h);
    params.centerX += beforeX - afterX;
    params.centerY += beforeY - afterY;
    requestRender();
  },
  { passive: false },
);

new ResizeObserver(() => requestRender()).observe(stage);

// ---- go ----
// ?preset=<index or name substring> selects a preset on load (shareable links)
const presetQuery = new URLSearchParams(location.search).get("preset");
if (presetQuery !== null) {
  const idx = /^\d+$/.test(presetQuery)
    ? Number(presetQuery)
    : PRESETS.findIndex((pr) => pr.name.toLowerCase().includes(presetQuery.toLowerCase()));
  if (idx >= 0 && idx < PRESETS.length) {
    Object.assign(params, PRESETS[idx].apply);
    presetSel.value = String(idx);
  }
}
syncControls();
setMode(params.mode);
