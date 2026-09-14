import { useEffect, useState } from 'react'
import { useSceneStore } from '../store/useSceneStore'
import GetCoordinatesPanel from './GetCoordinatesPanel'
import UpdateCoordinatesPanel from './UpdateCoordinatesPanel'

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
        'flex items-center justify-center w-10 h-10 rounded-full transition-colors ' +
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
        'px-4 py-1.5 text-sm rounded-full border backdrop-blur transition-colors whitespace-nowrap ' +
        (active
          ? 'bg-white text-black border-white'
          : 'text-white border-white/15 bg-black/70 hover:bg-white/10')
      }
    >
      {children}
    </button>
  )
}

export default function Toolbar({ coordinates = [] }) {
  const tool = useSceneStore((s) => s.tool)
  const setTool = useSceneStore((s) => s.setTool)
  const point = useSceneStore((s) => s.point)
  const reset = useSceneStore((s) => s.reset)
  const showGetPanel = useSceneStore((s) => s.showGetPanel)
  const setShowGetPanel = useSceneStore((s) => s.setShowGetPanel)
  const showUpdatePanel = useSceneStore((s) => s.showUpdatePanel)
  const setShowUpdatePanel = useSceneStore((s) => s.setShowUpdatePanel)
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

  const showToggles = point && coordinates.length > 0

  return (
    <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 flex items-start gap-3">
      {/* Tools column */}
      <div className="pointer-events-auto flex flex-col items-center gap-2">
        <div className="flex items-center gap-1 bg-black/70 backdrop-blur border border-white/15 rounded-full px-1.5 py-1.5">
          <ToolButton active={tool === 'hand'} onClick={() => setTool('hand')} title="Orbiter">
            <HandIcon />
          </ToolButton>
          <ToolButton
            active={tool === 'select'}
            disabled={Boolean(point)}
            onClick={handleSelectClick}
            title="Sélectionner un point"
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

      {/* Get-coordinates column */}
      {showToggles && (
        <div className="pointer-events-auto flex flex-col items-center gap-2">
          <PanelToggle active={showGetPanel} onClick={() => setShowGetPanel(!showGetPanel)}>
            Obtenir les coordonnées
          </PanelToggle>
          {showGetPanel && <GetCoordinatesPanel coordinates={coordinates} />}
        </div>
      )}

      {/* Update-coordinates column */}
      {showToggles && (
        <div className="pointer-events-auto flex flex-col items-center gap-2">
          <PanelToggle active={showUpdatePanel} onClick={() => setShowUpdatePanel(!showUpdatePanel)}>
            Modifier les coordonnées
          </PanelToggle>
          {showUpdatePanel && <UpdateCoordinatesPanel coordinates={coordinates} />}
        </div>
      )}
    </div>
  )
}
