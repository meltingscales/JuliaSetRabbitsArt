import type { Params } from "./params";

const VERT = `#version 300 es
void main() {
  // fullscreen triangle
  vec2 v = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(v * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
out vec4 fragColor;

uniform vec2 uRes;
uniform float uTime;
uniform vec2 uOrbit;     // user orbit angles (yaw, pitch)
uniform float uDist;     // camera distance
uniform int uSolid;      // 0 menger, 1 mandelbulb, 2 sierpinski
uniform int uDetail;
uniform float uHue;

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float deMenger(vec3 p) {
  float d = sdBox(p, vec3(1.0));
  float s = 1.0;
  for (int m = 0; m < 8; m++) {
    if (m >= uDetail) break;
    vec3 a = mod(p * s, 2.0) - 1.0;
    s *= 3.0;
    vec3 r = abs(1.0 - 3.0 * abs(a));
    float da = max(r.x, r.y);
    float db = max(r.y, r.z);
    float dc = max(r.z, r.x);
    float c = (min(da, min(db, dc)) - 1.0) / s;
    d = max(d, c);
  }
  return d;
}

float deBulb(vec3 pos) {
  vec3 z = pos;
  float dr = 1.0;
  float r = 0.0;
  for (int i = 0; i < 12; i++) {
    if (i >= uDetail + 4) break;
    r = length(z);
    if (r > 2.0) break;
    float theta = acos(z.z / r) * 8.0;
    float phi = atan(z.y, z.x) * 8.0;
    float zr = pow(r, 8.0);
    dr = pow(r, 7.0) * 8.0 * dr + 1.0;
    z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta)) + pos;
  }
  return 0.25 * log(r) * r / dr;
}

float deSierpinski(vec3 p) {
  float s = 1.0;
  for (int i = 0; i < 12; i++) {
    if (i >= uDetail + 4) break;
    if (p.x + p.y < 0.0) p.xy = -p.yx;
    if (p.x + p.z < 0.0) p.xz = -p.zx;
    if (p.y + p.z < 0.0) p.zy = -p.yz;
    p = p * 2.0 - 1.0;
    s *= 2.0;
  }
  return (length(p) - 1.6) / s;
}

float de(vec3 p) {
  if (uSolid == 0) return deMenger(p);
  if (uSolid == 1) return deBulb(p);
  return deSierpinski(p);
}

vec3 normalAt(vec3 p) {
  const vec2 e = vec2(0.0008, -0.0008);
  return normalize(
    e.xyy * de(p + e.xyy) + e.yyx * de(p + e.yyx) +
    e.yxy * de(p + e.yxy) + e.xxx * de(p + e.xxx));
}

vec3 hsl2rgb(float h, float s, float l) {
  vec3 rgb = clamp(abs(mod(h / 60.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0));
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / uRes.y;

  float yaw = uOrbit.x + uTime * 0.25;
  float pitch = clamp(uOrbit.y, -1.5, 1.5);
  vec3 ro = uDist * vec3(cos(pitch) * sin(yaw), sin(pitch), cos(pitch) * cos(yaw));
  vec3 fwd = normalize(-ro);
  vec3 right = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, fwd);
  vec3 rd = normalize(fwd * 1.6 + uv.x * right + uv.y * up);

  float t = 0.0;
  float d = 0.0;
  int steps = 0;
  bool hit = false;
  for (int i = 0; i < 160; i++) {
    vec3 p = ro + rd * t;
    d = de(p);
    if (d < 0.0008 * t) { hit = true; break; }
    t += d;
    steps = i;
    if (t > 30.0) break;
  }

  vec3 bg = mix(vec3(0.05, 0.04, 0.08), vec3(0.10, 0.07, 0.16), uv.y * 0.5 + 0.5);
  vec3 col = bg;
  if (hit) {
    vec3 p = ro + rd * t;
    vec3 n = normalAt(p);
    vec3 lightDir = normalize(vec3(0.6, 0.9, 0.4));
    float diff = max(dot(n, lightDir), 0.0);
    float amb = 0.18;
    float ao = clamp(1.0 - float(steps) / 160.0, 0.0, 1.0);
    float spec = pow(max(dot(reflect(-lightDir, n), -rd), 0.0), 24.0);
    vec3 base = hsl2rgb(uHue + float(steps) * 1.5, 0.55, 0.5);
    col = base * (amb + diff * 0.9) * ao + spec * 0.35;
    col = mix(col, bg, smoothstep(8.0, 30.0, t)); // distance fog
  }

  fragColor = vec4(pow(col, vec3(0.4545)), 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error("shader compile failed: " + gl.getShaderInfoLog(sh));
  }
  return sh;
}

export class Renderer3D {
  private gl: WebGL2RenderingContext;
  private uni: Record<string, WebGLUniformLocation | null> = {};
  private raf = 0;
  private start = performance.now();
  /** Frozen time while auto-rotate is off, so the solid holds still. */
  private frozen = 0;

  orbitYaw = 0.6;
  orbitPitch = 0.4;
  dist = 3.2;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2");
    if (!gl) throw new Error("WebGL2 not available");
    this.gl = gl;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error("program link failed: " + gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);
    for (const name of ["uRes", "uTime", "uOrbit", "uDist", "uSolid", "uDetail", "uHue"]) {
      this.uni[name] = gl.getUniformLocation(prog, name);
    }
  }

  /** Starts the animation loop for 3D mode. */
  run(getParams: () => Params) {
    const loop = () => {
      this.frame(getParams());
      this.raf = requestAnimationFrame(loop);
    };
    this.stop();
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private frame(p: Params) {
    const gl = this.gl;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    gl.viewport(0, 0, w, h);

    let time: number;
    if (p.spin) {
      time = (performance.now() - this.start) / 1000;
      this.frozen = time;
    } else {
      time = this.frozen;
    }

    gl.uniform2f(this.uni.uRes, w, h);
    gl.uniform1f(this.uni.uTime, time);
    gl.uniform2f(this.uni.uOrbit, this.orbitYaw, this.orbitPitch);
    gl.uniform1f(this.uni.uDist, this.dist);
    gl.uniform1i(this.uni.uSolid, p.solid);
    gl.uniform1i(this.uni.uDetail, p.detail);
    gl.uniform1f(this.uni.uHue, p.hue3d);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
