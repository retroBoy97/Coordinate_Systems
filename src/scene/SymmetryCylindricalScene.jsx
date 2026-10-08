import { useEffect, useState } from 'react'
import { Line } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { useSymmetryStore } from '../store/useSymmetryStore'
import { toThree } from './coords'
import { screenPointToRay, closestPointOnLineToRay, projectToScreenPx } from './drag'
import { cylindricalBasis } from './symmetryBasis'
import { cylindricalDrag } from './symmetryDrag'
import { CYLINDRICAL_PLANES } from './symmetryPlanes'
import Vector3D from './Vector3D'
import Plane3D from './Plane3D'
import { RED, PURPLE } from './colors'

const LIGHT_BLUE = '#00ccff'
const YELLOW = '#facc15'
const CYL_RADIUS = 3
const VECTOR_LENGTH = 1.8
const GRAB_THRESHOLD_PX = 40
const RIM_PICK_PX = 30
const RIM_SAMPLES = 64
const MIN_HEIGHT = 0.5
const BOUND_LIMIT = 8
const PLANE_MARGIN = 1.5
const Z_DIR = toThree({ x: 0, y: 0, z: 1 })

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

function circlePoints(radius, y, segments = 64) {
  const pts = []
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2
    pts.push(new THREE.Vector3(radius * Math.cos(a), y, radius * Math.sin(a)))
  }
  return pts
}

// Where each plane's patch sits. The two planes containing u_r are centered
// on the Oz axis rather than on M, so they reach M' (M's mirror image through
// Oz) as far as they reach M and cut the whole cylinder — that's what shows
// whether the plane splits the distribution into two symmetric halves.
// (M, u_θ, u_z) stays centered on M.
function planePlacement(key, point, cylBottom, cylTop) {
  const r = Math.hypot(point.x, point.y)
  const half = Math.max(r, CYL_RADIUS) + PLANE_MARGIN
  if (key === 'ur-utheta') {
    return { origin: { x: 0, y: 0, z: point.z }, aRange: [-half, half], bRange: [-half, half] }
  }
  if (key === 'ur-uz') {
    return {
      origin: { x: 0, y: 0, z: 0 },
      aRange: [-half, half],
      bRange: [Math.min(cylBottom, point.z) - PLANE_MARGIN, Math.max(cylTop, point.z) + PLANE_MARGIN],
    }
  }
  return { origin: point }
}

// The fixed schematic cylinder of axis Oz standing in for "a charge
// distribution with cylindrical symmetry", always visible regardless of
// where (or whether) a point is placed. Its lower base sits on the Oxy plane
// by default, and either base can be dragged up/down along Oz to resize it.
export default function SymmetryCylindricalScene() {
  const point = useSymmetryStore((s) => s.point)
  const activePlane = useSymmetryStore((s) => s.activePlane)
  const tool = useSymmetryStore((s) => s.tool)
  const cylBottom = useSymmetryStore((s) => s.cylBottom)
  const cylTop = useSymmetryStore((s) => s.cylTop)
  // Stable getter for the live camera/size/canvas, read inside event handlers
  // — never put camera/size/gl themselves in an effect's deps (tears the
  // listeners down mid-gesture, see the round-9 note in CartesianAnimation).
  const get = useThree((s) => s.get)

  // Yellow grab handle on whichever base rim the hand is near; follows the
  // base while it's being dragged.
  const [hoverRim, setHoverRim] = useState(null)

  // Growing-in progress (0..1) for u_r, u_θ, u_z, animated one after another
  // on a fresh placement. A drag of M must NOT replay this — the vectors just
  // move with it, fully drawn.
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
  //   1. near M while a coordinate is armed ("Modifier r/θ/z") → constrained
  //      drag of M, no value shown;
  //   2. near a base's rim → drag that base along Oz;
  //   3. anything else → left alone for OrbitControls (normal orbit).
  useEffect(() => {
    if (tool !== 'hand') return
    const el = get().gl.domElement
    let drag = null // { mode: 'point', key, fixed } | { mode: 'bottom' | 'top', x, y }
    let rimHover = null

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

    const findRimHover = (camera, size, mx, my) => {
      const { cylBottom: bottom, cylTop: top } = useSymmetryStore.getState()
      let best = null
      let bestDist = RIM_PICK_PX
      for (const which of ['bottom', 'top']) {
        const z = which === 'bottom' ? bottom : top
        for (let i = 0; i < RIM_SAMPLES; i++) {
          const a = (i / RIM_SAMPLES) * Math.PI * 2
          const p = { x: CYL_RADIUS * Math.cos(a), y: CYL_RADIUS * Math.sin(a), z }
          const proj = projectToScreenPx(camera, toThree(p), size.width, size.height)
          const d = Math.hypot(proj.x - mx, proj.y - my)
          if (d < bestDist) {
            bestDist = d
            best = { point: p, which }
          }
        }
      }
      return best
    }

    const handleMove = (e) => {
      const { camera, size, mx, my } = localCoords(e)
      const store = useSymmetryStore.getState()

      if (drag) {
        const ray = screenPointToRay(camera, mx, my, size.width, size.height)
        if (drag.mode === 'point') {
          const next = cylindricalDrag(drag.key, drag.fixed, ray)
          if (next) store.dragUpdatePoint(next)
          return
        }
        const { t } = closestPointOnLineToRay(toThree({ x: drag.x, y: drag.y, z: 0 }), Z_DIR, ray.origin, ray.dir)
        let z
        if (drag.mode === 'bottom') {
          z = clamp(t, -BOUND_LIMIT, store.cylTop - MIN_HEIGHT)
          store.setCylBottom(z)
        } else {
          z = clamp(t, store.cylBottom + MIN_HEIGHT, BOUND_LIMIT)
          store.setCylTop(z)
        }
        setHoverRim({ point: { x: drag.x, y: drag.y, z }, which: drag.mode })
        return
      }

      rimHover = pointGrabbable(camera, size, mx, my) ? null : findRimHover(camera, size, mx, my)
      setHoverRim(rimHover)
    }

    const handleDown = (e) => {
      const { camera, size, mx, my } = localCoords(e)
      const store = useSymmetryStore.getState()
      if (pointGrabbable(camera, size, mx, my)) {
        drag = { mode: 'point', key: store.activeUpdateKey, fixed: { ...store.point } }
      } else if (rimHover) {
        drag = { mode: rimHover.which, x: rimHover.point.x, y: rimHover.point.y }
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
      setHoverRim(null)
    }
  }, [tool, get])

  const basis = point ? cylindricalBasis(point) : null
  const plane = point && activePlane ? CYLINDRICAL_PLANES.find((p) => p.key === activePlane) : null
  const placement = plane ? planePlacement(plane.key, point, cylBottom, cylTop) : null

  return (
    <group>
      <mesh position={[0, (cylBottom + cylTop) / 2, 0]} scale={[CYL_RADIUS, cylTop - cylBottom, CYL_RADIUS]}>
        <cylinderGeometry args={[1, 1, 1, 48, 1, true]} />
        <meshBasicMaterial color={LIGHT_BLUE} transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <Line points={circlePoints(CYL_RADIUS, cylBottom)} color="#ffffff" lineWidth={3} depthTest={false} renderOrder={4} />
      <Line points={circlePoints(CYL_RADIUS, cylTop)} color="#ffffff" lineWidth={3} depthTest={false} renderOrder={4} />

      {hoverRim && (
        <mesh position={toThree(hoverRim.point)} renderOrder={25}>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshBasicMaterial color={YELLOW} fog={false} depthTest={false} />
        </mesh>
      )}

      {point && basis && (
        <>
          <Vector3D origin={point} dir={basis.ur} length={VECTOR_LENGTH} progress={progress[0]} color={RED} label="ur" />
          <Vector3D origin={point} dir={basis.utheta} length={VECTOR_LENGTH} progress={progress[1]} color={RED} label="utheta" />
          <Vector3D origin={point} dir={basis.uz} length={VECTOR_LENGTH} progress={progress[2]} color={RED} label="uz" />
        </>
      )}

      {plane && basis && (
        <Plane3D dirA={basis[plane.a]} dirB={basis[plane.b]} color={PURPLE} {...placement} />
      )}
    </group>
  )
}
