import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing           from './pages/Landing'
import Login             from './pages/Login'
import Registro          from './pages/Registro'
import Dashboard         from './pages/Dashboard'
import DocenteDashboard  from './pages/DocenteDashboard'
import Postulantes       from './pages/Postulantes'
import NuevoPostulante   from './pages/NuevoPostulante'
import EditarPostulante  from './pages/EditarPostulante'
import Grupos            from './pages/Grupos'
import DetalleGrupo      from './pages/DetalleGrupo'
import Examenes          from './pages/Examenes'
import Reportes          from './pages/Reportes'
import Docentes          from './pages/Docentes'
import Pagos             from './pages/Pagos'
import Inscripciones     from './pages/Inscripciones'
import RecuperarPassword    from './pages/RecuperarPassword'
import EstudianteDashboard  from './pages/EstudianteDashboard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                       element={<Landing />} />
        <Route path="/login"                  element={<Login />} />
        <Route path="/registro"               element={<Registro />} />
        <Route path="/dashboard"              element={<Dashboard />} />
        <Route path="/docente-dashboard"      element={<DocenteDashboard />} />
        <Route path="/postulantes"            element={<Postulantes />} />
        <Route path="/postulantes/nuevo"      element={<NuevoPostulante />} />
        <Route path="/postulantes/editar/:id" element={<EditarPostulante />} />
        <Route path="/grupos"                 element={<Grupos />} />
        <Route path="/grupos/:id"             element={<DetalleGrupo />} />
        <Route path="/examenes"               element={<Examenes />} />
        <Route path="/reportes"               element={<Reportes />} />
        <Route path="/docentes"               element={<Docentes />} />
        <Route path="/pagos"                  element={<Pagos />} />
        <Route path="/inscripciones"          element={<Inscripciones />} />
        <Route path="/recuperar-password"     element={<RecuperarPassword />} />
        <Route path="/estudiante-dashboard"   element={<EstudianteDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
