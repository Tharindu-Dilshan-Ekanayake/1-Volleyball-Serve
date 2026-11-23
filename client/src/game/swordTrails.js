import { Color } from 'three'

/**
 * Every ball's own trail as it flies (shared/balance.js TIRES ids; how each ball looks is
 * balls.js): the ribbon's colour at the ball (`head`) and at its tip (`tail`), or every
 * colour of the rainbow (`rainbow`); how wide it streams (`width`, x the usual); and what
 * drifts off it (`fx`: a roll/TireTrail.jsx FX kind - wood chips off the Wooden Ball,
 * leaves off the Bamboo Blade, ghost wisps off the Soul Reaper, petals off the Blossom
 * Dancer, holy light off the Celestial Halo Blade...), in its own colours (`colors`) or the
 * kind's. An aura adds its aura round the ball and its own sparks on top.
 * Colours are sRGB hex.
 */
export const SWORD_TRAILS = {
  bicycle: { head: '#ffffff', tail: '#c8d8f0', width: 0.85, fx: 'dust', colors: ['#ffffff', '#e8eef8', '#d0dcec'] },
  mountain: { head: '#fff6b0', tail: '#ffb21a', width: 0.85, fx: 'glint', colors: ['#ffe27a', '#ffffff', '#ffc21a'] },
  wood: { head: '#cfeaff', tail: '#2a7de1', width: 0.9, fx: 'bubbles', colors: ['#bff4ff', '#ffffff', '#7fd0ff'] },
  stone: { head: '#fff27a', tail: '#ff4b4b', width: 0.9, fx: 'glint', colors: ['#ff4b4b', '#2f8ff2', '#ffd23a'] },
  cookie: { head: '#b6ffb0', tail: '#ff5a6a', width: 0.9, fx: 'glint', colors: ['#3fb84a', '#ff5a6a', '#ffffff'] },
  pizza: { head: '#ffe6c0', tail: '#a0602e', width: 0.95, fx: 'dust', colors: ['#f3e3c3', '#c8955a', '#ffffff'] },
  donut: { head: '#ffd0e8', tail: '#ff6ab0', width: 1, fx: 'glint', colors: ['#ff6ab0', '#ffffff', '#ffd0e6'] },
  watermelon: { head: '#bfdcff', tail: '#ffd21f', width: 1, fx: 'gold', colors: ['#ffd21f', '#1f3f9f', '#ffffff'] },
  monster: { head: '#ffe0a0', tail: '#b05cff', width: 1, fx: 'glint', colors: ['#ff8a3a', '#b05cff', '#ffe0a0'] },
  mint: { head: '#c0fff0', tail: '#ff6a8a', width: 1, fx: 'leaves', colors: ['#2fd8b0', '#fff27a', '#ff6a8a'] },
  silver: { head: '#ffffff', tail: '#9fb8ff', width: 1, fx: 'stars', colors: ['#ffffff', '#dfe8ff', '#b0c8ff'] },
  ice: { head: '#e8fbff', tail: '#3f9cff', width: 1.05, fx: 'frost' },
  gold: { head: '#fff3a8', tail: '#ff9a00', width: 1.1, fx: 'gold' },
  lava: { head: '#ffd27a', tail: '#ff2a00', width: 1.1, fx: 'fire' },
  platinum: { head: '#fff7a0', tail: '#4fd2ff', width: 1.1, fx: 'spark' },
  emerald: { head: '#b6ffd0', tail: '#0fa860', width: 1.1, fx: 'glint', colors: ['#7dffb0', '#ffffff', '#2bd17a'] },
  ruby: { head: '#ffb0c0', tail: '#e0102f', width: 1.15, fx: 'fire', colors: ['#ff7a90', '#ff2a4a', '#ffd0d8'] },
  diamond: { head: '#ffffff', tail: '#7fe6ff', width: 1.2, fx: 'glint', colors: ['#ffffff', '#bff4ff', '#7fe6ff'] },
  rainbow: { head: '#ffffff', tail: '#ff7ad9', width: 1.2, fx: 'stars', rainbow: true },
  unicorn: { head: '#ffd6f4', tail: '#b48cff', width: 1.2, fx: 'stars', colors: ['#ffb6e6', '#ffffff', '#c6a6ff'] },
  galaxy: { head: '#c69bff', tail: '#3f6bff', width: 1.25, fx: 'stars' },
  dragon: { head: '#9dff7a', tail: '#ff4a1c', width: 1.3, fx: 'fire', colors: ['#4cff7a', '#ffd21f', '#ff6a1e'] },
  cosmic: { head: '#9ff8ff', tail: '#3f5bff', width: 1.2, fx: 'spark', colors: ['#3fd8ff', '#ffffff', '#9f7aff'] },
  infinity: { head: '#ffffff', tail: '#c69bff', width: 1.35, fx: 'stars', rainbow: true },
  // The Legend balls: each its own spectacle.
  reaper: { head: '#7dffe6', tail: '#3a0a5a', width: 1.35, fx: 'ghost' },
  twinmoon: { head: '#eef4ff', tail: '#6a8aff', width: 1.35, fx: 'stars', colors: ['#ffffff', '#cfe0ff', '#8fb0ff'] },
  titanaxe: { head: '#ffe2a0', tail: '#c2410c', width: 1.4, fx: 'smoke' },
  sawtooth: { head: '#ffa0a0', tail: '#a0001a', width: 1.4, fx: 'spark', colors: ['#ff3b3b', '#ffb000', '#ffffff'] },
  phoenixwing: { head: '#fff27a', tail: '#ff3b0a', width: 1.45, fx: 'feathers' },
  abyssal: { head: '#7fe8ff', tail: '#0a2a6a', width: 1.45, fx: 'bubbles' },
  blossom: { head: '#ffd0e8', tail: '#ff5fa8', width: 1.45, fx: 'petals' },
  celestial: { head: '#ffffff', tail: '#ffd21f', width: 1.5, fx: 'holy' },
  voidrift: { head: '#d18bff', tail: '#1a0633', width: 1.5, fx: 'void' },
  aurora: { head: '#7dffb0', tail: '#b14dff', width: 1.55, fx: 'aurora' },
  tempest: { head: '#e8fbff', tail: '#4f6bff', width: 1.6, fx: 'spark', colors: ['#ffffff', '#9ff4ff', '#6a8aff'] },
  eternity: { head: '#ffffff', tail: '#ffd21f', width: 1.7, fx: 'holy', rainbow: true },
}

const FALLBACK = SWORD_TRAILS.bicycle

// Parsed once: frame code reads colours without allocating.
const PARSED = Object.fromEntries(
  Object.entries(SWORD_TRAILS).map(([id, t]) => [
    id,
    {
      head: new Color(t.head),
      tail: new Color(t.tail),
      width: t.width ?? 1,
      fx: t.fx || 'none',
      colors: t.colors ? t.colors.map((c) => new Color(c)) : null,
      rainbow: Boolean(t.rainbow),
    },
  ]),
)

/** Ball `id`'s trail, parsed (Colors), never null. */
export const swordTrailLook = (id) => PARSED[id] || PARSED.bicycle
/** Ball `id`'s trail as hex (for the UI). */
export const swordTrailStyle = (id) => SWORD_TRAILS[id] || FALLBACK
