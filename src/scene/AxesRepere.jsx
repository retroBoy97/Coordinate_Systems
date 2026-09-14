import { useMemo } from 'react'
import { Line, Html } from '@react-three/drei'
import * as THREE from 'three'
import { GRID_MAX } from './coords'

const AXIS_COLOR = '#ffffff'
const ARROW_LENGTH = 0.45
const ARROW_RADIUS = 0.15

const AXES = [
  { dir: [0, 0, 1], label: 'x' }, // physics x -> three z
  { dir: [1, 0, 0], label: 'y' }, // physics y -> three x
  { dir: [0, 1, 0], label: 'z' }, // physics z -> three y
]

function Axis({ dir, label }) {
  const end = dir.map((d) => d * (GRID_MAX + 1))
  const negEnd = dir.map((d) => -d * (GRID_MAX + 1))
  const labelPos = dir.map((d) => d * (GRID_MAX + 1.8))

  const dirVec = useMemo(() => new THREE.Vector3(...dir), [dir])
  const arrowQuaternion = useMemo(() => {
    const q = new THREE.Quaternion()
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirVec)
    return q
  }, [dirVec])
  const arrowPos = useMemo(
    () => dirVec.clone().multiplyScalar(GRID_MAX + 1 - ARROW_LENGTH / 2),
    [dirVec]
  )

  return (
    <group>
      <Line points={[[0, 0, 0], end]} color={AXIS_COLOR} lineWidth={3.5} />
      <Line
        points={[[0, 0, 0], negEnd]}
        color={AXIS_COLOR}
        lineWidth={3.5}
        dashed
        dashSize={0.2}
        gapSize={0.15}
      />
      <mesh position={arrowPos} quaternion={arrowQuaternion}>
        <coneGeometry args={[ARROW_RADIUS, ARROW_LENGTH, 20]} />
        <meshBasicMaterial color={AXIS_COLOR} />
      </mesh>
      <Html position={labelPos} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
        <span className="text-white text-lg font-medium select-none">{label}</span>
      </Html>
    </group>
  )
}

export default function AxesRepere() {
  return (
    <group>
      {AXES.map((a) => (
        <Axis key={a.label} {...a} />
      ))}
    </group>
  )
}
