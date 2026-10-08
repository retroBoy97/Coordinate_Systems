import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const SYSTEMS = [
  { path: '/cartesien', label: 'Système de coordonnées cartésiennes' },
  { path: '/cylindrique', label: 'Système de coordonnées cylindriques' },
  { path: '/spherique', label: 'Système de coordonnées sphériques' },
]

const SYMMETRIES = [
  { path: '/symetrie/cylindrique', label: 'Symétrie cylindrique' },
  { path: '/symetrie/spherique', label: 'Symétrie sphérique' },
]

function MenuLink({ path, label, currentPath, onClick }) {
  return (
    <Link
      to={path}
      onClick={onClick}
      className={
        'block px-4 py-3 text-sm border-b border-white/10 last:border-b-0 transition-colors ' +
        (currentPath === path ? 'bg-white text-black' : 'text-white hover:bg-white/10')
      }
    >
      {label}
    </Link>
  )
}

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const close = () => setOpen(false)

  return (
    <div className="absolute top-4 left-4 z-10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex flex-col justify-center gap-1.5 w-10 h-10 rounded-full bg-black/70 backdrop-blur border border-white/15 items-center"
        title="Menu"
      >
        <span className="block w-4 h-[1.5px] bg-white" />
        <span className="block w-4 h-[1.5px] bg-white" />
        <span className="block w-4 h-[1.5px] bg-white" />
      </button>

      {open && (
        <div className="mt-2 w-72 bg-black/90 backdrop-blur border border-white/15 rounded-xl overflow-hidden">
          <MenuLink path="/" label="Accueil" currentPath={location.pathname} onClick={close} />
          <div className="px-4 pt-2 pb-1 text-xs uppercase tracking-wide text-white/40 border-t border-white/10">
            Coordonnées
          </div>
          {SYSTEMS.map((s) => (
            <MenuLink key={s.path} {...s} currentPath={location.pathname} onClick={close} />
          ))}
          <div className="px-4 pt-2 pb-1 text-xs uppercase tracking-wide text-white/40 border-t border-white/10">
            Symétrie
          </div>
          {SYMMETRIES.map((s) => (
            <MenuLink key={s.path} {...s} currentPath={location.pathname} onClick={close} />
          ))}
        </div>
      )}
    </div>
  )
}
