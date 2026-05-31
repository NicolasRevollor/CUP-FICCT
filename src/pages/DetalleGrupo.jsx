import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'

function DetalleGrupo() {
  const navigate = useNavigate()
  const { id } = useParams()
  const usuario = JSON.parse(localStorage.getItem('usuario'))
  const [grupo, setGrupo] = useState(null)
  const [postulantes, setPostulantes] = useState([])
  const [loading, setLoading] = useState(false)
  const [ciAsignar, setCiAsignar] = useState('')
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  useEffect(() => {
    if (!usuario) navigate('/')
  }, [])

  if (!usuario) return null

  const fetchGrupo = async () => {
    const res = await fetch('https://cup-ficct-production.up.railway.app/api/grupos')
    const data = await res.json()
    const g = data.find(g => g.idgrupo === parseInt(id))
    setGrupo(g)
  }

  const fetchPostulantes = async () => {
    setLoading(true)
    try {
      const res = await fetch(`https://cup-ficct-production.up.railway.app/api/grupos/${id}/postulantes`)
      const data = await res.json()
      setPostulantes(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGrupo()
    fetchPostulantes()
  }, [id])

  const handleAsignar = async (e) => {
    e.preventDefault()
    setError('')
    setExito('')

    // Buscar postulante por CI
    try {
      const resBuscar = await fetch(`https://cup-ficct-production.up.railway.app/api/postulantes/buscar?q=${ciAsignar}`)
      const dataBuscar = await resBuscar.json()

      if (!dataBuscar.data || dataBuscar.data.length === 0) {
        setError('No se encontró postulante con ese CI')
        return
      }

      const postulante = dataBuscar.data.find(p => p.ci === ciAsignar)
      if (!postulante) {
        setError('No se encontró postulante con ese CI exacto')
        return
      }

      // Asignar al grupo
      const resAsignar = await fetch('https://cup-ficct-production.up.railway.app/api/grupos/asignar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idpostulante: postulante.idpostulante,
          idgrupo: parseInt(id)
        })
      })

      const dataAsignar = await resAsignar.json()

      if (resAsignar.ok) {
        setExito(`${postulante.nombres} ${postulante.apellidos} asignado correctamente`)
        setCiAsignar('')
        fetchPostulantes()
        fetchGrupo()
      } else {
        setError(dataAsignar.message)
      }
    } catch (err) {
      setError('Error de conexión con el servidor')
    }
  }

  const handleRetirar = async (idPostulante) => {
    if (!window.confirm('¿Retirar este postulante del grupo?')) return

    await fetch(`https://cup-ficct-production.up.railway.app/api/grupos/${id}/retirar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idpostulante: idPostulante })
    })

    fetchPostulantes()
    fetchGrupo()
  }

  const getBadge = (estado) => {
    const badges = {
      'APROBADO':  'success',
      'REPROBADO': 'danger',
      'INSCRITO':  'primary',
      'PENDIENTE': 'warning'
    }
    return badges[estado] || 'secondary'
  }

  return (
    <div>
      <Navbar usuario={usuario} />
      <div className="container mt-4">

        {/* Header */}
        <div className="d-flex align-items-center mb-4">
          <button className="btn btn-outline-secondary me-3"
            onClick={() => navigate('/grupos')}>
            <i className="bi bi-arrow-left"></i>
          </button>
          <div>
            <h4 className="fw-bold mb-0" style={{ color: '#003087' }}>
              <i className="bi bi-people-fill me-2"></i>
              {grupo?.nombregrupo || 'Cargando...'}
            </h4>
            <small className="text-muted">
              {grupo?.turno} | {grupo?.aula} | {grupo?.horarioinicio?.slice(0,5)} - {grupo?.horariofin?.slice(0,5)}
            </small>
          </div>
        </div>

        {/* Info del grupo */}
        {grupo && (
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <div className="card shadow-sm text-center">
                <div className="card-body">
                  <i className="bi bi-people-fill fs-2" style={{ color: '#003087' }}></i>
                  <h3 className="fw-bold mt-2">{grupo.cantidadestudiante}</h3>
                  <p className="text-muted mb-0">Estudiantes asignados</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow-sm text-center">
                <div className="card-body">
                  <i className="bi bi-building fs-2 text-success"></i>
                  <h3 className="fw-bold mt-2">{grupo.capacidadmaxima}</h3>
                  <p className="text-muted mb-0">Capacidad máxima</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow-sm text-center">
                <div className="card-body">
                  <i className="bi bi-door-open fs-2 text-warning"></i>
                  <h3 className="fw-bold mt-2">{grupo.capacidadmaxima - grupo.cantidadestudiante}</h3>
                  <p className="text-muted mb-0">Lugares disponibles</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Asignar postulante */}
        <div className="card shadow mb-4">
          <div className="card-header fw-bold" style={{ backgroundColor: '#003087', color: 'white' }}>
            <i className="bi bi-person-plus-fill me-2"></i>
            Asignar Postulante al Grupo
          </div>
          <div className="card-body">
            {error  && <div className="alert alert-danger">{error}</div>}
            {exito  && <div className="alert alert-success">{exito}</div>}
            <form onSubmit={handleAsignar}>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ingrese CI del postulante..."
                  value={ciAsignar}
                  onChange={(e) => setCiAsignar(e.target.value)}
                  required
                />
                <button className="btn text-white" style={{ backgroundColor: '#003087' }} type="submit">
                  <i className="bi bi-plus-circle me-1"></i>
                  Asignar
                </button>
              </div>
              <small className="text-muted">Ingrese el CI exacto del postulante</small>
            </form>
          </div>
        </div>

        {/* Lista de postulantes del grupo */}
        <div className="card shadow">
          <div className="card-header fw-bold" style={{ backgroundColor: '#003087', color: 'white' }}>
            <i className="bi bi-list-ul me-2"></i>
            Postulantes del Grupo ({postulantes.length})
          </div>
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center p-4">
                <div className="spinner-border" style={{ color: '#003087' }}></div>
              </div>
            ) : postulantes.length === 0 ? (
              <div className="text-center p-4 text-muted">
                <i className="bi bi-inbox fs-1"></i>
                <p className="mt-2">No hay postulantes asignados a este grupo</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead style={{ backgroundColor: '#f8f9fa' }}>
                    <tr>
                      <th>CI</th>
                      <th>Nombres</th>
                      <th>Apellidos</th>
                      <th>Promedio</th>
                      <th>Estado</th>
                      <th>Fecha Asignación</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {postulantes.map((p) => (
                      <tr key={p.idpostulante}>
                        <td>{p.ci}</td>
                        <td>{p.nombres}</td>
                        <td>{p.apellidos}</td>
                        <td>{p.promedio_final}</td>
                        <td>
                          <span className={`badge bg-${getBadge(p.estadopostulante)}`}>
                            {p.estadopostulante}
                          </span>
                        </td>
                        <td>
                          <small>{new Date(p.fechaasignacion).toLocaleDateString()}</small>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleRetirar(p.idpostulante)}
                          >
                            <i className="bi bi-person-dash"></i>
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

export default DetalleGrupo
