import SceneCanvas from '../scene/SceneCanvas'
import CartesianAnimation from '../scene/CartesianAnimation'
import Toolbar from '../components/Toolbar'
import HamburgerMenu from '../components/HamburgerMenu'
import CoordinateReadoutBox from '../components/CoordinateReadoutBox'
import { useSceneStore } from '../store/useSceneStore'

const COORDINATES = [
  { key: 'x', label: 'Obtenir x' },
  { key: 'y', label: 'Obtenir y' },
  { key: 'z', label: 'Obtenir z' },
]

export default function CartesianPage() {
  const point = useSceneStore((s) => s.point)

  return (
    <div className="relative w-full h-full">
      <SceneCanvas>
        <CartesianAnimation />
      </SceneCanvas>
      <HamburgerMenu />
      <Toolbar coordinates={point ? COORDINATES : []} />
      <CoordinateReadoutBox />
    </div>
  )
}
