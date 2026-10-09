// Qué página se muestra en cada URL.
import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { BilleteraPage } from './pages/BilleteraPage'
import { DetallePage } from './pages/DetallePage'
import { ListadoPage } from './pages/ListadoPage'
import { LoginPage } from './pages/LoginPage'
import { PerfilPage } from './pages/PerfilPage'
import { RegistroPage } from './pages/RegistroPage'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<ListadoPage />} />
        <Route path="/items/:id" element={<DetallePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegistroPage />} />
        <Route path="/perfil" element={<PerfilPage />} />
        <Route path="/billetera" element={<BilleteraPage />} />
      </Route>
    </Routes>
  )
}
