
# JuliaSetRabbitsArt

art for my friend Milo

## building

Requires [node](https://nodejs.org/) (v20+) and optionally [just](https://github.com/casey/just).

```sh
just install   # or: npm install
just build     # or: npm run build  → outputs static site to ./dist/
```

The build is a fully static site (no backend) — host `dist/` anywhere.

## running

```sh
just dev       # or: npm run dev  → dev server with hot reload
just preview   # or: npm run preview  → serve the production build
```

Then open the printed URL (default http://localhost:5173). Drag to pan/orbit, scroll to zoom.

## for AI
- julia set viewer
  - each pixel is actually a scaled (by params) and colored (by params) randomly selected svg from `./img/`


- special mode that overlays the bifurcation diagram of the logistic map behind (opaque) the mandelbrot set so the lines line up with bulbs

- adjustable viewport and julia set params
  - presets for mandelbrot and other well known sets
  - can scale/warp, too
  - chaos/noise slider for pixel scaling/coloring

- 3d mode for menger sponge etc
