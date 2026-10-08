import SceneCanvas from '../scene/SceneCanvas'
import SymmetrySphericalScene from '../scene/SymmetrySphericalScene'
import { SPHERICAL_PLANES } from '../scene/symmetryPlanes'
import SymmetryToolbar from '../components/SymmetryToolbar'
import HamburgerMenu from '../components/HamburgerMenu'
import { useSymmetryStore } from '../store/useSymmetryStore'

const COORDINATES = [
  { key: 'r', label: 'Modifier r' },
  { key: 'theta', label: 'Modifier θ' },
  { key: 'phi', label: 'Modifier φ' },
]

export default function SymmetrySphericalPage() {
  return (
    <div className="relative w-full h-full">
      <SceneCanvas store={useSymmetryStore}>
        <SymmetrySphericalScene />
      </SceneCanvas>
      <HamburgerMenu />
      <SymmetryToolbar planes={SPHERICAL_PLANES} coordinates={COORDINATES} />
    </div>
  )
}
