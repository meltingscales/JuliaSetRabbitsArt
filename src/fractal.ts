import { screenToPlane, type Params } from "./params";

export interface Grid {
  cols: number;
  rows: number;
  /** Smooth escape-time value per cell; -1 means the point never escaped (interior). */
  values: Float32Array;
}

const BAILOUT = 256;
const LOG2 = Math.log(2);

/**
 * Computes a smooth escape-time value for each grid cell. Cells are sampled
 * at their centers in screen space, then warped into the complex plane.
 */
export function computeGrid(p: Params, w: number, h: number): Grid {
  const cols = Math.ceil(w / p.cellSize);
  const rows = Math.ceil(h / p.cellSize);
  const values = new Float32Array(cols * rows);
  const maxIter = p.iterations;
  const julia = p.mode === "julia";

  for (let row = 0; row < rows; row++) {
    const py = (row + 0.5) * p.cellSize;
    for (let col = 0; col < cols; col++) {
      const px = (col + 0.5) * p.cellSize;
      const [x0, y0] = screenToPlane(p, px, py, w, h);
      let zx: number, zy: number, cx: number, cy: number;
      if (julia) {
        zx = x0;
        zy = y0;
        cx = p.cre;
        cy = p.cim;
      } else {
        zx = 0;
        zy = 0;
        cx = x0;
        cy = y0;
      }

      let value = -1;
      for (let i = 0; i < maxIter; i++) {
        const zx2 = zx * zx;
        const zy2 = zy * zy;
        if (zx2 + zy2 > BAILOUT) {
          // smooth (fractional) iteration count
          value = i + 1 - Math.log(Math.log(zx2 + zy2) / 2) / LOG2;
          break;
        }
        zy = 2 * zx * zy + cy;
        zx = zx2 - zy2 + cx;
      }
      values[row * cols + col] = value;
    }
  }

  return { cols, rows, values };
}
