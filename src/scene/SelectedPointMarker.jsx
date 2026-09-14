import { toThree } from './coords'
import { useSceneStore } from '../store/useSceneStore'

export default function SelectedPointMarker() {
  const point = useSceneStore((s) => s.point)
  if (!point) return null

  return (
    <mesh position={toThree(point)} renderOrder={20}>
      <sphereGeometry args={[0.14, 20, 20]} />
      <meshBasicMaterial color="#facc15" fog={false} depthTest={false} />
    </mesh>
  )
}
