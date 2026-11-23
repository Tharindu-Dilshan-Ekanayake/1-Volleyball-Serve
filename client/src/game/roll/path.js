import { Euler, Quaternion, Vector3 } from 'three'

import { HOME_PLATE, SLOPE_ANGLE, THROW_STAGE, throwLane, TRACK_START_Z } from '@shared/world'

import { serveContact, THROW_RELEASE } from '../playerPose'
import { ballCenterY, ballLength } from '../volleyballs'

/**
 * Geometry of a serve: one long, straight court running north from the plaza's edge,
 * dead level (SLOPE_ANGLE is 0; the maths still allows a slope).
 *
 * Track metre `m` is measured along the field from the start line (the plaza's north
 * edge). Before the start (m < 0) the ground is the plaza. Everything here is pure maths
 * and allocation-free, so the frame loop can call it freely.
 */

export const SIN = Math.sin(SLOPE_ANGLE)
export const COS = Math.cos(SLOPE_ANGLE)
export const TAN = Math.tan(SLOPE_ANGLE)

/** World z of track metre m. */
export const zAt = (m) => TRACK_START_Z - (m > 0 ? m * COS : m)
/** Height of the floor at track metre m. */
export const floorY = (m) => (m > 0 ? -m * SIN : 0)
/** Height of the track's floor plane under world z. */
export const slopeY = (z) => (z < TRACK_START_Z ? -(TRACK_START_Z - z) * TAN : 0)
/** Height of a surface parallel to the floor, `h` metres off it, under world z. */
export const surfaceY = (z, h) => slopeY(z) + h / COS

/** How a box lies on the track: tipped back by the slope angle. */
export const SLOPE_EULER_X = -SLOPE_ANGLE

/** World point at track metre m, `x` to the side and `h` off the floor. */
export function trackPoint(m, x, h, out) {
  if (m <= 0) return out.set(x, h, TRACK_START_Z - m)
  return out.set(x, -m * SIN + h * COS, TRACK_START_Z - m * COS - h * SIN)
}

const _e = new Euler()
const _q = new Quaternion()
const _p = new Vector3()
const _s = new Vector3()

/**
 * Matrix of a box lying on the track, given in track terms: centred `x` across, `h`
 * off the floor (to its centre) and at metre `m` (also its centre), sized `sx` across,
 * `sy` thick and `sz` along the track, leaning `lean` radians about its own long axis.
 */
export function slopeBoxMatrix(m, x, h, sx, sy, sz, lean, out) {
  trackPoint(m, x, h, _p)
  _q.setFromEuler(_e.set(m > 0 ? SLOPE_EULER_X : 0, 0, lean))
  return out.compose(_p, _q, _s.set(sx, sy, sz))
}

/** Same as slopeBoxMatrix, but as BlockSet.add arguments: [x, y, z, rotX]. */
export function slopeBoxPlacement(m, x, h) {
  trackPoint(m, x, h, _p)
  return [_p.x, _p.y, _p.z, m > 0 ? SLOPE_EULER_X : 0]
}

/** Metres a world z is along the track (negative in the plaza). */
export const meterAtZ = (z) => (z < TRACK_START_Z ? (TRACK_START_Z - z) / COS : TRACK_START_Z - z)


// --- A serve -----------------------------------------------------------------------

const clamp01 = (x) => Math.min(1, Math.max(0, x))

/** The flying ball is drawn this much bigger than in your hand: it has to read from afar. */
export const SWORD_SCALE = 2.2
/** How big the flying ball reads to the trail and the effects (its trail's half-width). */
export const TIRE_SIZE = 0.75
/** The template's ball radius: the size of the little things that need one (sparkles, shadow). */
export const BALL_RADIUS = 0.26

/**
 * Where your hand meets the ball, from where you stand facing down the court: up over
 * your right shoulder at the top of your jump (playerPose serveContact at THROW_RELEASE).
 * Character space faces +Z with its left at +X; you face north (-Z), so it turns round.
 * CONTACT is a server's in the stage's middle; throwStart works it out for anywhere.
 */
const _c = serveContact(new Vector3())
const HAND = { x: -_c.x, y: _c.y, z: -_c.z }
export const CONTACT = { x: HOME_PLATE.x + HAND.x, y: THROW_STAGE.height + HAND.y, z: HOME_PLATE.z + HAND.z }
/** Seconds into a serve that your hand meets the ball (playerPose THROW_RELEASE). */
export const KICK_HIT = THROW_RELEASE
/** The metre (negative: still in the plaza) the flight starts from. */
export const CONTACT_METER = (TRACK_START_Z - CONTACT.z) / COS

/**
 * Where a serve from a server standing at (x, y, z) starts and flies: the contact point's
 * metre along the court (negative: still over the stage), its x and height, and its lane
 * down the court (throwLane: where on the stage you stood picks your line).
 */
export function throwStart(x, y, z) {
  const hz = z + HAND.z
  return { fromMeter: (TRACK_START_Z - hz) / COS, startX: x + HAND.x, startY: y + HAND.y, startZ: hz, lane: throwLane(x) }
}

/** How far along its arc (0-1) the ball is `u` of the way through it: off your hand fast, slowing as it goes. */
const progress = (u) => {
  const x = clamp01(u)
  return 1.5 * x - 0.5 * x * x
}

/**
 * How a serve's time after the hit is shared out: the big arc, two hops, the roll to a
 * stop - and its distance: the arc lands BOUNCE_SHARE of the way short of where it stops,
 * the hops cover HOP1_D and HOP2_D of that, the roll the rest.
 */
const ARC_T = 0.72
const HOP1_T = 0.1
const HOP2_T = 0.06
const ROLL_T = 1 - ARC_T - HOP1_T - HOP2_T
const BOUNCE_SHARE = 0.1
const HOP1_D = 0.5
const HOP2_D = 0.25

/**
 * Seconds into a serve of `duration` at which the ball has flown `f` (0-1) of its arc:
 * 0.5 is the top of the arc, 1 the moment it first hits the court.
 */
export const kickTimeAt = (f, duration) => KICK_HIT + (1.5 - Math.sqrt(2.25 - 2 * clamp01(f))) * Math.max(0.1, duration - KICK_HIT) * ARC_T

/**
 * The arc's peak grows with the distance (a short serve stays low, a long one soars) and
 * with how well you timed it (KICK_ARC: a WEAK one is a low skimmer, a PERFECT one a
 * towering bomb), capped so the court stays in view below it.
 */
const KICK_ARC = { weak: 0.45, good: 0.85, great: 1.15, perfect: 1.5 }
export const flightPeak = (distance, hit = null) => Math.min(48, (5 + 0.62 * Math.sqrt(Math.max(0, distance))) * (KICK_ARC[hit] ?? 1))

/** Topspin in the air, radians a second (a better serve spins harder). */
const AIR_SPIN = 14

/** A fresh state for rideState to write into. */
export const createRideState = () => ({
  /** 'launch' (not hit yet) | 'ride' (flying, bouncing, rolling down the court) | 'stopped' (at rest). */
  phase: 'launch',
  launch: 0,
  /** Metres along the court: the ball's, ending at the authority's distance. */
  meter: 0,
  speed: 0,
  /** Height of the ball's centre off the ground. */
  air: 0,
  size: TIRE_SIZE,
  /** True while it's in the air (the arc and its hops). */
  airborne: false,
  /** How many times it has hit the court so far. */
  bounces: 0,
  /** Rolling along the court at the end. */
  rolling: false,
  /** The ball's topspin about the sideways axis (radians), and its tilt about the way it flies. */
  spin: 0,
  roll: 0,
  /** Come to rest: and seconds since. */
  stuck: false,
  stuckFor: 0,
  /** Never true: nothing on the court stops it. */
  crashed: false,
  x: 0,
  /** The ball's centre. */
  position: new Vector3(),
  /** Where it first hit the court: the impact point. */
  tip: new Vector3(),
})

/** The ball's line across the court at metre `m`: from your spot, easing onto its lane. */
const lineX = (m, start, startX, lane) => {
  const settle = clamp01((m - start) / 40)
  return startX * (1 - settle) + lane * settle
}

/**
 * Everything about a serve `elapsed` seconds in - yours, or another player's replayed from
 * the same numbers, so both fly identically. `ride` is `{ fromMeter, startX, startY,
 * distance, duration, hit, len, centerY, lean }` (duration includes the serve; `len` the
 * ball's diameter and `centerY` its radius, volleyballs.js, unscaled; `lean` its tilt);
 * `lane` is a sideways offset so balls don't overlap. Writes into `out` (see
 * createRideState):
 *   phase    'launch' (not hit yet) | 'ride' | 'stopped'
 *   meter    the ball's metres along the court; speed in m/s along it
 *   position the ball's centre; spin its topspin; air its centre's height
 */
export function rideState(elapsed, ride, lane, out) {
  const r = (Number.isFinite(ride.centerY) ? ride.centerY : 0.15) * SWORD_SCALE
  const start = Number.isFinite(ride.fromMeter) ? ride.fromMeter : CONTACT_METER
  const end = Math.max(start + 2, ride.distance)
  const span = end - start
  const flightTime = Math.max(0.1, ride.duration - KICK_HIT)
  const bounce = Math.min(80, Math.max(1.5, span * BOUNCE_SHARE))
  const land = end - bounce
  const peak = flightPeak(span, ride.hit)
  const y0 = Number.isFinite(ride.startY) ? ride.startY : CONTACT.y
  const startX = Number.isFinite(ride.startX) ? ride.startX : CONTACT.x
  const spinRate = AIR_SPIN * (ride.hit === 'perfect' ? 1.4 : ride.hit === 'weak' ? 0.6 : 1)
  out.roll = Number.isFinite(ride.lean) ? ride.lean : 0
  out.size = TIRE_SIZE
  out.crashed = false
  let meter
  let y
  let speed = 0
  if (elapsed < KICK_HIT) {
    // Not hit yet: up in the air over you (the avatar draws it there).
    out.phase = 'launch'
    out.launch = clamp01(elapsed / KICK_HIT)
    out.airborne = false
    out.rolling = false
    out.bounces = 0
    out.stuck = false
    out.stuckFor = 0
    out.spin = 0
    meter = start
    y = y0
  } else {
    const t = elapsed - KICK_HIT
    const tArc = flightTime * ARC_T
    const tHop1 = flightTime * HOP1_T
    const tHop2 = flightTime * HOP2_T
    const tRoll = flightTime * ROLL_T
    const airSpin = -spinRate * Math.min(t, tArc)
    out.launch = 1
    out.phase = 'ride'
    out.stuck = false
    out.stuckFor = 0
    if (t < tArc) {
      // The big arc, topspinning.
      const u = t / tArc
      const f = progress(u)
      meter = start + (land - start) * f
      y = y0 + (r - y0) * f + peak * 4 * f * (1 - f)
      speed = ((land - start) * (1.5 - u)) / tArc
      out.airborne = true
      out.rolling = false
      out.bounces = 0
      out.spin = airSpin
    } else if (t < tArc + tHop1 + tHop2) {
      // Two hops, each lower and shorter than the last.
      const first = t < tArc + tHop1
      const t0 = first ? tArc : tArc + tHop1
      const dur = first ? tHop1 : tHop2
      const from = first ? land : land + bounce * HOP1_D
      const dist = bounce * (first ? HOP1_D : HOP2_D)
      const height = Math.min(9, peak * (first ? 0.16 : 0.055))
      const u = (t - t0) / dur
      meter = from + dist * u
      y = r + height * 4 * u * (1 - u)
      speed = dist / dur
      out.airborne = true
      out.rolling = false
      out.bounces = first ? 1 : 2
      out.spin = airSpin - ((meter - land) / r) * 1.2
    } else if (t < flightTime) {
      // Rolling to a stop.
      const u = (t - tArc - tHop1 - tHop2) / tRoll
      const from = land + bounce * (HOP1_D + HOP2_D)
      const dist = end - from
      meter = from + dist * (1 - (1 - u) * (1 - u))
      y = r
      speed = (2 * dist * (1 - u)) / tRoll
      out.airborne = false
      out.rolling = true
      out.bounces = 3
      out.spin = airSpin - ((meter - land) / r) * 1.2
    } else {
      // At rest, exactly where the authority said, with a last little settle.
      out.phase = 'stopped'
      out.airborne = false
      out.rolling = false
      out.bounces = 3
      out.stuck = true
      out.stuckFor = t - flightTime
      const wobble = out.stuckFor < 0.8 ? 0.08 * Math.exp(-out.stuckFor / 0.2) * Math.sin(out.stuckFor * 22) : 0
      meter = end
      y = r
      out.spin = airSpin - ((end - land) / r) * 1.2 + wobble
    }
  }
  const x = lineX(meter, start, startX, lane)
  out.meter = meter
  out.speed = speed
  out.air = y
  out.x = x
  trackPoint(meter, x, y, out.position)
  trackPoint(land, lineX(land, start, startX, lane), 0, out.tip)
  return out
}

/** Each other player's ball flies down its own line of the court, so balls don't overlap. */
export function laneFor(sid) {
  let h = 2166136261
  for (let i = 0; i < sid.length; i += 1) h = Math.imul(h ^ sid.charCodeAt(i), 16777619)
  return (((h >>> 0) % 5) - 2) * 3
}

/** A serve's tilt about the way it flies, the same on every client: a little tilt each time. */
export function leanFor(distance) {
  const k = Math.floor(Math.abs(distance) * 7.31) % 7
  return (k - 3) * 0.07
}

/** Where another player's serve starts (where they stood on the stage) and how big their ball is (connection.js ghostRoll). */
export function ghostStart(payload) {
  const id = payload.tireId || 'bicycle'
  const x = Number.isFinite(payload.x) ? payload.x : HOME_PLATE.x
  const z = Number.isFinite(payload.z) ? payload.z : HOME_PLATE.z
  return {
    ...throwStart(x, THROW_STAGE.height, z),
    len: ballLength(id),
    centerY: ballCenterY(id),
    lean: leanFor(payload.distance || 0),
  }
}
