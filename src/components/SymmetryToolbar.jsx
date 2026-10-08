import { useEffect, useState } from 'react'
import { useSymmetryStore } from '../store/useSymmetryStore'
import VectorLabel from '../scene/VectorLabel'

function HandIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 12V5a1.5 1.5 0 0 1 3 0v7M14 12V6.5a1.5 1.5 0 0 1 3 0V13M17 9v-1a1.5 1.5 0 0 1 3 0v6a6 6 0 0 1-6 6h-2a6 6 0 0 1-5.2-3l-1.9-3.3a1.4 1.4 0 0 1 2.3-1.6L8 13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SelectIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 3l6 16 2.2-6.4L19.6 10 5 3z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 4v5h5M20 20v-5h-5M4.5 15a8 8 0 0 0 14.3 2.5M19.5 9A8 8 0 0 0 5.2 6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ToolButton({ active, disabled, onClick, title, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={
        'flex items-center justify-center w-9 h-9 rounded-full transition-colors ' +
        (active
          ? 'bg-white text-black'
          : disabled
            ? 'text-white/30'
            : 'text-white hover:bg-white/10')
      }
    >
      {children}
    </button>
  )
}

function PanelToggle({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'h-11 flex items-center px-4 text-sm rounded-full border backdrop-blur transition-colors whitespace-nowrap ' +
        (active
          ? 'bg-white text-black border-white'
          : 'text-white border-white/15 bg-black/70 hover:bg-white/10')
      }
    >
      {children}
    </button>
  )
}

function PlaneLabel({ a, b }) {
  return (
    <>
      (M, <VectorLabel name={a} />, <VectorLabel name={b} />)
    </>
  )
}

// `planes` is the CYLINDRICAL_PLANES/SPHERICAL_PLANES array from
// symmetryPlanes.js — {key, a, b} triples naming which two basis vectors span
// it. `coordinates` is the page's {key, label} list for "Modifier r/θ/…".
export default function SymmetryToolbar({ planes = [], coordinates = [] }) {
  const tool = useSymmetryStore((s) => s.tool)
  const setTool = useSymmetryStore((s) => s.setTool)
  const point = useSymmetryStore((s) => s.point)
  const reset = useSymmetryStore((s) => s.reset)
  const showPlanePanel = useSymmetryStore((s) => s.showPlanePanel)
  const setShowPlanePanel = useSymmetryStore((s) => s.setShowPlanePanel)
  const activePlane = useSymmetryStore((s) => s.activePlane)
  const setActivePlane = useSymmetryStore((s) => s.setActivePlane)
  const showUpdatePanel = useSymmetryStore((s) => s.showUpdatePanel)
  const setShowUpdatePanel = useSymmetryStore((s) => s.setShowUpdatePanel)
  const activeUpdateKey = useSymmetryStore((s) => s.activeUpdateKey)
  const setActiveUpdateKey = useSymmetryStore((s) => s.setActiveUpdateKey)
  const [warning, setWarning] = useState(false)

  useEffect(() => {
    if (!warning) return
    const t = setTimeout(() => setWarning(false), 2000)
    return () => clearTimeout(t)
  }, [warning])

  const handleSelectClick = () => {
    if (point) {
      setWarning(true)
      return
    }
    setTool('select')
  }

  return (
    <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 flex items-start gap-3">
      {/* Tools column */}
      <div className="pointer-events-auto flex flex-col items-center gap-2">
        <div className="h-11 flex items-center gap-1 bg-black/70 backdrop-blur border border-white/15 rounded-full px-1.5">
          <ToolButton active={tool === 'hand'} onClick={() => setTool('hand')} title="Orbiter">
            <HandIcon />
          </ToolButton>
          <ToolButton
            active={tool === 'select'}
            disabled={Boolean(point)}
            onClick={handleSelectClick}
            title="Placer un point"
          >
            <SelectIcon />
          </ToolButton>
          <ToolButton active={false} onClick={reset} title="Réinitialiser">
            <ResetIcon />
          </ToolButton>
        </div>
        {warning && (
          <div className="pointer-events-none text-sm font-medium text-red-500 bg-black/70 px-3 py-1 rounded-full">
            Réinitialisez d'abord
          </div>
        )}
      </div>

      {/* Draw-plane column */}
      {point && (
        <div className="pointer-events-auto flex flex-col items-center gap-2">
          <PanelToggle active={showPlanePanel} onClick={() => setShowPlanePanel(!showPlanePanel)}>
            Tracer un plan
          </PanelToggle>
          {showPlanePanel && (
            <div className="flex items-center gap-1 bg-black/70 backdrop-blur border border-white/15 rounded-full px-3 py-1.5">
              {planes.map(({ key, a, b }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActivePlane(key)}
                  className={
                    'px-3 py-1 text-sm rounded-full transition-colors whitespace-nowrap ' +
                    (activePlane === key ? 'bg-white text-black' : 'text-white hover:bg-white/10')
                  }
                >
                  <PlaneLabel a={a} b={b} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Update-coordinates column: arms a constrained drag of M, no value shown */}
      {point && (
        <div className="pointer-events-auto flex flex-col items-center gap-2">
          <PanelToggle active={showUpdatePanel} onClick={() => setShowUpdatePanel(!showUpdatePanel)}>
            Modifier les coordonnées
          </PanelToggle>
          {showUpdatePanel && (
            <div className="flex items-center gap-1 bg-black/70 backdrop-blur border border-white/15 rounded-full px-3 py-1.5">
              {coordinates.map(({ key, label }) => {
                const active = activeUpdateKey === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveUpdateKey(active ? null : key)}
                    className={
                      'px-3 py-1 text-sm rounded-full transition-colors whitespace-nowrap ' +
                      (active ? 'bg-white text-black' : 'text-white hover:bg-white/10')
                    }
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
