import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, Color, DoubleSide, Euler, Group, InstancedBufferAttribute, InstancedMesh, Matrix4, PlaneGeometry, Quaternion, ShaderMaterial, Vector3 } from 'three'

import { TRAIN_INTERVAL } from '@shared/balance'
import { DUMMY_BASE, dummySpot, PAD_COUNT, padAt, padDir, PAD_YAWS } from '@shared/world'

import { sfx } from '../audio/sfx'
import { remotePlayers } from '../net/remotePlayers'
import { getGame } from '../store/game'
import { getQuality } from '../store/quality'
import { BlockSet, disposeBlocks } from './blocks'
import { CLICK_CONTACT, clicks } from './clickSwing'
import { burst } from './fx/fxQueue'
import { sharedMaterials, STYLE } from './materials'
import { CAGE_CONTACT, CLICK_JUMP, spikeContact } from './playerPose'
import { runtime } from './runtime'
import { swordTrailLook } from './swordTrails'
import { ballLength, createBallMesh } from './volleyballs'

/**
 * The training targets (the template's batting cages / training courts): one on each
 * training court's far side at dummySpot - a framed net with a big square bullseye hung in
 * it, a basket of balls at its foot, built of chunky blocks in the court's colours (wood
 * and red-and-white for the Rookie Court, then bronze, silver, gold, glowing crystal and
 * diamond, a galaxy frame and, in Christmas Village, candy cane and ice palace). Each target
 * hangs on a spring: spike a ball into it (you, training there, or anyone else) and it
 * rocks back and squashes, shudders and swings straight again.
 *
 * Every spike also sends the ball: training, it rockets from your hand into the bullseye;
 * a click spike slams it into the ground in front of you - a pool of ball meshes, each
 * shown for a blink. Where it hits, a ring of light flashes out in the ball's trail colour
 * (HitRings, below).
 *
 * All nine targets are one BlockSet (one draw call); each frame only the targets still
 * moving are re-placed. The rings are one instanced mesh (one draw call). Nothing is
 * allocated per frame.
 */

/** A target's boxes, in its own frame: its face towards -X, at the player training on its court. */
const PART = {
  BASE: 0,
  POST_L: 1,
  POST_R: 2,
  BAR: 3,
  NET: 4,
  BAND: 5,
  RING_OUT: 6,
  RING_MID: 7,
  BULL: 8,
  SIGN: 9,
  BASKET: 10,
  BALLS: 11,
  FLAG: 12,
}
const PARTS = 13

/** Where each part sits and how big it is: [x, y, z, sx, sy, sz] above the platform. */
const LAYOUT = [
  [0, 0.08, 0, 0.9, 0.16, 2.1],
  [0, 1.25, 0.95, 0.16, 2.3, 0.16],
  [0, 1.25, -0.95, 0.16, 2.3, 0.16],
  [0, 2.36, 0, 0.18, 0.16, 2.06],
  [0.04, 1.42, 0, 0.03, 1.5, 1.74],
  [0, 2.18, 0, 0.06, 0.14, 1.74],
  [-0.03, 1.42, 0, 0.05, 1.04, 1.04],
  [-0.06, 1.42, 0, 0.05, 0.68, 0.68],
  [-0.09, 1.42, 0, 0.05, 0.32, 0.32],
  [0, 2.68, 0, 0.12, 0.46, 1.1],
  [-0.2, 0.42, 1.45, 0.6, 0.52, 0.6],
  [-0.2, 0.74, 1.45, 0.48, 0.16, 0.48],
  [0, 3.05, 0.95, 0.06, 0.3, 0.06],
]
/** The parts that hang on the spring (rock and squash); the frame stays put. */
const SPRUNG = new Set([PART.NET, PART.BAND, PART.RING_OUT, PART.RING_MID, PART.BULL])
/** Where the bullseye is, in the target's frame (what a training spike flies into). */
const BULL_AT = new Vector3(-0.12, 1.42, 0)

/**
 * Each court's target: its colours and styles per part, [colour, style] (null: left out),
 * and how springy it is.
 */
const S = STYLE
const frame = (post, bar, net, band, out, mid, bull, sign, basket, balls, flag) => ({
  BASE: post,
  POST_L: post,
  POST_R: post,
  BAR: bar,
  NET: net,
  BAND: band,
  RING_OUT: out,
  RING_MID: mid,
  BULL: bull,
  SIGN: sign,
  BASKET: basket,
  BALLS: balls,
  FLAG: flag,
})
const TARGETS = [
  // Rookie Court: wooden posts, a white net, a red-and-white bullseye.
  { parts: frame(['#a0703a', S.SMOOTH], ['#8a5a2b', S.SMOOTH], ['#f4f4f4', S.CHECKER], ['#ffffff', S.SMOOTH], ['#ffffff', S.SMOOTH], ['#e0262f', S.SMOOTH], ['#ffd21f', S.SMOOTH], ['#2f8ff2', S.SMOOTH], ['#c08850', S.STRIPES], ['#ffffff', S.STUDS], null), give: 1.25 },
  // Bronze Court.
  { parts: frame(['#b0703a', S.PLATE], ['#8a5022', S.PLATE], ['#ffe8d0', S.CHECKER], ['#ffffff', S.SMOOTH], ['#ffffff', S.SMOOTH], ['#c2410c', S.SMOOTH], ['#ffb12a', S.SMOOTH], ['#c97a3a', S.PLATE], ['#6a4426', S.STRIPES], ['#ffd23a', S.STUDS], ['#c97a3a', S.SMOOTH]), give: 1.05 },
  // Silver Court.
  { parts: frame(['#c9d0da', S.PLATE], ['#9aa4b4', S.PLATE], ['#eef4ff', S.CHECKER], ['#ffffff', S.SMOOTH], ['#ffffff', S.SMOOTH], ['#2f5fd0', S.SMOOTH], ['#e8f0ff', S.SMOOTH], ['#c9d0da', S.PLATE], ['#4a4f58', S.STRIPES], ['#2a7de1', S.STUDS], ['#e8f0ff', S.SMOOTH]), give: 0.85 },
  // Gold Court.
  { parts: frame(['#ffc81a', S.PLATE], ['#e0a000', S.PLATE], ['#fff6d0', S.CHECKER], ['#ffffff', S.SMOOTH], ['#ffffff', S.SMOOTH], ['#e0262f', S.SMOOTH], ['#ffd21f', S.GLOW], ['#ffc81a', S.PLATE], ['#7a4a26', S.STRIPES], ['#ffd23a', S.STUDS], ['#e0262f', S.SMOOTH]), give: 0.75 },
  // Crystal Court: ice-blue crystal round a pink glowing bull.
  { parts: frame(['#7fb2ff', S.SMOOTH], ['#9fe6ff', S.SMOOTH], ['#dff6ff', S.CHECKER], ['#c08bff', S.GLOW], ['#bff4ff', S.SMOOTH], ['#7fd2ff', S.SMOOTH], ['#ff5fd2', S.GLOW], ['#9fe6ff', S.GLOW], ['#5a6aa8', S.SMOOTH], ['#ff9ad0', S.STUDS], ['#c08bff', S.GLOW]), give: 0.65 },
  // Diamond Court (VERY OP!): faceted diamond, a cyan bull.
  { parts: frame(['#bff4ff', S.PLATE], ['#e8fbff', S.PLATE], ['#f4fdff', S.CHECKER], ['#3fd8ff', S.GLOW], ['#ffffff', S.PLATE], ['#3fd8ff', S.GLOW], ['#ffffff', S.GLOW], ['#3fd8ff', S.GLOW], ['#3a4a6a', S.PLATE], ['#bff4ff', S.STUDS], ['#ffffff', S.GLOW]), give: 0.6 },
  // Galaxy Court (BEST OVERALL!): a frame of stars, a gold bull.
  { parts: frame(['#2a1a5a', S.GALAXY], ['#1a1240', S.GALAXY], ['#3a2a7a', S.GALAXY], ['#ffd21f', S.GLOW], ['#a46bff', S.GLOW], ['#140a33', S.GALAXY], ['#ffd21f', S.GLOW], ['#a46bff', S.GLOW], ['#1a0e40', S.GALAXY], ['#ffd21f', S.STUDS], ['#ffd21f', S.GLOW]), give: 0.55 },
  // Candy Cane Court: striped red-and-white posts, a green-and-gold bull, a present for a basket.
  { parts: frame(['#e0102f', S.STRIPES], ['#ffffff', S.STRIPES], ['#fff4f4', S.CHECKER], ['#ffd21f', S.GLOW], ['#ffffff', S.SMOOTH], ['#1f8a4a', S.SMOOTH], ['#ffd21f', S.GLOW], ['#e0102f', S.SMOOTH], ['#1f8a4a', S.SMOOTH], ['#ffd21f', S.STUDS], ['#ffd21f', S.GLOW]), give: 0.6 },
  // Ice Palace Court: frosted crystal glowing blue, a white star for a bull.
  { parts: frame(['#9fe0ff', S.PLATE], ['#dff6ff', S.PLATE], ['#eaf8ff', S.CHECKER], ['#7fe6ff', S.GLOW], ['#bff4ff', S.GLOW], ['#4fb8ff', S.GLOW], ['#ffffff', S.GLOW], ['#7fe6ff', S.GLOW], ['#2f6fb0', S.PLATE], ['#ffffff', S.STUDS], ['#bff4ff', S.GLOW]), give: 0.55 },
]

/** The spring every target hangs on: how stiff, how damped, how hard a spike knocks it (rad/s). */
const STIFF = 90
const DAMP = 7
const KNOCK = 3.2
/** Sparks per spike, on presets with particles. */
const SPARKS = 8

const _m = new Matrix4()
const _local = new Matrix4()
const _pivot = new Matrix4()
const _q = new Quaternion()
const _e = new Euler()
const _p = new Vector3()
const _s = new Vector3()
const ZERO = new Matrix4().makeScale(0, 0, 0)
const PART_NAMES = Object.keys(PART)

/**
 * Each target's spot (on its platform, out beyond its court: shared/world dummySpot) and
 * its turn about the vertical so its face (-X) looks back in at the court, and the way out
 * (where a spike knocks it): made once. And each bullseye in the world.
 */
const SPOTS = Array.from({ length: PAD_COUNT }, (_, i) => dummySpot(i))
const OUT = Array.from({ length: PAD_COUNT }, (_, i) => padDir(i))
const TURNS = OUT.map((d) => Math.atan2(-d.z, d.x))
const _turnQ = new Quaternion()
const _yAxis = new Vector3(0, 1, 0)
const BULLS = SPOTS.map((spot, i) => BULL_AT.clone().applyQuaternion(new Quaternion().setFromAxisAngle(_yAxis, TURNS[i])).add(new Vector3(spot.x, DUMMY_BASE, spot.z)))

function createTargets() {
  const set = new BlockSet()
  for (let i = 0; i < PAD_COUNT; i += 1) {
    const look = TARGETS[i] || TARGETS[0]
    for (let k = 0; k < PARTS; k += 1) {
      const paint = look.parts[PART_NAMES[k]]
      // Colours and styles here; every part is placed (turned to face its court) just below.
      set.add(0, 0, 0, 0, 0, 0, paint ? paint[0] : '#000000', paint ? paint[1] : S.SMOOTH)
    }
  }
  const mesh = set.build(sharedMaterials().blocks)
  for (let i = 0; i < PAD_COUNT; i += 1) placeTarget(mesh, i, 0, 0, 1)
  mesh.instanceMatrix.needsUpdate = true
  mesh.computeBoundingSphere()
  mesh.boundingSphere.radius += 1.5
  mesh.castShadow = true
  return mesh
}

/** Places target `i`'s parts: its net and bullseye rocked back `lean` radians, twisted `twist` and squashed `squash`. */
function placeTarget(mesh, i, lean, twist, squash) {
  const look = TARGETS[i] || TARGETS[0]
  const spot = SPOTS[i]
  _turnQ.setFromAxisAngle(_yAxis, TURNS[i])
  for (let k = 0; k < PARTS; k += 1) {
    const index = i * PARTS + k
    if (!look.parts[PART_NAMES[k]]) {
      mesh.setMatrixAt(index, ZERO)
      continue
    }
    const [x, y, z, sx, sy, sz] = LAYOUT[k]
    const sprung = SPRUNG.has(k)
    // The net swings from the crossbar; the bullseye squashes flat and springs back.
    _q.setFromEuler(_e.set(0, sprung ? twist : 0, sprung ? -lean : 0)).premultiply(_turnQ)
    _pivot.compose(_p.set(spot.x, DUMMY_BASE + (sprung ? 2.3 : 0), spot.z), _q, _s.set(1, 1, 1))
    const wide = sprung ? 1 / Math.sqrt(squash) : 1
    _local.compose(_p.set(x * (sprung ? squash : 1), sprung ? y - 2.3 : y, z), _q.identity(), _s.set(sx * (sprung ? squash : 1), sy * wide, sz * wide))
    mesh.setMatrixAt(index, _m.multiplyMatrices(_pivot, _local))
  }
}

// --- The hit rings ----------------------------------------------------------------------

const RINGS = 6
const RING_LIFE = 0.32

const ringVertex = /* glsl */ `
  attribute float aAge;
  varying vec2 vUv;
  varying float vAge;
  varying vec3 vColor;
  void main() {
    vUv = uv;
    vAge = aAge;
    vColor = instanceColor;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`
const ringFragment = /* glsl */ `
  varying vec2 vUv;
  varying float vAge;
  varying vec3 vColor;
  void main() {
    float t = clamp(vAge / ${RING_LIFE.toFixed(2)}, 0.0, 1.0);
    float r = length(vUv - 0.5) * 2.0;
    float radius = 0.2 + 0.8 * (1.0 - (1.0 - t) * (1.0 - t));
    float ring = 1.0 - smoothstep(0.0, 0.12, abs(r - radius));
    float core = (1.0 - smoothstep(0.0, 0.35, r)) * (1.0 - smoothstep(0.0, 0.3, t));
    float a = (ring + core) * (1.0 - t);
    if (a < 0.01) discard;
    gl_FragColor = vec4(mix(vColor, vec3(1.0), 0.4 * core), a);
    #include <colorspace_fragment>
  }
`

function createRings() {
  const geometry = new PlaneGeometry(1, 1)
  geometry.setAttribute('aAge', new InstancedBufferAttribute(new Float32Array(RINGS).fill(99), 1))
  const material = new ShaderMaterial({
    vertexShader: ringVertex,
    fragmentShader: ringFragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  })
  const mesh = new InstancedMesh(geometry, material, RINGS)
  for (let i = 0; i < RINGS; i += 1) {
    mesh.setMatrixAt(i, ZERO)
    mesh.setColorAt(i, new Color('#ffffff'))
  }
  mesh.frustumCulled = false
  mesh.renderOrder = 3
  return mesh
}

// --- The spiked balls ---------------------------------------------------------------------

/** Balls in flight at once (yours and others'), how long a training spike takes to reach the target and a click spike the ground. */
const FLIGHTS = 4
const TO_TARGET_S = 0.13
const TO_GROUND_S = 0.22
/** A click spike lands this far ahead of you. */
const CLICK_REACH = 5

const _from = new Vector3()
const _turn = new Quaternion()
const _up = new Vector3(0, 1, 0)
const _tint = new Color()
const _ringAt = new Matrix4()
const _ringQ = new Quaternion()
const _ringE = new Euler()

export default function TrainingDummies() {
  const targetRef = useRef(null)
  const ringRef = useRef(null)
  const ballsRef = useRef(null)
  const assets = useMemo(() => {
    const balls = new Group()
    const flights = Array.from({ length: FLIGHTS }, () => {
      const mesh = createBallMesh()
      mesh.visible = false
      balls.add(mesh)
      return { mesh, on: false, from: new Vector3(), to: new Vector3(), at: 0, dur: 0, ring: -1, pad: -1, id: 'bicycle' }
    })
    balls.userData.flights = flights
    return { targets: createTargets(), rings: createRings(), balls }
  }, [])
  /** Each target's spring: lean and its speed, twist and its speed, squash age. */
  const springs = useRef(Array.from({ length: PAD_COUNT }, () => ({ lean: 0, v: 0, twist: 0, tv: 0, hitAt: -9, moving: false })))
  /** Your last training phase, and other players' (their own clocks), by session id. */
  const phases = useRef({ mine: -1, others: new Map(), click: 0 })
  const nextRing = useRef(0)
  const nextFlight = useRef(0)

  useEffect(
    () => () => {
      disposeBlocks(assets.targets)
      assets.rings.geometry.dispose()
      assets.rings.material.dispose()
      assets.rings.dispose()
      // The balls' geometry and material are shared (volleyballs.js).
    },
    [assets],
  )

  /** The ring of light flashing out at `at`, facing `yaw` (or flat on the ground), in ball `id`'s colour. */
  const ring = (x, y, z, yaw, flat, id, size) => {
    const rings = ringRef.current
    if (!rings) return
    const slot = nextRing.current
    nextRing.current = (slot + 1) % RINGS
    _ringQ.setFromEuler(flat ? _ringE.set(-Math.PI / 2, 0, 0) : _ringE.set(0, yaw, 0))
    _ringAt.compose(_p.set(x, y, z), _ringQ, _s.set(size, size, size))
    rings.setMatrixAt(slot, _ringAt)
    rings.setColorAt(slot, _tint.copy(swordTrailLook(id).head))
    rings.geometry.getAttribute('aAge').setX(slot, 0)
    rings.instanceMatrix.needsUpdate = true
    rings.instanceColor.needsUpdate = true
  }

  /** A spike from (x, y, z) facing `yaw` with ball `id`: into court `pad`'s target, or (pad -1) a click spike into the ground. */
  const spike = (pad, now, x, y, z, yaw, id, local) => {
    const group = ballsRef.current
    if (!group) return
    const f = group.userData.flights[nextFlight.current]
    nextFlight.current = (nextFlight.current + 1) % FLIGHTS
    spikeContact(_from, ballLength(id), pad >= 0 ? undefined : CLICK_JUMP)
    _turn.setFromAxisAngle(_up, yaw)
    f.from.copy(_from.applyQuaternion(_turn)).add(_p.set(x, y, z))
    if (pad >= 0) {
      f.to.copy(BULLS[pad])
      f.dur = TO_TARGET_S
    } else {
      f.to.set(Math.sin(yaw) * CLICK_REACH, 0.2, Math.cos(yaw) * CLICK_REACH).add(_p.set(x, y, z))
      f.dur = TO_GROUND_S
    }
    f.on = true
    f.at = now
    f.pad = pad
    f.id = id
    f.local = local
    f.mesh.setBall(id)
  }

  /** A spiked ball arriving: the target rocks and rings, or the ground puffs. */
  const arrive = (f, now) => {
    if (f.pad >= 0) {
      const sp = springs.current[f.pad]
      const give = (TARGETS[f.pad] || TARGETS[0]).give
      sp.v += KNOCK * give
      sp.tv += (Math.random() - 0.5) * 2.4 * give
      sp.hitAt = now
      sp.moving = true
      const b = BULLS[f.pad]
      if (getQuality().particles) burst({ x: b.x, y: b.y, z: b.z, count: SPARKS, palette: 'power', speed: 5 })
      ring(b.x - OUT[f.pad].x * 0.08, b.y, b.z - OUT[f.pad].z * 0.08, PAD_YAWS[f.pad], false, f.id, 2.2)
      if (f.local) sfx.slashHit(f.pad)
    } else {
      ring(f.to.x, 0.06, f.to.z, 0, true, f.id, 2.6)
      if (getQuality().particles) burst({ x: f.to.x, y: 0.3, z: f.to.z, count: 6, palette: 'confetti', speed: 4 })
    }
  }

  useFrame((_state, rawDelta) => {
    const targets = targetRef.current
    const rings = ringRef.current
    const group = ballsRef.current
    if (!targets || !rings || !group) return
    const dt = Math.min(rawDelta, 0.05)
    const now = performance.now()
    const ph = phases.current
    const myId = getGame().profile.equippedTire

    // Your spikes: one leaving your hand each time your training phase passes CAGE_CONTACT.
    const cage = runtime.player.cage
    if (cage >= 0 && runtime.player.cagePhase >= 0) {
      const turns = runtime.player.cagePhase / (Math.PI * 2)
      if (ph.mine >= 0 && Math.floor(turns - CAGE_CONTACT) > Math.floor(ph.mine - CAGE_CONTACT)) {
        const p = runtime.player.position
        spike(cage, now, p.x, p.y, p.z, PAD_YAWS[cage], myId, true)
      }
      ph.mine = turns
    } else {
      ph.mine = -1
    }

    // Your click spikes: the ball slammed down as your hand meets it.
    const c = clicks[0]
    if (c.at && c.at !== ph.click && now - c.at >= CLICK_CONTACT * 1000) {
      ph.click = c.at
      spike(-1, now, c.x, c.y, c.z, c.yaw, myId, true)
    }

    // Everyone else training: their spikes on their own clock (you can't see their phase).
    const others = ph.others
    for (const r of remotePlayers.values()) {
      const pad = r.anim === 'run' ? padAt(r.position.x, r.position.z, 0.6) : -1
      if (pad < 0) {
        others.delete(r.sessionId)
        continue
      }
      const prev = others.get(r.sessionId) ?? 0
      const turns = prev + dt / TRAIN_INTERVAL
      if (Math.floor(turns - CAGE_CONTACT) > Math.floor(prev - CAGE_CONTACT)) {
        spike(pad, now, r.position.x, r.position.y, r.position.z, PAD_YAWS[pad], r.tireId || 'bicycle', false)
      }
      others.set(r.sessionId, turns)
    }
    if (others.size > remotePlayers.size) for (const sid of others.keys()) if (!remotePlayers.has(sid)) others.delete(sid)

    // The balls in flight: straight and fast, a touch of drop, a spin.
    let flying = false
    for (const f of group.userData.flights) {
      if (!f.on) continue
      const u = (now - f.at) / 1000 / f.dur
      if (u >= 1) {
        f.on = false
        f.mesh.visible = false
        arrive(f, now)
        continue
      }
      flying = true
      const r = ballLength(f.id) * 0.6
      f.mesh.visible = true
      f.mesh.scale.setScalar(1.2)
      f.mesh.position.lerpVectors(f.from, f.to, u)
      f.mesh.position.y -= r + (f.pad >= 0 ? 0.2 * u * (1 - u) : 0)
      f.mesh.rotation.x = -u * 9
    }
    group.visible = flying

    // The springs: only the targets still moving are re-placed.
    let dirty = false
    for (let i = 0; i < PAD_COUNT; i += 1) {
      const sp = springs.current[i]
      if (!sp.moving) continue
      sp.v += (-STIFF * sp.lean - DAMP * sp.v) * dt
      sp.lean += sp.v * dt
      sp.tv += (-STIFF * 0.6 * sp.twist - DAMP * sp.tv) * dt
      sp.twist += sp.tv * dt
      const since = (now - sp.hitAt) / 1000
      const squash = since < 0.3 ? 1 - 0.18 * Math.sin((since / 0.3) * Math.PI) * Math.exp(-since * 4) : 1
      placeTarget(targets, i, sp.lean * 0.6, sp.twist * 0.5, squash)
      dirty = true
      if (since > 0.4 && Math.abs(sp.lean) < 0.002 && Math.abs(sp.v) < 0.01 && Math.abs(sp.twist) < 0.002) {
        sp.moving = false
        sp.lean = sp.v = sp.twist = sp.tv = 0
        placeTarget(targets, i, 0, 0, 1)
      }
    }
    if (dirty) targets.instanceMatrix.needsUpdate = true

    // The rings age and fade.
    const ages = rings.geometry.getAttribute('aAge')
    let live = false
    for (let i = 0; i < RINGS; i += 1) {
      const a = ages.getX(i)
      if (a > RING_LIFE) continue
      ages.setX(i, a + dt)
      live = true
    }
    ages.needsUpdate = live
    // Drawn only while one is live - but never hidden, so its shader is compiled with the rest.
    rings.count = live ? RINGS : 0
  })

  return (
    <>
      <primitive ref={targetRef} object={assets.targets} />
      <primitive ref={ringRef} object={assets.rings} />
      <primitive ref={ballsRef} object={assets.balls} />
    </>
  )
}
