import { Grid } from '@react-three/drei'

const SIZE = 10

// Reference grid on the physics Oxy plane (three.js Y=0), a fixed 10x10
// squares, styled after References/Grid.png: uniform thin white lines on
// black.
export default function FloorGrid() {
  return (
    <Grid
      args={[SIZE, SIZE]}
      cellSize={1}
      cellThickness={1}
      cellColor="#666666"
      sectionSize={1}
      sectionThickness={1}
      sectionColor="#666666"
      fadeDistance={40}
      fadeStrength={1}
      infiniteGrid={false}
      side={2}
    />
  )
}
