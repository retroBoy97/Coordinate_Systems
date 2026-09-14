import { useSceneStore } from '../store/useSceneStore'

export default function GetCoordinatesPanel({ coordinates }) {
  const requestCoordinate = useSceneStore((s) => s.requestCoordinate)

  return (
    <div className="flex items-center gap-1 bg-black/70 backdrop-blur border border-white/15 rounded-full px-3 py-1.5">
      {coordinates.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => requestCoordinate(key)}
          className="px-3 py-1 text-sm text-white rounded-full hover:bg-white/10 transition-colors"
        >
          {label}
        </button>
      ))}
    </div>
  )
}
