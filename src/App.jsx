import { useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import CartesianPage from './pages/CartesianPage'
import CylindricalPage from './pages/CylindricalPage'
import SphericalPage from './pages/SphericalPage'
import SymmetryCylindricalPage from './pages/SymmetryCylindricalPage'
import SymmetrySphericalPage from './pages/SymmetrySphericalPage'
import { useSceneStore } from './store/useSceneStore'
import { useSymmetryStore } from './store/useSymmetryStore'

function ResetOnNavigate() {
  const location = useLocation()

  useEffect(() => {
    useSceneStore.getState().reset()
    useSymmetryStore.getState().reset()
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
          <Route path="/" element={<LandingPage />} />
          <Route path="/cartesien" element={<CartesianPage />} />
          <Route path="/cylindrique" element={<CylindricalPage />} />
          <Route path="/spherique" element={<SphericalPage />} />
          <Route path="/symetrie" element={<Navigate to="/symetrie/cylindrique" replace />} />
          <Route path="/symetrie/cylindrique" element={<SymmetryCylindricalPage />} />
          <Route path="/symetrie/spherique" element={<SymmetrySphericalPage />} />
        </Routes>
      </div>
      <Analytics />
    </BrowserRouter>
  )
}
