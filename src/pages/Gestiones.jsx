import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { apiFetch } from '../api'

const PERIODOS = ['I', 'II', 'Verano']
const INIT = { anio: new Date().getFullYear(), periodo: 'I' }

export default function Gestiones() {
  const navigate  = useNavigate()
  const usuario   = JSON.parse(localStorage.getItem('usuario'))
  const [lista,   setLista]   = useState([])
  const [loading, setLoading] = useState(false)
  const [modal,   setModal]   = useState(false)
  const [editando, setEditando] = useState(null)
  const [form,    setForm]    = useState(INIT)
  const [error,   setError]   = useState('')
  const [exito,   setExito]   = useState('')

  if (!usuario || usuario.rol !== 'ADMINISTRADOR') { navigate('/dashboard'); return null }

  const load = () => {
    setLoading(true)
    apiFetch('/api/gestiones')
      .then(r => r.ok ? r.json() : [])
      .then(setLista)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const onChange = e => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const abrirNuevo = () => {
    setForm(INIT); setEditando(null); setError(''); setExito(''); setModal(true)
  }

  const abrirEditar = g => {
    setForm({ anio: g.anio, periodo: g.periodo })
    setEditando(g.idgestion); setError(''); setExito(''); setModal(true)
  }

  const onSubmit = async e => {
    e.preventDefault(); setError('')
    try {
      const res  = editando
        ? await apiFetch(`/api/gestiones/${editando}`, { method: 'PUT',  body: JSON.stringify(form) })
        : await apiFetch('/api/gestiones',             { method: 'POST', body: JSON.stringify(form) })
      const data = await res.json()
      if (res.ok) { setExito(data.message); setModal(false); load() }
      else setError(data.message || 'Error al guardar')
    } catch { setError('Error de conexión') }
  }

  const eliminar = async g => {
    if (!window.confirm(`¿Eliminar gestión ${g.anio} — ${g.periodo}?`)) return
    try {
      const res  = await apiFetch(`/api/gestiones/${g.idgestion}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) { setExito(data.message); load() }
      else setError(data.message)
    } catch { setError('Error de conexión') }
  }

  return (
    <div className="page">
      <Navbar usuario={usuario} />
      <div className="page-content">

        <div className="page-header">
          <div>
            <div className="page-title">Gestiones Académicas</div>
            <div className="page-subtitle">{lista.length} gestiones registradas</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>
              <i className="bi bi-arrow-left"></i> Volver
            </button>
            <button className="btn btn-primary" onClick={abrirNuevo}>
              <i className="bi bi-plus"></i> Nueva Gestión
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
              <div className="empty-state-icon"><i className="bi bi-calendar3"></i></div>
              <div className="empty-state-text">No hay gestiones registradas. Creá una para poder confirmar inscripciones.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Año</th>
                    <th>Período</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map(g => (
                    <tr key={g.idgestion}>
                      <td className="td-muted">{g.idgestion}</td>
                      <td className="td-bold">{g.anio}</td>
                      <td>{g.periodo}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-sm btn-outline-info" onClick={() => abrirEditar(g)}>
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => eliminar(g)}>
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

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 420 }}>
            <div className="card-header card-header-dark">
              <i className={`bi ${editando ? 'bi-pencil' : 'bi-calendar-plus'}`}></i>
              {editando ? 'Editar Gestión' : 'Nueva Gestión'}
              <button className="btn-nav-logout" style={{ marginLeft: 'auto' }} onClick={() => setModal(false)}>
                <i className="bi bi-x"></i>
              </button>
            </div>
            <div className="card-body">
              {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i> {error}</div>}
              <form onSubmit={onSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Año <span className="req">*</span></label>
                    <input
                      type="number"
                      className="form-input"
                      name="anio"
                      value={form.anio}
                      onChange={onChange}
                      min={2000}
                      max={2100}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Período <span className="req">*</span></label>
                    <select className="form-select" name="periodo" value={form.periodo} onChange={onChange} required>
                      {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-actions" style={{ marginTop: 20 }}>
                  <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-save"></i> {editando ? 'Guardar Cambios' : 'Crear Gestión'}
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
