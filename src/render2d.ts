import { drawBifurcation } from "./bifurcation";
import { computeGrid } from "./fractal";
import type { Params } from "./params";
import type { Sprite } from "./sprites";

/** Deterministic per-cell RNG (mulberry32) so the art is stable until reseeded. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RenderStats {
  cells: number;
  drawn: number;
  ms: number;
}

export function render2d(
  ctx: CanvasRenderingContext2D,
  p: Params,
  sprites: Sprite[],
  w: number,
  h: number,
): RenderStats {
  const t0 = performance.now();

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#0d0a14";
  ctx.fillRect(0, 0, w, h);

  // the diagram sits behind the sprite layer; it peeks through the gaps
  // between sprites and fills the (undrawn) interior of the set
  const bifurcate = p.bifurcation && p.mode === "mandelbrot";
  if (bifurcate) drawBifurcation(ctx, p, w, h);

  const grid = computeGrid(p, w, h);
  const cell = p.cellSize;
  let drawn = 0;

  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const v = grid.values[row * grid.cols + col];
      const rng = mulberry32(p.seed * 0x9e3779b9 + row * 7349 + col);
      const sprite = sprites[Math.floor(rng() * sprites.length)];
      const interior = v < 0;

      // interior cells: skip when the bifurcation diagram needs to show
      // through; otherwise render them as dim, small sprites
      if (interior && bifurcate) continue;

      let hue: number, sat: number, light: number, size: number;
      if (interior) {
        hue = (p.hueBase + 180) % 360;
        sat = 25;
        light = 16;
        size = cell * p.spriteScale * 0.6;
      } else {
        // sqrt stretches the low end so the far exterior isn't one flat color
        const t = Math.sqrt(v / p.iterations);
        hue = (p.hueBase + t * p.hueSpread) % 360;
        sat = 75;
        light = 35 + t * 40;
        size = cell * p.spriteScale * (0.45 + 0.8 * Math.min(1, t * 2.5));
      }

      // chaos: jitter hue, scale, position, and rotation per cell
      const chaos = p.chaos;
      if (chaos > 0) {
        hue = (hue + (rng() - 0.5) * 120 * chaos + 360) % 360;
        size *= 1 + (rng() - 0.5) * 1.5 * chaos;
        light = Math.max(8, Math.min(85, light + (rng() - 0.5) * 40 * chaos));
      }
      if (size < 1) continue;

      // quantize the tint so the per-sprite color cache stays small
      hue = Math.round(hue / 8) * 8;
      light = Math.round(light / 5) * 5;
      const img = sprite.tinted(hue, sat, light);

      let x = (col + 0.5) * cell;
      let y = (row + 0.5) * cell;
      if (chaos > 0) {
        x += (rng() - 0.5) * cell * chaos;
        y += (rng() - 0.5) * cell * chaos;
        const rot = (rng() - 0.5) * Math.PI * chaos;
        ctx.setTransform(Math.cos(rot), Math.sin(rot), -Math.sin(rot), Math.cos(rot), x, y);
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      } else {
        ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
      }
      drawn++;
    }
  }

  return { cells: grid.cols * grid.rows, drawn, ms: performance.now() - t0 };
}
