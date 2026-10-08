import { Link } from 'react-router-dom'
import LandingHero from '../scene/LandingHero'
import HamburgerMenu from '../components/HamburgerMenu'

function NavButton({ to, children }) {
  return (
    <Link
      to={to}
      className="h-12 flex items-center px-8 text-base font-medium rounded-full border border-white/15 bg-black/70 backdrop-blur text-white hover:bg-white/10 transition-colors"
    >
      {children}
    </Link>
  )
}

export default function LandingPage() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-6 px-4 py-6">
      <HamburgerMenu />

      <div className="text-center">
        <h1 className="text-white text-2xl font-semibold">Systèmes de coordonnées</h1>
        <p className="text-white/60 text-sm mt-1">Visualisation interactive pour l'électrostatique</p>
      </div>

      <div className="w-full max-w-[420px] aspect-square rounded-2xl overflow-hidden border border-white/15">
        <LandingHero />
      </div>

      <div className="flex items-center gap-4">
        <NavButton to="/cartesien">Coordonnées</NavButton>
        <NavButton to="/symetrie/cylindrique">Symétrie</NavButton>
      </div>
    </div>
  )
}
