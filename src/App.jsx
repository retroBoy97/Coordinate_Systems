import { useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import CartesianPage from './pages/CartesianPage'
import CylindricalPage from './pages/CylindricalPage'
import SphericalPage from './pages/SphericalPage'
import { useSceneStore } from './store/useSceneStore'

function ResetOnNavigate() {
  const location = useLocation()
  const reset = useSceneStore((s) => s.reset)

  useEffect(() => {
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="w-screen h-screen bg-black overflow-hidden">
        <ResetOnNavigate />
        <Routes>
          <Route path="/" element={<Navigate to="/cartesien" replace />} />
          <Route path="/cartesien" element={<CartesianPage />} />
          <Route path="/cylindrique" element={<CylindricalPage />} />
          <Route path="/spherique" element={<SphericalPage />} />
        </Routes>
      </div>
      <Analytics />
    </BrowserRouter>
  )
}
