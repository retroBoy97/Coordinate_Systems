import * as THREE from 'three'
import { Line } from '@react-three/drei'
import { toThree } from './coords'

const UP = new THREE.Vector3(0, 1, 0)

// Renders an arc (physics-space points) as a curved arrow: the arc itself
// plus a small cone at its tip, oriented tangent to the direction of travel
// (estimated from the last two points, so it works for any arc regardless of
// which axis/method generated it).
export default function CurvedArrow({ points, color, lineWidth = 3, depthTest = true }) {
  if (!points || points.length < 2) return null
  const three = points.map((p) => toThree(p))
  const tip = three[three.length - 1]
  const prev = three[three.length - 2]
  const tangent = tip.clone().sub(prev)
  const renderOrder = depthTest ? 0 : 10
  if (tangent.lengthSq() < 1e-8) {
    return <Line points={three} color={color} lineWidth={lineWidth} depthTest={depthTest} renderOrder={renderOrder} />
  }
  tangent.normalize()
  const quat = new THREE.Quaternion().setFromUnitVectors(UP, tangent)

  return (
    <group>
      <Line points={three} color={color} lineWidth={lineWidth} depthTest={depthTest} renderOrder={renderOrder} />
      <mesh position={tip} quaternion={quat} renderOrder={renderOrder}>
        <coneGeometry args={[0.07, 0.2, 12]} />
        <meshBasicMaterial color={color} depthTest={depthTest} />
      </mesh>
    </group>
  )
}
