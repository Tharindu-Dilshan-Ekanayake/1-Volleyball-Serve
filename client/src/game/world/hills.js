import { hash2 } from '@shared/rng'
import { CANYON_HALF_WIDTH, PLAZA } from '@shared/world'

import { STYLE } from '../materials'
import { SCOREBOARD } from './terrain'

/**
 * The ridges round the lobby: blocky hills, one box per column on a 4 m grid, stepping up
 * in terraces the further they stand from the plaza - low grassy banks just past its edge,
 * cliffs 36 m high further out - each terrace a colour further along the venue's rock ramp.
 * At Sunblade Academy they're green-capped hills of brown earth (STYLE.HILL) with trees
 * and pines on the terraces, beyond the castle walls; in Christmas Village they're ash-capped basalt, some columns split by
 * glowing lava (STYLE.LAVA), with obsidian spikes, dead trees, lava rocks and fire torches
 * - and a smoking volcano rises over the north-east ridge (buildVolcano). The field's
 * mouth is left open to the north (Lane.jsx carries the scenery on down the court).
 *
 * The great banner board on the south hills is kept clear (underScoreboard).
 * Everything goes into the world's block set (the volcano's smoke into its props): no
 * draw calls of its own, nothing to do per frame. `density` (the preset's decorDensity)
 * thins the decor and, on LOW, coarsens the grid to 8 m columns (a quarter of the boxes).
 */

/** The open ground the hills keep clear of: the plaza and the castle round its edge (north too, behind the walls). */
const OPEN = { minX: PLAZA.minX - 4, maxX: PLAZA.maxX + 4, minZ: PLAZA.minZ - 4, maxZ: PLAZA.maxZ + 4 }
/** The field's valley floor, north of the plaza, left open for it. */
const VALLEY_HALF = CANYON_HALF_WIDTH + 6
/** How far out the hills go, from the middle. */
const REACH = { x: 96, south: PLAZA.maxZ + 112, north: -104 }

const TREE = { trunk: '#7a4f2a', leaves: ['#2f9e3a', '#3fb84a', '#4ccf54'], pine: ['#1f7a3a', '#25904a'] }
const PALM = { trunk: ['#a87a4a', '#8e6438'], leaves: ['#2fae4a', '#3fc455'], coconut: '#6a4224', umbrella: ['#ff6f61', '#18b5b0', '#ffd21f', '#ff9a3a'] }
const XMAS = { trunk: '#5a3a22', pine: ['#1f6a3a', '#257a44'], gifts: ['#d8203a', '#1f8a4a', '#2f6fd8', '#b03ad8', '#ffffff'] }
const LAVA = { obsidian: ['#1a1220', '#241a2c'], dead: '#2a2020', rock: '#ff5a14', flame: '#ff6a1e', core: '#ffd27a' }

/** Metres from (x, z) to the nearest open ground (the plaza, or the field's valley). */
function openDistance(x, z) {
  const dx = Math.max(OPEN.minX - x, 0, x - OPEN.maxX)
  const dz = Math.max(OPEN.minZ - z, 0, z - OPEN.maxZ)
  const plaza = Math.hypot(dx, dz)
  const valley = z < OPEN.minZ ? Math.max(0, Math.abs(x) - VALLEY_HALF) : Infinity
  return Math.min(plaza, valley)
}

/** Under the great banner board on the south hills: kept below its face. */
const underScoreboard = (x, z) =>
  Math.abs(x - SCOREBOARD.x) < SCOREBOARD.width / 2 + 3 && Math.abs(z - SCOREBOARD.z) < 4

/**
 * Something on a terrace at (x, top, z). At the academy: a round leafy tree (a trunk and
 * two stacked leaf blocks) or a pine (three stepped tiers). In Christmas Village: a tilted obsidian
 * spike, a dead tree with two bare branches, a glowing lava rock, or a fire torch.
 */
function addDecor(blocks, x, top, z, k, kind) {
  const r = hash2(k, 31)
  if (kind === 'palm') {
    if (r < 0.8) {
      // A palm: a leaning trunk of rings, a crown of fronds drooping out all round, coconuts.
      const h = 4.5 + hash2(k, 32) * 3
      const lean = (hash2(k, 36) - 0.5) * 0.5
      const turn = hash2(k, 37) * Math.PI * 2
      const lx = Math.sin(turn) * lean
      const lz = Math.cos(turn) * lean
      const rings = 5
      for (let i = 0; i < rings; i += 1) {
        const f = i / rings
        blocks.add(x + lx * h * f, top + (i + 0.5) * (h / rings), z + lz * h * f, 0.62 - f * 0.12, h / rings + 0.05, 0.62 - f * 0.12, i % 2 ? PALM.trunk[0] : PALM.trunk[1], STYLE.SMOOTH, turn)
      }
      const cx = x + lx * h
      const cz = z + lz * h
      const cy = top + h
      for (let i = 0; i < 6; i += 1) {
        const a = turn + (i / 6) * Math.PI * 2
        blocks.add(cx + Math.sin(a) * 1.3, cy - 0.15, cz + Math.cos(a) * 1.3, 0.7, 0.16, 2.8, PALM.leaves[i % 2], STYLE.SMOOTH, a, 0.35)
      }
      blocks.add(cx, cy + 0.1, cz, 0.9, 0.5, 0.9, PALM.leaves[0], STYLE.SMOOTH, turn)
      blocks.add(cx + 0.3, cy - 0.35, cz + 0.2, 0.34, 0.34, 0.34, PALM.coconut, STYLE.SMOOTH)
      blocks.add(cx - 0.25, cy - 0.38, cz - 0.15, 0.32, 0.32, 0.32, PALM.coconut, STYLE.SMOOTH)
    } else {
      // A beach umbrella over a towel.
      const c = PALM.umbrella[k % PALM.umbrella.length]
      blocks.addOn(x, top, z, 0.12, 2.4, 0.12, '#ffffff', STYLE.SMOOTH)
      blocks.addOn(x, top + 2.3, z, 2.8, 0.25, 2.8, c, STYLE.STRIPES, hash2(k, 36) * Math.PI)
      blocks.addOn(x, top + 2.55, z, 1.4, 0.2, 1.4, c, STYLE.STRIPES, hash2(k, 36) * Math.PI + 0.4)
      blocks.addOn(x + 0.9, top, z + 0.3, 1.0, 0.04, 2.0, PALM.umbrella[(k + 1) % PALM.umbrella.length], STYLE.STRIPES)
    }
    return
  }
  if (kind === 'xmas') {
    if (r < 0.62) {
      // A snowy pine: three tiers of dark green, each capped with snow.
      const turn = hash2(k, 36) * Math.PI
      const s = 0.9 + hash2(k, 32) * 0.5
      blocks.addOn(x, top, z, 0.5 * s, 1.2 * s, 0.5 * s, XMAS.trunk, STYLE.SMOOTH)
      for (const [y, w, hh] of [[1.0, 3.2, 1.8], [2.6, 2.3, 1.6], [4.0, 1.3, 1.4]]) {
        blocks.addOn(x, top + y * s, z, w * s, hh * s, w * s, XMAS.pine[k % 2], STYLE.STUDS, turn + y * 0.3)
        blocks.addOn(x, top + (y + hh * 0.82) * s, z, w * 0.82 * s, 0.3 * s, w * 0.82 * s, '#ffffff', STYLE.SMOOTH, turn + y * 0.3)
      }
      if (hash2(k, 38) < 0.5) blocks.addOn(x, top + 5.4 * s, z, 0.4 * s, 0.4 * s, 0.4 * s, '#ffd21f', STYLE.GLOW, Math.PI / 4)
    } else if (r < 0.82) {
      // A pile of presents, ribboned.
      for (let i = 0; i < 3; i += 1) {
        const w = 0.9 + hash2(k, 40 + i) * 0.7
        const ox = (hash2(k, 50 + i) - 0.5) * 1.6
        const oz = (hash2(k, 60 + i) - 0.5) * 1.6
        const c = XMAS.gifts[(k + i) % XMAS.gifts.length]
        blocks.addOn(x + ox, top, z + oz, w, w * 0.8, w, c, STYLE.SMOOTH, hash2(k, 70 + i))
        blocks.addOn(x + ox, top, z + oz, w * 0.22, w * 0.82, w + 0.04, '#ffd21f', STYLE.SMOOTH, hash2(k, 70 + i))
        blocks.addOn(x + ox, top, z + oz, w + 0.04, w * 0.82, w * 0.22, '#ffd21f', STYLE.SMOOTH, hash2(k, 70 + i))
      }
    } else {
      // A snowman with a carrot nose and a red scarf.
      blocks.addOn(x, top, z, 1.6, 1.4, 1.6, '#ffffff', STYLE.SMOOTH)
      blocks.addOn(x, top + 1.4, z, 1.15, 1.0, 1.15, '#ffffff', STYLE.SMOOTH)
      blocks.addOn(x, top + 1.3, z, 1.25, 0.22, 1.25, '#d8203a', STYLE.SMOOTH)
      blocks.addOn(x, top + 2.4, z, 0.8, 0.75, 0.8, '#ffffff', STYLE.SMOOTH)
      blocks.add(x, top + 2.75, z + 0.5, 0.12, 0.12, 0.4, '#ff8a1e', STYLE.SMOOTH)
      blocks.addOn(x, top + 3.15, z, 0.7, 0.1, 0.7, '#1b1b1f', STYLE.SMOOTH)
      blocks.addOn(x, top + 3.25, z, 0.46, 0.45, 0.46, '#1b1b1f', STYLE.SMOOTH)
    }
    return
  }
  if (kind === 'lava') {
    if (r < 0.35) {
      const h = 3 + hash2(k, 32) * 4
      const lean = (hash2(k, 36) - 0.5) * 0.5
      blocks.add(x, top + h / 2 - 0.3, z, 1.1, h, 1.1, LAVA.obsidian[k % 2], STYLE.SMOOTH, hash2(k, 37) * Math.PI, lean, -lean)
      blocks.add(x, top + h * 0.85, z, 0.5, h * 0.4, 0.5, LAVA.obsidian[(k + 1) % 2], STYLE.SMOOTH, hash2(k, 38) * Math.PI, lean * 1.2, -lean * 1.2)
    } else if (r < 0.6) {
      const h = 3.5 + hash2(k, 32) * 2
      blocks.addOn(x, top, z, 0.5, h, 0.5, LAVA.dead, STYLE.SMOOTH)
      blocks.add(x + 0.7, top + h * 0.75, z, 1.6, 0.25, 0.25, LAVA.dead, STYLE.SMOOTH, hash2(k, 36) * Math.PI, 0, 0.6)
      blocks.add(x - 0.6, top + h * 0.6, z, 1.3, 0.22, 0.22, LAVA.dead, STYLE.SMOOTH, hash2(k, 37) * Math.PI, 0, -0.7)
    } else if (r < 0.85) {
      const s = 1.6 + hash2(k, 32) * 1.6
      blocks.addOn(x, top, z, s, s * 0.8, s, LAVA.rock, STYLE.LAVA, hash2(k, 36) * Math.PI)
    } else {
      blocks.addOn(x, top, z, 0.3, 2.6, 0.3, LAVA.dead, STYLE.SMOOTH)
      blocks.addOn(x, top + 2.6, z, 0.7, 0.7, 0.7, LAVA.flame, STYLE.GLOW)
      blocks.addOn(x, top + 3.0, z, 0.4, 0.6, 0.4, LAVA.core, STYLE.GLOW)
    }
    return
  }
  if (r < 0.62) {
    const h = 2.4 + hash2(k, 32) * 1.6
    const leaf = TREE.leaves[Math.floor(hash2(k, 35) * TREE.leaves.length)]
    blocks.addOn(x, top, z, 0.7, h, 0.7, TREE.trunk, STYLE.SMOOTH)
    blocks.addOn(x, top + h, z, 3.4, 2.2, 3.4, leaf, STYLE.STUDS)
    blocks.addOn(x, top + h + 2.2, z, 2.2, 1.2, 2.2, leaf, STYLE.STUDS)
  } else {
    const turn = hash2(k, 36) * Math.PI
    blocks.addOn(x, top, z, 0.5, 1.4, 0.5, TREE.trunk, STYLE.SMOOTH)
    blocks.addOn(x, top + 1.2, z, 3, 1.8, 3, TREE.pine[0], STYLE.STUDS, turn)
    blocks.addOn(x, top + 3.0, z, 2.1, 1.6, 2.1, TREE.pine[1], STYLE.STUDS, turn + 0.4)
    blocks.addOn(x, top + 4.6, z, 1.1, 1.4, 1.1, TREE.pine[0], STYLE.STUDS, turn + 0.8)
  }
}

/**
 * Builds the hills into `blocks` in `venue`'s look (sceneStyle VENUES: `hills`). Returns
 * how many columns and decor pieces went in (for tests/debug).
 */
export function buildHills(blocks, { density = 1, venue } = {}) {
  const look = venue?.hills ?? { rock: ['#9a6a3a', '#8d6036', '#805632', '#734d2d', '#664428'], cap: STYLE.HILL, trees: 'tree' }
  const cap = look.cap ?? STYLE.HILL
  const cell = density < 0.5 ? 8 : 4
  const decorChance = density >= 0.75 ? 0.07 : density >= 0.5 ? 0.05 : 0.035
  let columns = 0
  let trees = 0
  for (let gx = -REACH.x; gx < REACH.x; gx += cell) {
    for (let gz = REACH.north; gz < REACH.south; gz += cell) {
      const x = gx + cell / 2
      const z = gz + cell / 2
      const d = openDistance(x, z)
      if (d < 2) continue
      // Terraces 4 m apart in height, every ~9 m out, with a little noise so the edges
      // wander; never higher than 36 m.
      const k = Math.floor(gx / 4) * 977 + Math.floor(gz / 4)
      const n = hash2(Math.floor(gx / 8), Math.floor(gz / 8))
      const step = Math.min(9, 1 + Math.floor(d / 9 + n * 1.3))
      let h = 4 * step
      if (underScoreboard(x, z)) h = Math.min(h, 20)
      const rock = look.rock[Math.min(look.rock.length - 1, Math.floor((step - 1) / 2))]
      // Now and then (Christmas Village) a column of lava rock: glowing seams through the basalt.
      if (look.lava && hash2(k, 41) < look.lava.chance) blocks.addOn(x, 0, z, cell, h, cell, look.lava.color, STYLE.LAVA)
      else blocks.addOn(x, 0, z, cell, h, cell, rock, cap)
      columns += 1
      // Decor now and then on a terrace near enough to be seen.
      if (d < 70 && hash2(k, 30) < decorChance * (cell / 4) ** 2) {
        addDecor(blocks, x + (hash2(k, 33) - 0.5) * (cell - 3.4), h, z + (hash2(k, 34) - 0.5) * (cell - 3.4), k, look.trees)
        trees += 1
      }
    }
  }
  return { columns, trees }
}

/** Where Christmas Village's giant tree stands: over the north-east ridge, seen from the plaza and the court. */
export const VOLCANO = { x: 81, z: -71, height: 74 }

/**
 * Christmas Village's giant Christmas tree over the north-east ridge: a trunk on a red
 * stand, seven stepped tiers of dark pine (each a little turned, its edge snowed on and
 * hung with glowing baubles in red, gold, blue and white), a garland of lights spiralling
 * up it and a great golden star on top, with a few snow puffs drifting off it (static
 * props). Boxes into `blocks`, the puffs into `props`. (The name of the spot is the
 * template's: VOLCANO.)
 */
export function buildChristmasTree(blocks, props, sphere) {
  const { x, z, height } = VOLCANO
  blocks.addOn(x, 0, z, 26, 6, 26, '#c8102e', STYLE.SMOOTH)
  blocks.addOn(x, 6, z, 22, 0.8, 22, '#ffd21f', STYLE.GLOW)
  blocks.addOn(x, 6, z, 9, 12, 9, '#5a3a22', STYLE.SMOOTH)
  const tiers = 7
  const baubles = ['#e0102f', '#ffd21f', '#3fa8ff', '#ffffff', '#ff6ad0']
  for (let i = 0; i < tiers; i += 1) {
    const w = 64 - i * 8.2
    const h = (height - 14) / tiers + 2
    const y = 14 + i * ((height - 14) / tiers)
    const turn = i * 0.32
    blocks.addOn(x, y, z, w, h, w, i % 2 ? '#1f6a3a' : '#237a42', STYLE.STUDS, turn)
    // Snow along the tier's top edge.
    blocks.addOn(x, y + h - 0.2, z, w * 0.86, 0.8, w * 0.86, '#ffffff', STYLE.SMOOTH, turn)
    // Baubles round the tier's skirt.
    const n = 10 - i
    for (let b = 0; b < n; b += 1) {
      const a = turn + (b / n) * Math.PI * 2
      const r = w * 0.52
      const s = 2.2 - i * 0.15
      blocks.add(x + Math.sin(a) * r, y + h * 0.3, z + Math.cos(a) * r, s, s, s, baubles[(b + i) % baubles.length], STYLE.GLOW, a)
    }
    // A garland of lights wound round it.
    for (let g = 0; g < 14; g += 1) {
      const a = turn + (g / 14) * Math.PI * 2 + i * 0.9
      const r = w * 0.5 * (1 - g / 28)
      blocks.add(x + Math.sin(a) * r, y + (g / 14) * h, z + Math.cos(a) * r, 0.9, 0.9, 0.9, g % 2 ? '#fff1b0' : '#ffb347', STYLE.GLOW)
    }
  }
  // The star.
  const top = height + 2
  blocks.add(x, top + 4, z, 7, 7, 1.6, '#ffd21f', STYLE.GLOW, 0, 0, Math.PI / 4)
  blocks.add(x, top + 4, z, 5, 9, 1.4, '#ffe98a', STYLE.GLOW)
  blocks.add(x, top + 4, z, 9, 5, 1.4, '#ffe98a', STYLE.GLOW)
  // A few snow puffs drifting off it to the east.
  for (let i = 0; i < 6; i += 1) {
    const s = 4 + i * 1.2
    props.add(sphere, { position: [x + 20 + i * 6, top - 20 + i * 5, z - i * 2], scale: [s, s * 0.7, s], color: '#f4f8ff' })
  }
}
