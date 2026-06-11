export type Mode = "julia" | "mandelbrot" | "3d";

export interface Params {
  mode: Mode;
  // Julia constant
  cre: number;
  cim: number;
  iterations: number;
  // viewport: complex-plane center and units-per-pixel
  centerX: number;
  centerY: number;
  scale: number;
  // warp applied to the sampling grid
  warpX: number;
  warpY: number;
  warpRot: number; // degrees
  // sprite pixels
  cellSize: number;
  spriteScale: number;
  chaos: number;
  hueBase: number;
  hueSpread: number;
  seed: number;
  bifurcation: boolean;
  // 3d
  solid: number; // 0 menger, 1 mandelbulb, 2 sierpinski
  detail: number;
  hue3d: number;
  spin: boolean;
}

export function defaultParams(): Params {
  return {
    mode: "julia",
    // Douady's rabbit, obviously
    cre: -0.1226,
    cim: 0.7449,
    iterations: 80,
    centerX: 0,
    centerY: 0,
    scale: 1 / 220,
    warpX: 1,
    warpY: 1,
    warpRot: 0,
    cellSize: 14,
    spriteScale: 1.1,
    chaos: 0.15,
    hueBase: 280,
    hueSpread: 240,
    seed: 1,
    bifurcation: true,
    solid: 0,
    detail: 5,
    hue3d: 200,
    spin: true,
  };
}

/** Maps a screen pixel to a point in the complex plane (applies warp). */
export function screenToPlane(
  p: Params,
  px: number,
  py: number,
  w: number,
  h: number,
): [number, number] {
  const dx = (px - w / 2) * p.scale * p.warpX;
  const dy = (py - h / 2) * p.scale * p.warpY;
  const t = (p.warpRot * Math.PI) / 180;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  return [p.centerX + dx * cos - dy * sin, p.centerY + dx * sin + dy * cos];
}

/** Inverse of screenToPlane. */
export function planeToScreen(
  p: Params,
  x: number,
  y: number,
  w: number,
  h: number,
): [number, number] {
  const t = (p.warpRot * Math.PI) / 180;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  const rx = (x - p.centerX) * cos + (y - p.centerY) * sin;
  const ry = -(x - p.centerX) * sin + (y - p.centerY) * cos;
  return [rx / (p.scale * p.warpX) + w / 2, ry / (p.scale * p.warpY) + h / 2];
}
