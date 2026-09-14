import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const SYSTEMS = [
  { path: '/cartesien', label: 'Système de coordonnées cartésiennes' },
  { path: '/cylindrique', label: 'Système de coordonnées cylindriques' },
  { path: '/spherique', label: 'Système de coordonnées sphériques' },
]

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="absolute top-4 left-4 z-10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex flex-col justify-center gap-1.5 w-10 h-10 rounded-full bg-black/70 backdrop-blur border border-white/15 items-center"
        title="Changer de système"
      >
        <span className="block w-4 h-[1.5px] bg-white" />
        <span className="block w-4 h-[1.5px] bg-white" />
        <span className="block w-4 h-[1.5px] bg-white" />
      </button>

      {open && (
        <div className="mt-2 w-72 bg-black/90 backdrop-blur border border-white/15 rounded-xl overflow-hidden">
          {SYSTEMS.map((s) => (
            <Link
              key={s.path}
              to={s.path}
              onClick={() => setOpen(false)}
              className={
                'block px-4 py-3 text-sm border-b border-white/10 last:border-b-0 transition-colors ' +
                (location.pathname === s.path
                  ? 'bg-white text-black'
                  : 'text-white hover:bg-white/10')
              }
            >
              {s.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
