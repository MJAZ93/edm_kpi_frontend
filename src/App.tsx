import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import DesignSystemPage from './pages/design-system/DesignSystemPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/design-system" element={<DesignSystemPage />} />
        <Route path="*" element={<Navigate to="/design-system" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
