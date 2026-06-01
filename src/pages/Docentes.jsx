import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { apiFetch } from '../api'

const INIT = {
  idusuario: '', ci: '', nombres: '', apellidos: '', profesion: '',
  maestria: '', diplomadoEdSup: '',
  telefono: '', correo: '', estado: 'ACTIVO',
}

function Docentes() {
  const navigate  = useNavigate()
  const usuario   = JSON.parse(localStorage.getItem('usuario'))
  const [docentes, setDocentes]   = useState([])
  const [usuarios, setUsuarios]   = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [exito, setExito]         = useState('')
  const [modal, setModal]         = useState(false)
  const [editando, setEditando]   = useState(null)
  const [form, setForm]           = useState(INIT)

  if (!usuario) { navigate('/'); return null }

  const load = () => {
    setLoading(true)
    apiFetch('/api/docentes')
      .then(r => r.ok ? r.json() : [])
      .then(setDocentes)
      .catch(() => setError('Error al cargar docentes'))
      .finally(() => setLoading(false))
  }

  const loadUsuarios = () => {
    apiFetch('/api/docentes/usuarios-disponibles')
      .then(r => r.ok ? r.json() : [])
      .then(setUsuarios)
      .catch(() => {})
  }

  useEffect(() => { load(); loadUsuarios() }, [])

  const onChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const abrirNuevo = () => { setForm(INIT); setEditando(null); setModal(true); setError(''); setExito(''); loadUsuarios() }

  const abrirEditar = (d) => {
    setForm({
      ci: d.ci, nombres: d.nombres, apellidos: d.apellidos,
      profesion: d.profesion, maestria: d.maestria || '', diplomadoEdSup: d.diplomadoedsup || '',
      telefono: d.telefono || '', correo: d.correo, estado: d.estado,
    })
    setEditando(d.iddocente)
    setModal(true); setError(''); setExito('')
  }

  const onSubmit = async (e) => {
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

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este docente?')) return
    try {
      const res = await apiFetch(`/api/docentes/${id}`, { method: 'DELETE' })
      if (res.ok) load()
      else { const d = await res.json(); setError(d.message) }
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
            <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>
              <i className="bi bi-arrow-left"></i> Volver
            </button>
            <button className="btn btn-primary" onClick={abrirNuevo}>
              <i className="bi bi-plus"></i> Nuevo Docente
            </button>
          </div>
        </div>

        {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i>{error}</div>}
        {exito && <div className="alert alert-success"><i className="bi bi-check-circle"></i>{exito}</div>}

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
                  <tr>
                    <th>CI</th><th>Nombres</th><th>Apellidos</th><th>Profesión</th>
                    <th>Maestría</th><th>Diplomado</th><th>Correo</th><th>Estado</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {docentes.map(d => (
                    <tr key={d.iddocente}>
                      <td className="td-bold">{d.ci}</td>
                      <td>{d.nombres}</td>
                      <td>{d.apellidos}</td>
                      <td className="td-muted">{d.profesion}</td>
                      <td>{d.maestria ? <span className="badge badge-success">Si</span> : <span className="badge badge-neutral">No</span>}</td>
                      <td>{d.diplomadoedsup ? <span className="badge badge-success">Si</span> : <span className="badge badge-neutral">No</span>}</td>
                      <td className="td-muted">{d.correo}</td>
                      <td>
                        <span className={`badge ${d.estado === 'ACTIVO' ? 'badge-success' : 'badge-danger'}`}>
                          {d.estado}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-sm btn-outline-info" onClick={() => abrirEditar(d)}>
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => eliminar(d.iddocente)}>
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

      </div>

      {/* Modal formulario */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-header card-header-dark">
              <i className={`bi ${editando ? 'bi-pencil' : 'bi-person-plus'}`}></i>
              {editando ? 'Editar Docente' : 'Nuevo Docente'}
              <button className="btn-nav-logout" style={{ marginLeft: 'auto' }} onClick={() => setModal(false)}>
                <i className="bi bi-x"></i>
              </button>
            </div>
            <div className="card-body">
              {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i>{error}</div>}
              <form onSubmit={onSubmit}>
                <div className="form-section">
                  <div className="form-section-title"><i className="bi bi-person"></i> Datos Personales</div>
                  {!editando && (
                    <div className="form-group">
                      <label className="form-label">Usuario del sistema <span className="req">*</span></label>
                      <select className="form-select" name="idusuario" value={form.idusuario} onChange={onChange} required>
                        <option value="">Seleccione un usuario...</option>
                        {usuarios.map(u => (
                          <option key={u.idusuario} value={u.idusuario}>
                            {u.nombre_usuario} ({u.email})
                          </option>
                        ))}
                      </select>
                      {usuarios.length === 0 && (
                        <div className="form-hint">No hay usuarios disponibles sin docente asignado.</div>
                      )}
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
                      <label className="form-label">Profesión <span className="req">*</span></label>
                      <input className="form-input" name="profesion" value={form.profesion} onChange={onChange} required />
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
                    <label className="form-label">Estado <span className="req">*</span></label>
                    <select className="form-select" name="estado" value={form.estado} onChange={onChange} required>
                      <option value="ACTIVO">Activo</option>
                      <option value="INACTIVO">Inactivo</option>
                    </select>
                  </div>
                </div>
                <div className="form-section">
                  <div className="form-section-title"><i className="bi bi-mortarboard"></i> Requisitos Académicos</div>
                  <div className="form-group">
                    <label className="form-label">Maestría</label>
                    <input className="form-input" name="maestria" placeholder="Ej: Maestría en Ingeniería de Software"
                      value={form.maestria} onChange={onChange} />
                    <div className="form-hint">Nombre del grado o dejar vacío si no aplica</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Diplomado en Educación Superior</label>
                    <input className="form-input" name="diplomadoEdSup" placeholder="Ej: Diplomado en Docencia Universitaria"
                      value={form.diplomadoEdSup} onChange={onChange} />
                    <div className="form-hint">Nombre del diplomado o dejar vacío si no aplica</div>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-save"></i> {editando ? 'Guardar Cambios' : 'Registrar Docente'}
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
