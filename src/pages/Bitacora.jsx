import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { apiFetch } from '../api'

const BADGE = {
  LOGIN_EXITOSO: 'success',
  LOGIN_FALLIDO: 'danger',
  LOGOUT:        'neutral',
}

const ACCION_LABEL = {
  LOGIN_EXITOSO: 'Login exitoso',
  LOGIN_FALLIDO: 'Login fallido',
  LOGOUT:        'Logout',
}

const fmt = (f) => {
  try {
    return new Date(f).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'medium' })
  } catch { return '—' }
}

export default function Bitacora() {
  const navigate  = useNavigate()
  const usuario   = JSON.parse(localStorage.getItem('usuario'))
  const [registros, setRegistros] = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [filtroAccion, setFiltroAccion] = useState('')
  const [filtroUsuario, setFiltroUsuario] = useState('')

  if (!usuario || usuario.rol !== 'ADMINISTRADOR') {
    navigate('/dashboard')
    return null
  }

  const load = (accion = filtroAccion, usr = filtroUsuario) => {
    setLoading(true); setError('')
    const params = new URLSearchParams()
    if (accion) params.set('accion', accion)
    if (usr)    params.set('usuario', usr)
    apiFetch(`/api/bitacora?${params}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setRegistros)
      .catch(() => setError('Error al cargar la bitácora'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleFiltrar = (e) => {
    e.preventDefault()
    load(filtroAccion, filtroUsuario)
  }

  const totales = {
    LOGIN_EXITOSO: registros.filter(r => r.accion === 'LOGIN_EXITOSO').length,
    LOGIN_FALLIDO: registros.filter(r => r.accion === 'LOGIN_FALLIDO').length,
    LOGOUT:        registros.filter(r => r.accion === 'LOGOUT').length,
  }

  return (
    <div className="page">
      <Navbar usuario={usuario} />
      <div className="page-content">

        <div className="page-header">
          <div>
            <div className="page-title">Bitácora del sistema</div>
            <div className="page-subtitle">
              {registros.length} registros
              {' · '}
              <span className="badge badge-success" style={{ marginRight: 4 }}>{totales.LOGIN_EXITOSO} exitosos</span>
              <span className="badge badge-danger"  style={{ marginRight: 4 }}>{totales.LOGIN_FALLIDO} fallidos</span>
              <span className="badge badge-neutral">{totales.LOGOUT} logouts</span>
            </div>
          </div>
          <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>
            <i className="bi bi-arrow-left"></i> Volver
          </button>
        </div>

        {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i> {error}</div>}

        {/* Filtros */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ padding: '14px 20px' }}>
            <form onSubmit={handleFiltrar} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ margin: 0, flex: '1 1 180px' }}>
                <label className="form-label">Acción</label>
                <select className="form-select" value={filtroAccion} onChange={e => setFiltroAccion(e.target.value)}>
                  <option value="">Todas</option>
                  <option value="LOGIN_EXITOSO">Login exitoso</option>
                  <option value="LOGIN_FALLIDO">Login fallido</option>
                  <option value="LOGOUT">Logout</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0, flex: '2 1 220px' }}>
                <label className="form-label">Usuario</label>
                <input className="form-input" placeholder="Buscar por usuario..." value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <i className="bi bi-search"></i> Filtrar
              </button>
              <button type="button" className="btn btn-outline" onClick={() => { setFiltroAccion(''); setFiltroUsuario(''); load('', '') }}>
                Limpiar
              </button>
            </form>
          </div>
        </div>

        {/* Tabla */}
        <div className="card">
          {loading ? (
            <div className="spinner-box"><span className="spinner"></span></div>
          ) : registros.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><i className="bi bi-journal-text"></i></div>
              <div className="empty-state-text">No hay registros en la bitácora</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha y hora</th>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>IP</th>
                    <th>Acción</th>
                    <th>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map(r => (
                    <tr key={r.idbitacora}>
                      <td className="td-muted" style={{ whiteSpace: 'nowrap' }}>{fmt(r.fecha)}</td>
                      <td className="td-bold">{r.nombre_usuario || '—'}</td>
                      <td className="td-muted">{r.rol || '—'}</td>
                      <td className="td-muted" style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.ip || '—'}</td>
                      <td>
                        <span className={`badge badge-${BADGE[r.accion] || 'neutral'}`}>
                          {ACCION_LABEL[r.accion] || r.accion}
                        </span>
                      </td>
                      <td className="td-muted">{r.descripcion || '—'}</td>
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
