import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { apiFetch } from '../api'

const INIT = { nombre_usuario: '', email: '', password: '', idrol: '', estado: 'ACTIVO' }

export default function Usuarios() {
  const navigate = useNavigate()
  const usuario  = JSON.parse(localStorage.getItem('usuario'))

  const [lista, setLista]     = useState([])
  const [roles, setRoles]     = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [exito, setExito]     = useState('')
  const [modal, setModal]     = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm]       = useState(INIT)

  if (!usuario || usuario.rol !== 'ADMINISTRADOR') { navigate('/dashboard'); return null }

  const load = () => {
    setLoading(true)
    apiFetch('/api/usuarios')
      .then(r => r.ok ? r.json() : [])
      .then(setLista)
      .catch(() => setError('Error al cargar usuarios'))
      .finally(() => setLoading(false))
  }

  const loadRoles = () => {
    apiFetch('/api/usuarios/roles')
      .then(r => r.ok ? r.json() : [])
      .then(setRoles)
      .catch(() => {})
  }

  useEffect(() => { load(); loadRoles() }, [])

  const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const abrirNuevo = () => {
    setForm(INIT); setEditando(null); setModal(true); setError(''); setExito('')
  }

  const abrirEditar = u => {
    setForm({ nombre_usuario: u.nombre_usuario, email: u.email, password: '', idrol: '', estado: u.estado })
    setEditando(u.idusuario); setModal(true); setError(''); setExito('')
  }

  const onSubmit = async e => {
    e.preventDefault(); setError('')
    try {
      const body = editando
        ? { email: form.email, estado: form.estado }
        : { nombre_usuario: form.nombre_usuario, email: form.email, password: form.password, idrol: form.idrol }

      const res = editando
        ? await apiFetch(`/api/usuarios/${editando}`, { method: 'PUT', body: JSON.stringify(body) })
        : await apiFetch('/api/usuarios', { method: 'POST', body: JSON.stringify(body) })

      const data = await res.json()
      if (res.ok) { setExito(data.message); setModal(false); load() }
      else setError(data.message || 'Error al guardar')
    } catch { setError('Error de conexión') }
  }

  const desactivar = async u => {
    if (!window.confirm(`¿Desactivar al usuario "${u.nombre_usuario}"?`)) return
    try {
      const res = await apiFetch(`/api/usuarios/${u.idusuario}`, { method: 'DELETE' })
      if (res.ok) { load(); setExito('Usuario desactivado') }
      else { const d = await res.json(); setError(d.message) }
    } catch { setError('Error de conexión') }
  }

  return (
    <div className="page">
      <Navbar usuario={usuario} />
      <div className="page-content">

        <div className="page-header">
          <div>
            <div className="page-title">Usuarios del sistema</div>
            <div className="page-subtitle">
              {lista.length} usuarios ·{' '}
              <span className="badge badge-success">{lista.filter(u => u.estado === 'ACTIVO').length} activos</span>
              {' '}
              <span className="badge badge-danger">{lista.filter(u => u.estado === 'INACTIVO').length} inactivos</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>
              <i className="bi bi-arrow-left"></i> Volver
            </button>
            <button className="btn btn-primary" onClick={abrirNuevo}>
              <i className="bi bi-person-plus"></i> Nuevo Usuario
            </button>
          </div>
        </div>

        {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i> {error}</div>}
        {exito && <div className="alert alert-success"><i className="bi bi-check-circle"></i> {exito}</div>}

        <div className="card">
          {loading ? (
            <div className="spinner-box"><span className="spinner"></span></div>
          ) : lista.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><i className="bi bi-people"></i></div>
              <div className="empty-state-text">No hay usuarios registrados</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Estado</th><th></th></tr>
                </thead>
                <tbody>
                  {lista.map(u => (
                    <tr key={u.idusuario}>
                      <td className="td-bold"><i className="bi bi-person-circle" style={{ marginRight: 6, color: '#9ca3af' }}></i>{u.nombre_usuario}</td>
                      <td className="td-muted">{u.email}</td>
                      <td><span className="badge badge-neutral">{u.rol || 'SIN ROL'}</span></td>
                      <td>
                        <span className={`badge ${u.estado === 'ACTIVO' ? 'badge-success' : 'badge-danger'}`}>
                          {u.estado}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-sm btn-outline-info" onClick={() => abrirEditar(u)} title="Editar">
                            <i className="bi bi-pencil"></i>
                          </button>
                          {u.estado === 'ACTIVO' && (
                            <button className="btn btn-sm btn-outline-danger" onClick={() => desactivar(u)} title="Desactivar">
                              <i className="bi bi-person-x"></i>
                            </button>
                          )}
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

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-header card-header-dark">
              <i className={`bi ${editando ? 'bi-pencil' : 'bi-person-plus'}`}></i>
              {editando ? 'Editar Usuario' : 'Nuevo Usuario'}
              <button className="btn-nav-logout" style={{ marginLeft: 'auto' }} onClick={() => setModal(false)}>
                <i className="bi bi-x"></i>
              </button>
            </div>
            <div className="card-body">
              {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i> {error}</div>}
              <form onSubmit={onSubmit}>
                {!editando ? (
                  <>
                    <div className="form-group">
                      <label className="form-label">Nombre de usuario <span className="req">*</span></label>
                      <input className="form-input" name="nombre_usuario" value={form.nombre_usuario} onChange={onChange} required placeholder="Ej: jperez" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email <span className="req">*</span></label>
                      <input type="email" className="form-input" name="email" value={form.email} onChange={onChange} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contraseña inicial <span className="req">*</span></label>
                      <input type="password" className="form-input" name="password" value={form.password} onChange={onChange} required minLength={6} />
                      <div className="form-hint">El usuario deberá cambiarla en su primer ingreso.</div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Rol <span className="req">*</span></label>
                      <select className="form-select" name="idrol" value={form.idrol} onChange={onChange} required>
                        <option value="">Seleccione un rol...</option>
                        {roles.map(r => <option key={r.idrol} value={r.idrol}>{r.nombre}</option>)}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input type="email" className="form-input" name="email" value={form.email} onChange={onChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Estado</label>
                      <select className="form-select" name="estado" value={form.estado} onChange={onChange}>
                        <option value="ACTIVO">Activo</option>
                        <option value="INACTIVO">Inactivo</option>
                      </select>
                    </div>
                  </>
                )}
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-save"></i> {editando ? 'Guardar Cambios' : 'Crear Usuario'}
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
