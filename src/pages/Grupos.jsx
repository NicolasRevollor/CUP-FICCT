import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { apiFetch } from '../api'

const TURNO_BADGE  = { 'MAÑANA': 'warning', TARDE: 'info', NOCHE: 'neutral' }
const TURNO_ICON   = { 'MAÑANA': 'bi-sunrise', TARDE: 'bi-sun', NOCHE: 'bi-moon-stars' }

const INIT_GRUPO = { nombregrupo: '', turno: 'MAÑANA', capacidadmaxima: '', idaula: '', horarioinicio: '', horariofin: '', dias: '' }

function Grupos() {
  const navigate  = useNavigate()
  const usuario   = JSON.parse(localStorage.getItem('usuario'))
  const esAdmin   = usuario?.rol === 'ADMINISTRADOR'
  const [grupos, setGrupos]     = useState([])
  const [aulas, setAulas]       = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [exito, setExito]       = useState('')
  const [filtro, setFiltro]     = useState('TODOS')
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState(INIT_GRUPO)
  const [guardando, setGuardando] = useState(false)

  const loadGrupos = () => {
    setLoading(true)
    apiFetch('/api/grupos')
      .then(r => { if (!r.ok) throw new Error('Error al cargar grupos'); return r.json() })
      .then(setGrupos).catch(e => setError(e.message)).finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!usuario) { navigate('/'); return }
    loadGrupos()
    apiFetch('/api/aulas').then(r => r.ok ? r.json() : []).then(setAulas).catch(() => {})
  }, [])

  if (!usuario) return null

  const filtrados = filtro === 'TODOS' ? grupos : grupos.filter(g => g.turno === filtro)
  const pct = (actual, max) => max > 0 ? Math.min(100, Math.round((actual / max) * 100)) : 0

  const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const abrirNuevo = () => { setForm(INIT_GRUPO); setError(''); setExito(''); setModal(true) }

  const onSubmit = async e => {
    e.preventDefault(); setError(''); setGuardando(true)
    try {
      const body = {
        nombregrupo:     form.nombregrupo,
        turno:           form.turno,
        capacidadmaxima: Number(form.capacidadmaxima),
        idaula:          form.idaula    ? Number(form.idaula)    : null,
        horarioinicio:   form.horarioinicio || null,
        horariofin:      form.horariofin    || null,
        dias:            form.dias          || null,
      }
      const res  = await apiFetch('/api/grupos', { method: 'POST', body: JSON.stringify(body) })
      const data = await res.json()
      if (res.ok) { setExito(data.message || 'Grupo creado correctamente'); setModal(false); loadGrupos() }
      else setError(data.message || 'Error al crear grupo')
    } catch { setError('Error de conexión') }
    finally { setGuardando(false) }
  }

  return (
    <div className="page">
      <Navbar usuario={usuario} />
      <div className="page-content">

        <div className="page-header">
          <div>
            <div className="page-title">Grupos</div>
            <div className="page-subtitle">{grupos.length} grupos habilitados</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>
              <i className="bi bi-arrow-left"></i> Volver
            </button>
            {esAdmin && (
              <button className="btn btn-primary" onClick={abrirNuevo}>
                <i className="bi bi-plus"></i> Nuevo Grupo
              </button>
            )}
          </div>
        </div>

        {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i> {error}</div>}
        {exito && <div className="alert alert-success"><i className="bi bi-check-circle"></i> {exito}</div>}

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

      {/* Modal nuevo grupo */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-header card-header-dark">
              <i className="bi bi-people"></i> Nuevo Grupo
              <button className="btn-nav-logout" style={{ marginLeft: 'auto' }} onClick={() => setModal(false)}>
                <i className="bi bi-x"></i>
              </button>
            </div>
            <div className="card-body">
              {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i> {error}</div>}
              <form onSubmit={onSubmit}>
                <div className="form-section">
                  <div className="form-section-title"><i className="bi bi-info-circle"></i> Datos del grupo</div>
                  <div className="form-row-3">
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Nombre del grupo <span className="req">*</span></label>
                      <input className="form-input" name="nombregrupo" value={form.nombregrupo} onChange={onChange} required placeholder="Ej: Grupo A" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Turno <span className="req">*</span></label>
                      <select className="form-select" name="turno" value={form.turno} onChange={onChange} required>
                        <option value="MAÑANA">Mañana</option>
                        <option value="TARDE">Tarde</option>
                        <option value="NOCHE">Noche</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Capacidad máxima <span className="req">*</span></label>
                      <input type="number" className="form-input" name="capacidadmaxima" value={form.capacidadmaxima} onChange={onChange} required min={1} max={200} placeholder="Ej: 30" />
                    </div>
                  </div>
                </div>
                <div className="form-section">
                  <div className="form-section-title"><i className="bi bi-clock"></i> Aula y horario (opcional)</div>
                  <div className="form-group">
                    <label className="form-label">Aula</label>
                    <select className="form-select" name="idaula" value={form.idaula} onChange={onChange}>
                      <option value="">Sin aula asignada</option>
                      {aulas.map(a => <option key={a.idaulas} value={a.idaulas}>{a.nombre}</option>)}
                    </select>
                  </div>
                  <div className="form-row-3">
                    <div className="form-group">
                      <label className="form-label">Horario inicio</label>
                      <input type="time" className="form-input" name="horarioinicio" value={form.horarioinicio} onChange={onChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Horario fin</label>
                      <input type="time" className="form-input" name="horariofin" value={form.horariofin} onChange={onChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Días</label>
                      <input className="form-input" name="dias" value={form.dias} onChange={onChange} placeholder="Ej: Lun-Mié-Vie" />
                    </div>
                  </div>
                  <div className="form-hint"><i className="bi bi-info-circle"></i> El horario solo se guarda si se selecciona aula, inicio y fin.</div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={guardando}>
                    {guardando ? 'Guardando...' : <><i className="bi bi-save"></i> Crear Grupo</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Grupos
