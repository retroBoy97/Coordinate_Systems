import { useSceneStore } from '../store/useSceneStore'

export default function UpdateCoordinatesPanel({ coordinates }) {
  const activeUpdateKey = useSceneStore((s) => s.activeUpdateKey)
  const setActiveUpdateKey = useSceneStore((s) => s.setActiveUpdateKey)

  return (
    <div className="flex items-center gap-1 bg-black/70 backdrop-blur border border-white/15 rounded-full px-3 py-1.5">
      {coordinates.map(({ key, label }) => {
        const active = activeUpdateKey === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => setActiveUpdateKey(active ? null : key)}
            className={
              'px-3 py-1 text-sm rounded-full transition-colors ' +
              (active ? 'bg-white text-black' : 'text-white hover:bg-white/10')
            }
          >
            {label.replace('Obtenir', 'Modifier')}
          </button>
        )
      })}
    </div>
  )
}
