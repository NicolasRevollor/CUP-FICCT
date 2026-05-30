import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

function Grupos() {
  const navigate = useNavigate()
  const usuario = JSON.parse(localStorage.getItem('usuario'))
  const [grupos, setGrupos] = useState([])
  const [loading, setLoading] = useState(false)
  const [filtroTurno, setFiltroTurno] = useState('TODOS')

  useEffect(() => {
    if (!usuario) navigate('/')
  }, [])

  if (!usuario) return null

  const fetchGrupos = async () => {
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/api/grupos')
      const data = await res.json()
      setGrupos(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGrupos()
  }, [])

  const gruposFiltrados = filtroTurno === 'TODOS'
    ? grupos
    : grupos.filter(g => g.turno === filtroTurno)

  const getBadgeTurno = (turno) => {
    const badges = {
      'MAÑANA': 'warning',
      'TARDE':  'primary',
      'NOCHE':  'dark'
    }
    return badges[turno] || 'secondary'
  }

  const getIconTurno = (turno) => {
    const icons = {
      'MAÑANA': 'bi-sunrise-fill',
      'TARDE':  'bi-sun-fill',
      'NOCHE':  'bi-moon-stars-fill'
    }
    return icons[turno] || 'bi-circle'
  }

  const getPorcentaje = (actual, maximo) => {
    return Math.round((actual / maximo) * 100)
  }

  return (
    <div>
      <Navbar usuario={usuario} />
      <div className="container mt-4">

        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-bold" style={{ color: '#003087' }}>
              <i className="bi bi-collection-fill me-2"></i>
              Grupos del CUP
            </h4>
            <p className="text-muted mb-0">Total: {grupos.length} grupos habilitados</p>
          </div>
          <button className="btn text-white" style={{ backgroundColor: '#003087' }}
            onClick={() => navigate('/dashboard')}>
            <i className="bi bi-arrow-left me-2"></i>
            Volver
          </button>
        </div>

        {/* Estadísticas por turno */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div className="card border-warning shadow-sm">
              <div className="card-body text-center">
                <i className="bi bi-sunrise-fill fs-2 text-warning"></i>
                <h5 className="fw-bold mt-2">Mañana</h5>
                <p className="mb-0">{grupos.filter(g => g.turno === 'MAÑANA').length} grupos</p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-primary shadow-sm">
              <div className="card-body text-center">
                <i className="bi bi-sun-fill fs-2 text-primary"></i>
                <h5 className="fw-bold mt-2">Tarde</h5>
                <p className="mb-0">{grupos.filter(g => g.turno === 'TARDE').length} grupos</p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-dark shadow-sm">
              <div className="card-body text-center">
                <i className="bi bi-moon-stars-fill fs-2"></i>
                <h5 className="fw-bold mt-2">Noche</h5>
                <p className="mb-0">{grupos.filter(g => g.turno === 'NOCHE').length} grupos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtro por turno */}
        <div className="mb-4">
          <div className="btn-group">
            {['TODOS', 'MAÑANA', 'TARDE', 'NOCHE'].map(turno => (
              <button
                key={turno}
                className={`btn ${filtroTurno === turno ? 'text-white' : 'btn-outline-secondary'}`}
                style={filtroTurno === turno ? { backgroundColor: '#003087' } : {}}
                onClick={() => setFiltroTurno(turno)}
              >
                {turno}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla de grupos */}
        <div className="card shadow">
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center p-5">
                <div className="spinner-border" style={{ color: '#003087' }}></div>
                <p className="mt-2">Cargando...</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead style={{ backgroundColor: '#003087', color: 'white' }}>
                    <tr>
                      <th>#</th>
                      <th>Grupo</th>
                      <th>Turno</th>
                      <th>Aula</th>
                      <th>Horario</th>
                      <th>Ocupación</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gruposFiltrados.map((g) => (
                      <tr key={g.idgrupo}>
                        <td>{g.idgrupo}</td>
                        <td className="fw-semibold">{g.nombregrupo}</td>
                        <td>
                          <span className={`badge bg-${getBadgeTurno(g.turno)}`}>
                            <i className={`bi ${getIconTurno(g.turno)} me-1`}></i>
                            {g.turno}
                          </span>
                        </td>
                        <td>{g.aula}</td>
                        <td>
                          <small>
                            {g.horarioinicio?.slice(0,5)} - {g.horariofin?.slice(0,5)}
                          </small>
                        </td>
                        <td style={{ minWidth: '150px' }}>
                          <div className="d-flex align-items-center gap-2">
                            <div className="progress flex-grow-1" style={{ height: '8px' }}>
                              <div
                                className={`progress-bar bg-${getPorcentaje(g.cantidadestudiante, g.capacidadmaxima) >= 90 ? 'danger' : 'success'}`}
                                style={{ width: `${getPorcentaje(g.cantidadestudiante, g.capacidadmaxima)}%` }}
                              ></div>
                            </div>
                            <small>{g.cantidadestudiante}/{g.capacidadmaxima}</small>
                          </div>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm text-white"
                            style={{ backgroundColor: '#003087' }}
                            onClick={() => navigate(`/grupos/${g.idgrupo}`)}
                          >
                            <i className="bi bi-eye me-1"></i>
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

export default Grupos