import {
  BufferAttribute,
  Color,
  ConeGeometry,
  Euler,
  ExtrudeGeometry,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  Quaternion,
  Shape,
  Sphere,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import { RARITIES, TIRES } from '@shared/balance'

import { glowTime } from './glow'

/**
 * Every volleyball in the game (shared/balance.js TIRES - the ids are the template's tire
 * ids, kept for saves; names and stats live there). Each is a real volleyball: eighteen
 * panels in six groups of three strips, the groups interlocking round the ball, the seams
 * pressed in - painted by one GLSL function (BALL_PANELS + the painter's looks), no
 * textures. Early balls are plain plastic in one, two or three colours; then leather,
 * candy stripes, chrome, frost, gold, cracked lava, lightning, cut gems, rainbow, galaxy,
 * dragon scales and neon cyber panels - and the twelve Legend balls carry something extra
 * (orbiting rings, moons, spikes, wings, a halo). Each ball is a little bigger than the
 * last.
 *
 * Every ball is one merged geometry, built lazily the first time it's needed and shared.
 * Every vertex carries its paint: `aP` (where it is, for the patterns: on the ball's
 * surface, its offset from the ball's centre), `aLook` (pattern, glow, panel mode, accent
 * glow) and three sRGB colours `aCa` / `aCb` / `aCc` - so every ball draws with one
 * material and one program, and swapping balls is swapping a geometry. The ball shop
 * merges all of them into a single mesh that turns each ball on its stand in the vertex
 * shader (createBallShowcase): one draw call.
 *
 * A ball's local frame: the bottom of the ball (where it sits in your palm) at the origin,
 * its centre `ballCenterY(id)` above it (its radius). Units are metres (the avatar is 1.8
 * tall).
 */

/** The patterns the painter knows (a vertex's `aLook.x`). */
export const BALL_LOOK = {
  PLAIN: 0,
  WOOD: 1,
  BAMBOO: 2,
  STONE: 3,
  BONE: 4,
  COPPER: 5,
  STEEL: 6,
  GLOSS: 7,
  METAL: 8,
  CHROME: 9,
  CANDY: 10,
  SWIRL: 11,
  ICE: 12,
  GOLD: 13,
  LAVA: 14,
  THUNDER: 15,
  GEM: 16,
  RAINBOW: 17,
  PASTEL: 18,
  GALAXY: 19,
  SCALES: 20,
  CARBON: 21,
  NEON: 22,
  PRISM: 23,
  GRIP: 24,
  LEATHER: 25,
  BLADE: 26,
  FULLER: 27,
  RUNES: 28,
  INLAY: 29,
  CRACK: 30,
  AURORA: 31,
  GHOST: 32,
  FEATHER: 33,
  PETALS: 34,
}
const K = BALL_LOOK

/**
 * Per ball id: its radius `r`; the look its main panels are painted in, with colours `a`
 * and `b` (the two main panel colours) and `c` (the accent panels, plain and glossy - null:
 * every panel takes the look); how much it glows (`glow`, `cGlow` for the accent panels);
 * `trail`, the colour of its glow, stand trim, trail and anything else tinted by it; and
 * `decor`, the Legend balls' extras.
 */
const BALL_DEFS = {
  bicycle: { look: K.GLOSS, a: '#f7f2e6', b: '#ebe3cf', c: '#ffffff', trail: '#fff4d6' },
  mountain: { look: K.GLOSS, a: '#ffd23a', b: '#ffffff', c: '#ffc21a', trail: '#ffe27a' },
  wood: { look: K.GLOSS, a: '#2a7de1', b: '#ffffff', c: '#7fd0ff', trail: '#8fd0ff' },
  stone: { look: K.GLOSS, a: '#ff4b4b', b: '#2f8ff2', c: '#ffd23a', trail: '#ffe27a' },
  cookie: { look: K.GLOSS, a: '#3fb84a', b: '#ff5a6a', c: '#1f7a2a', trail: '#7dff8a' },
  pizza: { look: K.LEATHER, a: '#a0602e', b: '#f3e3c3', c: '#f3e3c3', trail: '#ffd9a8' },
  donut: { look: K.CANDY, a: '#ff6ab0', b: '#ffffff', c: '#ffd0e6', trail: '#ff9ad0' },
  watermelon: { look: K.GLOSS, a: '#1f3f9f', b: '#ffd21f', c: '#ffffff', trail: '#7fb2ff' },
  monster: { look: K.PASTEL, a: '#ff8a3a', b: '#b05cff', c: '#ffe0a0', trail: '#ffb070' },
  mint: { look: K.SWIRL, a: '#2fd8b0', b: '#fff27a', c: '#ff6a8a', trail: '#6affd8' },
  silver: { look: K.CHROME, a: '#eef2f8', b: '#8a96a8', c: '#ffffff', trail: '#d6e4ff' },
  ice: { look: K.ICE, a: '#c9f1ff', b: '#4fb8ff', c: '#ffffff', glow: 0.1, trail: '#bff4ff' },
  gold: { look: K.GOLD, a: '#ffc81a', b: '#fff1a8', c: '#ffffff', trail: '#ffd21f' },
  lava: { look: K.LAVA, a: '#2a0f0b', b: '#ff5a1c', c: null, trail: '#ff5a1c' },
  platinum: { look: K.THUNDER, a: '#2a3a66', b: '#fff27a', c: '#4fd2ff', glow: 0.2, cGlow: 0.6, trail: '#7fe6ff' },
  emerald: { look: K.GEM, a: '#2bd17a', b: '#0a7a40', c: '#e8fff0', glow: 0.1, trail: '#7dffb0' },
  ruby: { look: K.GEM, a: '#ff3b5c', b: '#9a0a2a', c: '#ffe0e6', glow: 0.1, trail: '#ff7a90' },
  diamond: { look: K.GEM, a: '#e8fbff', b: '#8fdcff', c: null, glow: 0.15, trail: '#bff4ff' },
  rainbow: { look: K.RAINBOW, a: '#ffffff', b: '#ffffff', c: '#ffffff', glow: 0.2, trail: '#ff7ad9' },
  unicorn: { look: K.PASTEL, a: '#ffb6e6', b: '#b6e0ff', c: '#fff6c4', glow: 0.05, trail: '#ffb0f0', decor: ['horn'] },
  galaxy: { look: K.GALAXY, a: '#120a2a', b: '#5a2aa8', c: null, trail: '#a46bff' },
  dragon: { look: K.SCALES, a: '#22a552', b: '#0a4a20', c: '#ffd23a', trail: '#4cff7a', decor: ['horns'] },
  cosmic: { look: K.CARBON, a: '#1a1f2a', b: '#3a4250', c: '#3fd8ff', cGlow: 1, trail: '#3fd8ff' },
  infinity: { look: K.PRISM, a: '#ffffff', b: '#ffffff', c: null, glow: 0.3, trail: '#ffffff', decor: ['ring'] },
  reaper: { look: K.GHOST, a: '#0e3a3a', b: '#5fffe0', c: null, glow: 0.3, trail: '#5fffe0', decor: ['ring'] },
  twinmoon: { look: K.GLOSS, a: '#dfeaff', b: '#1a2450', c: '#9fd0ff', cGlow: 0.5, trail: '#9fd0ff', decor: ['moons'] },
  titanaxe: { look: K.METAL, a: '#c98a3a', b: '#5a3a1a', c: '#ffd27a', trail: '#ffb45a', decor: ['studs'] },
  sawtooth: { look: K.CRACK, a: '#2a2f38', b: '#ff2a2a', c: null, trail: '#ff2a2a', decor: ['spikes'] },
  phoenixwing: { look: K.LAVA, a: '#ff7a1a', b: '#fff27a', c: '#ffb21a', glow: 0.3, cGlow: 0.5, trail: '#ffb21a', decor: ['wings'] },
  abyssal: { look: K.CRACK, a: '#0b2a5a', b: '#2fe0ff', c: null, trail: '#2fe0ff', decor: ['ring', 'spikes'] },
  blossom: { look: K.PETALS, a: '#ff9cc8', b: '#ffffff', c: '#ffd0e6', trail: '#ffc0e0', decor: ['ring'] },
  celestial: { look: K.GOLD, a: '#fff3c4', b: '#ffe27a', c: '#ffffff', glow: 0.15, cGlow: 0.4, trail: '#ffe27a', decor: ['halo', 'wings'] },
  voidrift: { look: K.CRACK, a: '#0a0612', b: '#b14dff', c: null, trail: '#b14dff', decor: ['rings'] },
  aurora: { look: K.AURORA, a: '#3fffb0', b: '#7a5cff', c: null, glow: 0.2, trail: '#7affd8', decor: ['rings'] },
  tempest: { look: K.THUNDER, a: '#2a5aa8', b: '#9ff4ff', c: null, glow: 0.3, trail: '#9ff4ff', decor: ['rings', 'spikes'] },
  eternity: { look: K.GOLD, a: '#ffe48a', b: '#ffffff', c: '#7dfcff', glow: 0.15, cGlow: 0.9, trail: '#ffffff', decor: ['rings', 'wings', 'halo'] },
}

/** The ball's radius by its place in the shop: 0.15 m for the first, growing to 0.21 m for the last. */
const ORDER = TIRES.map((t) => t.id)
const radiusOf = (id) => {
  const i = Math.max(0, ORDER.indexOf(id))
  return 0.15 + (0.06 * i) / Math.max(1, ORDER.length - 1)
}

const defOf = (id) => BALL_DEFS[id] || BALL_DEFS.bicycle

/** Per ball id: `a`, its main colour (its stand's cap) and `trail`, the colour of its glow. */
export const BALL_STYLES = Object.fromEntries(Object.entries(BALL_DEFS).map(([id, d]) => [id, { a: d.a, trail: d.trail }]))

// Parsed once: frame code looks colours up without allocating.
const PARSED = Object.fromEntries(Object.entries(BALL_STYLES).map(([id, s]) => [id, { a: new Color(s.a), trail: new Color(s.trail) }]))
const styleOf = (id) => PARSED[id] || PARSED.bicycle

/** The colour of ball `id`'s glow, trims, trail and anything tinted by it. */
export const ballTrail = (id) => styleOf(id).trail
/** Ball `id`'s main colour. */
export const ballBase = (id) => styleOf(id).a

// --- The painter -------------------------------------------------------------------------

/**
 * The painter's looks, in GLSL: `swordPaint` (the template's name) paints one fragment in
 * a look from its position `p`, normals, colours `a` / `b`, glow and clock; `swordShine`
 * lays the sweeping gleam and the rarer balls' star glints over it. On a ball's panels `p`
 * is the point on a sphere of radius 0.5, so every ball's pattern is the same size
 * whatever the ball's.
 */
const SWORD_GLSL = /* glsl */ `
  float sHash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float sNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(sHash(i), sHash(i + vec2(1.0, 0.0)), f.x), mix(sHash(i + vec2(0.0, 1.0)), sHash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  vec3 sCells(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float d1 = 8.0;
    float d2 = 8.0;
    float id = 0.0;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 g = vec2(float(x), float(y));
        vec2 o = vec2(sHash(i + g), sHash(i + g + 17.7));
        vec2 r = g + o - f;
        float d = dot(r, r);
        if (d < d1) { d2 = d1; d1 = d; id = sHash(i + g + 3.3); }
        else if (d < d2) { d2 = d; }
      }
    }
    return vec3(sqrt(d1), sqrt(d2), id);
  }
  vec3 sHue(float h) {
    return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  }
  void swordPaint(vec3 p, vec3 n, vec3 vn, float look, vec3 a, vec3 b, float glow, float t, out vec3 col, out vec3 emit) {
    int k = int(look + 0.5);
    // Continuous over the whole surface (no seam round the back), stretched along the sword.
    vec2 q = vec2(p.x + p.z, p.y);
    float ang = atan(p.z, p.x + 1e-5);
    float turn = ang / 6.28318;
    // A studio light up and to the left of the camera, and the sky above: the shine.
    float spec = pow(max(0.0, dot(vn, vec3(-0.36, 0.56, 0.75))), 22.0);
    float rim = pow(1.0 - clamp(vn.z, 0.0, 1.0), 2.0);
    float sky = smoothstep(-0.15, 0.3, vn.y);
    bool cellular = k == ${K.ICE} || k == ${K.LAVA} || k == ${K.PRISM} || k == ${K.AURORA};
    float cs = k == ${K.ICE} ? 13.0 : k == ${K.LAVA} ? 15.0 : k == ${K.AURORA} ? 8.0 : 11.0;
    vec2 drift = k == ${K.LAVA} ? vec2(0.0, t * 0.05) : vec2(0.0);
    vec3 cl = cellular ? sCells(q * cs + drift) : vec3(1.0, 1.0, 0.0);
    float edge = cl.y - cl.x;
    vec2 ns = k == ${K.GALAXY} ? vec2(6.0) : k == ${K.PASTEL} ? vec2(4.0) : k == ${K.GHOST} ? vec2(7.0, 2.5) : vec2(9.0);
    vec2 nd = k == ${K.LAVA} ? vec2(t * 0.4) : k == ${K.PASTEL} ? vec2(t * 0.1, 0.0) : k == ${K.GHOST} ? vec2(0.0, -t * 0.7) : vec2(0.0, t * 0.05);
    float n1 = sNoise(q * ns + nd);
    float n2 = sNoise(q * 23.0 + 7.0);
    col = a;
    emit = a * glow + vec3(spec * 0.2);
    if (k == ${K.GLOSS}) {
      emit = a * glow + vec3(spec * 0.9) + a * rim * 0.15;
    } else if (k == ${K.METAL}) {
      col = a * 0.5;
      emit = mix(b, a, sky) * 0.45 + vec3(spec * 0.9) + a * glow;
    } else if (k == ${K.CHROME}) {
      float band = 0.5 + 0.5 * sin(vn.y * 8.0 - vn.x * 3.0);
      vec3 env = mix(b * 0.5, a, sky) * (0.55 + 0.45 * band);
      col = b * 0.25;
      emit = env * 0.75 + vec3(spec * 1.3) + a * rim * 0.25;
    } else if (k == ${K.CANDY}) {
      col = mix(a, b, step(0.5, fract(p.y * 7.0 + turn)));
      emit = vec3(spec * 0.75) + col * glow;
    } else if (k == ${K.SWIRL}) {
      float an = atan(p.z, p.x + 1e-5) / 6.28318;
      col = mix(a, b, step(0.5, fract(an * 3.0 + length(p.xz) * 14.0)));
      emit = vec3(spec * 0.8) + col * glow;
    } else if (k == ${K.ICE}) {
      col = mix(a, b, cl.z * 0.5 + n1 * 0.3);
      col = mix(col, vec3(1.0), (1.0 - smoothstep(0.01, 0.05, edge)) * 0.7);
      float sp = step(0.985, sHash(floor(q * 60.0) + floor(t * 3.0)));
      emit = a * glow + vec3(sp) + a * rim * 0.35 + vec3(spec * 0.8);
    } else if (k == ${K.GOLD}) {
      float band = 0.5 + 0.5 * sin(vn.y * 6.0 + vn.x * 3.0);
      vec3 metal = mix(a, b, band * sky * 0.7);
      float groove = 1.0 - smoothstep(0.0, 0.006, abs(fract(p.y * 9.0) - 0.5) - 0.44);
      float scroll = step(0.82, 0.5 + 0.5 * sin(turn * 37.699 + p.y * 40.0)) * step(0.5, fract(p.y * 4.5));
      metal *= 1.0 - (groove * 0.45 + scroll * 0.25);
      col = metal * 0.55;
      emit = metal * (0.3 + 0.35 * band) + vec3(spec * 1.1) + a * glow;
    } else if (k == ${K.LAVA}) {
      float crack = 1.0 - smoothstep(0.02, 0.1, edge);
      vec3 rock = a * (0.8 + 0.6 * n2);
      vec3 hot = mix(b, vec3(1.0, 0.86, 0.25), smoothstep(0.5, 1.0, crack) * (0.6 + 0.4 * n1));
      float pulse = 0.75 + 0.25 * sin(t * 3.0 + p.y * 9.0);
      col = mix(rock, hot, crack);
      emit = hot * crack * pulse * 1.1 + b * glow * 0.3;
    } else if (k == ${K.THUNDER}) {
      float z = abs(fract(q.x * 6.0 + abs(fract(p.y * 5.0) - 0.5) * 1.8 + t * 0.6) - 0.5);
      float bolt = 1.0 - smoothstep(0.03, 0.08, z);
      float flick = step(0.35, fract(sin(floor(t * 8.0)) * 43758.5));
      col = mix(a, b, bolt);
      emit = a * glow + b * bolt * (0.5 + 0.5 * flick) + vec3(spec * 0.6);
    } else if (k == ${K.GEM}) {
      // One shade per facet: its (flat) normal, snapped so every pixel of it agrees.
      vec3 nq = floor(n * 6.0 + 0.5);
      float h = sHash(nq.xy * 0.37 + nq.z * 1.71 + 0.5);
      col = mix(b, a, 0.45 + 0.55 * h);
      float glint = pow(max(0.0, sin(t * 2.0 + h * 40.0)), 24.0);
      emit = a * glow + col * 0.15 + vec3(glint * 0.8 + spec * 1.2) + a * rim * 0.4;
    } else if (k == ${K.RAINBOW}) {
      col = mix(sHue(fract(p.y * 1.1 - t * 0.25 + q.x * 0.6)), vec3(1.0), 0.15);
      emit = col * glow + vec3(spec * 0.6);
    } else if (k == ${K.PASTEL}) {
      float s = sin(p.y * 14.0 + n1 * 4.4 + q.x * 20.0);
      col = mix(mix(a, b, smoothstep(-0.6, 0.6, s)), vec3(1.0), smoothstep(0.65, 0.95, n2) * 0.6);
      emit = col * glow + vec3(spec * 0.5);
    } else if (k == ${K.GALAXY}) {
      float nn = n1 * 0.65 + n2 * 0.35;
      col = mix(a, b, smoothstep(0.35, 0.75, nn));
      col = mix(col, vec3(0.37, 0.84, 1.0), smoothstep(0.7, 0.95, nn) * 0.7);
      vec2 cellS = floor(q * 36.0);
      float blob = 1.0 - smoothstep(0.12, 0.38, length(fract(q * 36.0) - 0.5));
      float star = step(0.9, sHash(cellS)) * blob * (0.5 + 0.5 * sin(t * 4.0 + sHash(cellS + 5.0) * 30.0));
      col = mix(col, vec3(1.0), star);
      emit = vec3(star) + col * smoothstep(0.7, 0.95, nn) * 0.35 + a * glow;
    } else if (k == ${K.SCALES}) {
      float row = floor(q.y * 26.0);
      vec2 sq = vec2(q.x * 20.0 + mod(row, 2.0) * 0.5, q.y * 26.0);
      float d = length((fract(sq) - vec2(0.5, 0.25)) * vec2(1.0, 1.3));
      col = mix(a, b, smoothstep(0.2, 0.48, d));
      col = mix(col, a * 1.6, smoothstep(0.38, 0.44, d) * (1.0 - smoothstep(0.46, 0.5, d)));
      emit = vec3(spec * 0.5);
    } else if (k == ${K.CARBON}) {
      vec2 w = q * 70.0;
      float twill = step(0.5, fract(w.x * 0.5 + floor(w.y) * 0.5));
      col = mix(a, b, twill * 0.7 + 0.15 * n2);
      emit = vec3(spec * 0.55) + b * 0.1 * sky;
    } else if (k == ${K.NEON}) {
      float pulse = 0.8 + 0.2 * sin(t * 4.0 + p.y * 12.0);
      col = mix(a, vec3(1.0), 0.3);
      emit = a * (0.9 + glow) * pulse + vec3(spec * 0.5);
    } else if (k == ${K.PRISM}) {
      col = sHue(fract(cl.z + t * 0.2 + p.y * 0.3));
      col = mix(col, vec3(1.0), 0.25 + 0.3 * (1.0 - smoothstep(0.0, 0.05, edge)));
      emit = col * max(glow, 0.3) + vec3(spec);
    } else if (k == ${K.LEATHER}) {
      float s = fract(p.y * 18.0 + turn);
      float seam = 1.0 - smoothstep(0.0, 0.1, s);
      col = mix(a, a * 0.6, seam) * (0.85 + 0.3 * n1);
      float stitch = step(0.6, fract(turn * 16.0)) * (1.0 - smoothstep(0.03, 0.09, abs(s - 0.5)));
      col = mix(col, b, stitch * 0.8);
      emit = vec3(spec * 0.1);
    } else if (k == ${K.CRACK}) {
      // Black glass, split down the middle by a wandering crack of light.
      float cx = 0.014 * sin(p.y * 21.0 + 1.3) + 0.008 * sin(p.y * 53.0);
      float d = abs(p.x - cx);
      float crack = 1.0 - smoothstep(0.004, 0.012, d);
      float halo = 1.0 - smoothstep(0.0, 0.05, d);
      float pulse = 0.8 + 0.2 * sin(t * 5.0 + p.y * 6.0);
      float fleck = step(0.992, sHash(floor(q * 70.0) + floor(t * 2.0)));
      col = mix(a * (0.8 + 0.4 * n2), b, crack);
      emit = b * (crack * 1.4 + halo * 0.35 + fleck * 0.8) * pulse + b * glow * 0.2 + vec3(spec * 0.9) + b * rim * 0.25;
    } else if (k == ${K.AURORA}) {
      // Layered crystal: bands of a, b and violet drifting up it, white along the cracks.
      float band = sin(p.y * 4.0 - t * 0.9 + cl.z * 2.0 + q.x * 6.0);
      vec3 c1 = mix(a, b, smoothstep(-0.6, 0.6, band));
      c1 = mix(c1, vec3(0.55, 0.25, 1.0), smoothstep(0.55, 0.95, sin(p.y * 2.3 + t * 0.6 + cl.z * 3.0)));
      col = mix(c1, vec3(1.0), 0.3 * (1.0 - smoothstep(0.0, 0.05, edge)));
      emit = c1 * max(glow, 0.3) + vec3(spec * 1.1) + c1 * rim * 0.4;
    } else if (k == ${K.GHOST}) {
      // Spectral: wisps rising through it, its rims glowing.
      float wisp = smoothstep(0.45, 0.85, n1);
      col = mix(a, b, wisp * 0.6);
      emit = b * (glow + wisp * 0.8 + rim * 0.6) + vec3(spec * 0.5);
    } else if (k == ${K.FEATHER}) {
      // Feathers: root to tip from a to b, combed into barbs.
      float g = smoothstep(0.05, 0.42, abs(p.x) + max(0.0, p.y - 0.1) * 0.25);
      vec3 base = mix(a, b, g);
      float barb = smoothstep(0.0, 0.3, fract(abs(p.x) * 24.0 + p.y * 16.0));
      col = base * (0.78 + 0.22 * barb);
      emit = base * glow * (0.7 + 0.3 * barb) + vec3(spec * 0.5) + base * rim * 0.2;
    } else if (k == ${K.PETALS}) {
      // Little five-petalled flowers scattered over it, each with a golden heart.
      vec2 pc = q * vec2(16.0, 11.0);
      vec2 cell = floor(pc);
      vec2 f = fract(pc) - 0.5 + (vec2(sHash(cell), sHash(cell + 3.1)) - 0.5) * 0.3;
      float r = length(f);
      float an = atan(f.y, f.x);
      float lobe = 0.1 * cos(an * 5.0);
      float petal = (1.0 - smoothstep(0.2 + lobe, 0.26 + lobe, r)) * step(0.45, sHash(cell + 9.0));
      float heart = 1.0 - smoothstep(0.04, 0.07, r);
      col = mix(a * (0.9 + 0.2 * n1), b, petal);
      col = mix(col, vec3(1.0, 0.82, 0.35), heart * petal);
      emit = col * glow + vec3(spec * 0.7) + a * rim * 0.2;
    }
  }

  /*
   * The finishing shine over the paint, every sword alike - \`info\` is the sword's
   * (aSword: its sparkle by rarity, its length) and its showcase phase:
   *  - a bright band sweeps up it on the slant, pommel to tip, every few seconds,
   *    catching its metal and crystal (not its wood, leather or cloth);
   *  - rarer swords (Epic up) twinkle with star glints over their metal and gems, and
   *    their edges light up in their own colours;
   *  - gems, crystals and glowing parts breathe.
   * A handful of operations a pixel - cheap enough for LOW.
   */
  void swordShine(vec3 p, vec3 vn, float look, vec3 a, vec3 b, vec3 info, float t, vec3 col, inout vec3 emit) {
    int k = int(look + 0.5);
    float spark = info.x;
    float len = max(info.y, 0.5);
    float ph = info.z;
    float m = 0.0;
    if (k == ${K.CHROME} || k == ${K.METAL} || k == ${K.GOLD}) m = 1.0;
    else if (k == ${K.ICE} || k == ${K.GEM} || k == ${K.AURORA} || k == ${K.PRISM} || k == ${K.CRACK} || k == ${K.GLOSS} || k == ${K.GALAXY} || k == ${K.NEON} || k == ${K.RAINBOW} || k == ${K.THUNDER} || k == ${K.CARBON}) m = 0.7;
    else if (k == ${K.GHOST} || k == ${K.CANDY} || k == ${K.SWIRL} || k == ${K.PASTEL} || k == ${K.SCALES} || k == ${K.FEATHER} || k == ${K.PETALS}) m = 0.35;
    // The sweep: 0.85 s up the sword in every 3.6, each sword on the wall a beat apart.
    float head = fract(t / 3.6 + ph * 0.137) * (3.6 / 0.85);
    float span = len + 0.6;
    float x = ((p.y + p.x * 0.9 + 0.3) / span - head) * span / 0.075;
    // A sharp gleam in a soft glow.
    float band = exp(-x * x) + 0.22 * exp(-x * x * 0.08);
    emit += mix(vec3(1.0, 0.97, 0.9), b, 0.2) * band * m * (0.85 + 0.65 * spark);
    if (spark > 0.01 && m > 0.0) {
      // Star glints: a few cells of a fine grid flash in turn.
      vec2 g = vec2(p.x + p.z, p.y) * vec2(15.0, 8.0);
      vec2 cell = floor(g);
      float h = sHash(cell + 41.0);
      vec2 f = fract(g) - 0.5;
      float flash = pow(max(0.0, sin(t * 2.3 + h * 70.0)), 24.0) * step(1.0 - 0.22 * spark, h);
      float star = max((1.0 - smoothstep(0.0, 0.07, abs(f.x))) * (1.0 - smoothstep(0.05, 0.5, abs(f.y))), (1.0 - smoothstep(0.0, 0.07, abs(f.y))) * (1.0 - smoothstep(0.05, 0.5, abs(f.x))));
      star = max(star, 1.0 - smoothstep(0.0, 0.16, length(f)));
      emit += vec3(2.6) * star * flash;
      // Edges lit in its own colours.
      float rim = pow(1.0 - clamp(vn.z, 0.0, 1.0), 3.0);
      emit += mix(a, b, 0.6) * rim * spark * m * 0.35;
    }
    if (k == ${K.GEM} || k == ${K.NEON} || k == ${K.CRACK} || k == ${K.AURORA} || k == ${K.PRISM} || k == ${K.GHOST} || k == ${K.LAVA} || k == ${K.THUNDER}) {
      float breathe = 0.5 + 0.5 * sin(t * 2.2 + ph * 1.7 + p.y * 2.0);
      emit += col * (0.08 + 0.18 * breathe) * (0.5 + 0.5 * spark);
    }
  }
`

/**
 * A volleyball's panels, in GLSL: for a direction `d` from the ball's centre, which colour
 * slot its panel takes (0 = a, 1 = b, 2 = the accent c) and how deep in a seam it is (0-1).
 *
 * The sphere is split like a cube (its six faces by the dominant axis), each face into
 * three strips, the strips of neighbouring faces at right angles - the eighteen panels of
 * a real volleyball. Measured in equal angles, so every strip is the same width all the
 * way along. Faces alternate which strip is the accent: the middle one on half of them,
 * the outer two on the rest.
 */
const BALL_PANELS = /* glsl */ `
  void ballPanels(vec3 d, out float slot, out float seam) {
    vec3 ad = abs(d);
    float axis;
    float sgn;
    vec2 uv;
    if (ad.x >= ad.y && ad.x >= ad.z) { axis = 0.0; sgn = step(0.0, d.x); uv = d.yz / ad.x; }
    else if (ad.y >= ad.z) { axis = 1.0; sgn = step(0.0, d.y); uv = d.zx / ad.y; }
    else { axis = 2.0; sgn = step(0.0, d.z); uv = d.xy / ad.z; }
    vec2 e = atan(uv) * 1.2732395;
    float strip = e.y < -0.3333 ? 0.0 : (e.y < 0.3333 ? 1.0 : 2.0);
    float parity = mod(axis + sgn, 2.0);
    slot = strip == 1.0 ? (parity < 0.5 ? 2.0 : 0.0) : (parity < 0.5 ? 0.0 : 1.0);
    float dist = min(abs(abs(e.y) - 0.3333), 1.0 - max(abs(e.x), abs(e.y)));
    seam = 1.0 - smoothstep(0.012, 0.04, dist);
  }
`

const VERTEX_HEAD = /* glsl */ `
  attribute vec3 aP;
  attribute vec4 aLook;
  attribute vec3 aCa;
  attribute vec3 aCb;
  attribute vec3 aCc;
  attribute vec2 aSword;
  varying vec3 vSwordP;
  varying vec4 vSwordLook;
  varying vec3 vSwordA;
  varying vec3 vSwordB;
  varying vec3 vSwordC;
  varying vec3 vSwordN;
  varying vec3 vSwordInfo;
  uniform float uSwordTime;
  #ifdef SWORD_SHOWCASE
    attribute vec3 aCenter;
    attribute float aPhase;
  #endif
`

/**
 * The paint varyings, then the showcase's turn: every ball spins about its own upright
 * axis on its stand (aCenter) and bobs, each a beat behind the last (aPhase).
 */
const VERTEX_NORMAL = /* glsl */ `
  vSwordP = aP;
  vSwordLook = aLook;
  // Colours travel as sRGB bytes; light in linear.
  vSwordA = pow(aCa, vec3(2.2));
  vSwordB = pow(aCb, vec3(2.2));
  vSwordC = pow(aCc, vec3(2.2));
  vSwordN = normal;
  vSwordInfo = vec3(aSword, 0.0);
  vec3 objectNormal = normal;
  #ifdef SWORD_SHOWCASE
    vSwordInfo.z = aPhase;
    float swordTurn = uSwordTime * 0.6 + aPhase * 0.7;
    float swordC = cos(swordTurn);
    float swordS = sin(swordTurn);
    objectNormal = vec3(swordC * normal.x + swordS * normal.z, normal.y, -swordS * normal.x + swordC * normal.z);
  #endif
`

const VERTEX_POSITION = /* glsl */ `
  vec3 transformed = position;
  #ifdef SWORD_SHOWCASE
    transformed = aCenter + vec3(swordC * position.x + swordS * position.z, position.y + sin(uSwordTime * 1.6 + aPhase) * 0.15, -swordS * position.x + swordC * position.z);
  #endif
`

/**
 * The fragment's paint: on a ball's surface (aLook.z 1: with accent panels, 2: every panel
 * in the look) its panel picks the colours and the look - the accent panels plain and
 * glossy - and the seams are pressed in; anything else (rings, wings, spikes) is painted
 * in its look as it is. The painter and the shine are each called exactly once (the
 * panel only picks their inputs): shader compilers inline every call, and three copies of
 * the painter made the program several times slower to compile at start-up.
 */
const FRAGMENT_PAINT = /* glsl */ `
  vec3 swordCol;
  vec3 swordEmit;
  vec3 swordN = normalize(vSwordN);
  vec3 paintP = vSwordP;
  float paintLook = vSwordLook.x;
  float paintGlow = vSwordLook.y;
  vec3 paintA = vSwordA;
  vec3 paintB = vSwordB;
  float seam = 0.0;
  if (vSwordLook.z > 0.5) {
    vec3 dir = normalize(vSwordP);
    float slot;
    ballPanels(dir, slot, seam);
    if (vSwordLook.z > 1.5 && slot > 1.5) slot = 0.0;
    paintP = dir * 0.5;
    if (slot > 1.5) {
      paintLook = ${K.GLOSS}.0;
      paintGlow = vSwordLook.w;
      paintA = vSwordC;
      paintB = vSwordC;
    } else if (slot > 0.5) {
      paintA = vSwordB;
      paintB = vSwordA;
    }
  }
  swordPaint(paintP, swordN, normal, paintLook, paintA, paintB, paintGlow, uSwordTime, swordCol, swordEmit);
  swordShine(paintP, normal, vSwordLook.x, vSwordA, vSwordB, vSwordInfo, uSwordTime, swordCol, swordEmit);
  swordCol *= 1.0 - seam * 0.6;
  swordEmit *= 1.0 - seam * 0.8;
  diffuseColor.rgb = swordCol;
  totalEmissiveRadiance += swordEmit;
`

/** A Lambert material taught to paint volleyballs; `showcase` turns them on their stands. */
function createBallMaterial(showcase) {
  const material = new MeshLambertMaterial({ color: 0xffffff })
  if (showcase) material.defines = { SWORD_SHOWCASE: '' }
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSwordTime = glowTime
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_HEAD}`)
      .replace('#include <beginnormal_vertex>', VERTEX_NORMAL)
      .replace('#include <begin_vertex>', VERTEX_POSITION)
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uSwordTime;
        varying vec3 vSwordP;
        varying vec4 vSwordLook;
        varying vec3 vSwordA;
        varying vec3 vSwordB;
        varying vec3 vSwordC;
        varying vec3 vSwordN;
        varying vec3 vSwordInfo;
        ${SWORD_GLSL}
        ${BALL_PANELS}`,
      )
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${FRAGMENT_PAINT}`)
  }
  material.customProgramCacheKey = () => (showcase ? 'ball-showcase-v1' : 'ball-v1')
  return material
}

// --- Building a ball ------------------------------------------------------------------

const _color = new Color()
const UP = new Vector3(0, 1, 0)

/** sRGB bytes of a hex colour. */
function srgb(hex) {
  const h = _color.set(hex).getHex()
  return [(h >> 16) & 255, (h >> 8) & 255, h & 255]
}

/** A transform: position, Euler rotation (XYZ) and scale. */
function at(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromEuler(new Euler(rx, ry, rz)), new Vector3(sx, sy, sz))
}

/** A transform turning +Y to point along (dx, dy, dz), from (x, y, z). */
function aim(x, y, z, dx, dy, dz) {
  const q = new Quaternion().setFromUnitVectors(UP, new Vector3(dx, dy, dz).normalize())
  return new Matrix4().compose(new Vector3(x, y, z), q, new Vector3(1, 1, 1))
}

/** A polygon (in the XY plane) as a Shape. */
function shapeOf(points) {
  const s = new Shape()
  s.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i += 1) s.lineTo(points[i][0], points[i][1])
  s.closePath()
  return s
}

/** A flat piece cut out of `shape` (XY plane), `depth` thick along Z and centred on z = 0. */
function plate(shape, depth) {
  const g = new ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, curveSegments: 4 })
  g.translate(0, 0, -depth / 2)
  return g
}

/** A feathered wing reaching out along +X from the origin, `k` metres long. */
function wingShape(k, side) {
  const pts = [
    [0, -0.12],
    [0.45, -0.2],
    [0.62, -0.08],
    [0.82, -0.04],
    [0.72, 0.06],
    [1, 0.16],
    [0.74, 0.22],
    [0.84, 0.36],
    [0.5, 0.3],
    [0.3, 0.38],
    [0, 0.14],
  ]
  return shapeOf(pts.map(([x, y]) => [x * k * side, y * k]))
}

/** Collects a ball's parts, each painted in its own look and colours, into one geometry. */
class BallBuilder {
  constructor() {
    this.parts = []
  }

  /**
   * Adds a part painted `look` in colours `a` / `b`. `m` places it; `local` paints it in
   * its own frame (before `m`); `mode` 1 or 2 makes it a ball's panelled surface (with
   * accent panels in `c`, or all in the look).
   */
  add(geometry, look, a, b = a, { glow = 0, m = null, local = false, mode = 0, c = a, cGlow = 0 } = {}) {
    const g = geometry
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name)
    g.clearGroups()
    const own = local ? g.getAttribute('position').array.slice() : null
    if (m) g.applyMatrix4(m)
    if (!g.getAttribute('normal')) g.computeVertexNormals()
    const count = g.getAttribute('position').count
    if (!g.index) g.setIndex(Array.from({ length: count }, (_, i) => i))
    g.setAttribute('aP', new BufferAttribute(own ?? g.getAttribute('position').array.slice(), 3))
    const looks = new Float32Array(count * 4)
    const ca = new Uint8Array(count * 3)
    const cb = new Uint8Array(count * 3)
    const cc = new Uint8Array(count * 3)
    const cols = [srgb(a), srgb(b), srgb(c)]
    for (let i = 0; i < count; i += 1) {
      looks.set([look, glow, mode, cGlow], i * 4)
      ca.set(cols[0], i * 3)
      cb.set(cols[1], i * 3)
      cc.set(cols[2], i * 3)
    }
    g.setAttribute('aLook', new BufferAttribute(looks, 4))
    g.setAttribute('aCa', new BufferAttribute(ca, 3, true))
    g.setAttribute('aCb', new BufferAttribute(cb, 3, true))
    g.setAttribute('aCc', new BufferAttribute(cc, 3, true))
    this.parts.push(g)
    return this
  }

  build() {
    const merged = mergeGeometries(this.parts, false)
    for (const part of this.parts) part.dispose()
    merged.computeBoundingBox()
    merged.computeBoundingSphere()
    return merged
  }
}

/** The twelve directions of an icosahedron's corners: where spikes and studs go. */
const ICO_DIRS = (() => {
  const t = (1 + Math.sqrt(5)) / 2
  const raw = [
    [-1, t, 0],
    [1, t, 0],
    [-1, -t, 0],
    [1, -t, 0],
    [0, -1, t],
    [0, 1, t],
    [0, -1, -t],
    [0, 1, -t],
    [t, 0, -1],
    [t, 0, 1],
    [-t, 0, -1],
    [-t, 0, 1],
  ]
  return raw.map(([x, y, z]) => new Vector3(x, y, z).normalize())
})()

/**
 * The Legend balls' extras round a ball of radius `r` centred at (0, r, 0), in the ball's
 * accent (or trail) colours.
 */
const DECOR = {
  /** A ring orbiting the ball's middle, tilted. */
  ring(b, r, d) {
    b.add(new TorusGeometry(r * 1.45, r * 0.07, 4, 32), K.NEON, d.trail, d.trail, { glow: 0.8, m: at(0, r, 0, Math.PI / 2 + 0.35, 0, 0.2) })
  },
  /** Two rings crossing, like an atom's orbits. */
  rings(b, r, d) {
    b.add(new TorusGeometry(r * 1.42, r * 0.06, 4, 32), K.NEON, d.trail, d.trail, { glow: 0.8, m: at(0, r, 0, Math.PI / 2 + 0.45, 0, 0.3) })
    b.add(new TorusGeometry(r * 1.55, r * 0.05, 4, 32), K.NEON, d.c ?? d.trail, d.c ?? d.trail, { glow: 0.8, m: at(0, r, 0, Math.PI / 2 - 0.5, 0, -0.35) })
  },
  /** A glowing halo floating over the ball. */
  halo(b, r) {
    b.add(new TorusGeometry(r * 0.7, r * 0.09, 4, 24), K.NEON, '#fff3a8', '#fff3a8', { glow: 1, m: at(0, r * 2.45, 0, Math.PI / 2) })
  },
  /** Two little moons on its orbit. */
  moons(b, r, d) {
    b.add(new SphereGeometry(r * 0.28, 10, 8), K.GLOSS, '#fff6dc', '#fff6dc', { glow: 0.4, m: at(r * 1.5, r * 1.5, 0) })
    b.add(new SphereGeometry(r * 0.22, 10, 8), K.GLOSS, d.c, d.c, { glow: 0.5, m: at(-r * 1.45, r * 0.6, r * 0.3) })
    b.add(new TorusGeometry(r * 1.5, r * 0.03, 3, 32), K.NEON, d.trail, d.trail, { glow: 0.7, m: at(0, r, 0, Math.PI / 2 + 0.5, 0, 0.3) })
  },
  /** Spikes out of the seams' corners. */
  spikes(b, r, d) {
    for (const dir of ICO_DIRS) {
      const g = new ConeGeometry(r * 0.12, r * 0.42, 5, 1).translate(0, r * 0.21, 0)
      b.add(g, K.NEON, d.trail, d.trail, { glow: 0.7, m: aim(dir.x * r * 0.92, r + dir.y * r * 0.92, dir.z * r * 0.92, dir.x, dir.y, dir.z) })
    }
  },
  /** Rivets studding the panels. */
  studs(b, r, d) {
    for (const dir of ICO_DIRS) {
      b.add(new SphereGeometry(r * 0.1, 6, 4), K.METAL, d.c, d.b, { m: at(dir.x * r * 0.98, r + dir.y * r * 0.98, dir.z * r * 0.98) })
    }
  },
  /** Feathered wings either side. */
  wings(b, r, d) {
    for (const side of [-1, 1]) {
      b.add(plate(wingShape(r * 2.1, side), r * 0.08), K.FEATHER, '#ffffff', d.trail, { glow: 0.35, m: at(side * r * 0.75, r * 1.05, -r * 0.2, 0, side * 0.35, 0) })
    }
  },
  /** A spiral golden horn on top. */
  horn(b, r) {
    b.add(new ConeGeometry(r * 0.2, r * 0.9, 8, 1), K.CANDY, '#ffe27a', '#ffffff', { m: at(0, r * 2.3, r * 0.12, 0.25) })
  },
  /** Two curved horns, like a little dragon's. */
  horns(b, r) {
    for (const side of [-1, 1]) {
      b.add(new ConeGeometry(r * 0.14, r * 0.6, 6, 1), K.GLOSS, '#fff6dc', '#ffd23a', { m: at(side * r * 0.55, r * 1.95, -r * 0.1, -0.3, 0, -side * 0.45) })
    }
  },
}

/** Builds ball `id`: its panelled surface and any extras. */
function buildBall(id) {
  const d = defOf(id)
  const r = radiusOf(id)
  const b = new BallBuilder()
  const mode = d.c ? 1 : 2
  b.add(new SphereGeometry(r, 18, 12), d.look, d.a, d.b, { glow: d.glow ?? 0, m: at(0, r, 0), local: true, mode, c: d.c ?? d.a, cGlow: d.cGlow ?? 0 })
  for (const name of d.decor ?? []) DECOR[name](b, r, d)
  return b.build()
}

const geometries = new Map()

/**
 * How much ball `id` sparkles (the shine's star glints and lit edges): none up to Rare,
 * then rising with its rarity to 1 for the Divine (Legend) balls.
 */
function sparkleOf(id) {
  const tire = TIRES.find((t) => t.id === id)
  const order = RARITIES[tire?.rarity]?.order ?? 0
  return Math.min(1, Math.max(0, (order - 2) / 5))
}

/** Ball `id`'s geometry, built the first time it's asked for and shared from then on. */
export function getBallGeometry(id) {
  const key = BALL_DEFS[id] ? id : 'bicycle'
  let geometry = geometries.get(key)
  if (!geometry) {
    geometry = buildBall(key)
    // Every vertex knows its ball's sparkle (aSword.x) for the shine; .y the shine's span.
    const count = geometry.getAttribute('position').count
    const info = new Float32Array(count * 2)
    const spark = sparkleOf(key)
    for (let i = 0; i < count; i += 1) {
      info[i * 2] = spark
      info[i * 2 + 1] = 1
    }
    geometry.setAttribute('aSword', new BufferAttribute(info, 2))
    geometries.set(key, geometry)
  }
  return geometry
}

/** Ball `id`'s radius, metres. */
export const ballRadius = (id) => radiusOf(BALL_DEFS[id] ? id : 'bicycle')
/** Bottom to top of the ball itself (its diameter): what holds and throws measure it by. */
export const ballLength = (id) => 2 * ballRadius(id)
/** The ball's centre above its bottom (its radius): what a served ball spins about. */
export const ballCenterY = (id) => ballRadius(id)

// --- One ball (in a hand, or in flight) ---------------------------------------------------

let ballMaterial = null

/**
 * One ball: a single mesh (an avatar's, or one in flight). `mesh.setBall(id)` dresses it as
 * ball `id` (cheap, a no-op when unchanged: it swaps in that ball's shared geometry).
 * Every ball shares one material, and so one program. Placed every frame by its holder.
 */
export function createBallMesh() {
  ballMaterial ??= createBallMaterial(false)
  const mesh = new Mesh(getBallGeometry('bicycle'), ballMaterial)
  mesh.frustumCulled = false
  let shown = 'bicycle'
  mesh.setBall = (id) => {
    if (id === shown) return
    shown = id
    mesh.geometry = getBallGeometry(id)
  }
  return mesh
}

/**
 * Lets a ball mesh go. Its geometry and material are shared by every ball (and the shop),
 * built once and kept, so there's nothing of its own to free - and it's left where it is
 * in the scene: React owns that.
 */
// eslint-disable-next-line no-unused-vars
export function disposeBallMesh(mesh) {}

// --- The ball shop's showcase ------------------------------------------------------------

/**
 * Every ball in `entries` (`{ id, x, y, z, phase, scale? }`: the ball and where it floats)
 * in one mesh and one draw call: each its own `scale` (or the shared `scale`) times its
 * size, centred on its spot, and turned and bobbed on it by the vertex shader (phase
 * staggers them). Free it with disposeBallShowcase.
 */
export function createBallShowcase(entries, scale = 1) {
  const parts = entries.map(({ id, x, y, z, phase, scale: own }) => {
    const g = getBallGeometry(id).clone()
    const box = g.boundingBox
    g.translate(0, -(box.min.y + box.max.y) / 2, 0)
    g.applyMatrix4(at(0, 0, 0, 0, 0, 0, own ?? scale))
    const count = g.getAttribute('position').count
    const centres = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      centres[i * 3] = x
      centres[i * 3 + 1] = y
      centres[i * 3 + 2] = z
    }
    g.setAttribute('aCenter', new BufferAttribute(centres, 3))
    g.setAttribute('aPhase', new BufferAttribute(new Float32Array(count).fill(phase), 1))
    return g
  })
  const geometry = mergeGeometries(parts, false)
  for (const part of parts) part.dispose()
  const mesh = new Mesh(geometry, createBallMaterial(true))
  // Each ball is built round the origin and moved to its spot by the vertex shader, so the
  // geometry's own bounds are useless: the sphere is set from the spots instead.
  const centre = new Vector3()
  for (const e of entries) centre.add(new Vector3(e.x, e.y, e.z))
  centre.divideScalar(Math.max(1, entries.length))
  let radius = 0
  for (const e of entries) radius = Math.max(radius, Math.hypot(e.x - centre.x, e.y - centre.y, e.z - centre.z))
  geometry.boundingSphere = new Sphere(centre, radius + 1.2 * scale + 2)
  mesh.frustumCulled = true
  return mesh
}

export function disposeBallShowcase(mesh) {
  mesh.geometry.dispose()
  mesh.material.dispose()
}

/** Triangles in ball `id` (for budgets and tests). */
export const ballTriangles = (id) => getBallGeometry(id).index.count / 3
