import SceneCanvas from '../scene/SceneCanvas'
import SphericalAnimation from '../scene/SphericalAnimation'
import Toolbar from '../components/Toolbar'
import HamburgerMenu from '../components/HamburgerMenu'
import CoordinateReadoutBox from '../components/CoordinateReadoutBox'
import { useSceneStore } from '../store/useSceneStore'

const COORDINATES = [
  { key: 'r', label: 'Obtenir r' },
  { key: 'theta', label: 'Obtenir θ' },
  { key: 'phi', label: 'Obtenir φ' },
]

export default function SphericalPage() {
  const point = useSceneStore((s) => s.point)
  const revealComplete = useSceneStore((s) => s.revealComplete)

  return (
    <div className="relative w-full h-full">
      <SceneCanvas>
        <SphericalAnimation />
      </SceneCanvas>
      <HamburgerMenu />
      <Toolbar coordinates={point && revealComplete ? COORDINATES : []} />
      <CoordinateReadoutBox />
    </div>
  )
}
