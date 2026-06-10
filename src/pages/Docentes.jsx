import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { apiFetch } from '../api'

const INIT = {
  idusuario: '', ci: '', nombres: '', apellidos: '', profesion: '',
  maestria: '', diplomadoEdSup: '', telefono: '', correo: '', estado: 'ACTIVO',
}
const TURNO_BADGE = { 'MAÑANA': 'warning', TARDE: 'info', NOCHE: 'neutral' }

function Docentes() {
  const navigate = useNavigate()
  const usuario  = JSON.parse(localStorage.getItem('usuario'))

  const [docentes, setDocentes]       = useState([])
  const [usuarios, setUsuarios]       = useState([])
  const [grupos, setGrupos]           = useState([])
  const [materias, setMaterias]       = useState([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [exito, setExito]             = useState('')

  // modal docente
  const [modal, setModal]             = useState(false)
  const [editando, setEditando]       = useState(null)
  const [form, setForm]               = useState(INIT)

  // panel asignaciones
  const [panelDocente, setPanelDocente]   = useState(null)
  const [asignaciones, setAsignaciones]   = useState([])
  const [loadingAsig, setLoadingAsig]     = useState(false)
  const [modalAsignar, setModalAsignar]   = useState(false)
  const [formAsig, setFormAsig]           = useState({ idgrupo: '', idmateria: '' })
  const [guardandoAsig, setGuardandoAsig] = useState(false)

  if (!usuario) { navigate('/'); return null }
  const esAdmin = usuario.rol === 'ADMINISTRADOR'

  const load = () => {
    setLoading(true)
    apiFetch('/api/docentes').then(r => r.ok ? r.json() : []).then(setDocentes).catch(() => setError('Error al cargar docentes')).finally(() => setLoading(false))
  }
  const loadAux = () => {
    apiFetch('/api/docentes/usuarios-disponibles').then(r => r.ok ? r.json() : []).then(setUsuarios).catch(() => {})
    apiFetch('/api/grupos').then(r => r.ok ? r.json() : []).then(setGrupos).catch(() => {})
    apiFetch('/api/materias').then(r => r.ok ? r.json() : []).then(setMaterias).catch(() => {})
  }

  useEffect(() => { load(); loadAux() }, [])

  const loadAsignaciones = async (iddocente) => {
    setLoadingAsig(true)
    try {
      const r = await apiFetch(`/api/docentes/${iddocente}/grupos`)
      setAsignaciones(r.ok ? await r.json() : [])
    } catch { setAsignaciones([]) }
    finally { setLoadingAsig(false) }
  }

  const abrirPanel = (d) => {
    setPanelDocente(d); setError(''); setExito('')
    loadAsignaciones(d.iddocente)
  }

  // ── CRUD docente ──────────────────────────────────────────
  const onChange = e => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }
  const abrirNuevo  = () => { setForm(INIT); setEditando(null); setModal(true); setError(''); setExito(''); loadAux() }
  const abrirEditar = d => {
    setForm({ ci: d.ci, nombres: d.nombres, apellidos: d.apellidos, profesion: d.profesion, maestria: d.maestria || '', diplomadoEdSup: d.diplomadoedsup || '', telefono: d.telefono || '', correo: d.correo, estado: d.estado })
    setEditando(d.iddocente); setModal(true); setError(''); setExito('')
  }
  const onSubmit = async e => {
    e.preventDefault(); setError('')
    try {
      const res = editando
        ? await apiFetch(`/api/docentes/${editando}`, { method: 'PUT', body: JSON.stringify(form) })
        : await apiFetch('/api/docentes', { method: 'POST', body: JSON.stringify(form) })
      const data = await res.json()
      if (res.ok) { setExito(data.message); setModal(false); load() }
      else setError(data.message || 'Error al guardar')
    } catch { setError('Error de conexión') }
  }
  const eliminar = async id => {
    if (!window.confirm('¿Eliminar este docente?')) return
    try {
      const res = await apiFetch(`/api/docentes/${id}`, { method: 'DELETE' })
      if (res.ok) load()
      else { const d = await res.json(); setError(d.message) }
    } catch { setError('Error de conexión') }
  }

  // ── CU11: asignación de grupos ────────────────────────────
  const asignar = async e => {
    e.preventDefault(); setError(''); setGuardandoAsig(true)
    try {
      const res  = await apiFetch(`/api/docentes/${panelDocente.iddocente}/asignar-grupo`, {
        method: 'POST', body: JSON.stringify({ idgrupo: Number(formAsig.idgrupo), idmateria: Number(formAsig.idmateria) }),
      })
      const data = await res.json()
      if (res.ok) { setExito(data.message); setModalAsignar(false); setFormAsig({ idgrupo: '', idmateria: '' }); loadAsignaciones(panelDocente.iddocente); load() }
      else setError(data.message || 'Error al asignar')
    } catch { setError('Error de conexión') }
    finally { setGuardandoAsig(false) }
  }

  const desasignar = async (idasignacion) => {
    if (!window.confirm('¿Desasignar este grupo?')) return
    try {
      const res  = await apiFetch(`/api/docentes/${panelDocente.iddocente}/asignaciones/${idasignacion}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) { setExito(data.message); loadAsignaciones(panelDocente.iddocente); load() }
      else setError(data.message)
    } catch { setError('Error de conexión') }
  }

  return (
    <div className="page">
      <Navbar usuario={usuario} />
      <div className="page-content">

        <div className="page-header">
          <div>
            <div className="page-title">Docentes</div>
            <div className="page-subtitle">{docentes.length} docentes registrados</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={() => navigate('/dashboard')}><i className="bi bi-arrow-left"></i> Volver</button>
            {esAdmin && <button className="btn btn-primary" onClick={abrirNuevo}><i className="bi bi-plus"></i> Nuevo Docente</button>}
          </div>
        </div>

        {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i> {error}</div>}
        {exito && <div className="alert alert-success"><i className="bi bi-check-circle"></i> {exito}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: panelDocente ? '1fr 360px' : '1fr', gap: 16, alignItems: 'start' }}>

          {/* Tabla */}
          <div className="card">
            {loading ? (
              <div className="spinner-box"><span className="spinner"></span></div>
            ) : docentes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><i className="bi bi-person-badge"></i></div>
                <div className="empty-state-text">No hay docentes registrados</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>CI</th><th>Nombre</th><th>Profesión</th><th>Correo</th><th>Estado</th><th>Grupos</th>{esAdmin && <th></th>}</tr>
                  </thead>
                  <tbody>
                    {docentes.map(d => (
                      <tr key={d.iddocente} style={{ background: panelDocente?.iddocente === d.iddocente ? '#f0f4ff' : '' }}>
                        <td className="td-bold">{d.ci}</td>
                        <td>{d.nombres} {d.apellidos}</td>
                        <td className="td-muted">{d.profesion || '—'}</td>
                        <td className="td-muted">{d.correo}</td>
                        <td><span className={`badge ${d.estado === 'ACTIVO' ? 'badge-success' : 'badge-danger'}`}>{d.estado}</span></td>
                        <td>
                          <button className="btn btn-sm btn-outline-info" onClick={() => abrirPanel(d)}>
                            <i className="bi bi-diagram-3"></i> Grupos
                          </button>
                        </td>
                        {esAdmin && (
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-sm btn-outline-info" onClick={() => abrirEditar(d)}><i className="bi bi-pencil"></i></button>
                              <button className="btn btn-sm btn-outline-danger" onClick={() => eliminar(d.iddocente)}><i className="bi bi-trash"></i></button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Panel asignaciones */}
          {panelDocente && (
            <div className="card" style={{ position: 'sticky', top: 16 }}>
              <div className="card-header card-header-dark" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><i className="bi bi-diagram-3"></i> Grupos asignados</span>
                <button className="btn-nav-logout" style={{ marginLeft: 'auto' }} onClick={() => setPanelDocente(null)}><i className="bi bi-x"></i></button>
              </div>
              <div className="card-body">
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{panelDocente.nombres} {panelDocente.apellidos}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>CI: {panelDocente.ci}</div>

                {loadingAsig ? (
                  <div className="spinner-box" style={{ padding: 20 }}><span className="spinner"></span></div>
                ) : asignaciones.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '16px 0', marginBottom: 12 }}>
                    <i className="bi bi-inbox" style={{ fontSize: 24, display: 'block', marginBottom: 6 }}></i>
                    Sin grupos asignados
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {asignaciones.map(a => (
                      <div key={a.idasignacion} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{a.nombregrupo}</div>
                          <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', gap: 8, marginTop: 2 }}>
                            <span className={`badge badge-${TURNO_BADGE[a.turno] || 'neutral'}`} style={{ fontSize: 10 }}>{a.turno}</span>
                            <span>{a.materia}</span>
                          </div>
                        </div>
                        <button className="btn btn-sm btn-outline-danger" title="Desasignar" onClick={() => desasignar(a.idasignacion)}>
                          <i className="bi bi-x"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ fontSize: 12, color: asignaciones.length >= 4 ? '#dc2626' : '#6b7280', marginBottom: 10, textAlign: 'right' }}>
                  {asignaciones.length}/4 grupos activos {asignaciones.length >= 4 && '(máximo alcanzado)'}
                </div>

                <button
                  className="btn btn-primary btn-full"
                  disabled={asignaciones.length >= 4}
                  onClick={() => { setFormAsig({ idgrupo: '', idmateria: '' }); setModalAsignar(true); setError('') }}>
                  <i className="bi bi-plus-circle"></i> Asignar a grupo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal docente */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-header card-header-dark">
              <i className={`bi ${editando ? 'bi-pencil' : 'bi-person-plus'}`}></i>
              {editando ? 'Editar Docente' : 'Nuevo Docente'}
              <button className="btn-nav-logout" style={{ marginLeft: 'auto' }} onClick={() => setModal(false)}><i className="bi bi-x"></i></button>
            </div>
            <div className="card-body">
              {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i> {error}</div>}
              <form onSubmit={onSubmit}>
                <div className="form-section">
                  <div className="form-section-title"><i className="bi bi-person"></i> Datos Personales</div>
                  {!editando && (
                    <div className="form-group">
                      <label className="form-label">Usuario del sistema <span className="req">*</span></label>
                      <select className="form-select" name="idusuario" value={form.idusuario} onChange={onChange} required>
                        <option value="">Seleccione un usuario...</option>
                        {usuarios.map(u => <option key={u.idusuario} value={u.idusuario}>{u.nombre_usuario} ({u.email})</option>)}
                      </select>
                      {usuarios.length === 0 && <div className="form-hint">No hay usuarios disponibles sin docente asignado.</div>}
                    </div>
                  )}
                  <div className="form-row-3">
                    <div className="form-group">
                      <label className="form-label">CI <span className="req">*</span></label>
                      <input className="form-input" name="ci" value={form.ci} onChange={onChange} required disabled={!!editando} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nombres <span className="req">*</span></label>
                      <input className="form-input" name="nombres" value={form.nombres} onChange={onChange} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Apellidos <span className="req">*</span></label>
                      <input className="form-input" name="apellidos" value={form.apellidos} onChange={onChange} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Profesión</label>
                      <input className="form-input" name="profesion" value={form.profesion} onChange={onChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Teléfono</label>
                      <input className="form-input" name="telefono" value={form.telefono} onChange={onChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Correo <span className="req">*</span></label>
                      <input type="email" className="form-input" name="correo" value={form.correo} onChange={onChange} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select className="form-select" name="estado" value={form.estado} onChange={onChange}>
                      <option value="ACTIVO">Activo</option>
                      <option value="INACTIVO">Inactivo</option>
                    </select>
                  </div>
                </div>
                <div className="form-section">
                  <div className="form-section-title"><i className="bi bi-mortarboard"></i> Requisitos Académicos</div>
                  <div className="form-group">
                    <label className="form-label">Maestría</label>
                    <input className="form-input" name="maestria" value={form.maestria} onChange={onChange} placeholder="Nombre del grado o vacío si no aplica" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Diplomado en Educación Superior</label>
                    <input className="form-input" name="diplomadoEdSup" value={form.diplomadoEdSup} onChange={onChange} placeholder="Nombre del diplomado o vacío si no aplica" />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary"><i className="bi bi-save"></i> {editando ? 'Guardar Cambios' : 'Registrar Docente'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal asignar grupo */}
      {modalAsignar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 440 }}>
            <div className="card-header card-header-dark">
              <i className="bi bi-plus-circle"></i> Asignar a grupo — {panelDocente?.nombres} {panelDocente?.apellidos}
              <button className="btn-nav-logout" style={{ marginLeft: 'auto' }} onClick={() => setModalAsignar(false)}><i className="bi bi-x"></i></button>
            </div>
            <div className="card-body">
              {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i> {error}</div>}
              <form onSubmit={asignar}>
                <div className="form-group">
                  <label className="form-label">Grupo <span className="req">*</span></label>
                  <select className="form-select" value={formAsig.idgrupo} onChange={e => setFormAsig(f => ({ ...f, idgrupo: e.target.value }))} required>
                    <option value="">Seleccione un grupo...</option>
                    {grupos.map(g => <option key={g.idgrupo} value={g.idgrupo}>{g.nombregrupo} — {g.turno}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Materia <span className="req">*</span></label>
                  <select className="form-select" value={formAsig.idmateria} onChange={e => setFormAsig(f => ({ ...f, idmateria: e.target.value }))} required>
                    <option value="">Seleccione una materia...</option>
                    {materias.map(m => <option key={m.idmateria} value={m.idmateria}>{m.nombre}</option>)}
                  </select>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
                  <i className="bi bi-info-circle"></i> El docente puede tener máximo 4 grupos activos simultáneos.
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setModalAsignar(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={guardandoAsig}>
                    {guardandoAsig ? 'Asignando...' : <><i className="bi bi-check"></i> Confirmar asignación</>}
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

export default Docentes
