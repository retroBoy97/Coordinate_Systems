import { useEffect, useRef, useState } from 'react'
import { Line, Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useSceneStore } from '../store/useSceneStore'
import { toThree } from './coords'
import { formatNumber } from './arc'
import { screenPointToRay, closestPointOnLineToRay, projectToScreenPx } from './drag'
import { RED, PURPLE, PINK } from './colors'

const COLOR_FOR_KEY = { x: RED, y: PURPLE, z: PINK }
const GRAB_THRESHOLD_PX = 40

const AXIS_DIR = {
  x: { x: 1, y: 0, z: 0 },
  y: { x: 0, y: 1, z: 0 },
  z: { x: 0, y: 0, z: 1 },
}

function LabelSpan({ text, color }) {
  return (
    <span
      className="text-lg font-bold bg-black/90 px-2 py-1 rounded border whitespace-nowrap"
      style={{ color, borderColor: color }}
    >
      {text}
    </span>
  )
}

// The final (fully-drawn) construction for a given key and point — used both
// as the "Obtenir" GSAP timeline's end state and, unanimated, by "Modifier".
function finalState(point, key) {
  const { x, y, z } = point
  const H = { x, y, z: 0 }
  const color = COLOR_FOR_KEY[key]
  if (key === 'x') {
    return {
      segments: [
        { from: point, to: H, t: 1 },
        { from: H, to: { x, y: 0, z: 0 }, t: 1 },
      ],
      markers: [H],
      label: { text: `x = ${formatNumber(x)}`, pos: { x, y: 0, z: 0 }, color },
      color,
    }
  }
  if (key === 'y') {
    return {
      segments: [
        { from: point, to: H, t: 1 },
        { from: H, to: { x: 0, y, z: 0 }, t: 1 },
      ],
      markers: [H],
      label: { text: `y = ${formatNumber(y)}`, pos: { x: 0, y, z: 0 }, color },
      color,
    }
  }
  return {
    segments: [{ from: point, to: { x: 0, y: 0, z }, t: 1 }],
    markers: [],
    label: { text: `z = ${formatNumber(z)}`, pos: { x: 0, y: 0, z }, color },
    color,
  }
}

export default function CartesianAnimation() {
  const point = useSceneStore((s) => s.point)
  const activeCoordinate = useSceneStore((s) => s.activeCoordinate)
  const requestId = useSceneStore((s) => s.requestId)
  const activeUpdateKey = useSceneStore((s) => s.activeUpdateKey)
  const dragUpdatePoint = useSceneStore((s) => s.dragUpdatePoint)
  const setCoordinateLabel = useSceneStore((s) => s.setCoordinateLabel)
  const setOrbitSuspended = useSceneStore((s) => s.setOrbitSuspended)
  const three = useThree()
  // useThree() returns a fresh-enough object that including it (or its
  // camera/size/gl fields) in an effect's dependency array can tear the
  // effect down mid-drag (confirmed: it happened after the very first
  // pointermove of a drag, resetting the local `dragging` flag and silently
  // killing the rest of the gesture). Read the latest values through a ref
  // instead, updated on every render, so the drag effect only depends on
  // things that actually need to restart it.
  const threeRef = useRef(three)
  threeRef.current = three
  // Same reasoning for `point`: the drag effect intentionally does not
  // depend on it (a dependency change would tear the listeners down mid
  // gesture), but handleDown needs the truly current point — both to seed
  // `fixed` correctly on a second grab, and to hit-test the click against
  // the point's live screen position.
  const pointRef = useRef(point)
  pointRef.current = point

  // "Obtenir" (get) flow — animated, own state.
  const [segments, setSegments] = useState([])
  const [markers, setMarkers] = useState([])
  const [label, setLabel] = useState(null)
  const tlRef = useRef(null)

  // "Modifier" (update/drag) flow — instant, independent state so both can
  // be visible at once if the user has both panels open.
  const [updateSegments, setUpdateSegments] = useState([])
  const [updateMarkers, setUpdateMarkers] = useState([])
  const [updateLabel, setUpdateLabel] = useState(null)
  const [updateColor, setUpdateColor] = useState(RED)

  useEffect(() => {
    tlRef.current?.kill()
    setSegments([])
    setMarkers([])
    setLabel(null)
    if (!point || !activeCoordinate) return

    const { x, y, z } = point
    const H = { x, y, z: 0 }
    const color = COLOR_FOR_KEY[activeCoordinate]
    let steps
    if (activeCoordinate === 'x') {
      steps = [
        { from: point, to: H, marker: H },
        { from: H, to: { x, y: 0, z: 0 }, label: `x = ${formatNumber(x)}` },
      ]
    } else if (activeCoordinate === 'y') {
      steps = [
        { from: point, to: H, marker: H },
        { from: H, to: { x: 0, y, z: 0 }, label: `y = ${formatNumber(y)}` },
      ]
    } else {
      steps = [{ from: point, to: { x: 0, y: 0, z }, label: `z = ${formatNumber(z)}` }]
    }

    const tl = gsap.timeline()
    steps.forEach((step, i) => {
      const proxy = { t: 0 }
      tl.to(
        proxy,
        {
          t: 1,
          duration: 0.8,
          ease: 'power2.out',
          onUpdate: () => {
            setSegments((prev) => {
              const next = prev.slice(0, i)
              next[i] = { from: step.from, to: step.to, t: proxy.t }
              return next
            })
          },
          onComplete: () => {
            if (step.marker) setMarkers((prev) => [...prev, step.marker])
            if (step.label) {
              setLabel({ text: step.label, pos: step.to, color })
              setCoordinateLabel({ text: step.label, color })
            }
          },
        },
        i === 0 ? 0 : '+=0.15'
      )
    })
    tlRef.current = tl
    return () => tl.kill()
  }, [point, activeCoordinate, requestId, setCoordinateLabel])

  // "Modifier x/y/z": show the current construction instantly the moment a
  // key is armed (before any drag), so there's something to grab.
  useEffect(() => {
    if (!activeUpdateKey || !point) {
      setUpdateSegments([])
      setUpdateMarkers([])
      setUpdateLabel(null)
      return
    }
    const state = finalState(point, activeUpdateKey)
    setUpdateSegments(state.segments)
    setUpdateMarkers(state.markers)
    setUpdateLabel(state.label)
    setUpdateColor(state.color)
    setCoordinateLabel({ text: state.label.text, color: state.color })
    // Only re-run when the key changes (or a fresh point is placed), not on
    // every point update — the drag handler below keeps this in sync live.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUpdateKey, point === null])

  // Drag-to-update: constrained to a straight line along the active axis,
  // the other two coordinates held fixed at their value when the drag started.
  // A drag only engages when the pointerdown lands near the point's current
  // on-screen position; otherwise the event is left alone so OrbitControls
  // handles it as a normal orbit/rotate gesture.
  useEffect(() => {
    if (!activeUpdateKey) return
    let dragging = false
    let fixed = null

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
      const dir = AXIS_DIR[activeUpdateKey]
      const lineOrigin = toThree(fixed)
      const lineDir = toThree(dir)
      const { t } = closestPointOnLineToRay(lineOrigin, lineDir, ray.origin, ray.dir)
      // Clamp the resulting coordinate value, never the raw delta `t` — a
      // fixed value far from 0 needs a large |t| to reach a valid target, so
      // clamping t itself truncates the drag short of where it should land.
      const newPoint = {
        x: fixed.x + dir.x * t,
        y: fixed.y + dir.y * t,
        z: fixed.z + dir.z * t,
      }
      newPoint.x = Math.max(-8, Math.min(8, newPoint.x))
      newPoint.y = Math.max(-8, Math.min(8, newPoint.y))
      newPoint.z = Math.max(-8, Math.min(8, newPoint.z))
      dragUpdatePoint(newPoint)
      const state = finalState(newPoint, activeUpdateKey)
      setUpdateSegments(state.segments)
      setUpdateMarkers(state.markers)
      setUpdateLabel(state.label)
      setUpdateColor(state.color)
      setCoordinateLabel({ text: state.label.text, color: state.color })
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
      {segments.map((seg, i) => {
        const from = toThree(seg.from)
        const to = toThree(seg.to)
        const current = from.clone().lerp(to, seg.t)
        return (
          <Line
            key={i}
            points={[from, current]}
            color={COLOR_FOR_KEY[activeCoordinate]}
            lineWidth={4}
            dashed
            dashSize={0.15}
            gapSize={0.08}
          />
        )
      })}
      {markers.map((m, i) => (
        <mesh key={`m${i}`} position={toThree(m)}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color={COLOR_FOR_KEY[activeCoordinate]} />
        </mesh>
      ))}
      {label && (
        <Html position={toThree(label.pos)} center style={{ pointerEvents: 'none' }}>
          <LabelSpan text={label.text} color={label.color} />
        </Html>
      )}

      {updateSegments.map((seg, i) => {
        const from = toThree(seg.from)
        const to = toThree(seg.to)
        const current = from.clone().lerp(to, seg.t)
        return (
          <Line
            key={`u${i}`}
            points={[from, current]}
            color={updateColor}
            lineWidth={4}
            dashed
            dashSize={0.15}
            gapSize={0.08}
          />
        )
      })}
      {updateMarkers.map((m, i) => (
        <mesh key={`um${i}`} position={toThree(m)}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color={updateColor} />
        </mesh>
      ))}
      {updateLabel && (
        <Html position={toThree(updateLabel.pos)} center style={{ pointerEvents: 'none' }}>
          <LabelSpan text={updateLabel.text} color={updateLabel.color} />
        </Html>
      )}
    </group>
  )
}
