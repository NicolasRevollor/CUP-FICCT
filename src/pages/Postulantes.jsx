import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { apiFetch } from '../api'

const BADGE = { APROBADO: 'success', REPROBADO: 'danger', INSCRITO: 'info', PENDIENTE: 'warning' }

function Postulantes() {
  const navigate    = useNavigate()
  const usuario     = JSON.parse(localStorage.getItem('usuario'))
  const [rows, setRows]             = useState([])
  const [page, setPage]             = useState(1)
  const [lastPage, setLastPage]     = useState(1)
  const [total, setTotal]           = useState(0)
  const [query, setQuery]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  if (!usuario) { navigate('/'); return null }

  const load = async (p = 1, q = '') => {
    setLoading(true); setError('')
    try {
      const path = q
        ? `/api/postulantes/buscar?q=${encodeURIComponent(q)}&page=${p}`
        : `/api/postulantes?page=${p}`
      const res  = await apiFetch(path)
      if (!res.ok) throw new Error('Error al cargar')
      const data = await res.json()
      setRows(data.data); setLastPage(data.last_page); setTotal(data.total); setPage(data.current_page)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSearch = (e) => { e.preventDefault(); load(1, query) }
  const handleClear  = () => { setQuery(''); load(1, '') }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este postulante?')) return
    try {
      const res = await apiFetch(`/api/postulantes/${id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); setError(d.message); return }
      load(page, query)
    } catch { setError('Error de conexión') }
  }

  return (
    <div className="page">
      <Navbar usuario={usuario} />
      <div className="page-content">

        <div className="page-header">
          <div>
            <div className="page-title">Postulantes</div>
            <div className="page-subtitle">{total} registros en total</div>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/postulantes/nuevo')}>
            <i className="bi bi-plus"></i> Nuevo Postulante
          </button>
        </div>

        {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i>{error}</div>}

        <form className="search-bar" onSubmit={handleSearch}>
          <input className="form-input" placeholder="Buscar por CI, nombre o apellido..."
            value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="btn btn-primary" type="submit">
            <i className="bi bi-search"></i> Buscar
          </button>
          <button className="btn btn-outline" type="button" onClick={handleClear}>
            <i className="bi bi-x"></i> Limpiar
          </button>
        </form>

        <div className="card">
          {loading ? (
            <div className="spinner-box">
              <span className="spinner"></span>
              <span className="spinner-text">Cargando postulantes...</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><i className="bi bi-inbox"></i></div>
              <div className="empty-state-text">No se encontraron postulantes</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th><th>CI</th><th>Nombres</th><th>Apellidos</th>
                    <th>Promedio</th><th>Estado</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.idpostulante}>
                      <td className="td-muted">{p.idpostulante}</td>
                      <td className="td-bold">{p.ci}</td>
                      <td>{p.nombres}</td>
                      <td>{p.apellidos}</td>
                      <td>{p.promedio_final ?? '—'}</td>
                      <td>
                        <span className={`badge badge-${BADGE[p.estadopostulante] || 'neutral'}`}>
                          {p.estadopostulante}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-sm btn-outline-info"
                            onClick={() => navigate(`/postulantes/editar/${p.idpostulante}`)}>
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(p.idpostulante)}>
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="pagination-row">
          <span>Página {page} de {lastPage}</span>
          <div className="pagination-btns">
            <button className="page-btn" disabled={page === 1}
              onClick={() => load(page - 1, query)}>Anterior</button>
            <button className="page-btn" disabled={page === lastPage}
              onClick={() => load(page + 1, query)}>Siguiente</button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Postulantes
