import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

function Dashboard() {
  const navigate = useNavigate()
  const usuario = JSON.parse(localStorage.getItem('usuario'))
  const [stats, setStats] = useState({
    total_inscritos: 0,
    total_aprobados: 0,
    total_reprobados: 0,
    total_grupos: 0
  })

  useEffect(() => {
    if (!usuario) navigate('/')
    fetchStats()
  }, [])

  if (!usuario) return null

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/reportes/dashboard')
      const data = await res.json()
      setStats(data)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <Navbar usuario={usuario} />
      <div className="container mt-4">

        {/* Bienvenida */}
        <div className="row mb-4">
          <div className="col text-center">
            <h4 className="fw-bold" style={{ color: '#003087' }}>
              Bienvenido, {usuario.nombre}
            </h4>
            <p className="text-muted">Rol: {usuario.rol} — Panel Administrativo CUP-FICCT</p>
          </div>
        </div>

        {/* Tarjetas estadísticas reales */}
        <div className="row g-4 mb-4">
          <div className="col-md-3">
            <div className="card text-white shadow" style={{ backgroundColor: '#003087' }}>
              <div className="card-body text-center">
                <i className="bi bi-people-fill fs-1"></i>
                <h2 className="fw-bold mt-2">{stats.total_inscritos}</h2>
                <p className="mb-0">Total Inscritos</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-white bg-success shadow">
              <div className="card-body text-center">
                <i className="bi bi-check-circle-fill fs-1"></i>
                <h2 className="fw-bold mt-2">{stats.total_aprobados}</h2>
                <p className="mb-0">Aprobados</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-white bg-danger shadow">
              <div className="card-body text-center">
                <i className="bi bi-x-circle-fill fs-1"></i>
                <h2 className="fw-bold mt-2">{stats.total_reprobados}</h2>
                <p className="mb-0">Reprobados</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-white bg-warning shadow">
              <div className="card-body text-center">
                <i className="bi bi-collection-fill fs-1"></i>
                <h2 className="fw-bold mt-2">{stats.total_grupos}</h2>
                <p className="mb-0">Grupos Habilitados</p>
              </div>
            </div>
          </div>
        </div>

        {/* Módulos */}
        <div className="row g-4">
          <div className="col-md-3">
            <div className="card shadow h-100">
              <div className="card-body text-center p-4">
                <i className="bi bi-person-lines-fill fs-1" style={{ color: '#003087' }}></i>
                <h5 className="fw-bold mt-3">Postulantes</h5>
                <p className="text-muted">Gestión de postulantes inscritos</p>
                <button className="btn text-white" style={{ backgroundColor: '#003087' }}
                  onClick={() => navigate('/postulantes')}>
                  <i className="bi bi-arrow-right-circle me-2"></i>Ver Postulantes
                </button>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card shadow h-100">
              <div className="card-body text-center p-4">
                <i className="bi bi-collection-fill fs-1" style={{ color: '#003087' }}></i>
                <h5 className="fw-bold mt-3">Grupos</h5>
                <p className="text-muted">Gestión de grupos y asignaciones</p>
                <button className="btn text-white" style={{ backgroundColor: '#003087' }}
                  onClick={() => navigate('/grupos')}>
                  <i className="bi bi-arrow-right-circle me-2"></i>Ver Grupos
                </button>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card shadow h-100">
              <div className="card-body text-center p-4">
                <i className="bi bi-journal-text fs-1" style={{ color: '#003087' }}></i>
                <h5 className="fw-bold mt-3">Exámenes</h5>
                <p className="text-muted">Registro de notas y evaluaciones</p>
                <button className="btn text-white" style={{ backgroundColor: '#003087' }}
                  onClick={() => navigate('/examenes')}>
                  <i className="bi bi-arrow-right-circle me-2"></i>Ver Exámenes
                </button>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card shadow h-100">
              <div className="card-body text-center p-4">
                <i className="bi bi-bar-chart-fill fs-1" style={{ color: '#003087' }}></i>
                <h5 className="fw-bold mt-3">Reportes</h5>
                <p className="text-muted">Estadísticas y reportes generales</p>
                <button className="btn text-white" style={{ backgroundColor: '#003087' }}
                  onClick={() => navigate('/reportes')}>
                  <i className="bi bi-arrow-right-circle me-2"></i>Ver Reportes
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Dashboard