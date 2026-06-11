import { planeToScreen, screenToPlane, type Params } from "./params";

/**
 * Draws the bifurcation diagram of the logistic map x -> r·x·(1-x), aligned
 * with the Mandelbrot set on the real axis.
 *
 * The logistic map is conjugate to z -> z² + c via c = r(2-r)/4 and
 * z = r(1/2 - x), so plotting (c(r), z(x)) in plane coordinates puts each
 * period-doubling exactly under its bulb: r ∈ [1,4] sweeps c ∈ [0.25,-2].
 */
export function drawBifurcation(
  ctx: CanvasRenderingContext2D,
  p: Params,
  w: number,
  h: number,
) {
  const WARMUP = 150;
  const SAMPLES = 220;

  ctx.save();
  ctx.fillStyle = "rgba(255, 196, 87, 0.45)";

  // march screen columns so density stays even at any zoom level
  for (let px = 0; px < w; px += 1) {
    // c on the real axis at this column (warp-aware via the plane mapping)
    const [c] = screenToPlane(p, px, h / 2, w, h);
    if (c < -2 || c > 0.25) continue;
    const r = 1 + Math.sqrt(1 - 4 * c);

    let x = 0.5;
    for (let i = 0; i < WARMUP; i++) x = r * x * (1 - x);
    for (let i = 0; i < SAMPLES; i++) {
      x = r * x * (1 - x);
      const z = r * (0.5 - x);
      const [sx, sy] = planeToScreen(p, c, z, w, h);
      if (sx >= 0 && sx < w && sy >= 0 && sy < h) ctx.fillRect(sx, sy, 1, 1);
    }
  }

  ctx.restore();
}
