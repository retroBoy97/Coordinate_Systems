import { useEffect, useState } from 'react'
import { Line } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useSymmetryStore } from '../store/useSymmetryStore'
import { toThree } from './coords'
import { screenPointToRay, projectToScreenPx } from './drag'
import { sphericalBasis } from './symmetryBasis'
import { sphericalDrag } from './symmetryDrag'
import { SPHERICAL_PLANES } from './symmetryPlanes'
import Vector3D from './Vector3D'
import Plane3D from './Plane3D'
import { RED, PURPLE } from './colors'

const LIGHT_BLUE = '#00ccff'
const YELLOW = '#facc15'
const VECTOR_LENGTH = 1.8
const GRAB_THRESHOLD_PX = 40
const OUTLINE_PICK_PX = 30
const MIN_SPHERE_R = 0.5
const MAX_SPHERE_R = 8
const PLANE_MARGIN = 1.5
// Polar angle of the dotted latitude circle drawn on the sphere: 60° from Oz,
// i.e. at height R/2 in the upper hemisphere — where the coordinates
// section's latitude circle typically sits.
const LATITUDE_POLAR = Math.PI / 3

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

function latitudePoints(radius, progress, segments = 96) {
  const z = radius * Math.cos(LATITUDE_POLAR)
  const rho = radius * Math.sin(LATITUDE_POLAR)
  const n = Math.max(1, Math.round(segments * progress))
  const pts = []
  for (let i = 0; i <= n; i++) {
    const a = (i / segments) * Math.PI * 2
    pts.push(toThree({ x: rho * Math.cos(a), y: rho * Math.sin(a), z }))
  }
  return pts
}

// The point of the sphere's on-screen outline nearest the mouse ray, in
// three.js space: along the direction from O to the ray's closest approach
// to O. That closest-approach distance is also exactly the radius at which
// the outline passes under the cursor — used to resize the sphere.
function outlineUnderRay(ray) {
  const t = -ray.origin.dot(ray.dir)
  const closest = ray.origin.clone().addScaledVector(ray.dir, t)
  const dist = closest.length()
  if (dist < 1e-6) return null
  return { dir: closest.divideScalar(dist), dist }
}

// Where each plane's patch sits. The two planes containing u_r pass through
// O, so they're centered on O rather than on M: they reach M' (M's mirror
// image through O) as far as they reach M and cut the whole sphere.
// (M, u_θ, u_φ) stays centered on M.
function planePlacement(key, point, sphereRadius) {
  if (key === 'utheta-uphi') return { origin: point }
  const r = Math.hypot(point.x, point.y, point.z)
  const half = Math.max(r, sphereRadius) + PLANE_MARGIN
  return { origin: { x: 0, y: 0, z: 0 }, aRange: [-half, half], bRange: [-half, half] }
}

// The fixed schematic sphere centered on O — the spherical-symmetry analog of
// SymmetryCylindricalScene's fixed cylinder — always visible regardless of
// where (or whether) a point is placed, resizable by dragging its outline.
export default function SymmetrySphericalScene() {
  const point = useSymmetryStore((s) => s.point)
  const activePlane = useSymmetryStore((s) => s.activePlane)
  const tool = useSymmetryStore((s) => s.tool)
  const sphereRadius = useSymmetryStore((s) => s.sphereRadius)
  const cameraResetToken = useSymmetryStore((s) => s.cameraResetToken)
  const get = useThree((s) => s.get)

  // Yellow grab handle on the sphere's outline where the hand is; follows
  // the outline while the radius is being dragged. three.js-space position.
  const [hoverOutline, setHoverOutline] = useState(null)

  // The sphere's latitude circle draws itself in when the page (or a reset)
  // shows the sphere, like the coordinates section's does after its reveal.
  const [latitudeProgress, setLatitudeProgress] = useState(0)
  useEffect(() => {
    setLatitudeProgress(0)
    const s = { p: 0 }
    const tween = gsap.to(s, {
      p: 1,
      duration: 1.3,
      delay: 0.3,
      ease: 'power1.inOut',
      onUpdate: () => setLatitudeProgress(s.p),
    })
    return () => tween.kill()
  }, [cameraResetToken])

  // Vectors grow in one at a time on a fresh placement; a drag of M must NOT
  // replay this — they just move with it, fully drawn.
  const [progress, setProgress] = useState([0, 0, 0])
  useEffect(() => {
    if (useSymmetryStore.getState().orbitSuspended) {
      setProgress([1, 1, 1])
      return
    }
    setProgress([0, 0, 0])
    if (!point) return
    const state = { a: 0, b: 0, c: 0 }
    const apply = () => setProgress([state.a, state.b, state.c])
    const tl = gsap.timeline()
    tl.to(state, { a: 1, duration: 0.5, ease: 'power2.out', onUpdate: apply })
    tl.to(state, { b: 1, duration: 0.5, ease: 'power2.out', onUpdate: apply }, '+=0.15')
    tl.to(state, { c: 1, duration: 0.5, ease: 'power2.out', onUpdate: apply }, '+=0.15')
    return () => tl.kill()
  }, [point])

  // Hand-tool pointer interaction. Priority on pointerdown:
  //   1. near M while a coordinate is armed ("Modifier r/θ/φ") → constrained
  //      drag of M, no value shown;
  //   2. near the sphere's outline → drag to change its radius;
  //   3. anything else → left alone for OrbitControls (normal orbit).
  useEffect(() => {
    if (tool !== 'hand') return
    const el = get().gl.domElement
    let drag = null // { mode: 'point', key, fixed } | { mode: 'radius' }
    let outlineHover = null

    const localCoords = (e) => {
      const { camera, size, gl } = get()
      const rect = gl.domElement.getBoundingClientRect()
      return { camera, size, mx: e.clientX - rect.left, my: e.clientY - rect.top }
    }

    const pointGrabbable = (camera, size, mx, my) => {
      const { point: cur, activeUpdateKey } = useSymmetryStore.getState()
      if (!cur || !activeUpdateKey) return false
      const p = projectToScreenPx(camera, toThree(cur), size.width, size.height)
      return Math.hypot(mx - p.x, my - p.y) <= GRAB_THRESHOLD_PX
    }

    const findOutlineHover = (camera, size, mx, my) => {
      const hit = outlineUnderRay(screenPointToRay(camera, mx, my, size.width, size.height))
      if (!hit) return null
      const p = hit.dir.clone().multiplyScalar(useSymmetryStore.getState().sphereRadius)
      const proj = projectToScreenPx(camera, p, size.width, size.height)
      return Math.hypot(proj.x - mx, proj.y - my) <= OUTLINE_PICK_PX ? p : null
    }

    const handleMove = (e) => {
      const { camera, size, mx, my } = localCoords(e)
      const store = useSymmetryStore.getState()

      if (drag) {
        const ray = screenPointToRay(camera, mx, my, size.width, size.height)
        if (drag.mode === 'point') {
          const next = sphericalDrag(drag.key, drag.fixed, ray)
          if (next) store.dragUpdatePoint(next)
          return
        }
        const hit = outlineUnderRay(ray)
        if (!hit) return
        const radius = clamp(hit.dist, MIN_SPHERE_R, MAX_SPHERE_R)
        store.setSphereRadius(radius)
        setHoverOutline(hit.dir.multiplyScalar(radius))
        return
      }

      outlineHover = pointGrabbable(camera, size, mx, my) ? null : findOutlineHover(camera, size, mx, my)
      setHoverOutline(outlineHover)
    }

    const handleDown = (e) => {
      const { camera, size, mx, my } = localCoords(e)
      const store = useSymmetryStore.getState()
      if (pointGrabbable(camera, size, mx, my)) {
        drag = { mode: 'point', key: store.activeUpdateKey, fixed: { ...store.point } }
      } else if (outlineHover) {
        drag = { mode: 'radius' }
      } else {
        return
      }
      e.stopImmediatePropagation()
      store.setOrbitSuspended(true)
      el.setPointerCapture?.(e.pointerId)
    }

    const handleUp = () => {
      if (!drag) return
      drag = null
      useSymmetryStore.getState().setOrbitSuspended(false)
    }

    el.addEventListener('pointermove', handleMove)
    el.addEventListener('pointerdown', handleDown)
    window.addEventListener('pointerup', handleUp)
    return () => {
      el.removeEventListener('pointermove', handleMove)
      el.removeEventListener('pointerdown', handleDown)
      window.removeEventListener('pointerup', handleUp)
      setHoverOutline(null)
    }
  }, [tool, get])

  const basis = point ? sphericalBasis(point) : null
  const plane = point && activePlane ? SPHERICAL_PLANES.find((p) => p.key === activePlane) : null
  const placement = plane ? planePlacement(plane.key, point, sphereRadius) : null

  return (
    <group>
      <mesh scale={[sphereRadius, sphereRadius, sphereRadius]}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshBasicMaterial color={LIGHT_BLUE} transparent opacity={0.12} depthWrite={false} />
      </mesh>

      {latitudeProgress > 0 && (
        <Line
          points={latitudePoints(sphereRadius, latitudeProgress)}
          color={LIGHT_BLUE}
          lineWidth={2}
          dashed
          dashSize={0.12}
          gapSize={0.08}
          transparent
          opacity={0.9}
        />
      )}

      {hoverOutline && (
        <mesh position={hoverOutline} renderOrder={25}>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshBasicMaterial color={YELLOW} fog={false} depthTest={false} />
        </mesh>
      )}

      {point && basis && (
        <>
          <Vector3D origin={point} dir={basis.ur} length={VECTOR_LENGTH} progress={progress[0]} color={RED} label="ur" />
          <Vector3D origin={point} dir={basis.utheta} length={VECTOR_LENGTH} progress={progress[1]} color={RED} label="utheta" />
          <Vector3D origin={point} dir={basis.uphi} length={VECTOR_LENGTH} progress={progress[2]} color={RED} label="uphi" />
        </>
      )}

      {plane && basis && (
        <Plane3D dirA={basis[plane.a]} dirB={basis[plane.b]} color={PURPLE} {...placement} />
      )}
    </group>
  )
}
