import { useEffect, useMemo } from 'react'
import { DoubleSide, Mesh, PlaneGeometry, ShaderMaterial } from 'three'

import { SERVE_NET, SERVE_NET_Z } from '@shared/world'

/**
 * The netting of the volleyball net across the court in front of the serve line
 * (shared/world SERVE_NET; its posts, bands and antennas are in the lobby's blocks:
 * rollZone.buildServeNet). One quad, no texture: the shader draws the 10 cm mesh of dark
 * cord, anti-aliased by its own screen-space width, and where the cords get finer than a
 * pixel (from far away) it fades to an even see-through grey instead of shimmering. One
 * draw call on every preset; the court shows through it.
 */

/** The size of one square of mesh (metres). */
const CELL = 0.1

const vertex = /* glsl */ `
  varying vec2 vCells;
  uniform vec2 uCells;
  void main() {
    vCells = uv * uCells;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const fragment = /* glsl */ `
  varying vec2 vCells;
  void main() {
    vec2 w = max(fwidth(vCells), vec2(1e-4));
    // Distance to the nearest cord, in pixels.
    vec2 d = abs(fract(vCells - 0.5) - 0.5) / w;
    float cord = 1.0 - clamp(min(d.x, d.y) - 0.6, 0.0, 1.0);
    // Cords thinner than a pixel: an even tint of how much they cover.
    float far = smoothstep(0.25, 0.6, max(w.x, w.y));
    float a = mix(cord * 0.9, 0.38, far);
    if (a < 0.02) discard;
    gl_FragColor = vec4(vec3(0.07, 0.07, 0.09), a);
    #include <colorspace_fragment>
  }
`

function createServeNet() {
  const { top, height, halfWidth } = SERVE_NET
  const width = halfWidth * 2
  const material = new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: { uCells: { value: [width / CELL, height / CELL] } },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  })
  const mesh = new Mesh(new PlaneGeometry(width, height - 0.06), material)
  mesh.position.set(0, top - height / 2 - 0.02, SERVE_NET_Z)
  mesh.renderOrder = 1
  return mesh
}

export default function ServeNet() {
  const net = useMemo(() => createServeNet(), [])
  useEffect(
    () => () => {
      net.geometry.dispose()
      net.material.dispose()
    },
    [net],
  )
  return <primitive object={net} />
}
