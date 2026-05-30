import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

function Postulantes() {
  const navigate = useNavigate()
  const usuario = JSON.parse(localStorage.getItem('usuario'))
  const [postulantes, setPostulantes] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(false)

  if (!usuario) { navigate('/'); return null }

  const fetchPostulantes = async (page = 1, query = '') => {
    setLoading(true)
    try {
      const url = query
        ? `http://localhost:8000/api/postulantes/buscar?q=${query}&page=${page}`
        : `http://localhost:8000/api/postulantes?page=${page}`

      const res = await fetch(url)
      const data = await res.json()
      setPostulantes(data.data)
      setTotalPages(data.last_page)
      setTotal(data.total)
      setCurrentPage(data.current_page)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPostulantes()
  }, [])

  const handleBuscar = (e) => {
    e.preventDefault()
    fetchPostulantes(1, busqueda)
  }

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este postulante?')) return
    await fetch(`http://localhost:8000/api/postulantes/${id}`, { method: 'DELETE' })
    fetchPostulantes(currentPage, busqueda)
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
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-bold" style={{ color: '#003087' }}>
              <i className="bi bi-person-lines-fill me-2"></i>
              Gestión de Postulantes
            </h4>
            <p className="text-muted mb-0">Total: {total} postulantes registrados</p>
          </div>
          <button
            className="btn text-white"
            style={{ backgroundColor: '#003087' }}
            onClick={() => navigate('/postulantes/nuevo')}
          >
            <i className="bi bi-plus-circle me-2"></i>
            Nuevo Postulante
          </button>
        </div>

        {/* Buscador */}
        <form onSubmit={handleBuscar} className="mb-4">
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por CI, nombre o apellido..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <button className="btn text-white" style={{ backgroundColor: '#003087' }} type="submit">
              <i className="bi bi-search me-1"></i> Buscar
            </button>
            <button className="btn btn-outline-secondary" type="button"
              onClick={() => { setBusqueda(''); fetchPostulantes(1, '') }}>
              <i className="bi bi-x-circle me-1"></i> Limpiar
            </button>
          </div>
        </form>

        {/* Tabla */}
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
                      <th>CI</th>
                      <th>Nombres</th>
                      <th>Apellidos</th>
                      <th>Promedio</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {postulantes.map((p) => (
                      <tr key={p.idpostulante}>
                        <td>{p.idpostulante}</td>
                        <td>{p.ci}</td>
                        <td>{p.nombres}</td>
                        <td>{p.apellidos}</td>
                        <td>{p.promedio_final}</td>
                        <td>
                          <span className={`badge rounded-pill bg-${getBadge(p.estadopostulante)} px-3 py-2`}>
                            {p.estadopostulante === 'APROBADO'  && <><i className="bi bi-check-circle-fill me-1"></i>Aprobado</>}
                            {p.estadopostulante === 'REPROBADO' && <><i className="bi bi-x-circle-fill me-1"></i>Reprobado</>}
                            {p.estadopostulante === 'INSCRITO'  && <><i className="bi bi-person-check-fill me-1"></i>Inscrito</>}
                            {p.estadopostulante === 'PENDIENTE' && <><i className="bi bi-clock-fill me-1"></i>Pendiente</>}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-primary me-1"
                            onClick={() => navigate(`/postulantes/editar/${p.idpostulante}`)}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleEliminar(p.idpostulante)}
                          >
                            <i className="bi bi-trash"></i>
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

        {/* Paginación */}
        <div className="d-flex justify-content-between align-items-center mt-3">
          <small className="text-muted">
            Página {currentPage} de {totalPages}
          </small>
          <nav>
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button className="page-link"
                  onClick={() => fetchPostulantes(currentPage - 1, busqueda)}>
                  Anterior
                </button>
              </li>
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button className="page-link"
                  onClick={() => fetchPostulantes(currentPage + 1, busqueda)}>
                  Siguiente
                </button>
              </li>
            </ul>
          </nav>
        </div>

      </div>
    </div>
  )
}

export default Postulantes