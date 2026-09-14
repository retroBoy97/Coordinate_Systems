import { useEffect, useRef, useState } from 'react'
import { Line, Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { useSceneStore } from '../store/useSceneStore'
import { toThree, toPhysics } from './coords'
import { arcPoints, azimuthalArcPoints, normalizedAngle, midpoint, formatAngle } from './arc'
import CurvedArrow from './CurvedArrow'
import { screenPointToRay, closestPointOnLineToRay, rayPlaneIntersect, projectToScreenPx } from './drag'
import { RED, PURPLE, PINK } from './colors'

const COLOR_FOR_KEY = { r: RED, theta: PURPLE, phi: PINK }
const GRAB_THRESHOLD_PX = 40
const LIGHT_BLUE = '#00ccff'
const OX_DIR = new THREE.Vector3(1, 0, 0)
const OZ_DIR = new THREE.Vector3(0, 0, 1)
const OZ_AXIS = new THREE.Vector3(0, 0, 1)

// The horizontal latitude circle through M (References/Sphere.png).
function latitudeCirclePoints(point, progress = 1, segments = 64) {
  const radius = Math.hypot(point.x, point.y)
  const startAngle = Math.atan2(point.y, point.x)
  const n = Math.max(1, Math.round(segments * progress))
  const pts = []
  for (let i = 0; i <= n; i++) {
    const a = startAngle + (i / segments) * Math.PI * 2
    pts.push({ x: radius * Math.cos(a), y: radius * Math.sin(a), z: point.z })
  }
  return pts
}

// The dotted meridian great-circle used by "Modifier θ": centered on O,
// radius r, lying in the vertical plane (OZM) that contains Oz and the
// current OM azimuth. point(a) = r*(sin(a)*radialDir + cos(a)*Oz), so a=theta
// lands exactly on M and a=0 is the north pole.
function meridianCirclePoints(r, phi0, segments = 96) {
  const radialDir = { x: Math.cos(phi0), y: Math.sin(phi0), z: 0 }
  const pts = []
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2
    pts.push({
      x: r * Math.sin(a) * radialDir.x,
      y: r * Math.sin(a) * radialDir.y,
      z: r * Math.cos(a),
    })
  }
  return pts
}

// The final (fully-drawn), unanimated construction for a key + point.
function finalState(point, key) {
  const O = { x: 0, y: 0, z: 0 }
  const r = Math.hypot(point.x, point.y, point.z)
  const color = COLOR_FOR_KEY[key]
  if (key === 'r') {
    return {
      red: [{ from: O, to: point, t: 1 }],
      purple: [],
      arc: null,
      meridian: null,
      markers: [],
      label: { text: `r = ${r.toFixed(2)}`, pos: midpoint(O, point), color },
      color,
    }
  }
  if (key === 'theta') {
    const thetaPolar = r > 0 ? Math.acos(point.z / r) : 0
    const mDir = r > 0 ? new THREE.Vector3(point.x, point.y, point.z).normalize() : OZ_DIR
    const arcRadius = Math.max(0.3, Math.min(1, r * 0.85))
    const phi0 = Math.atan2(point.y, point.x)
    return {
      red: [],
      purple: [
        { from: O, to: point, t: 1, dashed: true },
        { from: O, to: { x: 0, y: 0, z: Math.abs(point.z) }, t: 1 },
      ],
      arc: arcPoints(OZ_DIR, mDir, arcRadius, 1),
      meridian: r > 0 ? meridianCirclePoints(r, phi0) : null,
      markers: [],
      label: { text: `θ = ${formatAngle(thetaPolar)}`, pos: midpoint(O, point), color },
      color,
    }
  }
  // phi
  const phi = normalizedAngle(point.y, point.x)
  const P = { x: point.x, y: point.y, z: 0 }
  const arcRadius = Math.max(0.3, Math.min(1, Math.hypot(point.x, point.y) * 0.85))
  return {
    red: [{ from: point, to: P, t: 1 }],
    purple: [
      { from: O, to: P, t: 1 },
      { from: O, to: { x: Math.abs(point.x), y: 0, z: 0 }, t: 1 },
    ],
    arc: azimuthalArcPoints(OX_DIR, OZ_AXIS, phi, arcRadius, 1),
    meridian: null,
    markers: [P],
    label: { text: `φ = ${formatAngle(phi)}`, pos: { ...midpoint(O, P), z: 0.3 }, color },
    color,
  }
}

export default function SphericalAnimation() {
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

  const [sphereRadius, setSphereRadius] = useState(0)
  const [showSphere, setShowSphere] = useState(false)
  const [showLatitude, setShowLatitude] = useState(false)
  const [latitudeProgress, setLatitudeProgress] = useState(0)

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
  const [uMeridian, setUMeridian] = useState(null)
  const [uMarkers, setUMarkers] = useState([])
  const [uLabel, setULabel] = useState(null)
  const [uColor, setUColor] = useState(RED)

  const r = point ? Math.hypot(point.x, point.y, point.z) : 0
  const thetaPolar = point && r > 0 ? Math.acos(point.z / r) : 0
  const phi = point ? normalizedAngle(point.y, point.x) : 0

  // Reveal: sphere grows 0 -> r, then the latitude circle draws. Skips the
  // tween while a "Modifier" drag is active (would restart every frame) and
  // instead tracks r/point live.
  useEffect(() => {
    setShowSphere(false)
    setShowLatitude(false)
    setLatitudeProgress(0)
    setSphereRadius(0)
    if (!point) return
    setShowSphere(true)

    if (activeUpdateKey) {
      setSphereRadius(r)
      setRevealComplete(true)
      setShowLatitude(true)
      setLatitudeProgress(1)
      return
    }
    const proxy = { r: 0 }
    const tl = gsap.timeline({
      onComplete: () => {
        setRevealComplete(true)
        setShowLatitude(true)
        const latProxy = { p: 0 }
        gsap.to(latProxy, {
          p: 1,
          duration: 1.3,
          ease: 'power1.inOut',
          onUpdate: () => setLatitudeProgress(latProxy.p),
        })
      },
    })
    tl.to(proxy, {
      r,
      duration: 1,
      ease: 'power2.out',
      onUpdate: () => setSphereRadius(proxy.r),
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
    const P = { x: point.x, y: point.y, z: 0 }
    const color = COLOR_FOR_KEY[activeCoordinate]
    setGetColor(color)
    const tl = gsap.timeline()

    if (activeCoordinate === 'r') {
      const proxy = { t: 0 }
      tl.to(proxy, {
        t: 1,
        duration: 0.7,
        onUpdate: () => setRedSegments([{ from: O, to: point, t: proxy.t }]),
        onComplete: () => {
          const text = `r = ${r.toFixed(2)}`
          setLabel({ text, pos: midpoint(O, point), color })
          setCoordinateLabel({ text, color })
        },
      })
    } else if (activeCoordinate === 'theta') {
      const arcRadius = Math.max(0.3, Math.min(1, r * 0.85))
      const mDir = r > 0 ? new THREE.Vector3(point.x, point.y, point.z).normalize() : OZ_DIR

      const omProxy = { t: 0 }
      tl.to(omProxy, {
        t: 1,
        duration: 0.6,
        onUpdate: () => setPurpleSegments([{ from: O, to: point, t: omProxy.t, dashed: true }]),
      })
      tl.call(
        () =>
          setPurpleSegments((prev) => [prev[0], { from: O, to: { x: 0, y: 0, z: Math.abs(point.z) }, t: 1 }]),
        null,
        '+=0.5'
      )
      const arcProxy = { p: 0 }
      tl.to(
        arcProxy,
        {
          p: 1,
          duration: 0.8,
          onUpdate: () => setArc(arcPoints(OZ_DIR, mDir, arcRadius, arcProxy.p)),
          onComplete: () => {
            const text = `θ = ${formatAngle(thetaPolar)}`
            setLabel({ text, pos: midpoint(O, point), color })
            setCoordinateLabel({ text, color })
          },
        },
        '+=0.5'
      )
    } else if (activeCoordinate === 'phi') {
      const arcRadius = Math.max(0.3, Math.min(1, Math.hypot(point.x, point.y) * 0.85))

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
          onUpdate: () => setArc(azimuthalArcPoints(OX_DIR, OZ_AXIS, phi, arcRadius, arcProxy.p)),
          onComplete: () => {
            const text = `φ = ${formatAngle(phi)}`
            setLabel({ text, pos: { ...midpoint(O, P), z: 0.3 }, color })
            setCoordinateLabel({ text, color })
          },
        },
        '+=0.5'
      )
    }
    return () => tl.kill()
  }, [point, activeCoordinate, requestId, setCoordinateLabel])

  // "Modifier r/θ/φ": show the current construction instantly the moment a
  // key is armed, before any drag.
  useEffect(() => {
    if (!activeUpdateKey || !point) {
      setURed([])
      setUPurple([])
      setUArc(null)
      setUMeridian(null)
      setUMarkers([])
      setULabel(null)
      return
    }
    const state = finalState(point, activeUpdateKey)
    setURed(state.red)
    setUPurple(state.purple)
    setUArc(state.arc)
    setUMeridian(state.meridian)
    setUMarkers(state.markers)
    setULabel(state.label)
    setUColor(state.color)
    setCoordinateLabel({ text: state.label.text, color: state.color })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUpdateKey, point === null])

  // Drag-to-update: r along the OM ray, φ around the horizontal plane at the
  // current z, θ within the vertical plane containing Oz and the current
  // azimuth. A drag only engages when the pointerdown lands near the point's
  // current on-screen position; otherwise the event is left alone so
  // OrbitControls handles it as a normal orbit/rotate gesture.
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
      setUMeridian(state.meridian)
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
      const r0 = Math.hypot(fixed.x, fixed.y, fixed.z)

      if (activeUpdateKey === 'r') {
        const dir = r0 > 0 ? { x: fixed.x / r0, y: fixed.y / r0, z: fixed.z / r0 } : { x: 0, y: 0, z: 1 }
        const lineOrigin = toThree({ x: 0, y: 0, z: 0 })
        const lineDir = toThree(dir)
        const { t } = closestPointOnLineToRay(lineOrigin, lineDir, ray.origin, ray.dir)
        const newR = Math.max(0, Math.min(10, t))
        applyFinal({ x: dir.x * newR, y: dir.y * newR, z: dir.z * newR })
      } else if (activeUpdateKey === 'phi') {
        const planePoint = toThree({ x: 0, y: 0, z: fixed.z })
        const planeNormal = toThree({ x: 0, y: 0, z: 1 })
        const hit = rayPlaneIntersect(ray.origin, ray.dir, planePoint, planeNormal)
        if (!hit) return
        const hitPhysics = toPhysics(hit)
        const newPhi = normalizedAngle(hitPhysics.y, hitPhysics.x)
        const rho = Math.hypot(fixed.x, fixed.y)
        applyFinal({ x: rho * Math.cos(newPhi), y: rho * Math.sin(newPhi), z: fixed.z })
      } else if (activeUpdateKey === 'theta') {
        const fixedPhi = normalizedAngle(fixed.y, fixed.x)
        const radialDir = { x: Math.cos(fixedPhi), y: Math.sin(fixedPhi), z: 0 }
        const planeNormal = toThree({ x: -Math.sin(fixedPhi), y: Math.cos(fixedPhi), z: 0 })
        const planePoint = toThree({ x: 0, y: 0, z: 0 })
        const hit = rayPlaneIntersect(ray.origin, ray.dir, planePoint, planeNormal)
        if (!hit) return
        const hitPhysics = toPhysics(hit)
        const u = Math.max(0, hitPhysics.x * radialDir.x + hitPhysics.y * radialDir.y)
        const v = hitPhysics.z
        const newTheta = Math.atan2(u, v)
        applyFinal({
          x: r0 * Math.sin(newTheta) * radialDir.x,
          y: r0 * Math.sin(newTheta) * radialDir.y,
          z: r0 * Math.cos(newTheta),
        })
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
      {showSphere && point && (
        <mesh scale={[sphereRadius, sphereRadius, sphereRadius]}>
          <sphereGeometry args={[1, 32, 24]} />
          <meshBasicMaterial color={LIGHT_BLUE} transparent opacity={0.15} depthWrite={false} />
        </mesh>
      )}

      {showLatitude && point && (
        <Line
          points={latitudeCirclePoints(point, latitudeProgress).map((p) => toThree(p))}
          color={LIGHT_BLUE}
          lineWidth={2}
          dashed
          dashSize={0.12}
          gapSize={0.08}
          transparent
          opacity={0.9}
        />
      )}

      {uMeridian && (
        <Line
          points={uMeridian.map((p) => toThree(p))}
          color={uColor}
          lineWidth={2}
          dashed
          dashSize={0.06}
          gapSize={0.09}
          transparent
          opacity={0.85}
          depthTest={false}
        />
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
        return seg.dashed ? (
          <Line
            key={`p${i}`}
            points={[from, current]}
            color={getColor}
            lineWidth={4}
            dashed
            dashSize={0.15}
            gapSize={0.08}
            depthTest={false}
            renderOrder={10}
          />
        ) : (
          <Line key={`p${i}`} points={[from, current]} color={getColor} lineWidth={4} depthTest={false} renderOrder={10} />
        )
      })}
      {uPurple.map((seg, i) => {
        if (!seg) return null
        const from = toThree(seg.from)
        const to = toThree(seg.to)
        const current = from.clone().lerp(to, seg.t)
        return seg.dashed ? (
          <Line
            key={`up${i}`}
            points={[from, current]}
            color={uColor}
            lineWidth={4}
            dashed
            dashSize={0.15}
            gapSize={0.08}
            depthTest={false}
            renderOrder={10}
          />
        ) : (
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
