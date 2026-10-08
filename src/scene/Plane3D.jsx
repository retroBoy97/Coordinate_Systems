import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { toThree } from './coords'

const DEFAULT_HALF = 6

// A finite rectangular patch of the plane through physics point `origin`,
// spanned by the two physics-space unit directions `dirA`/`dirB`: every point
// origin + a·dirA + b·dirB with a in `aRange` and b in `bRange`. Built as an
// explicit quad (not a rotated PlaneGeometry) so it works directly from two
// arbitrary orthonormal directions, and so the patch doesn't have to be
// centered on `origin` — the symmetry planes are centered on the axis/center
// of the distribution, not on M.
export default function Plane3D({
  origin,
  dirA,
  dirB,
  aRange = [-DEFAULT_HALF, DEFAULT_HALF],
  bRange = [-DEFAULT_HALF, DEFAULT_HALF],
  color,
  opacity = 1,
}) {
  const [a0, a1] = aRange
  const [b0, b1] = bRange
  const geometry = useMemo(() => {
    const o = new THREE.Vector3(origin.x, origin.y, origin.z)
    const a = new THREE.Vector3(dirA.x, dirA.y, dirA.z)
    const b = new THREE.Vector3(dirB.x, dirB.y, dirB.z)
    const corner = (sa, sb) => toThree(o.clone().addScaledVector(a, sa).addScaledVector(b, sb))
    const c1 = corner(a1, b1)
    const c2 = corner(a1, b0)
    const c3 = corner(a0, b0)
    const c4 = corner(a0, b1)

    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array([
      c1.x, c1.y, c1.z, c2.x, c2.y, c2.z, c3.x, c3.y, c3.z,
      c1.x, c1.y, c1.z, c3.x, c3.y, c3.z, c4.x, c4.y, c4.z,
    ])
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.computeVertexNormals()
    return { geo, corners: [c1, c2, c3, c4, c1] }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin.x, origin.y, origin.z, dirA.x, dirA.y, dirA.z, dirB.x, dirB.y, dirB.z, a0, a1, b0, b1])

  return (
    <group>
      <mesh geometry={geometry.geo} renderOrder={5}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.25 * opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <Line
        points={geometry.corners}
        color={color}
        lineWidth={2.5}
        transparent
        opacity={opacity}
        depthTest={false}
        renderOrder={6}
      />
    </group>
  )
}
