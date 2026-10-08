import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import AxesRepere from './AxesRepere'
import FloorGrid from './FloorGrid'

// A small, ambient, auto-rotating repère used as the landing page's hero
// visual — reuses the same axes/grid as the real pages so it reads as "this
// app, at a glance" rather than a generic decorative graphic.
export default function LandingHero() {
  return (
    <Canvas camera={{ position: [10, 8, 12], fov: 50 }}>
      <color attach="background" args={['#000000']} />
      <AxesRepere />
      <FloorGrid />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={1.2}
        target={[0, 0, 0]}
        makeDefault
      />
    </Canvas>
  )
}
