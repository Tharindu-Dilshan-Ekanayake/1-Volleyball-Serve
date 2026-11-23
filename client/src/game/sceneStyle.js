/**
 * The scene's whole look in one place: Sunny Shores - a beach volleyball arena at sunset:
 * an orange-to-violet evening sky with a low golden sun over the far end of the court,
 * warm sand underfoot, white-washed resort walls with turquoise and coral roofs, sunset
 * flags and palm trees on the dunes round it (hills.js), the blue sea beyond (Ocean.jsx)
 * and the long court running off between the dunes (Lane.jsx). World 2, Christmas
 * Village, has a venue of its own (VENUES[1]): snow, red and green, a starry night.
 *
 * Colours are sRGB hex, exactly as you would pick them in an image editor.
 *
 * Light intensities are three.js physical units: a light of intensity PI (~3.14)
 * lights a surface facing it to its full texture colour. The cool sky fill plus the warm
 * sun add up to just over that on the ground; shadowed ground only gets the fill, so
 * shadows read cool and the lit side warm.
 */

/** Style ids from materials.js STYLE (numbers here so this file stays import-free). */
const STYLE_HILL = 14

/**
 * The academy's heraldic colours: royal blue and gold, with white and a red accent.
 * (Keys kept from the template: everything that reads TEAM still finds them.)
 */
export const TEAM = {
  blue: '#1aa6c8',
  navy: '#163a5a',
  red: '#ff6f61',
  white: '#fffaf0',
  gold: '#ffc21a',
}

export const SKY = {
  /** Straight up: the evening's deep violet-blue. */
  top: '#3a3f96',
  /** At eye level: a warm sunset peach. Fog uses the same colour so distant ground melts into the sky. */
  horizon: '#ffb98a',
  /** Lower = the deep colour reaches further down towards the horizon. */
  exponent: 0.55,
  /** The low sun's golden glow round its direction, and how strong it is. */
  sun: '#ffcf7a',
  glow: 1.05,
  /** Evening clouds (0 none, 1 plenty), and the first stars coming out. */
  clouds: 0.7,
  stars: 0.08,
}

export const FOG = {
  color: SKY.horizon,
}

/** Every surface colour in the lobby. */
export const PALETTE = {
  /** The ball shop's yard: pale marble flagstones. */
  shopFloor: '#e4dfd3',
  /** Rings painted round the portal. */
  apron: TEAM.navy,
  apronEdge: TEAM.gold,
  /** Pale castle stone, a shade darker every third course (Lane.jsx reads these too). */
  concrete: ['#c9ccd4', '#c9ccd4', '#b4b9c4'],
  seats: [TEAM.blue, TEAM.red, TEAM.white],
  standBase: '#8c93a1',
  rail: '#ffffff',
  /** Sand, light and dark: the beach round the lobby and the court's verges. */
  turf: ['#f0d6a0', '#ead09a'],
  /** Banners and pennants: the academy's blue and gold, a red one now and then. */
  crowd: [TEAM.blue, '#ffffff', TEAM.gold, '#3a6ee8', TEAM.red, '#ffe27a', '#e8eef8', TEAM.navy],
  /** Flags along the walls. */
  flags: [TEAM.blue, TEAM.gold, TEAM.red],
  /** Far-off castle towers and villages: hazy blue-grey. */
  city: ['#7a86a6', '#8a8fae', '#6f7a9a', '#978cac', '#7d92b0'],
  /** Old cobbles. */
  asphalt: '#6b6f78',
  /** Castle stone courses, light to dark. */
  stone: ['#c9ccd4', '#bcc0ca', '#b0b5c0'],
  /** Wood: beams, fences, platforms. */
  wood: '#9a6436',
}

/**
 * Each world's venue: the colours everything built for it uses. World 1 is Sunny Shores
 * (white-washed walls, turquoise and coral, sand, dunes with palms, the sea); World 2 is
 * Christmas Village (snow, red and green and gold, snowy pines, a frozen sea and a giant
 * Christmas tree over the north-east ridge). The lobby (World.jsx) and the court
 * (Lane.jsx) are built from the one for the world you're in, and rebuilt when you step
 * through the portal.
 *
 *   ground   the lobby floor's paint (ground.js)
 *   castle   the walls, towers, banners and braziers round the courtyard (terrain.js)
 *   hills    the ridges round the lobby: rock by terrace (low to high), their cap style,
 *            the cap colour (materials GRASS_COLOR), what grows on them
 *   sea      the sea beyond the ground (Ocean.jsx); landmark: the giant tree (hills.js)
 *   field    the court's own extras (Lane.jsx): its edging, lamps
 *
 * The template's stadium fields (concrete, vip, glass, crowd, wall...) are kept: other
 * modules still read them. (`lava` stays false: the template's lava venue is gone.)
 */
export const VENUES = [
  {
    lava: false,
    snow: false,
    /** The sea round the lobby beyond the ground (Ocean.jsx): 'water', 'ice', or null. */
    sea: 'water',
    /** The landmark over the north-east ridge (hills.js): 'tree' (a giant Christmas tree) or null. */
    landmark: null,
    primary: TEAM.blue,
    dark: '#163a5a',
    light: TEAM.white,
    accent: TEAM.gold,
    concrete: ['#f2ebdc', '#f2ebdc', '#e2d8c4'],
    wall: '#efe7d6',
    vip: '#f6f0e2',
    glass: '#1c3a52',
    crowd: [TEAM.blue, '#ffffff', TEAM.gold, '#ff9a3a', TEAM.red, '#ffe27a', '#5fe0d0', TEAM.navy],
    flags: [TEAM.blue, '#ff9a3a', TEAM.red],
    surround: '#ecd29c',
    strip: PALETTE.turf,
    shopFloor: '#f4ead6',
    ground: {
      /** Beach sand: the lobby floor's main paint. */
      grass: ['#f2dca8', '#eed6a0'],
      /** Sun-bleached deck boards: three shades, and the gaps between them. */
      flag: ['#f4ead6', '#ece0c8', '#fbf3e2'],
      grout: '#c8b48e',
      /** Sandy paths. */
      path: ['#e8c88e', '#dcbb80'],
      /** Path and bed edging: driftwood. */
      edge: '#b08850',
      /** The training courts' sand. */
      sand: ['#f7d892', '#edcc82'],
      /** The SERVE ZONE's deck, and the gold lane lines on it. */
      runway: ['#e6dcc6', '#d9cdb4'],
      chalk: '#ffd84a',
      /** Flower beds: soil and tropical blooms. */
      soil: '#c8a060',
      flowers: ['#ff5f8a', '#ffd21f', '#ff8a3a', '#5fd6ff', '#ffffff', '#b77bff'],
      ring: TEAM.gold,
      portal: '#7a4cff',
      rune: '#8a5cff',
      yard: '#f4ead6',
      // Template names, still read by older code.
      dirt: '#e2c487',
      dirtDark: '#d4b478',
      infield: ['#e6dcc6', '#d9cdb4'],
      cages: '#f7d892',
      cracks: null,
    },
    logo: { rim: TEAM.gold, ring: '#ff7a3a', inner: '#163a5a', top: 'VOLLEY SERVE', bottom: 'LEGENDS' },
    castle: {
      stone: ['#f6f1e6', '#ece5d6', '#e0d8c6'],
      dark: '#b8a888',
      cap: '#fffaf0',
      roof: '#18b5b0',
      roofAlt: '#ff6f61',
      banner: '#18a6c8',
      bannerAlt: '#ff7a3a',
      trim: TEAM.gold,
      emblem: '#fff27a',
      blade: '#ffffff',
      flame: '#ffb347',
      core: '#fff1b0',
      glow: '#fff1b0',
      wood: '#b07840',
      window: '#2a5a7a',
    },
    hills: { rock: ['#ecd29a', '#e4c68a', '#dab97c', '#cfac70', '#c39f64'], cap: STYLE_HILL, grass: '#f4dfae', lava: null, trees: 'palm' },
    field: { wall: '#b8a888', cap: TEAM.gold, track: '#e2c487', lights: '#fff1b0' },
    /** The great banner board's face (on the south dunes). */
    board: '#163a5a',
    endNorth: 'SERVE FAR!',
    /** The SERVE ZONE's arch: towers, the beam, its glow and the crest. */
    arch: { pillar: '#ece5d6', base: '#b8a888', glow: '#fff1b0', crest: TEAM.gold, beam: TEAM.blue },
    /** The ball shop's stages and sign. */
    shop: { band: TEAM.blue, strip: '#ffe27a', post: '#e0d8c6', panel: '#163a5a', top: '#f4ead6' },
    /** The Aura Shrine: its stone, the runes' glow, the crystal and the sign board. */
    stall: { awning: [TEAM.blue, '#ffffff'], wood: '#b07840', counter: '#163a5a', trim: TEAM.gold },
    altar: { stone: '#d8ccb4', dark: '#a8987c', rune: '#a77bff', crystal: '#c9a0ff', core: '#ffffff', board: '#1f1640', trim: '#ffc21a' },
  },
  {
    lava: false,
    snow: true,
    sea: 'ice',
    landmark: 'tree',
    primary: '#d8203a',
    dark: '#123a24',
    light: '#ffffff',
    accent: '#ffd21f',
    concrete: ['#e8eef6', '#e8eef6', '#d6dee8'],
    wall: '#e4eaf2',
    vip: '#f0f4fa',
    glass: '#14243a',
    crowd: ['#d8203a', '#ffffff', '#1f8a4a', '#ffd21f', '#e8f4ff', '#a8101e', '#2fb060', '#ffe27a'],
    flags: ['#d8203a', '#1f8a4a', '#ffd21f'],
    surround: '#eef4fb',
    strip: ['#f4f8fd', '#eaf0f8'],
    shopFloor: '#e6edf5',
    ground: {
      /** Fresh snow. */
      grass: ['#f6f9fd', '#eef3fa'],
      /** Frosted flagstones, and the snow between them. */
      flag: ['#d8e2ee', '#ccd8e6', '#e4ecf5'],
      grout: '#ffffff',
      /** Trodden paths through the snow. */
      path: ['#c8d6e6', '#bccbdd'],
      /** Edging: red, like a candy cane's stripe. */
      edge: '#d8203a',
      /** The training courts: packed snow. */
      sand: ['#e2ebf5', '#d6e1ee'],
      runway: ['#d0dae8', '#c4cfde'],
      chalk: '#ffd21f',
      /** Beds: evergreen, dotted with baubles. */
      soil: '#1f6a3a',
      flowers: ['#d8203a', '#ffd21f', '#ffffff', '#2f8ff2', '#ff6a8a'],
      ring: '#ffd21f',
      portal: '#3fd8ff',
      rune: '#7fe6ff',
      yard: '#e6edf5',
      dirt: '#c8d6e6',
      dirtDark: '#b4c4d8',
      infield: ['#d0dae8', '#c4cfde'],
      cages: '#e2ebf5',
      cracks: null,
    },
    logo: { rim: '#ffd21f', ring: '#d8203a', inner: '#123a24', top: 'CHRISTMAS', bottom: 'VILLAGE' },
    castle: {
      stone: ['#eef2f8', '#e2e8f1', '#d4dce8'],
      dark: '#9aa8bc',
      cap: '#ffffff',
      roof: '#c8102e',
      roofAlt: '#1f8a4a',
      banner: '#c8102e',
      bannerAlt: '#1f8a4a',
      trim: '#ffd21f',
      emblem: '#ffe27a',
      blade: '#ffffff',
      flame: '#ffb347',
      core: '#fff1b0',
      glow: '#fff1b0',
      wood: '#7a4a2a',
      window: '#ffcf6a',
    },
    hills: { rock: ['#dfe7f1', '#d3ddea', '#c6d2e2', '#b9c7da', '#acbcd2'], cap: STYLE_HILL, grass: '#ffffff', lava: null, trees: 'xmas' },
    field: { wall: '#9aa8bc', cap: '#d8203a', track: '#c8d6e6', lights: '#ffcf6a' },
    board: '#123a24',
    endNorth: 'HO HO HO!',
    arch: { pillar: '#e2e8f1', base: '#9aa8bc', glow: '#fff1b0', crest: '#ffd21f', beam: '#c8102e' },
    shop: { band: '#c8102e', strip: '#ffd21f', post: '#d4dce8', panel: '#123a24', top: '#e6edf5' },
    stall: { awning: ['#c8102e', '#ffffff'], wood: '#7a4a2a', counter: '#123a24', trim: '#ffd21f' },
    altar: { stone: '#c6d2e2', dark: '#8a9ab0', rune: '#7fe6ff', crystal: '#bff4ff', core: '#ffffff', board: '#123a24', trim: '#ffd21f' },
  },
]
export const venueOf = (world) => VENUES[world] ?? VENUES[0]

export const LIGHTS = {
  /** A warm pink fill from the evening sky, a golden bounce off the sand. */
  hemiSky: '#ffd2c0',
  hemiGround: '#e0c08a',
  hemiIntensity: 2.0,

  /** A low golden sunset sun. */
  sunColor: '#ffc88a',
  sunIntensity: 1.75,
  /**
   * Direction *towards* the sun: low in the north-west, beyond the far end of the court
   * (the sky's glow sits there too), so long shadows fall back towards you.
   */
  sunDirection: [-0.42, 0.42, -0.8],
  /** 1 = shadows get no sunlight at all; lower = lighter shadows. */
  shadowIntensity: 0.6,
  /** Blur radius of shadow edges, in shadow-map texels. */
  shadowSoftness: 3,
}

/**
 * Each world's light (Lighting.jsx): Sunny Shores' golden sunset, and Christmas Village's
 * moonlit night - a cool blue sky fill, a bright bounce off the snow and a pale moon.
 */
export const WORLD_LIGHTS = [
  LIGHTS,
  { ...LIGHTS, hemiSky: '#8aa4ee', hemiGround: '#c8d8f4', hemiIntensity: 1.65, sunColor: '#c4d6ff', sunIntensity: 1.05 },
]
export const lightsOf = (world) => WORLD_LIGHTS[world] ?? LIGHTS
