import { useSceneStore } from '../store/useSceneStore'

export default function CoordinateReadoutBox() {
  const coordinateLabel = useSceneStore((s) => s.coordinateLabel)
  if (!coordinateLabel) return null

  return (
    <div className="pointer-events-none absolute top-4 right-4">
      <div
        className="bg-black/80 border-2 rounded-lg px-5 py-2"
        style={{ borderColor: coordinateLabel.color }}
      >
        <span className="text-xl font-semibold whitespace-nowrap" style={{ color: coordinateLabel.color }}>
          {coordinateLabel.text}
        </span>
      </div>
    </div>
  )
}
