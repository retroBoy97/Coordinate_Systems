import { useEffect, useMemo, useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore } from '../store/useSceneStore'
import { toThree, GRID_MAX } from './coords'

// `store` defaults to the coordinates-page store but can be swapped (e.g. the
// symmetry pages pass useSymmetryStore) — see SceneCanvas.jsx.

// Max on-screen distance (px) from the cursor to a lattice point for it to be
// pickable. Deliberately NOT implemented as a 3D raycast against a fixed
// world-space hit-sphere per point: under perspective, a fixed world-space
// radius gives points near the camera a much larger *apparent* (on-screen)
// hit area than points far from it, so a nearby point can steal clicks aimed
// at a farther one even when the click looks precise on screen. Measuring
// distance in screen space instead gives every point the same effective
// tolerance regardless of depth.
const MAX_PICK_PX = 28

// A lattice of raycast targets spanning the whole space for initial point
// placement. The student rotates the camera (hand tool), then switches to
// the select tool and clicks the point nearest the cursor on screen — only
// that single nearest point renders as a hover preview, never a dot cloud.
export default function PickableLattice({ store = useSceneStore }) {
  const tool = store((s) => s.tool)
  const point = store((s) => s.point)
  const setPoint = store((s) => s.setPoint)
  const { camera, size, gl } = useThree()
  const [hoverIndex, setHoverIndex] = useState(null)

  const points = useMemo(() => {
    const pts = []
    for (let x = -GRID_MAX; x <= GRID_MAX; x++) {
      for (let y = -GRID_MAX; y <= GRID_MAX; y++) {
        for (let z = -GRID_MAX; z <= GRID_MAX; z++) {
          if (x === 0 && y === 0 && z === 0) continue
          pts.push({ x, y, z })
        }
      }
    }
    return pts
  }, [])

  const active = tool === 'select' && !point

  useEffect(() => {
    if (!active) {
      setHoverIndex(null)
      return
    }

    const v = new THREE.Vector3()
    const findNearest = (clientX, clientY) => {
      const rect = gl.domElement.getBoundingClientRect()
      const mx = clientX - rect.left
      const my = clientY - rect.top
      let bestIdx = -1
      let bestDist = MAX_PICK_PX
      let bestCamDist = Infinity
      for (let i = 0; i < points.length; i++) {
        v.copy(toThree(points[i]))
        const camDist = v.distanceTo(camera.position)
        v.project(camera)
        if (v.z > 1 || v.z < -1) continue // behind/outside camera clip range
        const px = ((v.x + 1) / 2) * size.width
        const py = ((1 - v.y) / 2) * size.height
        const d = Math.hypot(px - mx, py - my)
        if (d < bestDist - 1e-6 || (Math.abs(d - bestDist) < 1e-6 && camDist < bestCamDist)) {
          bestDist = d
          bestIdx = i
          bestCamDist = camDist
        }
      }
      return bestIdx
    }

    const handleMove = (e) => setHoverIndex(findNearest(e.clientX, e.clientY))
    const handleClick = (e) => {
      const idx = findNearest(e.clientX, e.clientY)
      if (idx >= 0) setPoint(points[idx])
    }

    const el = gl.domElement
    el.addEventListener('pointermove', handleMove)
    el.addEventListener('click', handleClick)
    return () => {
      el.removeEventListener('pointermove', handleMove)
      el.removeEventListener('click', handleClick)
    }
  }, [active, points, camera, size, gl, setPoint])

  const hovered = hoverIndex != null && hoverIndex >= 0 ? points[hoverIndex] : null
  if (!active || !hovered) return null

  return (
    <mesh position={toThree(hovered)} renderOrder={10}>
      <sphereGeometry args={[0.09, 16, 16]} />
      <meshBasicMaterial color="#ffffff" depthTest={false} />
    </mesh>
  )
}
