import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { apiFetch } from '../api'

const INIT_AULA    = { nombre: '', capacidad: '', ubicacion: '' }
const INIT_HORARIO = { idgrupo: '', idaula: '', horarioinicio: '', horariofin: '', dias: '' }

export default function Aulas() {
  const navigate = useNavigate()
  const usuario  = JSON.parse(localStorage.getItem('usuario'))

  const [aulas, setAulas]       = useState([])
  const [horarios, setHorarios] = useState([])
  const [grupos, setGrupos]     = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [exito, setExito]       = useState('')
  const [tab, setTab]           = useState('aulas')

  const [modalAula, setModalAula]       = useState(false)
  const [editandoAula, setEditandoAula] = useState(null)
  const [formAula, setFormAula]         = useState(INIT_AULA)

  const [modalHorario, setModalHorario]       = useState(false)
  const [editandoHorario, setEditandoHorario] = useState(null)
  const [formHorario, setFormHorario]         = useState(INIT_HORARIO)

  if (!usuario || usuario.rol !== 'ADMINISTRADOR') { navigate('/dashboard'); return null }

  const loadAulas = () => {
    setLoading(true)
    apiFetch('/api/aulas').then(r => r.ok ? r.json() : []).then(setAulas).finally(() => setLoading(false))
  }
  const loadHorarios = () => {
    apiFetch('/api/horarios').then(r => r.ok ? r.json() : []).then(setHorarios)
  }
  const loadGrupos = () => {
    apiFetch('/api/grupos').then(r => r.ok ? r.json() : []).then(setGrupos)
  }

  useEffect(() => { loadAulas(); loadHorarios(); loadGrupos() }, [])

  // ── Aulas ──────────────────────────────────────────────────
  const abrirNuevaAula = () => { setFormAula(INIT_AULA); setEditandoAula(null); setModalAula(true); setError(''); setExito('') }
  const abrirEditarAula = a => { setFormAula({ nombre: a.nombre, capacidad: a.capacidad || '', ubicacion: a.ubicacion || '' }); setEditandoAula(a.idaulas); setModalAula(true); setError(''); setExito('') }

  const submitAula = async e => {
    e.preventDefault(); setError('')
    try {
      const res = editandoAula
        ? await apiFetch(`/api/aulas/${editandoAula}`, { method: 'PUT', body: JSON.stringify(formAula) })
        : await apiFetch('/api/aulas', { method: 'POST', body: JSON.stringify(formAula) })
      const data = await res.json()
      if (res.ok) { setExito(data.message); setModalAula(false); loadAulas() }
      else setError(data.message || 'Error al guardar')
    } catch { setError('Error de conexión') }
  }

  const eliminarAula = async id => {
    if (!window.confirm('¿Eliminar esta aula?')) return
    try {
      const res = await apiFetch(`/api/aulas/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) { loadAulas(); loadHorarios(); setExito(data.message) }
      else setError(data.message)
    } catch { setError('Error de conexión') }
  }

  // ── Horarios ──────────────────────────────────────────────
  const abrirNuevoHorario = () => { setFormHorario(INIT_HORARIO); setEditandoHorario(null); setModalHorario(true); setError(''); setExito('') }
  const abrirEditarHorario = h => {
    const aula = aulas.find(a => a.nombre === h.aula)
    setFormHorario({
      idgrupo: grupos.find(g => g.nombregrupo === h.nombregrupo)?.idgrupo || '',
      idaula:  aula?.idaulas || '',
      horarioinicio: h.horarioinicio?.slice(0, 5) || '',
      horariofin:    h.horariofin?.slice(0, 5) || '',
      dias:          h.dias || '',
    })
    setEditandoHorario(h.idhorario); setModalHorario(true); setError(''); setExito('')
  }

  const submitHorario = async e => {
    e.preventDefault(); setError('')
    try {
      const res = editandoHorario
        ? await apiFetch(`/api/horarios/${editandoHorario}`, { method: 'PUT', body: JSON.stringify(formHorario) })
        : await apiFetch('/api/horarios', { method: 'POST', body: JSON.stringify(formHorario) })
      const data = await res.json()
      if (res.ok) { setExito(data.message); setModalHorario(false); loadHorarios() }
      else setError(data.message || 'Error al guardar')
    } catch { setError('Error de conexión') }
  }

  const onChangeAula    = e => setFormAula(f => ({ ...f, [e.target.name]: e.target.value }))
  const onChangeHorario = e => setFormHorario(f => ({ ...f, [e.target.name]: e.target.value }))

  return (
    <div className="page">
      <Navbar usuario={usuario} />
      <div className="page-content">

        <div className="page-header">
          <div>
            <div className="page-title">Aulas y horarios</div>
            <div className="page-subtitle">{aulas.length} aulas · {horarios.length} horarios asignados</div>
          </div>
          <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>
            <i className="bi bi-arrow-left"></i> Volver
          </button>
        </div>

        {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i> {error}</div>}
        {exito && <div className="alert alert-success"><i className="bi bi-check-circle"></i> {exito}</div>}

        <div className="filter-tabs" style={{ marginBottom: 16 }}>
          <button className={`filter-tab ${tab === 'aulas' ? 'active' : ''}`} onClick={() => setTab('aulas')}>
            <i className="bi bi-building"></i> Aulas
          </button>
          <button className={`filter-tab ${tab === 'horarios' ? 'active' : ''}`} onClick={() => setTab('horarios')}>
            <i className="bi bi-clock"></i> Horarios
          </button>
        </div>

        {/* ── TAB AULAS ── */}
        {tab === 'aulas' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button className="btn btn-primary" onClick={abrirNuevaAula}>
                <i className="bi bi-plus"></i> Nueva Aula
              </button>
            </div>
            <div className="card">
              {loading ? (
                <div className="spinner-box"><span className="spinner"></span></div>
              ) : aulas.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><i className="bi bi-building"></i></div>
                  <div className="empty-state-text">No hay aulas registradas</div>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>#</th><th>Nombre</th><th>Capacidad</th><th>Ubicación</th><th></th></tr></thead>
                    <tbody>
                      {aulas.map(a => (
                        <tr key={a.idaulas}>
                          <td className="td-muted">{a.idaulas}</td>
                          <td className="td-bold"><i className="bi bi-building" style={{ marginRight: 6, color: '#9ca3af' }}></i>{a.nombre}</td>
                          <td>{a.capacidad ? <span className="badge badge-neutral"><i className="bi bi-people"></i> {a.capacidad}</span> : '—'}</td>
                          <td className="td-muted">{a.ubicacion || '—'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-sm btn-outline-info" onClick={() => abrirEditarAula(a)}><i className="bi bi-pencil"></i></button>
                              <button className="btn btn-sm btn-outline-danger" onClick={() => eliminarAula(a.idaulas)}><i className="bi bi-trash"></i></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── TAB HORARIOS ── */}
        {tab === 'horarios' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button className="btn btn-primary" onClick={abrirNuevoHorario}>
                <i className="bi bi-plus"></i> Asignar Horario
              </button>
            </div>
            <div className="card">
              {horarios.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><i className="bi bi-clock"></i></div>
                  <div className="empty-state-text">No hay horarios asignados</div>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Grupo</th><th>Aula</th><th>Días</th><th>Inicio</th><th>Fin</th><th></th></tr></thead>
                    <tbody>
                      {horarios.map(h => (
                        <tr key={h.idhorario}>
                          <td className="td-bold">{h.nombregrupo || '—'}</td>
                          <td>{h.aula || '—'}</td>
                          <td className="td-muted">{h.dias || '—'}</td>
                          <td>{h.horarioinicio?.slice(0, 5) || '—'}</td>
                          <td>{h.horariofin?.slice(0, 5) || '—'}</td>
                          <td>
                            <button className="btn btn-sm btn-outline-info" onClick={() => abrirEditarHorario(h)}><i className="bi bi-pencil"></i></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

      </div>

      {/* Modal Aula */}
      {modalAula && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 460 }}>
            <div className="card-header card-header-dark">
              <i className="bi bi-building"></i> {editandoAula ? 'Editar Aula' : 'Nueva Aula'}
              <button className="btn-nav-logout" style={{ marginLeft: 'auto' }} onClick={() => setModalAula(false)}><i className="bi bi-x"></i></button>
            </div>
            <div className="card-body">
              {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i> {error}</div>}
              <form onSubmit={submitAula}>
                <div className="form-group">
                  <label className="form-label">Nombre <span className="req">*</span></label>
                  <input className="form-input" name="nombre" value={formAula.nombre} onChange={onChangeAula} required placeholder="Ej: Aula 101" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Capacidad</label>
                    <input type="number" className="form-input" name="capacidad" value={formAula.capacidad} onChange={onChangeAula} min="1" placeholder="Ej: 30" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ubicación</label>
                    <input className="form-input" name="ubicacion" value={formAula.ubicacion} onChange={onChangeAula} placeholder="Ej: Piso 2, Bloque A" />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setModalAula(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary"><i className="bi bi-save"></i> Guardar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Horario */}
      {modalHorario && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 480 }}>
            <div className="card-header card-header-dark">
              <i className="bi bi-clock"></i> {editandoHorario ? 'Editar Horario' : 'Asignar Horario'}
              <button className="btn-nav-logout" style={{ marginLeft: 'auto' }} onClick={() => setModalHorario(false)}><i className="bi bi-x"></i></button>
            </div>
            <div className="card-body">
              {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i> {error}</div>}
              <form onSubmit={submitHorario}>
                {!editandoHorario && (
                  <div className="form-group">
                    <label className="form-label">Grupo <span className="req">*</span></label>
                    <select className="form-select" name="idgrupo" value={formHorario.idgrupo} onChange={onChangeHorario} required>
                      <option value="">Seleccione grupo...</option>
                      {grupos.map(g => <option key={g.idgrupo} value={g.idgrupo}>{g.nombregrupo} ({g.turno})</option>)}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Aula <span className="req">*</span></label>
                  <select className="form-select" name="idaula" value={formHorario.idaula} onChange={onChangeHorario} required>
                    <option value="">Seleccione aula...</option>
                    {aulas.map(a => <option key={a.idaulas} value={a.idaulas}>{a.nombre}{a.capacidad ? ` (cap. ${a.capacidad})` : ''}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Hora inicio <span className="req">*</span></label>
                    <input type="time" className="form-input" name="horarioinicio" value={formHorario.horarioinicio} onChange={onChangeHorario} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hora fin <span className="req">*</span></label>
                    <input type="time" className="form-input" name="horariofin" value={formHorario.horariofin} onChange={onChangeHorario} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Días <span className="req">*</span></label>
                  <input className="form-input" name="dias" value={formHorario.dias} onChange={onChangeHorario} required placeholder="Ej: Lunes, Miércoles, Viernes" />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setModalHorario(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary"><i className="bi bi-save"></i> Guardar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
