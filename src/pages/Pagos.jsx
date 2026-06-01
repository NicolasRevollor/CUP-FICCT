import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { apiFetch } from '../api'

const ESTADO_BADGE = { CONFIRMADO: 'success', PENDIENTE: 'warning', RECHAZADO: 'danger' }
const METODOS = ['EFECTIVO', 'TRANSFERENCIA', 'QR', 'DEPOSITO']

const fmt = (f) => { try { return new Date(f).toLocaleDateString('es-BO') } catch { return '—' } }

function Pagos() {
  const navigate = useNavigate()
  const usuario  = JSON.parse(localStorage.getItem('usuario'))
  const [pagos, setPagos]       = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [exito, setExito]       = useState('')
  const [modal, setModal]       = useState(false)
  const [busci, setBusci]       = useState('')
  const [postulante, setPost]   = useState(null)
  const [buscando, setBuscando] = useState(false)
  const [form, setForm]         = useState({
    monto: '', metodopago: 'EFECTIVO', codgotransaccion: '', estadopago: 'CONFIRMADO',
  })

  if (!usuario) { navigate('/'); return null }

  const load = () => {
    setLoading(true)
    apiFetch('/api/pagos')
      .then(r => r.ok ? r.json() : [])
      .then(setPagos)
      .catch(() => setError('Error al cargar pagos'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const buscarPostulante = async (e) => {
    e.preventDefault(); setBuscando(true); setPost(null); setError('')
    try {
      const r = await apiFetch(`/api/postulantes/buscar?q=${encodeURIComponent(busci)}`)
      const d = await r.json()
      const p = d.data?.find(x => x.ci === busci)
      if (!p) setError('No se encontró postulante con ese CI')
      else setPost(p)
    } catch { setError('Error de conexión') }
    finally { setBuscando(false) }
  }

  const onSubmit = async (e) => {
    e.preventDefault(); setError('')
    if (!postulante) { setError('Debe buscar un postulante primero'); return }
    try {
      const res  = await apiFetch('/api/pagos', {
        method: 'POST',
        body: JSON.stringify({ idpostulante: postulante.idpostulante, ...form }),
      })
      const data = await res.json()
      if (res.ok) {
        setExito('Pago registrado correctamente')
        setModal(false); setBusci(''); setPost(null)
        setForm({ monto: '', metodopago: 'EFECTIVO', codgotransaccion: '', estadopago: 'CONFIRMADO' })
        load()
      } else setError(data.message || 'Error al registrar pago')
    } catch { setError('Error de conexión') }
  }

  const cambiarEstado = async (id, estado) => {
    try {
      await apiFetch(`/api/pagos/${id}`, { method: 'PUT', body: JSON.stringify({ estadopago: estado }) })
      load()
    } catch { setError('Error al actualizar estado') }
  }

  const total = pagos.filter(p => p.estadopago === 'CONFIRMADO').reduce((s, p) => s + Number(p.monto), 0)

  return (
    <div className="page">
      <Navbar usuario={usuario} />
      <div className="page-content">

        <div className="page-header">
          <div>
            <div className="page-title">Pagos</div>
            <div className="page-subtitle">Total confirmado: <strong>Bs. {total.toFixed(2)}</strong></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>
              <i className="bi bi-arrow-left"></i> Volver
            </button>
            <button className="btn btn-primary" onClick={() => {
              setModal(true); setError(''); setExito(''); setPost(null); setBusci('')
            }}>
              <i className="bi bi-plus"></i> Registrar Pago
            </button>
          </div>
        </div>

        {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i>{error}</div>}
        {exito && <div className="alert alert-success"><i className="bi bi-check-circle"></i>{exito}</div>}

        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
          <div className="stat-card stat-card-success">
            <div className="stat-icon"><i className="bi bi-check-circle"></i></div>
            <div className="stat-value">{pagos.filter(p => p.estadopago === 'CONFIRMADO').length}</div>
            <div className="stat-label">Confirmados</div>
          </div>
          <div className="stat-card stat-card-warning">
            <div className="stat-icon"><i className="bi bi-clock"></i></div>
            <div className="stat-value">{pagos.filter(p => p.estadopago === 'PENDIENTE').length}</div>
            <div className="stat-label">Pendientes</div>
          </div>
          <div className="stat-card stat-card-danger">
            <div className="stat-icon"><i className="bi bi-x-circle"></i></div>
            <div className="stat-value">{pagos.filter(p => p.estadopago === 'RECHAZADO').length}</div>
            <div className="stat-label">Rechazados</div>
          </div>
        </div>

        <div className="card">
          {loading ? (
            <div className="spinner-box"><span className="spinner"></span></div>
          ) : pagos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><i className="bi bi-cash-stack"></i></div>
              <div className="empty-state-text">No hay pagos registrados</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th><th>CI</th><th>Postulante</th><th>Monto</th>
                    <th>Método</th><th>Código</th><th>Fecha</th><th>Estado</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map(p => (
                    <tr key={p.idpagos}>
                      <td className="td-muted">{p.idpagos}</td>
                      <td className="td-bold">{p.ci}</td>
                      <td>{p.nombres} {p.apellidos}</td>
                      <td><strong>Bs. {Number(p.monto).toFixed(2)}</strong></td>
                      <td><span className="badge badge-neutral">{p.metodopago}</span></td>
                      <td className="td-muted">{p.codgotransaccion || '—'}</td>
                      <td className="td-muted">{fmt(p.fechapago)}</td>
                      <td>
                        <span className={`badge badge-${ESTADO_BADGE[p.estadopago] || 'neutral'}`}>
                          {p.estadopago}
                        </span>
                      </td>
                      <td>
                        {p.estadopago === 'PENDIENTE' && (
                          <button className="btn btn-sm btn-outline-info"
                            onClick={() => cambiarEstado(p.idpagos, 'CONFIRMADO')}>
                            Confirmar
                          </button>
                        )}
                        {p.estadopago === 'CONFIRMADO' && (
                          <button className="btn btn-sm btn-outline-danger"
                            onClick={() => cambiarEstado(p.idpagos, 'RECHAZADO')}>
                            Rechazar
                          </button>
                        )}
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
          <div className="card" style={{ width: '100%', maxWidth: 520 }}>
            <div className="card-header card-header-dark">
              <i className="bi bi-cash-stack"></i> Registrar Pago
              <button className="btn-nav-logout" style={{ marginLeft: 'auto' }} onClick={() => setModal(false)}>
                <i className="bi bi-x"></i>
              </button>
            </div>
            <div className="card-body">
              {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i>{error}</div>}

              <div className="form-section">
                <div className="form-section-title"><i className="bi bi-search"></i> Buscar Postulante</div>
                <form onSubmit={buscarPostulante} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input className="form-input" placeholder="CI exacto del postulante..."
                    value={busci} onChange={e => setBusci(e.target.value)} required style={{ flex: 1 }} />
                  <button className="btn btn-primary" type="submit" disabled={buscando}>
                    <i className="bi bi-search"></i>
                  </button>
                </form>
                {postulante && (
                  <div className="alert alert-success" style={{ marginBottom: 0 }}>
                    <i className="bi bi-person-check"></i>
                    <strong>{postulante.nombres} {postulante.apellidos}</strong> — CI: {postulante.ci}
                  </div>
                )}
              </div>

              <form onSubmit={onSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Monto (Bs.) <span className="req">*</span></label>
                    <input type="number" className="form-input" step="0.01" min="0"
                      value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Método de Pago <span className="req">*</span></label>
                    <select className="form-select" value={form.metodopago}
                      onChange={e => setForm(f => ({ ...f, metodopago: e.target.value }))}>
                      {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Código de Transacción</label>
                    <input className="form-input" placeholder="Opcional..."
                      value={form.codgotransaccion}
                      onChange={e => setForm(f => ({ ...f, codgotransaccion: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estado <span className="req">*</span></label>
                    <select className="form-select" value={form.estadopago}
                      onChange={e => setForm(f => ({ ...f, estadopago: e.target.value }))}>
                      <option value="CONFIRMADO">Confirmado</option>
                      <option value="PENDIENTE">Pendiente</option>
                    </select>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-save"></i> Registrar Pago
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

export default Pagos
