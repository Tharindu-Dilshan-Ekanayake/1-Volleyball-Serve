import { Quaternion, Vector3 } from 'three'

/**
 * The player's body language, shared by the Bloxity avatar and the blocky stand-in so
 * both move the same way - and where their volleyball is.
 *
 * `computePose` turns the motion state into joint angles, and the ball's place; each
 * avatar applies them to its own limbs and ball. Angles are radians in character space
 * (the character faces +Z, its left side is +X), about each joint's pivot:
 *   swing - about X: negative swings a hanging limb forward (arm up in front, knee up);
 *           on the spine and neck, which point up, negative bends them back
 *   sway  - about Z: positive moves a limb towards +X
 *   twist - about Y: positive turns the right shoulder forward (the chest towards +X)
 * `lift` raises (or, to keep bent legs on the ground, lowers) the body, in metres.
 * `stretchL` / `stretchR` are how long each arm is against its rest length (1 = normal).
 *
 * The ball (`pose.bat`, the template's name): `mode` 'back' (carried on your right hip
 * while you walk about), 'hand' (in your hands or in the air over you: training, a click
 * spike, winding up and serving) or 'none' (it's been hit - flying down the court);
 * `pos` the bottom of the ball (where your palm holds it), `quat` its turn and `scale` its
 * size, in character space, metres - the ball's own frame is volleyballs.js's: its bottom
 * at the origin, its centre straight up +Y.
 *
 * Right-handed: you toss with your left hand and hit with your right (character -X side).
 * Your target - the training target, the court - is straight ahead (+Z).
 */

export const POSED_BONES = ['Spine1', 'Neck1', 'ArmL1', 'ArmL2', 'ArmR1', 'ArmR2', 'LegL1', 'LegL2', 'LegR1', 'LegR2']

/** Written by `computePose` every frame; one shared result, never reallocated. */
export const pose = {
  lift: 0,
  stretchL: 1,
  stretchR: 1,
  bones: Object.fromEntries(POSED_BONES.map((name) => [name, { swing: 0, sway: 0, twist: 0 }])),
  bat: { mode: 'back', pos: new Vector3(), quat: new Quaternion(), scale: 1 },
}

/**
 * The 1.8 m character's measurements: shoulder height and how far out from the middle,
 * arm length (shoulder to palm), and the pivot the upper body turns about (its middle).
 * Measured on Bloxity's player.glb fitted to 1.8 m. Avatars whose arms are a different
 * length rescale the stretch (avatarRig.animateRig).
 */
export const BODY = { shoulderY: 1.35, shoulderX: 0.56, arm: 0.63, pivot: 0.9 }

/** Sway sign that moves a limb away from the body, per side. */
const OUT_L = 1
const OUT_R = -1

const clamp01 = (x) => Math.min(1, Math.max(0, x))
const lerp = (a, b, t) => a + (b - a) * t
const smooth = (edge0, edge1, x) => {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/** Adds to a joint, scaled by weight `w`. */
function add(name, swing, sway, twist, w) {
  const b = pose.bones[name]
  b.swing += swing * w
  b.sway += sway * w
  b.twist += twist * w
}

/** Clears a joint (another move takes it over completely). */
function clear(name) {
  const b = pose.bones[name]
  b.swing = 0
  b.sway = 0
  b.twist = 0
}

// --- Walking about ------------------------------------------------------------------

/** Relaxed stance: knees soft, breathing. */
function stance(w, time) {
  const breath = Math.sin(time * 1.8)
  add('LegL1', -0.04, 0.05 * OUT_L, 0, w)
  add('LegL2', 0.07, 0, 0, w)
  add('LegR1', 0.04, 0.05 * OUT_R, 0, w)
  add('LegR2', 0.07, 0, 0, w)
  add('Spine1', 0.03 + breath * 0.015, 0, 0, w)
  add('ArmL1', 0.04 + breath * 0.02, 0.1 * OUT_L, 0, w)
  add('ArmR1', 0.04 - breath * 0.02, 0.1 * OUT_R, 0, w)
  add('ArmL2', -0.12, 0, 0, w)
  add('ArmR2', -0.12, 0, 0, w)
  pose.lift += (-0.01 + breath * 0.006) * w
}

/**
 * Walk to sprint: the legs swing, the arms swing against them and the body bobs once
 * per step. `phase` advances faster with speed, so the steps quicken.
 */
function stride(phase, ratio) {
  const cycle = Math.sin(phase)
  const leg = 0.85 * ratio
  add('LegL1', cycle * leg, 0, 0, 1)
  add('LegR1', -cycle * leg, 0, 0, 1)
  // Knees fold on the back swing only.
  add('LegL2', Math.max(0, -cycle) * 1.1 * ratio, 0, 0, 1)
  add('LegR2', Math.max(0, cycle) * 1.1 * ratio, 0, 0, 1)
  // Arms against the legs, elbows bending more the faster you go.
  const arm = 0.75 * ratio
  add('ArmL1', -cycle * arm, 0.08 * OUT_L * ratio, 0, 1)
  add('ArmR1', cycle * arm, 0.08 * OUT_R * ratio, 0, 1)
  add('ArmL2', -0.35 * ratio, 0, 0, 1)
  add('ArmR2', -0.35 * ratio, 0, 0, 1)
  add('Spine1', (0.06 + 0.1 * ratio) * ratio, 0, cycle * 0.12 * ratio, 1)
  pose.lift += (Math.abs(Math.cos(phase)) * 0.05 - 0.015) * ratio
}

/**
 * In the air: one knee up on the way up, arms flung up and out; falling, the legs
 * straighten and reach down for the ground.
 */
function airborne(vy) {
  const f = smooth(0, 1, clamp01((2 - vy) / 9))
  add('LegL1', lerp(-1.3, -0.35, f), 0.08 * OUT_L, 0, 1)
  add('LegL2', lerp(1.6, 0.25, f), 0, 0, 1)
  add('LegR1', lerp(0.25, -0.1, f), 0.08 * OUT_R, 0, 1)
  add('LegR2', lerp(0.5, 0.2, f), 0, 0, 1)
  add('Spine1', lerp(0.15, -0.06, f), 0, 0, 1)
  add('ArmL1', lerp(-2.6, -0.5, f), lerp(0.5, 0.35, f) * OUT_L, 0, 1)
  add('ArmR1', lerp(-2.6, -0.5, f), lerp(0.5, 0.35, f) * OUT_R, 0, 1)
}

/** Arms up and waving, bouncing on the spot: a celebration. */
function cheering(time, w) {
  const wave = Math.sin(time * 10) * 0.28
  add('ArmL1', -2.7 + wave, 0.38 * OUT_L, 0, w)
  add('ArmR1', -2.7 - wave, 0.38 * OUT_R, 0, w)
  add('ArmL2', -0.25, 0, 0, w)
  add('ArmR2', -0.25, 0, 0, w)
  add('LegL1', -0.12, 0.06 * OUT_L, 0, w)
  add('LegR1', -0.12, 0.06 * OUT_R, 0, w)
  add('LegL2', 0.22, 0, 0, w)
  add('LegR2', 0.22, 0, 0, w)
  add('Spine1', -0.1, 0, 0, w)
  add('Neck1', -0.15, 0, 0, w)
  pose.lift += Math.abs(Math.sin(time * 7)) * 0.16 * w
}

// --- Reaching ----------------------------------------------------------------------------

const _q = new Quaternion()
const _ax = new Vector3(1, 0, 0)
const _ay = new Vector3(0, 1, 0)

/** The upper body's turn: bent forward `swing` about the hips, then twisted `twist`. */
function upperBody(swing, twist, out) {
  out.setFromAxisAngle(_ax, swing)
  return out.multiply(_q.setFromAxisAngle(_ay, twist))
}

const _spine = new Quaternion()
const _spineInv = new Quaternion()
const _shoulder = new Vector3()
const _d = new Vector3()

/**
 * Points one arm (`side` +1 left, -1 right) from its shoulder at `target` (character
 * space, metres), the upper body bent `spineSwing` and twisted `spineTwist`, and
 * stretches it - within reason - to reach.
 */
function aimArmAt(side, target, spineSwing, spineTwist, w) {
  upperBody(spineSwing, spineTwist, _spine)
  _spineInv.copy(_spine).invert()
  _shoulder.set(side * BODY.shoulderX, BODY.shoulderY - BODY.pivot, 0).applyQuaternion(_spine)
  _shoulder.y += BODY.pivot + pose.lift
  _d.subVectors(target, _shoulder).applyQuaternion(_spineInv)
  const len = Math.max(0.05, _d.length())
  const out = side * _d.x
  const sway = Math.asin(Math.min(1, Math.max(-1, out / len)))
  const swing = Math.atan2(-_d.z, -_d.y)
  const name = side > 0 ? 'ArmL1' : 'ArmR1'
  add(name, swing, sway * (side > 0 ? OUT_L : OUT_R), 0, w)
  const stretch = Math.min(1.22, Math.max(0.72, len / (BODY.arm + 0.045))) - 1
  if (side > 0) pose.stretchL += stretch * w
  else pose.stretchR += stretch * w
}

// --- The ball -------------------------------------------------------------------------

/**
 * How big a ball is drawn on you (the template's ball scale, by its length): every
 * volleyball a touch bigger than life, so it reads at a glance.
 */
export const swordScale = () => 1.2
/** The ball being posed this frame: its radius as drawn (set from motion.swordLen by computePose). */
let radius = 0.18

const _ball = new Vector3()
const _hand = new Vector3()
const _hand2 = new Vector3()
const _up = new Vector3()

/** Puts the ball's bottom at `palm`, its centre `dir` (unit) away from it. */
function ballOnPalm(palm, dir) {
  pose.bat.mode = 'hand'
  pose.bat.pos.copy(palm)
  pose.bat.quat.setFromUnitVectors(_ay, _up.copy(dir).normalize())
}

/** Puts the ball's centre at `centre`, upright (in the air). */
function ballAt(centre) {
  pose.bat.mode = 'hand'
  pose.bat.pos.set(centre.x, centre.y - radius, centre.z)
  pose.bat.quat.identity()
}

/**
 * The ball carried on your right hip as you walk about: your right arm crooked round it,
 * riding with your upper body - the rest of you walks as usual.
 */
function ballOnHip(spineSwing, twist, time, w) {
  clear('ArmR1')
  clear('ArmR2')
  pose.stretchR = 1
  upperBody(spineSwing, twist, _spine)
  _ball.set(-0.5, 1.0 - BODY.pivot, 0.2).applyQuaternion(_spine)
  _ball.y += BODY.pivot + pose.lift + Math.sin(time * 1.8) * 0.004
  _hand.copy(_ball)
  _hand.x -= 0.05
  _hand.y -= 0.02
  aimArmAt(-1, _hand, spineSwing, twist, w)
  add('ArmR2', -0.9, 0, 0, w)
  pose.bat.scale = 1.2
  ballOnPalm(_hand, _up.set(0.55, 0.8, 0.1))
}

// --- The spike: training, click spikes and the jump serve -----------------------------------

/**
 * A spike as keyframes over its progress `s` (0-1): where the right (hitting) hand and
 * the left (tossing) hand are, relative to the standing body (y from the ground, before
 * the jump), how far the upper body bends forward and twists, and how high the body is
 * (`lift`: a crouch below 0; above 0, a share of the jump).
 *
 * 0 to 0.12, the ball in your left hand, crouched; tossed up at 0.12, both arms swinging
 * up as you rise; at 0.45 your hitting arm is cocked back behind your head, bow-and-arrow;
 * at SPIKE_CONTACT you hit the ball at the top of your reach, then snap through and land.
 */
const SPIKE = [
  { s: 0, rx: -0.42, ry: 0.95, rz: -0.08, lx: 0.12, ly: 1.4, lz: 0.42, bend: 0.14, twist: -0.1, lift: -0.18 },
  { s: 0.12, rx: -0.5, ry: 1.2, rz: -0.22, lx: 0.1, ly: 1.78, lz: 0.48, bend: 0.02, twist: -0.2, lift: -0.08 },
  { s: 0.3, rx: -0.55, ry: 1.82, rz: -0.32, lx: 0.2, ly: 2.08, lz: 0.45, bend: -0.12, twist: -0.45, lift: 0.6 },
  { s: 0.45, rx: -0.5, ry: 1.95, rz: -0.4, lx: 0.28, ly: 2.02, lz: 0.42, bend: -0.24, twist: -0.62, lift: 0.95 },
  { s: 0.55, rx: -0.3, ry: 2.04, rz: 0.3, lx: 0.4, ly: 1.42, lz: 0.22, bend: 0.12, twist: 0.25, lift: 1 },
  { s: 0.7, rx: -0.08, ry: 1.45, rz: 0.55, lx: 0.45, ly: 1.1, lz: 0.05, bend: 0.4, twist: 0.5, lift: 0.55 },
  { s: 1, rx: 0.18, ry: 1.0, rz: 0.36, lx: 0.42, ly: 1.0, lz: 0.0, bend: 0.2, twist: 0.3, lift: -0.08 },
]
/** The share of a spike at which the hand meets the ball. */
const SPIKE_CONTACT = 0.55
/** The share at which the ball leaves your tossing hand. */
const SPIKE_TOSS = 0.12
/** Gravity on a tossed ball (m/s^2): a cartoon's, so the toss reads quickly. */
const TOSS_G = 20

const _key = { rx: 0, ry: 0, rz: 0, lx: 0, ly: 0, lz: 0, bend: 0, twist: 0, lift: 0 }
const KEY_FIELDS = Object.keys(_key)

/** Samples `keys` at progress `s` (smoothly between keys) into `out`. */
function sampleKeys(keys, s, out = _key) {
  let i = 1
  while (i < keys.length - 1 && keys[i].s < s) i += 1
  const a = keys[i - 1]
  const b = keys[i]
  const u = clamp01((s - a.s) / Math.max(1e-6, b.s - a.s))
  const k = u * u * (3 - 2 * u) * 0.35 + u * 0.65
  for (const f of KEY_FIELDS) out[f] = a[f] + (b[f] - a[f]) * k
  return out
}

/** The body's height for a key's `lift`, with a jump `jump` metres high. */
const liftOf = (lift, jump) => (lift > 0 ? lift * jump : lift)

const _toss = new Vector3()
const _hit = new Vector3()
const _tmpKey = { rx: 0, ry: 0, rz: 0, lx: 0, ly: 0, lz: 0, bend: 0, twist: 0, lift: 0 }

/** Where the ball is in the right hand at contact, for a spike with a jump `jump` high. */
function contactPoint(jump, out) {
  sampleKeys(SPIKE, SPIKE_CONTACT, _tmpKey)
  const lift = liftOf(_tmpKey.lift, jump)
  return out.set(_tmpKey.rx + 0.02, _tmpKey.ry + lift + radius * 0.9, _tmpKey.rz + radius * 0.6)
}

/**
 * The spike's legs: crouched and loading, springing off the ground (`air` 0-1: tucked in
 * the air), landing soft.
 */
function spikeLegs(s, air, w) {
  const load = 1 - smooth(0.1, 0.25, s) + smooth(0.85, 1, s)
  add('LegL1', -0.45 * load - 0.55 * air, 0.12 * OUT_L, 0, w)
  add('LegL2', 0.8 * load + 0.9 * air, 0, 0, w)
  add('LegR1', 0.1 * load - 0.25 * air, 0.12 * OUT_R, 0, w)
  add('LegR2', 0.75 * load + 0.75 * air, 0, 0, w)
}

/**
 * A spike `s` (0-1) of the way through, `dur` seconds long in all, jumping `jump` metres:
 * the toss, the leap, the hit at SPIKE_CONTACT and the landing - and the ball: in your left
 * hand, then up in the air along its toss to meet your hand, then gone (hit).
 * `ballAfter` keeps nothing drawn after the hit (the flight takes over).
 */
function spike(s, dur, jump, w) {
  const key = sampleKeys(SPIKE, clamp01(s), _key)
  const lift = liftOf(key.lift, jump)
  pose.lift += lift * w
  add('Spine1', key.bend, 0, key.twist, w)
  add('Neck1', -0.12 - 0.25 * smooth(0.12, 0.45, s) * (1 - smooth(0.55, 0.75, s)), 0, -key.twist * 0.5, w)
  // The hands, riding the jump.
  _hand.set(key.rx, key.ry + lift, key.rz)
  aimArmAt(-1, _hand, key.bend, key.twist, w)
  _hand2.set(key.lx, key.ly + lift, key.lz)
  aimArmAt(1, _hand2, key.bend, key.twist, w)
  // The hitting elbow: bent while cocked, straight at the hit.
  add('ArmR2', -1.1 * smooth(0.2, 0.42, s) * (1 - smooth(0.47, 0.55, s)), 0, 0, w)
  add('ArmL2', -0.25, 0, 0, w)
  spikeLegs(s, clamp01(lift / Math.max(0.1, jump)) * smooth(0.15, 0.3, s), w)

  pose.bat.scale = 1.2
  if (s < SPIKE_TOSS) {
    // On your tossing palm.
    ballOnPalm(_hand2, _up.set(0, 1, 0.15))
  } else if (s < SPIKE_CONTACT) {
    // In the air: from your palm to where your hand meets it, over the top of its toss.
    const t0 = SPIKE_TOSS * dur
    const T = (SPIKE_CONTACT - SPIKE_TOSS) * dur
    const tau = s * dur - t0
    sampleKeys(SPIKE, SPIKE_TOSS, _tmpKey)
    _toss.set(_tmpKey.lx, _tmpKey.ly + liftOf(_tmpKey.lift, jump) + radius, _tmpKey.lz)
    contactPoint(jump, _hit)
    const f = clamp01(tau / T)
    _ball.lerpVectors(_toss, _hit, f)
    _ball.y += 0.5 * TOSS_G * tau * (T - tau)
    ballAt(_ball)
  } else {
    // Hit: away down the court (or into the target).
    pose.bat.mode = 'none'
  }
}

// --- Training, click spikes ------------------------------------------------------------------

/** Contact comes at this share of each training spike's cycle (the gain lands then). */
export const CAGE_CONTACT = SPIKE_CONTACT
/** Seconds a training cycle takes (shared/balance TRAIN_INTERVAL; kept here for the toss's arc), and its hop. */
const TRAIN_S = 0.6
const TRAIN_JUMP = 0.16

/**
 * Training at a target, one spike per pitch of `phase` (2 PI each TRAIN_INTERVAL): toss,
 * a little hop, and the ball smacked into the target CAGE_CONTACT of the way through.
 */
function trainingSpikes(phase, w) {
  const turns = phase / (Math.PI * 2)
  const c = ((turns % 1) + 1) % 1
  spike(c, TRAIN_S, TRAIN_JUMP, w)
}

/** Seconds a click spike takes, and when it hits (the gain lands then); how high it hops. */
export const CLICK_SLASH_S = 0.5
export const CLICK_JUMP = 0.22
export const CLICK_SLASH_CONTACT = CAGE_CONTACT * CLICK_SLASH_S

// --- Serving ------------------------------------------------------------------------------

/** How high the jump serve leaps (metres). */
const SERVE_JUMP = 0.8
/** Seconds after letting go that your hand meets the ball (the flight starts there: roll/path.js). */
export const THROW_RELEASE = 0.5
/** Seconds the whole jump serve takes, toss to landing. */
export const SERVE_S = THROW_RELEASE / SPIKE_CONTACT

/** Where the ball is (character space, metres) as your hand meets it, in a spike jumping `jump` high. */
export function spikeContact(out, ballLen = 0.3, jump = TRAIN_JUMP) {
  const keep = radius
  radius = (ballLen / 2) * 1.2
  contactPoint(jump, out)
  radius = keep
  return out
}

/** Where the ball is (character space, metres) as your hand meets it, in a jump serve. */
export const serveContact = (out, ballLen = 0.3) => spikeContact(out, ballLen, SERVE_JUMP)

/**
 * On the serving line: ready, the ball held out in front in both hands - and as you hold
 * SERVE (`coil` 0-1) loading up: sinking into a crouch, the ball in your left hand, your
 * hitting arm drawn back. Held at full charge you tremble with the strain (`strain` 0-1).
 */
function serveReady(time, coil, strain, w) {
  const k = smooth(0, 1, coil)
  const jitter = strain > 0 ? Math.sin(time * 61) * 0.015 * strain : 0
  const start = SPIKE[0]
  const bend = lerp(0.04, start.bend + 0.06, k)
  const twist = lerp(0, start.twist, k)
  const lift = lerp(-0.02, start.lift - 0.06, k) + jitter
  pose.lift += lift * w
  add('Spine1', bend, 0, twist, w)
  add('Neck1', -0.1, 0, 0, w)
  // Both hands on the ball in front of you, then the left alone holding it out.
  _ball.set(lerp(-0.02, start.lx, k), lerp(1.12, start.ly - 0.06, k) + lift, lerp(0.42, start.lz + 0.04, k))
  _hand2.set(_ball.x + 0.14 * (1 - k), _ball.y - radius * 0.2, _ball.z)
  aimArmAt(1, _hand2, bend, twist, w)
  _hand.set(lerp(_ball.x - 0.16, start.rx - 0.05, k), lerp(_ball.y - radius * 0.2, start.ry + 0.02, k), lerp(_ball.z, start.rz - 0.08, k))
  aimArmAt(-1, _hand, bend, twist, w)
  add('ArmL2', -0.3, 0, 0, w)
  add('ArmR2', -0.3 * k, 0, 0, w)
  spikeLegs(0.05, 0, w * k)
  stance(w * (1 - k), time)
  pose.bat.scale = 1.2
  ballOnPalm(_hand2.set(_ball.x, _ball.y - radius, _ball.z), _up.set(0, 1, 0))
  pose.lift += Math.sin(time * 3) * 0.006 * (1 - k) * w
}

/** The jump serve `t` seconds after letting go: toss, leap, hit at THROW_RELEASE, land. */
function serving(t, w) {
  spike(t / SERVE_S, SERVE_S, SERVE_JUMP, w)
}

/**
 * After the serve: the landing held, then up to watch it fly - a cheer with both fists up
 * when it was a great one, a hand shading your eyes when it wasn't. `t` is seconds since
 * letting go. The ball is out there: none in your hands.
 */
function afterServe(t, great, time, w) {
  const relax = smooth(SERVE_S, SERVE_S + 0.4, t)
  if (relax < 1) serving(Math.min(t, SERVE_S), w * (1 - relax))
  if (t >= THROW_RELEASE) pose.bat.mode = 'none'
  if (relax <= 0) return
  if (great) {
    cheering(time, w * relax)
  } else {
    stance(w * relax, time)
    // A hand up to shade your eyes, watching it go.
    _hand.set(-0.12, 1.72, 0.2)
    aimArmAt(-1, _hand, 0.02, 0, w * relax)
    add('ArmR2', -1.2, 0, 0, w * relax)
    add('Neck1', -0.12, 0, 0, w * relax)
  }
}

/**
 * @param {{ time?: number, speed?: number, maxSpeed?: number, grounded?: boolean,
 *   vy?: number, stride?: number, run?: number, bat?: string, swingT?: number,
 *   coil?: number, strain?: number, great?: boolean, cheer?: number, swordLen?: number,
 *   emote?: string|null }} motion
 *   `run` (0-1) is training at a target (`stride` is the spikes' phase); the name is the
 *   template's, and what other players are told ('run').
 *   `bat` is 'ready' (on the serving line: `coil` 0-1 loading up, `strain` 0-1 held at
 *   full), 'serve' (serving, `swingT` seconds after letting go), 'after' (it's flying:
 *   `swingT` seconds since letting go, `great` whether to celebrate), 'spike' (a click
 *   spike, `swingT` seconds in) - or unset: walking about with the ball on your hip.
 *   `swordLen` is the ball's diameter (volleyballs.js ballLength). `cheer` (0-1) is
 *   celebrating. `emote` is a Boxity emote id, blended over this pose by the avatar.
 */
export function computePose(motion) {
  const { time = 0, speed = 0, maxSpeed = 6, grounded = true, vy = 0, stride: phase = time * 5, run = 0, bat, swingT = 0, coil = 0, cheer = 0, swordLen = 0.3 } = motion
  for (const name of POSED_BONES) clear(name)
  pose.lift = 0
  pose.stretchL = 1
  pose.stretchR = 1
  pose.bat.mode = 'back'
  pose.bat.scale = 1.2
  radius = (swordLen / 2) * 1.2

  if (bat === 'ready') {
    serveReady(time, clamp01(coil), clamp01(motion.strain || 0), 1)
    return pose
  }
  if (bat === 'throw') {
    serving(swingT, 1)
    return pose
  }
  if (bat === 'after') {
    afterServe(swingT, Boolean(motion.great), time, 1)
    return pose
  }
  if (bat === 'slash') {
    spike(clamp01(swingT / CLICK_SLASH_S), CLICK_SLASH_S, CLICK_JUMP, 1)
    return pose
  }
  if (run > 0 && grounded) {
    trainingSpikes(phase, clamp01(run))
    return pose
  }
  if (cheer > 0) {
    cheering(time, cheer)
    stance(clamp01(1 - cheer), time)
    ballOnHip(0.03, 0, time, 1)
    return pose
  }
  const ratio = grounded ? clamp01(speed / Math.max(maxSpeed, 0.001)) : 0
  if (grounded) {
    const still = 1 - smooth(0.05, 0.4, ratio)
    stance(still, time)
    if (ratio > 0.02) stride(phase, ratio)
  } else {
    airborne(vy)
  }
  const spine = pose.bones.Spine1
  ballOnHip(spine.swing, spine.twist, time, 1)
  return pose
}
