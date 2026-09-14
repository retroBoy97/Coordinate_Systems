import { useEffect, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import { useSceneStore } from '../store/useSceneStore'
import AxesRepere from './AxesRepere'
import FloorGrid from './FloorGrid'
import PickableLattice from './PickableLattice'
import SelectedPointMarker from './SelectedPointMarker'

const INITIAL_POSITION = new THREE.Vector3(16, 13, 19)
const INITIAL_TARGET = new THREE.Vector3(0, 0, 0)

function Controls({ tool, orbitSuspended }) {
  const controlsRef = useRef()
  const { camera } = useThree()
  const cameraResetToken = useSceneStore((s) => s.cameraResetToken)

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return

    const startPos = camera.position.clone()
    const startTarget = controls.target.clone()
    const proxy = { t: 0 }
    const tl = gsap.to(proxy, {
      t: 1,
      duration: 1,
      ease: 'power2.inOut',
      onUpdate: () => {
        camera.position.lerpVectors(startPos, INITIAL_POSITION, proxy.t)
        controls.target.lerpVectors(startTarget, INITIAL_TARGET, proxy.t)
        controls.update()
      },
    })
    return () => tl.kill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraResetToken])

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={tool === 'hand' && !orbitSuspended}
      enableDamping={false}
      makeDefault
      target={[0, 0, 0]}
    />
  )
}

export default function SceneCanvas({ children }) {
  const tool = useSceneStore((s) => s.tool)
  const activeUpdateKey = useSceneStore((s) => s.activeUpdateKey)
  const orbitSuspended = useSceneStore((s) => s.orbitSuspended)
  const [pointerDown, setPointerDown] = useState(false)

  // Centralized cursor: 'grab'/'grabbing' whenever the user can drag
  // something (orbiting with the hand tool, or a coordinate armed for
  // drag-to-update), 'crosshair' while placing a point, otherwise default.
  useEffect(() => {
    const handleDown = () => setPointerDown(true)
    const handleUp = () => setPointerDown(false)
    window.addEventListener('pointerdown', handleDown)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointerdown', handleDown)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [])

  let cursor = 'auto'
  if (tool === 'select') cursor = 'crosshair'
  else if (tool === 'hand' || activeUpdateKey) cursor = pointerDown ? 'grabbing' : 'grab'

  return (
    <Canvas
      style={{ position: 'absolute', inset: 0, cursor }}
      camera={{ position: [16, 13, 19], fov: 50 }}
    >
      <color attach="background" args={['#000000']} />
      <AxesRepere />
      <FloorGrid />
      <PickableLattice />
      <SelectedPointMarker />
      {children}
      <Controls tool={tool} orbitSuspended={orbitSuspended} />
    </Canvas>
  )
}
