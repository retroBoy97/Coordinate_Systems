import SceneCanvas from '../scene/SceneCanvas'
import SymmetryCylindricalScene from '../scene/SymmetryCylindricalScene'
import { CYLINDRICAL_PLANES } from '../scene/symmetryPlanes'
import SymmetryToolbar from '../components/SymmetryToolbar'
import HamburgerMenu from '../components/HamburgerMenu'
import { useSymmetryStore } from '../store/useSymmetryStore'

const COORDINATES = [
  { key: 'r', label: 'Modifier r' },
  { key: 'theta', label: 'Modifier θ' },
  { key: 'z', label: 'Modifier z' },
]

export default function SymmetryCylindricalPage() {
  return (
    <div className="relative w-full h-full">
      <SceneCanvas store={useSymmetryStore}>
        <SymmetryCylindricalScene />
      </SceneCanvas>
      <HamburgerMenu />
      <SymmetryToolbar planes={CYLINDRICAL_PLANES} coordinates={COORDINATES} />
    </div>
  )
}
