import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { apiFetch } from '../api'

const BADGE = { APROBADO: 'success', REPROBADO: 'danger', INSCRITO: 'info', PENDIENTE: 'warning' }

const fmt = (f) => { try { return new Date(f).toLocaleDateString('es-BO') } catch { return '—' } }

function DetalleGrupo() {
  const navigate  = useNavigate()
  const { id }    = useParams()
  const usuario   = JSON.parse(localStorage.getItem('usuario'))
  const [grupo, setGrupo]       = useState(null)
  const [rows, setRows]         = useState([])
  const [loading, setLoading]   = useState(false)
  const [ci, setCi]             = useState('')
  const [error, setError]       = useState('')
  const [exito, setExito]       = useState('')

  useEffect(() => {
    if (!usuario) { navigate('/'); return }
    loadGrupo(); loadPostulantes()
  }, [id])

  if (!usuario) return null

  const loadGrupo = () =>
    apiFetch('/api/grupos')
      .then(r => r.ok ? r.json() : [])
      .then(d => setGrupo(d.find(g => g.idgrupo === parseInt(id)) || null))
      .catch(() => {})

  const loadPostulantes = () => {
    setLoading(true)
    apiFetch(`/api/grupos/${id}/postulantes`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setRows(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleAsignar = async (e) => {
    e.preventDefault(); setError(''); setExito('')
    try {
      const rb = await apiFetch(`/api/postulantes/buscar?q=${encodeURIComponent(ci)}`)
      if (!rb.ok) throw new Error('Error al buscar')
      const db = await rb.json()
      const p  = db.data?.find(x => x.ci === ci)
      if (!p) { setError('No se encontró postulante con ese CI'); return }

      const ra = await apiFetch('/api/grupos/asignar', {
        method: 'POST',
        body: JSON.stringify({ idpostulante: p.idpostulante, idgrupo: parseInt(id) }),
      })
      const da = await ra.json()
      if (ra.ok) { setExito(`${p.nombres} ${p.apellidos} asignado correctamente`); setCi(''); loadPostulantes(); loadGrupo() }
      else setError(da.message)
    } catch { setError('Error de conexión con el servidor') }
  }

  const handleRetirar = async (idPostulante) => {
    if (!window.confirm('¿Retirar este postulante del grupo?')) return
    try {
      const res = await apiFetch(`/api/grupos/${id}/retirar`, {
        method: 'PUT',
        body: JSON.stringify({ idpostulante: idPostulante }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.message); return }
      loadPostulantes(); loadGrupo()
    } catch { setError('Error de conexión con el servidor') }
  }

  return (
    <div className="page">
      <Navbar usuario={usuario} />
      <div className="page-content">

        <div className="back-header">
          <button className="btn-back" onClick={() => navigate('/grupos')}>
            <i className="bi bi-arrow-left"></i>
          </button>
          <div className="back-header-info">
            <div className="back-header-title">{grupo?.nombregrupo || 'Cargando...'}</div>
            <div className="back-header-sub">
              {grupo ? `${grupo.turno} · ${grupo.aula || 'Sin aula'} · ${grupo.horarioinicio?.slice(0,5)} – ${grupo.horariofin?.slice(0,5)}` : ''}
            </div>
          </div>
        </div>

        {grupo && (
          <div className="info-grid">
            <div className="info-card">
              <div className="info-icon"><i className="bi bi-people" style={{ color: 'var(--primary)' }}></i></div>
              <div className="info-value">{grupo.cantidadestudiante}</div>
              <div className="info-label">Estudiantes asignados</div>
            </div>
            <div className="info-card">
              <div className="info-icon"><i className="bi bi-building" style={{ color: 'var(--success)' }}></i></div>
              <div className="info-value">{grupo.capacidadmaxima}</div>
              <div className="info-label">Capacidad máxima</div>
            </div>
            <div className="info-card">
              <div className="info-icon"><i className="bi bi-door-open" style={{ color: 'var(--warning)' }}></i></div>
              <div className="info-value">{grupo.capacidadmaxima - grupo.cantidadestudiante}</div>
              <div className="info-label">Lugares disponibles</div>
            </div>
          </div>
        )}

        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-header card-header-dark">
            <i className="bi bi-person-plus"></i> Asignar Postulante
          </div>
          <div className="card-body">
            {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i>{error}</div>}
            {exito && <div className="alert alert-success"><i className="bi bi-check-circle"></i>{exito}</div>}
            <form onSubmit={handleAsignar}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" placeholder="Ingrese CI exacto del postulante..."
                  value={ci} onChange={e => setCi(e.target.value)} required style={{ flex: 1 }} />
                <button className="btn btn-primary" type="submit">
                  <i className="bi bi-plus"></i> Asignar
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-header card-header-dark">
            <i className="bi bi-list-ul"></i> Postulantes del Grupo
            <span style={{ marginLeft: 6, background: 'rgba(255,255,255,.15)', borderRadius: 20, padding: '1px 9px', fontSize: 11 }}>
              {rows.length}
            </span>
          </div>
          {loading ? (
            <div className="spinner-box">
              <span className="spinner"></span>
            </div>
          ) : rows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><i className="bi bi-inbox"></i></div>
              <div className="empty-state-text">No hay postulantes asignados a este grupo</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>CI</th><th>Nombres</th><th>Apellidos</th>
                    <th>Promedio</th><th>Estado</th><th>Asignado</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(p => (
                    <tr key={p.idpostulante}>
                      <td className="td-bold">{p.ci}</td>
                      <td>{p.nombres}</td>
                      <td>{p.apellidos}</td>
                      <td>{p.promedio_final ?? '—'}</td>
                      <td>
                        <span className={`badge badge-${BADGE[p.estadopostulante] || 'neutral'}`}>
                          {p.estadopostulante}
                        </span>
                      </td>
                      <td className="td-muted">{fmt(p.fechaasignacion)}</td>
                      <td>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleRetirar(p.idpostulante)}>
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
  )
}

export default DetalleGrupo
