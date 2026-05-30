import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Postulantes from './pages/Postulantes'
import NuevoPostulante from './pages/NuevoPostulante'
import EditarPostulante from './pages/EditarPostulante'
import Grupos from './pages/Grupos'
import DetalleGrupo from './pages/DetalleGrupo'
import Examenes from './pages/Examenes'
import Reportes from './pages/Reportes'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                       element={<Login />} />
        <Route path="/dashboard"              element={<Dashboard />} />
        <Route path="/postulantes"            element={<Postulantes />} />
        <Route path="/postulantes/nuevo"      element={<NuevoPostulante />} />
        <Route path="/postulantes/editar/:id" element={<EditarPostulante />} />
        <Route path="/grupos"                 element={<Grupos />} />
        <Route path="/grupos/:id"             element={<DetalleGrupo />} />
        <Route path="/examenes"               element={<Examenes />} />
        <Route path="/reportes"               element={<Reportes />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App