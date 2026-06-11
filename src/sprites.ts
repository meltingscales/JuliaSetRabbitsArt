const SPRITE_PX = 96;

const rawSvgs = import.meta.glob("../img/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** One SVG rasterized to an alpha mask, plus a cache of tinted copies. */
class Sprite {
  private tints = new Map<string, HTMLCanvasElement>();

  constructor(private mask: HTMLCanvasElement) {}

  /** Returns the sprite filled uniformly with the given HSL color. */
  tinted(hue: number, sat: number, light: number): HTMLCanvasElement {
    const key = `${hue}|${sat}|${light}`;
    let c = this.tints.get(key);
    if (!c) {
      c = document.createElement("canvas");
      c.width = SPRITE_PX;
      c.height = SPRITE_PX;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = `hsl(${hue} ${sat}% ${light}%)`;
      ctx.fillRect(0, 0, SPRITE_PX, SPRITE_PX);
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(this.mask, 0, 0);
      this.tints.set(key, c);
    }
    return c;
  }
}

function rasterize(svgText: string): Promise<Sprite> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgText], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = SPRITE_PX;
      c.height = SPRITE_PX;
      const ctx = c.getContext("2d")!;
      // fit the SVG into the square, centered, preserving aspect
      const s = Math.min(SPRITE_PX / img.width, SPRITE_PX / img.height);
      const w = img.width * s;
      const h = img.height * s;
      ctx.drawImage(img, (SPRITE_PX - w) / 2, (SPRITE_PX - h) / 2, w, h);
      URL.revokeObjectURL(url);
      resolve(new Sprite(c));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("failed to rasterize SVG"));
    };
    img.src = url;
  });
}

export async function loadSprites(): Promise<Sprite[]> {
  const texts = Object.values(rawSvgs);
  if (texts.length === 0) throw new Error("no SVGs found in ./img/");
  return Promise.all(texts.map(rasterize));
}

export type { Sprite };
export { SPRITE_PX };
