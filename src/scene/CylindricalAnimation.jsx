import { useEffect, useRef, useState } from 'react'
import { Line, Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { useSceneStore } from '../store/useSceneStore'
import { toThree, toPhysics } from './coords'
import { azimuthalArcPoints, normalizedAngle, midpoint, formatAngle, formatNumber } from './arc'
import CurvedArrow from './CurvedArrow'
import { screenPointToRay, closestPointOnLineToRay, rayPlaneIntersect, projectToScreenPx } from './drag'
import { RED, PURPLE, PINK } from './colors'

const COLOR_FOR_KEY = { r: RED, theta: PURPLE, z: PINK }
const GRAB_THRESHOLD_PX = 40
const LIGHT_BLUE = '#00ccff'
const OZ_AXIS = new THREE.Vector3(0, 0, 1)
const OX_DIR = new THREE.Vector3(1, 0, 0)

// A horizontal rim circle directly in three.js space (matching the reveal
// cylinder's own local orientation), at three-Y height `y`, given radius.
function circlePoints(radius, y, segments = 64) {
  const pts = []
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2
    pts.push(new THREE.Vector3(radius * Math.cos(a), y, radius * Math.sin(a)))
  }
  return pts
}

// The final (fully-drawn), unanimated construction for a key + point — used
// both to seed "Modifier" the instant a key is armed and to keep it in sync
// during the drag.
function finalState(point, key) {
  const O = { x: 0, y: 0, z: 0 }
  const P = { x: point.x, y: point.y, z: 0 }
  const H = { x: 0, y: 0, z: point.z }
  const r = Math.hypot(point.x, point.y)
  const color = COLOR_FOR_KEY[key]
  if (key === 'z' || key === 'r') {
    const text = key === 'z' ? `z = ${formatNumber(point.z)}` : `r = ${r.toFixed(2)}`
    return {
      red: [{ from: point, to: H, t: 1 }],
      purple: [],
      arc: null,
      markers: [H],
      label: { text, pos: midpoint(point, H), color },
      color,
    }
  }
  // theta
  const theta = normalizedAngle(point.y, point.x)
  const arcRadius = Math.max(0.3, Math.min(1, r * 0.85))
  return {
    red: [{ from: point, to: P, t: 1 }],
    purple: [
      { from: O, to: P, t: 1 },
      { from: O, to: { x: Math.abs(point.x), y: 0, z: 0 }, t: 1 },
    ],
    arc: azimuthalArcPoints(OX_DIR, OZ_AXIS, theta, arcRadius, 1),
    markers: [P],
    label: { text: `θ = ${formatAngle(theta)}`, pos: { ...midpoint(O, P), z: 0.35 }, color },
    color,
  }
}

export default function CylindricalAnimation() {
  const point = useSceneStore((s) => s.point)
  const activeCoordinate = useSceneStore((s) => s.activeCoordinate)
  const requestId = useSceneStore((s) => s.requestId)
  const setRevealComplete = useSceneStore((s) => s.setRevealComplete)
  const activeUpdateKey = useSceneStore((s) => s.activeUpdateKey)
  const dragUpdatePoint = useSceneStore((s) => s.dragUpdatePoint)
  const setCoordinateLabel = useSceneStore((s) => s.setCoordinateLabel)
  const setOrbitSuspended = useSceneStore((s) => s.setOrbitSuspended)
  const three = useThree()
  // See CartesianAnimation.jsx for why: useThree()'s object can change
  // identity often enough that depending on camera/size/gl directly tears
  // down the drag effect mid-gesture. Read the latest via a ref instead.
  const threeRef = useRef(three)
  threeRef.current = three
  const pointRef = useRef(point)
  pointRef.current = point

  const [cylRadius, setCylRadius] = useState(0)
  const [showCylinder, setShowCylinder] = useState(false)

  // "Obtenir" (get) flow.
  const [redSegments, setRedSegments] = useState([])
  const [purpleSegments, setPurpleSegments] = useState([])
  const [arc, setArc] = useState(null)
  const [markers, setMarkers] = useState([])
  const [label, setLabel] = useState(null)
  const [getColor, setGetColor] = useState(RED)

  // "Modifier" (update/drag) flow — independent state.
  const [uRed, setURed] = useState([])
  const [uPurple, setUPurple] = useState([])
  const [uArc, setUArc] = useState(null)
  const [uMarkers, setUMarkers] = useState([])
  const [uLabel, setULabel] = useState(null)
  const [uColor, setUColor] = useState(RED)

  const r = point ? Math.hypot(point.x, point.y) : 0
  const theta = point ? normalizedAngle(point.y, point.x) : 0

  // Reveal: a light-blue semi-transparent cylinder grows from radius 0 until
  // its rim reaches M. Re-tracks `r`/`point.z` live (e.g. while "Modifier r"
  // or "Modifier z" is dragging) without replaying the growth animation once
  // it has already completed once for this point.
  useEffect(() => {
    setShowCylinder(false)
    setCylRadius(0)
    if (!point) return
    setShowCylinder(true)

    if (activeUpdateKey) {
      setCylRadius(r)
      setRevealComplete(true)
      return
    }
    const proxy = { r: 0 }
    const tl = gsap.timeline({ onComplete: () => setRevealComplete(true) })
    tl.to(proxy, {
      r,
      duration: 1,
      ease: 'power2.out',
      onUpdate: () => setCylRadius(proxy.r),
    })
    return () => tl.kill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [point, activeUpdateKey])

  // Per-button constructions ("Obtenir").
  useEffect(() => {
    setRedSegments([])
    setPurpleSegments([])
    setArc(null)
    setMarkers([])
    setLabel(null)
    if (!point || !activeCoordinate) return

    const O = { x: 0, y: 0, z: 0 }
    const H = { x: 0, y: 0, z: point.z }
    const P = { x: point.x, y: point.y, z: 0 }
    const color = COLOR_FOR_KEY[activeCoordinate]
    setGetColor(color)
    const tl = gsap.timeline()

    if (activeCoordinate === 'z' || activeCoordinate === 'r') {
      const text = activeCoordinate === 'z' ? `z = ${formatNumber(point.z)}` : `r = ${r.toFixed(2)}`
      const proxy = { t: 0 }
      tl.to(proxy, {
        t: 1,
        duration: 0.7,
        onUpdate: () => setRedSegments([{ from: point, to: H, t: proxy.t }]),
        onComplete: () => {
          setMarkers([H])
          setLabel({ text, pos: midpoint(point, H), color })
          setCoordinateLabel({ text, color })
        },
      })
    } else if (activeCoordinate === 'theta') {
      const arcRadius = Math.max(0.3, Math.min(1, r * 0.85))

      const dropProxy = { t: 0 }
      tl.to(dropProxy, {
        t: 1,
        duration: 0.6,
        onUpdate: () => setRedSegments([{ from: point, to: P, t: dropProxy.t }]),
        onComplete: () => setMarkers([P]),
      })
      const opProxy = { t: 0 }
      tl.to(opProxy, {
        t: 1,
        duration: 0.6,
        onUpdate: () => setPurpleSegments([{ from: O, to: P, t: opProxy.t }]),
      })
      tl.call(
        () => setPurpleSegments((prev) => [prev[0], { from: O, to: { x: Math.abs(point.x), y: 0, z: 0 }, t: 1 }]),
        null,
        '+=0.5'
      )
      const arcProxy = { p: 0 }
      tl.to(
        arcProxy,
        {
          p: 1,
          duration: 0.8,
          onUpdate: () => setArc(azimuthalArcPoints(OX_DIR, OZ_AXIS, theta, arcRadius, arcProxy.p)),
          onComplete: () => {
            const text = `θ = ${formatAngle(theta)}`
            setLabel({ text, pos: { ...midpoint(O, P), z: 0.35 }, color })
            setCoordinateLabel({ text, color })
          },
        },
        '+=0.5'
      )
    }
    return () => tl.kill()
  }, [point, activeCoordinate, requestId, setCoordinateLabel])

  // "Modifier r/θ/z": show the current construction instantly the moment a
  // key is armed, before any drag.
  useEffect(() => {
    if (!activeUpdateKey || !point) {
      setURed([])
      setUPurple([])
      setUArc(null)
      setUMarkers([])
      setULabel(null)
      return
    }
    const state = finalState(point, activeUpdateKey)
    setURed(state.red)
    setUPurple(state.purple)
    setUArc(state.arc)
    setUMarkers(state.markers)
    setULabel(state.label)
    setUColor(state.color)
    setCoordinateLabel({ text: state.label.text, color: state.color })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUpdateKey, point === null])

  // Drag-to-update: r and z are constrained to a line, θ to the top-rim
  // circle of the cylinder (found via ray-plane intersection, then angle). A
  // drag only engages when the pointerdown lands near the point's current
  // on-screen position; otherwise the event is left alone so OrbitControls
  // handles it as a normal orbit/rotate gesture.
  useEffect(() => {
    if (!activeUpdateKey) return
    let dragging = false
    let fixed = null

    const applyFinal = (newPoint) => {
      dragUpdatePoint(newPoint)
      const state = finalState(newPoint, activeUpdateKey)
      setURed(state.red)
      setUPurple(state.purple)
      setUArc(state.arc)
      setUMarkers(state.markers)
      setULabel(state.label)
      setUColor(state.color)
      setCoordinateLabel({ text: state.label.text, color: state.color })
    }

    const handleDown = (e) => {
      const cur = pointRef.current
      if (!cur) return
      const { camera, size, gl } = threeRef.current
      const rect = gl.domElement.getBoundingClientRect()
      const clickPx = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      const pointPx = projectToScreenPx(camera, toThree(cur), size.width, size.height)
      const dist = Math.hypot(clickPx.x - pointPx.x, clickPx.y - pointPx.y)
      if (dist > GRAB_THRESHOLD_PX) return

      e.stopImmediatePropagation()
      dragging = true
      fixed = { ...cur }
      setOrbitSuspended(true)
      gl.domElement.setPointerCapture?.(e.pointerId)
    }
    const handleMove = (e) => {
      if (!dragging || !fixed) return
      const { camera, size, gl } = threeRef.current
      const rect = gl.domElement.getBoundingClientRect()
      const ray = screenPointToRay(camera, e.clientX - rect.left, e.clientY - rect.top, size.width, size.height)

      if (activeUpdateKey === 'z') {
        const lineOrigin = toThree(fixed)
        const lineDir = toThree({ x: 0, y: 0, z: 1 })
        const { t } = closestPointOnLineToRay(lineOrigin, lineDir, ray.origin, ray.dir)
        const newZ = Math.max(-8, Math.min(8, fixed.z + t))
        applyFinal({ x: fixed.x, y: fixed.y, z: newZ })
      } else if (activeUpdateKey === 'r') {
        const fixedTheta = normalizedAngle(fixed.y, fixed.x)
        const radialDir = { x: Math.cos(fixedTheta), y: Math.sin(fixedTheta), z: 0 }
        const lineOrigin = toThree({ x: 0, y: 0, z: fixed.z })
        const lineDir = toThree(radialDir)
        const { t } = closestPointOnLineToRay(lineOrigin, lineDir, ray.origin, ray.dir)
        const newR = Math.max(0, Math.min(10, t))
        applyFinal({ x: radialDir.x * newR, y: radialDir.y * newR, z: fixed.z })
      } else if (activeUpdateKey === 'theta') {
        const planePoint = toThree({ x: 0, y: 0, z: fixed.z })
        const planeNormal = toThree({ x: 0, y: 0, z: 1 })
        const hit = rayPlaneIntersect(ray.origin, ray.dir, planePoint, planeNormal)
        if (!hit) return
        const hitPhysics = toPhysics(hit)
        const newTheta = normalizedAngle(hitPhysics.y, hitPhysics.x)
        const r0 = Math.hypot(fixed.x, fixed.y)
        applyFinal({ x: r0 * Math.cos(newTheta), y: r0 * Math.sin(newTheta), z: fixed.z })
      }
    }
    const handleUp = () => {
      if (dragging) setOrbitSuspended(false)
      dragging = false
    }

    const el = threeRef.current.gl.domElement
    el.addEventListener('pointerdown', handleDown)
    el.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      el.removeEventListener('pointerdown', handleDown)
      el.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [activeUpdateKey, dragUpdatePoint, setCoordinateLabel, setOrbitSuspended])

  return (
    <group>
      {showCylinder && point && (
        <>
          <mesh position={[0, point.z / 2, 0]} scale={[cylRadius, Math.abs(point.z) || 0.0001, cylRadius]}>
            <cylinderGeometry args={[1, 1, 1, 48, 1, false]} />
            <meshBasicMaterial
              color={LIGHT_BLUE}
              transparent
              opacity={0.15}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <Line
            points={circlePoints(cylRadius, 0)}
            color="#ffffff"
            lineWidth={5}
            depthTest={false}
            renderOrder={10}
          />
          <Line
            points={circlePoints(cylRadius, point.z)}
            color="#ffffff"
            lineWidth={5}
            depthTest={false}
            renderOrder={10}
          />
        </>
      )}

      {redSegments.map((seg, i) => {
        if (!seg) return null
        const from = toThree(seg.from)
        const to = toThree(seg.to)
        const current = from.clone().lerp(to, seg.t)
        return (
          <Line
            key={`r${i}`}
            points={[from, current]}
            color={getColor}
            lineWidth={4}
            dashed
            dashSize={0.15}
            gapSize={0.08}
            depthTest={false}
            renderOrder={10}
          />
        )
      })}
      {uRed.map((seg, i) => {
        if (!seg) return null
        const from = toThree(seg.from)
        const to = toThree(seg.to)
        const current = from.clone().lerp(to, seg.t)
        return (
          <Line
            key={`ur${i}`}
            points={[from, current]}
            color={uColor}
            lineWidth={4}
            dashed
            dashSize={0.15}
            gapSize={0.08}
            depthTest={false}
            renderOrder={10}
          />
        )
      })}

      {purpleSegments.map((seg, i) => {
        if (!seg) return null
        const from = toThree(seg.from)
        const to = toThree(seg.to)
        const current = from.clone().lerp(to, seg.t)
        return (
          <Line key={`p${i}`} points={[from, current]} color={getColor} lineWidth={4} depthTest={false} renderOrder={10} />
        )
      })}
      {uPurple.map((seg, i) => {
        if (!seg) return null
        const from = toThree(seg.from)
        const to = toThree(seg.to)
        const current = from.clone().lerp(to, seg.t)
        return (
          <Line key={`up${i}`} points={[from, current]} color={uColor} lineWidth={4} depthTest={false} renderOrder={10} />
        )
      })}

      {arc && <CurvedArrow points={arc} color={getColor} depthTest={false} />}
      {uArc && <CurvedArrow points={uArc} color={uColor} depthTest={false} />}

      {markers.map((m, i) => (
        <mesh key={`mk${i}`} position={toThree(m)} renderOrder={10}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color={getColor} depthTest={false} />
        </mesh>
      ))}
      {uMarkers.map((m, i) => (
        <mesh key={`umk${i}`} position={toThree(m)} renderOrder={10}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color={uColor} depthTest={false} />
        </mesh>
      ))}

      {label && (
        <Html position={toThree(label.pos)} center style={{ pointerEvents: 'none' }}>
          <span
            className="text-lg font-bold bg-black/90 px-2 py-1 rounded border whitespace-nowrap"
            style={{ color: label.color, borderColor: label.color }}
          >
            {label.text}
          </span>
        </Html>
      )}
      {uLabel && (
        <Html position={toThree(uLabel.pos)} center style={{ pointerEvents: 'none' }}>
          <span
            className="text-lg font-bold bg-black/90 px-2 py-1 rounded border whitespace-nowrap"
            style={{ color: uLabel.color, borderColor: uLabel.color }}
          >
            {uLabel.text}
          </span>
        </Html>
      )}
    </group>
  )
}
