import { CylinderGeometry, OctahedronGeometry } from 'three'

import { SERVE_NET, SERVE_NET_Z, STAGE_TOWERS, THROW_STAGE } from '@shared/world'

import { STYLE } from '../materials'
import { venueOf } from '../sceneStyle'
import { banner, brazier, localBox, wallTorch } from './heraldry'

const ROOF = new CylinderGeometry(0, 1, 1, 4)
const GEM = new OctahedronGeometry(1, 0)

/** Where the stage's front steps start (the deck runs from the north edge to here). */
export const STEPS_Z = THROW_STAGE.maxZ - 1.2
/** The flag towers: shaft size and height, and their "SERVE STAGE" boards (lettering: signs.js). */
const TOWER = { size: 2.1, height: 12.6, plinth: 3.0 }
export const TOWER_SIGN = { y: 7.2, width: 4.6, height: 1.4, out: TOWER.size / 2 + 0.12 }
/** Each tower's sign's lettering face (south, towards spawn): where its quad goes. */
export const towerSignAt = (tower) => ({ x: tower.x, y: TOWER_SIGN.y, z: tower.z + TOWER_SIGN.out + 0.21 })
/** The stage top's painted arrow and runes (a decal: signs.js): its middle and width. */
export const STAGE_DECAL = { x: 0, z: (THROW_STAGE.minZ + STEPS_Z) / 2, width: 15 }

/**
 * The SERVE STAGE at the court's mouth (the template's launch pad): one wide raised stone
 * stage filling THROW_STAGE, its top at its height - stand anywhere on it and serve. A dark
 * plinth, a recessed body under a cornice, a pale deck with a border of darker stones round
 * its edge, a gold-lit band along its front over the road, and two steps up along its
 * south edge with gold nosings. The deck's arrow and runes are a decal (signs.js). Nothing
 * stands on it or over it, or over the road.
 *
 * Off either end stands a flag tower (STAGE_TOWERS, inside its collider): a slim stone
 * shaft, a crenellated top, a tall pole with the academy's flag streaming away from the
 * stage, a SERVE STAGE board on its south face (towards spawn), a banner down the face
 * turned to the stage, torches, and braziers on its plinth's stage-side corners.
 *
 * Boxes go into the world's block set and the round parts into its props, so it all rides
 * in those two draw calls. `detail` (off on LOW) adds the banners, braziers and flags. No
 * two faces share a plane, and every piece stays inside the stage's rect or a tower's
 * collider (nothing solid on walkable ground).
 */
export function buildRollZone(blocks, props, { detail = true, world = 0 } = {}) {
  const v = venueOf(world)
  buildServeNet(blocks, world)
  const c = v.castle
  const s = THROW_STAGE
  const w = s.maxX - s.minX
  const cx = (s.minX + s.maxX) / 2
  const h = s.height
  const deckD = STEPS_Z - s.minZ
  const deckZ = (s.minZ + STEPS_Z) / 2
  // The deck: plinth, recessed body, the cornice slab whose top is the stage's floor.
  blocks.addOn(cx, 0, deckZ, w, 0.25, deckD, c.dark, STYLE.STUDS)
  blocks.addOn(cx, 0.25, deckZ, w - 0.24, h - 0.37, deckD - 0.24, c.stone[1], STYLE.STUDS)
  blocks.addOn(cx, h - 0.12, deckZ, w, 0.12, deckD, c.cap, STYLE.STUDS)
  // The deck's border: darker stones round its north, east and west edges, a hair proud.
  const b = 0.7
  blocks.addOn(cx, h, s.minZ + b / 2, w, 0.04, b, c.stone[2], STYLE.STUDS)
  for (const side of [-1, 1]) blocks.addOn(cx + side * (w / 2 - b / 2), h, deckZ + b / 2, b, 0.04, deckD - b, c.stone[2], STYLE.STUDS)
  // The gold-lit band along its front, over the road.
  blocks.add(cx, h * 0.55, s.minZ - 0.03, w - 0.4, 0.14, 0.06, c.trim, STYLE.GLOW)
  // The steps up along the south edge, gold nosings on their fronts.
  const stepD = (s.maxZ - STEPS_Z) / 2
  blocks.addOn(cx, 0, STEPS_Z + stepD / 2, w, (h * 2) / 3, stepD, c.stone[0], STYLE.STUDS)
  blocks.addOn(cx, 0, s.maxZ - stepD / 2, w, h / 3, stepD, c.stone[0], STYLE.STUDS)
  blocks.addOn(cx, (h * 2) / 3, STEPS_Z + stepD - 0.08, w - 0.6, 0.03, 0.14, c.trim, STYLE.GLOW)
  blocks.addOn(cx, h / 3, s.maxZ - 0.08, w - 0.6, 0.03, 0.14, c.trim, STYLE.GLOW)

  // The flag towers off its ends.
  STAGE_TOWERS.forEach((t, i) => {
    const out = t.x > cx ? 1 : -1
    const x = t.x
    const z = t.z
    blocks.addOn(x, 0, z, TOWER.plinth, 0.6, TOWER.plinth, c.dark, STYLE.STUDS)
    blocks.addOn(x, 0.6, z, TOWER.size, TOWER.height - 0.6, TOWER.size, c.stone[i % 2], STYLE.STUDS)
    for (const y of [4.2, 9.6]) blocks.add(x, y, z, TOWER.size + 0.1, 0.24, TOWER.size + 0.1, c.stone[2], STYLE.SMOOTH)
    // Its crenellated top.
    const top = TOWER.size + 0.6
    blocks.addOn(x, TOWER.height, z, top, 0.4, top, c.cap, STYLE.SMOOTH)
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) blocks.addOn(x + dx * (top / 2 - 0.28), TOWER.height + 0.4, z + dz * (top / 2 - 0.28), 0.5, 0.65, 0.5, c.stone[1], STYLE.STUDS)
    props.add(ROOF, { position: [x, TOWER.height + 0.4 + 0.9, z], rotation: [0, Math.PI / 4, 0], scale: [1.15, 1.8, 1.15], color: c.roof, style: STYLE.STUDS })
    // The flagpole and its flag, streaming out away from the stage.
    blocks.addOn(x, TOWER.height + 2.2, z, 0.14, 5.4, 0.14, c.dark, STYLE.SMOOTH)
    props.add(GEM, { position: [x, TOWER.height + 7.75, z], scale: 0.3, color: c.trim, style: STYLE.GLOW })
    if (detail) {
      blocks.add(x + out * 1.7, TOWER.height + 6.6, z, 3.2, 1.8, 0.06, i % 2 ? c.bannerAlt : c.banner, STYLE.SMOOTH)
      blocks.add(x + out * 1.7, TOWER.height + 6.6, z, 2.2, 0.22, 0.08, c.trim, STYLE.GLOW)
    }
    // The SERVE STAGE board on its south face, towards spawn (lettering: signs.js).
    const sz = z + TOWER_SIGN.out
    blocks.add(x, TOWER_SIGN.y, sz, TOWER_SIGN.width + 0.3, TOWER_SIGN.height + 0.3, 0.2, c.trim, STYLE.SMOOTH)
    blocks.add(x, TOWER_SIGN.y, sz + 0.07, TOWER_SIGN.width, TOWER_SIGN.height, 0.2, c.banner, STYLE.SMOOTH)
    // Torches on its south face, under the board.
    for (const dx of [-0.55, 0.55]) wallTorch(blocks, x + dx, 3.0, z + TOWER.size / 2 + 0.01, 0, c)
    if (detail) {
      // The banner down the face turned to the stage.
      banner(blocks, x - out * (TOWER.size / 2 + 0.06), 9.2, z, out > 0 ? -Math.PI / 2 : Math.PI / 2, 1.5, 4.4, c, { field: i % 2 ? c.bannerAlt : c.banner })
      // Braziers on the plinth's stage-side corners.
      for (const dz of [-1, 1]) brazier(blocks, x - out * 1.22, 0.6, z + dz * 1.22, c, 0.62)
    }
    localBox(blocks, x, TOWER.height * 0.42, z, out > 0 ? Math.PI / 2 : -Math.PI / 2, 0, 0, TOWER.size / 2 + 0.02, 0.28, 1.0, 0.06, c.window, STYLE.SMOOTH)
  })
}

/**
 * The frame of the volleyball net across the court in front of the serve line
 * (shared/world SERVE_NET): two padded posts just outside the court, the white top and
 * bottom bands the netting hangs between, and the red-and-white antennas over the
 * sidelines. The netting itself is ServeNet.jsx (one see-through quad).
 */
function buildServeNet(blocks, world) {
  const { top, height, halfWidth } = SERVE_NET
  const z = SERVE_NET_Z
  const pad = world === 1 ? '#3a1a10' : '#2f5fd0'
  const post = world === 1 ? '#5a4a4a' : '#e8ecf2'
  for (const side of [-1, 1]) {
    const x = side * (halfWidth + 0.45)
    blocks.addOn(x, 0, z, 0.5, 0.12, 0.5, post, STYLE.SMOOTH)
    blocks.addOn(x, 0, z, 0.2, top + 0.3, 0.2, post, STYLE.PLATE)
    blocks.addOn(x, 0.12, z, 0.34, 1.7, 0.34, pad, STYLE.SMOOTH)
    blocks.addOn(x, top + 0.3, z, 0.26, 0.1, 0.26, '#ffd21f', STYLE.GLOW)
    // The cable from the post to the band's end.
    blocks.add(side * (halfWidth + 0.2), top - 0.03, z, 0.5, 0.03, 0.03, '#2a2a30', STYLE.SMOOTH)
    // The antenna over the sideline: red and white stripes, up through the band.
    for (let k = 0; k < 18; k += 1) {
      blocks.add(side * halfWidth, top - height + 0.05 + 0.1 * k, z, 0.045, 0.1, 0.045, k % 2 ? '#ffffff' : '#e0262f', STYLE.SMOOTH)
    }
  }
  // The bands: a broad white one along the top, a narrow one along the bottom.
  blocks.add(0, top - 0.035, z, halfWidth * 2, 0.07, 0.05, '#ffffff', STYLE.SMOOTH)
  blocks.add(0, top - height + 0.025, z, halfWidth * 2, 0.05, 0.04, '#f2f2f2', STYLE.SMOOTH)
}
