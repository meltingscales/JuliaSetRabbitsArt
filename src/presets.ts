import type { Params } from "./params";

export interface Preset {
  name: string;
  apply: Partial<Params>;
}

export const PRESETS: Preset[] = [
  {
    name: "Douady's Rabbit",
    apply: { mode: "julia", cre: -0.1226, cim: 0.7449, centerX: 0, centerY: 0, scale: 1 / 220 },
  },
  {
    name: "Basilica",
    apply: { mode: "julia", cre: -1, cim: 0, centerX: 0, centerY: 0, scale: 1 / 200 },
  },
  {
    name: "Dendrite",
    apply: { mode: "julia", cre: 0, cim: 1, centerX: 0, centerY: 0, scale: 1 / 220 },
  },
  {
    name: "San Marco",
    apply: { mode: "julia", cre: -0.75, cim: 0, centerX: 0, centerY: 0, scale: 1 / 200 },
  },
  {
    name: "Siegel Disk",
    apply: { mode: "julia", cre: -0.391, cim: -0.587, centerX: 0, centerY: 0, scale: 1 / 220 },
  },
  {
    name: "Airplane",
    apply: { mode: "julia", cre: -1.755, cim: 0, centerX: 0, centerY: 0, scale: 1 / 180 },
  },
  {
    name: "Mandelbrot",
    apply: { mode: "mandelbrot", centerX: -0.6, centerY: 0, scale: 1 / 220 },
  },
  {
    name: "Seahorse Valley (zoom)",
    apply: { mode: "mandelbrot", centerX: -0.745, centerY: 0.11, scale: 1 / 9000 },
  },
  {
    name: "Menger Sponge (3D)",
    apply: { mode: "3d", solid: 0, detail: 5 },
  },
  {
    name: "Mandelbulb (3D)",
    apply: { mode: "3d", solid: 1, detail: 6 },
  },
];
