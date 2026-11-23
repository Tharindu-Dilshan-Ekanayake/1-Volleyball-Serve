import { STYLE } from '../materials'

/**
 * The academy's heraldry and fixtures, as boxes for the world's block set (no draw calls
 * of their own): hanging banners with the academy's crest - two crossed balls, point up,
 * over a gold border - giant crossed balls for the crests on the arch and the great board,
 * braziers and wall torches. Everything is placed in a local frame turned by `yaw` about
 * the vertical (local +Z is the way it faces: yaw 0 faces south, +Z), so the same piece
 * hangs on any wall.
 *
 * The crest is original: a blue field, a gold border and two steel balls crossed in a
 * saltire with gold guards - no lettering, no borrowed symbol.
 */

/** World offset of local (lx, lz) turned by `yaw`: written into `out` [x, z]. */
const _o = [0, 0]
function turn(yaw, lx, lz) {
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  _o[0] = lx * c + lz * s
  _o[1] = -lx * s + lz * c
  return _o
}

/**
 * A box given in a turned frame: its centre at local (lx, ly, lz) from (x, y, z), sized in
 * local terms, tilted `tilt` about its own facing axis (local Z) before the turn.
 */
export function localBox(blocks, x, y, z, yaw, lx, ly, lz, sx, sy, sz, color, style = STYLE.SMOOTH, tilt = 0) {
  const [ox, oz] = turn(yaw, lx, lz)
  blocks.add(x + ox, y + ly, z + oz, sx, sy, sz, color, style, yaw, 0, tilt)
}

/**
 * One ball lying flat in a turned frame's XY plane: its grip at local (lx, ly), pointing
 * along `tilt` from straight up (positive tilts it towards local -X), `length` from guard
 * to tip, `width` across the blade, `depth` its thickness (out along local Z, at lz).
 */
export function flatSword(blocks, x, y, z, yaw, lx, ly, lz, tilt, length, width, depth, c) {
  const dx = -Math.sin(tilt)
  const dy = Math.cos(tilt)
  const at = (d) => [lx + dx * d, ly + dy * d]
  // Blade, its darker fuller down the middle, and a pointed tip (a diamond: a square turned 45 degrees).
  const [bx, by] = at(length / 2 + width * 0.25)
  localBox(blocks, x, y, z, yaw, bx, by, lz, width, length, depth, c.blade, STYLE.SMOOTH, tilt)
  localBox(blocks, x, y, z, yaw, bx, by, lz + depth * 0.55, width * 0.22, length * 0.86, depth * 0.2, c.fuller ?? '#b9c3d2', STYLE.SMOOTH, tilt)
  const tip = width / Math.SQRT2
  const [tx, ty] = at(length + width * 0.25)
  localBox(blocks, x, y, z, yaw, tx, ty, lz, tip, tip, depth * 0.96, c.blade, STYLE.SMOOTH, tilt + Math.PI / 4)
  // Guard, grip and pommel.
  localBox(blocks, x, y, z, yaw, lx, ly, lz, width * 3.4, width * 0.55, depth * 1.6, c.trim, STYLE.GLOW, tilt)
  const [gx, gy] = at(-width * 0.9)
  localBox(blocks, x, y, z, yaw, gx, gy, lz, width * 0.5, width * 1.5, depth * 1.4, c.grip ?? '#5a3a24', STYLE.SMOOTH, tilt)
  const [px, py] = at(-width * 1.85)
  localBox(blocks, x, y, z, yaw, px, py, lz, width * 0.8, width * 0.8, depth * 1.6, c.trim, STYLE.GLOW, tilt + Math.PI / 4)
}

/**
 * The crest: a blocky volleyball, centred on local (lx, ly), `size` across, lying `lz` out in
 * front of whatever it's on - a white disc of three blocks, two bands of panel colour
 * curving across it (the trim and the blade colours) and a dark ring round it. (The name is
 * the template's: every crest calls it.)
 */
export function crossedSwords(blocks, x, y, z, yaw, lx, ly, lz, size, c) {
  const r = size * 0.36
  // A round-ish disc: a square and the same square turned an eighth, and a dark rim behind.
  localBox(blocks, x, y, z, yaw, lx, ly, lz - 0.02, r * 2.12, r * 2.12, 0.04, '#1b1b1f', STYLE.SMOOTH, Math.PI / 8)
  localBox(blocks, x, y, z, yaw, lx, ly, lz, r * 1.95, r * 1.95, 0.05, '#ffffff', STYLE.SMOOTH)
  localBox(blocks, x, y, z, yaw, lx, ly, lz, r * 1.95, r * 1.95, 0.05, '#ffffff', STYLE.SMOOTH, Math.PI / 4)
  // Two panel bands sweeping across it, and one up through it.
  localBox(blocks, x, y, z, yaw, lx - r * 0.1, ly + r * 0.42, lz + 0.03, r * 1.7, r * 0.42, 0.05, c.trim, STYLE.SMOOTH, -0.35)
  localBox(blocks, x, y, z, yaw, lx + r * 0.1, ly - r * 0.42, lz + 0.03, r * 1.7, r * 0.42, 0.05, c.blade ?? c.trim, STYLE.SMOOTH, -0.35)
  localBox(blocks, x, y, z, yaw, lx + r * 0.05, ly, lz + 0.035, r * 0.34, r * 1.9, 0.05, '#ffffff', STYLE.SMOOTH, -0.35)
}

/**
 * A banner hanging from a bar with its top at (x, top, z), facing `yaw`: the field in
 * `field`, a gold border, a swallow-tailed foot, and the crest's volleyball on it.
 * `w` wide, `h` long; `out` is how far in front of the wall it hangs.
 */
export function banner(blocks, x, top, z, yaw, w, h, c, { field = c.banner, out = 0.12, crest = true } = {}) {
  const y = top - h / 2
  // The bar and its two finials.
  localBox(blocks, x, top + 0.12, z, yaw, 0, 0, out, w + 0.5, 0.14, 0.14, c.trim, STYLE.GLOW)
  // Border, then the field a step in front of it.
  localBox(blocks, x, y, z, yaw, 0, 0, out, w, h, 0.05, c.trim, STYLE.SMOOTH)
  localBox(blocks, x, y + 0.04, z, yaw, 0, 0, out + 0.04, w - 0.22, h - 0.3, 0.05, field, STYLE.SMOOTH)
  // The swallow-tail foot: two pennant points below the field.
  for (const side of [-1, 1]) {
    const s = w * 0.35
    localBox(blocks, x, top - h - s * 0.2, z, yaw, side * w * 0.25, 0, out, s, s, 0.05, field, STYLE.SMOOTH, Math.PI / 4)
  }
  if (crest) crossedSwords(blocks, x, y + h * 0.06, z, yaw, 0, 0, out + 0.1, Math.min(w * 0.95, h * 0.55), c)
}

/** A brazier standing at (x, base, z): a stone foot, an iron bowl and its fire. */
export function brazier(blocks, x, base, z, c, scale = 1) {
  const s = scale
  blocks.addOn(x, base, z, 0.7 * s, 0.25 * s, 0.7 * s, c.dark, STYLE.SMOOTH)
  blocks.addOn(x, base + 0.25 * s, z, 0.3 * s, 0.75 * s, 0.3 * s, c.dark, STYLE.SMOOTH)
  blocks.addOn(x, base + 1.0 * s, z, 0.9 * s, 0.3 * s, 0.9 * s, '#3a3438', STYLE.SMOOTH, Math.PI / 4)
  blocks.addOn(x, base + 1.3 * s, z, 0.62 * s, 0.55 * s, 0.62 * s, c.flame, STYLE.GLOW, 0.3)
  blocks.addOn(x, base + 1.3 * s, z, 0.34 * s, 0.85 * s, 0.34 * s, c.core, STYLE.GLOW, 0.9)
}

/** A torch on a wall bracket at (x, y, z), sticking out towards `yaw`. */
export function wallTorch(blocks, x, y, z, yaw, c) {
  localBox(blocks, x, y - 0.35, z, yaw, 0, 0, 0.18, 0.16, 0.16, 0.36, c.dark, STYLE.SMOOTH)
  localBox(blocks, x, y, z, yaw, 0, 0, 0.36, 0.14, 0.6, 0.14, c.wood, STYLE.SMOOTH)
  localBox(blocks, x, y + 0.42, z, yaw, 0, 0, 0.36, 0.3, 0.32, 0.3, c.flame, STYLE.GLOW, 0.4)
  localBox(blocks, x, y + 0.5, z, yaw, 0, 0, 0.36, 0.15, 0.36, 0.15, c.core, STYLE.GLOW, 0.4)
}
