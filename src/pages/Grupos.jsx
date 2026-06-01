import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { apiFetch } from '../api'

const TURNO_BADGE  = { 'MAÑANA': 'warning', TARDE: 'info', NOCHE: 'neutral' }
const TURNO_ICON   = { 'MAÑANA': 'bi-sunrise', TARDE: 'bi-sun', NOCHE: 'bi-moon-stars' }

function Grupos() {
  const navigate  = useNavigate()
  const usuario   = JSON.parse(localStorage.getItem('usuario'))
  const [grupos, setGrupos]   = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [filtro, setFiltro]   = useState('TODOS')

  useEffect(() => {
    if (!usuario) { navigate('/'); return }
    setLoading(true)
    apiFetch('/api/grupos')
      .then(r => { if (!r.ok) throw new Error('Error al cargar grupos'); return r.json() })
      .then(d => setGrupos(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (!usuario) return null

  const filtrados = filtro === 'TODOS' ? grupos : grupos.filter(g => g.turno === filtro)

  const pct = (actual, max) => max > 0 ? Math.min(100, Math.round((actual / max) * 100)) : 0

  return (
    <div className="page">
      <Navbar usuario={usuario} />
      <div className="page-content">

        <div className="page-header">
          <div>
            <div className="page-title">Grupos</div>
            <div className="page-subtitle">{grupos.length} grupos habilitados</div>
          </div>
          <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>
            <i className="bi bi-arrow-left"></i> Volver
          </button>
        </div>

        {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i>{error}</div>}

        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 18 }}>
          {['MAÑANA', 'TARDE', 'NOCHE'].map(t => (
            <div key={t} className="stat-card stat-card-white">
              <div className="stat-icon"><i className={`bi ${TURNO_ICON[t]}`}></i></div>
              <div className="stat-value">{grupos.filter(g => g.turno === t).length}</div>
              <div className="stat-label">{t.charAt(0) + t.slice(1).toLowerCase()}</div>
            </div>
          ))}
        </div>

        <div className="filter-tabs">
          {['TODOS', 'MAÑANA', 'TARDE', 'NOCHE'].map(t => (
            <button key={t} className={`filter-tab ${filtro === t ? 'active' : ''}`} onClick={() => setFiltro(t)}>
              {t}
            </button>
          ))}
        </div>

        <div className="card">
          {loading ? (
            <div className="spinner-box">
              <span className="spinner"></span>
              <span className="spinner-text">Cargando grupos...</span>
            </div>
          ) : filtrados.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><i className="bi bi-inbox"></i></div>
              <div className="empty-state-text">No hay grupos para este turno</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th><th>Grupo</th><th>Turno</th><th>Aula</th>
                    <th>Horario</th><th>Ocupación</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(g => (
                    <tr key={g.idgrupo}>
                      <td className="td-muted">{g.idgrupo}</td>
                      <td className="td-bold">{g.nombregrupo}</td>
                      <td>
                        <span className={`badge badge-${TURNO_BADGE[g.turno] || 'neutral'}`}>
                          <i className={`bi ${TURNO_ICON[g.turno] || 'bi-circle'}`}></i>
                          {g.turno}
                        </span>
                      </td>
                      <td>{g.aula || '—'}</td>
                      <td className="td-muted">
                        {g.horarioinicio?.slice(0, 5)} {g.horariofin ? `– ${g.horariofin.slice(0, 5)}` : ''}
                      </td>
                      <td style={{ minWidth: 160 }}>
                        <div className="progress-row">
                          <div className="progress-track">
                            <div
                              className={`progress-fill ${pct(g.cantidadestudiante, g.capacidadmaxima) >= 90 ? 'progress-fill-danger' : 'progress-fill-success'}`}
                              style={{ width: `${pct(g.cantidadestudiante, g.capacidadmaxima)}%` }}
                            />
                          </div>
                          <span className="progress-label">{g.cantidadestudiante}/{g.capacidadmaxima}</span>
                        </div>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-primary" onClick={() => navigate(`/grupos/${g.idgrupo}`)}>
                          <i className="bi bi-eye"></i> Ver
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

export default Grupos
