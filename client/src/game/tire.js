import { BALL_STYLES, ballBase, ballTrail } from './volleyballs'

/**
 * Each ball's colours, by ball id (the ids are the template's tire ids, kept for saves;
 * names and stats live in shared/balance.js, and how each ball looks is balls.js). Named
 * for the template, so everything that tinted itself by your tire - the stands, the
 * impact's glow, the speed lines - now takes your ball's colours. `trail` is the glow
 * colour; `a` is the ball's base colour.
 */
export const TIRE_STYLES = BALL_STYLES

export const tireRim = (id) => ballBase(id)
export const tireGlow = (id) => ballTrail(id)
