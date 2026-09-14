import SceneCanvas from '../scene/SceneCanvas'
import CylindricalAnimation from '../scene/CylindricalAnimation'
import Toolbar from '../components/Toolbar'
import HamburgerMenu from '../components/HamburgerMenu'
import CoordinateReadoutBox from '../components/CoordinateReadoutBox'
import { useSceneStore } from '../store/useSceneStore'

const COORDINATES = [
  { key: 'r', label: 'Obtenir r' },
  { key: 'theta', label: 'Obtenir θ' },
  { key: 'z', label: 'Obtenir z' },
]

export default function CylindricalPage() {
  const point = useSceneStore((s) => s.point)
  const revealComplete = useSceneStore((s) => s.revealComplete)

  return (
    <div className="relative w-full h-full">
      <SceneCanvas>
        <CylindricalAnimation />
      </SceneCanvas>
      <HamburgerMenu />
      <Toolbar coordinates={point && revealComplete ? COORDINATES : []} />
      <CoordinateReadoutBox />
    </div>
  )
}
