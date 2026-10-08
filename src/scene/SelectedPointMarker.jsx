import { toThree } from './coords'
import { useSceneStore } from '../store/useSceneStore'

// See PickableLattice.jsx / SceneCanvas.jsx: `store` defaults to the
// coordinates-page store but can be swapped for another with the same shape.
export default function SelectedPointMarker({ store = useSceneStore }) {
  const point = store((s) => s.point)
  if (!point) return null

  return (
    <mesh position={toThree(point)} renderOrder={20}>
      <sphereGeometry args={[0.14, 20, 20]} />
      <meshBasicMaterial color="#facc15" fog={false} depthTest={false} />
    </mesh>
  )
}
