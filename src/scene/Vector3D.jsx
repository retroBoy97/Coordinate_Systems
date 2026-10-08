import { useMemo } from 'react'
import { Line, Html } from '@react-three/drei'
import * as THREE from 'three'
import { toThree } from './coords'
import VectorLabel from './VectorLabel'

const CONE_RADIUS = 0.12
const CONE_LENGTH = 0.32
const UP = new THREE.Vector3(0, 1, 0)

// A straight arrow from `origin` (physics point) along unit physics direction
// `dir`, of physics-space `length`, that can be animated growing outward by
// varying `progress` (0..1) — used for the "drawn one by one" basis vectors.
// `label` (e.g. 'ur') annotates the arrow with its name once it's fully grown.
export default function Vector3D({ origin, dir, length = 1.6, progress = 1, color, label }) {
  const originV = useMemo(() => toThree(origin), [origin.x, origin.y, origin.z])
  const dirV = useMemo(() => toThree(dir).normalize(), [dir.x, dir.y, dir.z])
  const tip = useMemo(
    () => originV.clone().addScaledVector(dirV, length * progress),
    [originV, dirV, length, progress]
  )
  const labelPos = useMemo(() => originV.clone().addScaledVector(dirV, length * 1.18), [originV, dirV, length])
  const quaternion = useMemo(() => new THREE.Quaternion().setFromUnitVectors(UP, dirV), [dirV])

  if (progress <= 0) return null

  return (
    <group>
      <Line points={[originV, tip]} color={color} lineWidth={4} depthTest={false} renderOrder={15} />
      <mesh position={tip} quaternion={quaternion} renderOrder={15}>
        <coneGeometry args={[CONE_RADIUS, CONE_LENGTH, 16]} />
        <meshBasicMaterial color={color} depthTest={false} fog={false} />
      </mesh>
      {label && progress > 0.9 && (
        <Html position={labelPos} center style={{ pointerEvents: 'none' }}>
          <span
            className="text-sm font-bold bg-black/90 px-1.5 py-0.5 rounded border whitespace-nowrap"
            style={{ color, borderColor: color }}
          >
            <VectorLabel name={label} />
          </span>
        </Html>
      )}
    </group>
  )
}
