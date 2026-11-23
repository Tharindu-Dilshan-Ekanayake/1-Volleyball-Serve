import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from 'three'

import { toyTime } from '../materials'

/**
 * Christmas Village's snowfall on the LOW preset, where there are no particles (the
 * particle snow is roll/Weather.jsx, MEDIUM and up): one full-screen quad whose shader
 * draws two layers of square blocky flakes falling and drifting - a near layer of big
 * slow ones and a far layer of small ones - shifted sideways as the camera turns so the
 * snow seems to hang in the world. One draw call, no textures, nothing simulated on the
 * CPU: each frame only writes two numbers (the camera's heading and the screen's shape)
 * into uniforms.
 */

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`
const fragment = /* glsl */ `
  uniform float uTime;
  uniform vec2 uOffset;
  uniform float uAspect;
  varying vec2 vUv;
  float sHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  // One layer of flakes: \`scale\` cells across the screen's height, falling at \`fall\`
  // cells a second, one flake in roughly \`density\` of the cells, \`size\` of a cell big.
  float flakes(vec2 uv, float scale, float fall, float density, float size) {
    vec2 p = uv * scale;
    p.y += uTime * fall;
    vec2 cell = floor(p);
    float sway = sin(uTime * 0.9 + sHash(vec2(cell.x, 3.7)) * 6.28) * 0.25;
    p.x += sway;
    cell = floor(p);
    if (sHash(cell) > density) return 0.0;
    vec2 f = fract(p) - 0.5;
    vec2 o = (vec2(sHash(cell + 3.1), sHash(cell + 7.7)) - 0.5) * 0.5;
    vec2 d = abs(f - o);
    float edge = max(d.x, d.y);
    return 1.0 - smoothstep(size * 0.8, size, edge);
  }
  void main() {
    vec2 uv = vec2(vUv.x * uAspect, vUv.y);
    float near = flakes(uv + uOffset, 6.0, 0.9, 0.22, 0.13);
    float far = flakes(uv + uOffset * 0.5 + 17.0, 13.0, 1.3, 0.3, 0.11);
    float a = max(near * 0.9, far * 0.55);
    if (a < 0.02) discard;
    gl_FragColor = vec4(vec3(1.0), a);
  }
`

const _dir = new Vector3()

export default function SnowScreen() {
  const ref = useRef(null)
  const snow = useMemo(() => {
    const material = new ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: { uTime: toyTime, uOffset: { value: [0, 0] }, uAspect: { value: 1 } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
    const mesh = new Mesh(new PlaneGeometry(2, 2), material)
    mesh.frustumCulled = false
    mesh.renderOrder = 10
    return mesh
  }, [])

  useEffect(
    () => () => {
      snow.geometry.dispose()
      snow.material.dispose()
    },
    [snow],
  )

  // The camera's heading and tilt slide the snow across the screen as it turns; the
  // screen's shape keeps the flakes square.
  useFrame((state) => {
    const mesh = ref.current
    if (!mesh) return
    state.camera.getWorldDirection(_dir)
    const u = mesh.material.uniforms
    u.uOffset.value[0] = Math.atan2(_dir.x, _dir.z) * -1.6
    u.uOffset.value[1] = _dir.y * 1.2
    u.uAspect.value = state.size.width / Math.max(1, state.size.height)
  })

  return <primitive ref={ref} object={snow} />
}
