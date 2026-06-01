import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { apiFetch } from '../api'

const ESTADO_BADGE = { CONFIRMADA: 'success', PENDIENTE: 'warning', ANULADA: 'danger' }

const fmt = (f) => { try { return new Date(f).toLocaleDateString('es-BO') } catch { return '—' } }

function Inscripciones() {
  const navigate = useNavigate()
  const usuario  = JSON.parse(localStorage.getItem('usuario'))
  const [inscripciones, setInscripciones] = useState([])
  const [gestiones, setGestiones]         = useState([])
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')
  const [exito, setExito]                 = useState('')
  const [modal, setModal]                 = useState(false)
  const [busci, setBusci]                 = useState('')
  const [postulante, setPost]             = useState(null)
  const [pagoPostulante, setPago]         = useState(null)
  const [buscando, setBuscando]           = useState(false)
  const [idgestion, setIdgestion]         = useState('')

  if (!usuario) { navigate('/'); return null }

  const load = () => {
    setLoading(true)
    apiFetch('/api/inscripciones')
      .then(r => r.ok ? r.json() : [])
      .then(setInscripciones)
      .catch(() => setError('Error al cargar inscripciones'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    apiFetch('/api/inscripciones/gestiones')
      .then(r => r.ok ? r.json() : [])
      .then(setGestiones)
      .catch(() => {})
  }, [])

  const buscarPostulante = async (e) => {
    e.preventDefault(); setBuscando(true); setPost(null); setPago(null); setError('')
    try {
      const r = await apiFetch(`/api/postulantes/buscar?q=${encodeURIComponent(busci)}`)
      const d = await r.json()
      const p = d.data?.find(x => x.ci === busci)
      if (!p) { setError('No se encontró postulante con ese CI'); return }
      setPost(p)

      // Buscar pago confirmado del postulante
      const rp = await apiFetch(`/api/pagos/postulante/${p.idpostulante}`)
      const dp = await rp.json()
      const pago = dp.find(x => x.estadopago === 'CONFIRMADO')
      if (pago) setPago(pago)
      else setError('El postulante no tiene un pago CONFIRMADO. Registre y confirme el pago primero.')
    } catch { setError('Error de conexión') }
    finally { setBuscando(false) }
  }

  const onSubmit = async (e) => {
    e.preventDefault(); setError('')
    if (!postulante) { setError('Debe buscar un postulante primero'); return }
    if (!pagoPostulante) { setError('El postulante no tiene pago confirmado'); return }
    if (!idgestion) { setError('Debe seleccionar una gestión'); return }
    try {
      const res  = await apiFetch('/api/inscripciones', {
        method: 'POST',
        body: JSON.stringify({ idpostulante: postulante.idpostulante, idgestion }),
      })
      const data = await res.json()
      if (res.ok) {
        setExito('Inscripción registrada correctamente')
        setModal(false); setBusci(''); setPost(null); setPago(null); setIdgestion('')
        load()
      } else setError(data.message || 'Error al registrar')
    } catch { setError('Error de conexión') }
  }

  const cambiarEstado = async (id, estado) => {
    try {
      await apiFetch(`/api/inscripciones/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ estadoinscripcion: estado }),
      })
      load()
    } catch { setError('Error al actualizar estado') }
  }

  return (
    <div className="page">
      <Navbar usuario={usuario} />
      <div className="page-content">

        <div className="page-header">
          <div>
            <div className="page-title">Inscripciones</div>
            <div className="page-subtitle">{inscripciones.length} inscripciones registradas</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>
              <i className="bi bi-arrow-left"></i> Volver
            </button>
            <button className="btn btn-primary" onClick={() => {
              setModal(true); setError(''); setExito(''); setPost(null); setPago(null); setBusci('')
            }}>
              <i className="bi bi-plus"></i> Nueva Inscripción
            </button>
          </div>
        </div>

        {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i>{error}</div>}
        {exito && <div className="alert alert-success"><i className="bi bi-check-circle"></i>{exito}</div>}

        <div className="alert alert-info" style={{ fontSize: 13 }}>
          <i className="bi bi-info-circle"></i>
          Para inscribir un postulante, primero debe tener un pago con estado <strong>CONFIRMADO</strong> en el módulo de Pagos.
        </div>

        <div className="card">
          {loading ? (
            <div className="spinner-box"><span className="spinner"></span></div>
          ) : inscripciones.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><i className="bi bi-clipboard"></i></div>
              <div className="empty-state-text">No hay inscripciones registradas</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th><th>CI</th><th>Postulante</th><th>Monto Pago</th>
                    <th>Gestión</th><th>Fecha</th><th>Estado</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {inscripciones.map(i => (
                    <tr key={i.idinscripcion}>
                      <td className="td-muted">{i.idinscripcion}</td>
                      <td className="td-bold">{i.ci}</td>
                      <td>{i.nombres} {i.apellidos}</td>
                      <td>Bs. {Number(i.monto).toFixed(2)}</td>
                      <td className="td-muted">{i.anio} — {i.periodo}</td>
                      <td className="td-muted">{fmt(i.fechainscripcion)}</td>
                      <td>
                        <span className={`badge badge-${ESTADO_BADGE[i.estadoinscripcion] || 'neutral'}`}>
                          {i.estadoinscripcion}
                        </span>
                      </td>
                      <td>
                        {i.estadoinscripcion === 'PENDIENTE' && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-sm btn-outline-info"
                              onClick={() => cambiarEstado(i.idinscripcion, 'CONFIRMADA')}>
                              Confirmar
                            </button>
                            <button className="btn btn-sm btn-outline-danger"
                              onClick={() => cambiarEstado(i.idinscripcion, 'ANULADA')}>
                              Anular
                            </button>
                          </div>
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
              <i className="bi bi-clipboard-plus"></i> Nueva Inscripción
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

                {postulante && !pagoPostulante && (
                  <div className="alert alert-warning">
                    <i className="bi bi-exclamation-triangle"></i>
                    Postulante encontrado pero sin pago CONFIRMADO. Vaya a <strong>Pagos</strong> primero.
                  </div>
                )}

                {postulante && pagoPostulante && (
                  <div className="alert alert-success">
                    <div style={{ marginBottom: 4 }}>
                      <i className="bi bi-person-check"></i>
                      <strong> {postulante.nombres} {postulante.apellidos}</strong> — CI: {postulante.ci}
                    </div>
                    <div style={{ fontSize: 12 }}>
                      <i className="bi bi-check-circle"></i> Pago confirmado: <strong>Bs. {Number(pagoPostulante.monto).toFixed(2)}</strong> ({pagoPostulante.metodopago})
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={onSubmit}>
                <div className="form-group">
                  <label className="form-label">Gestión Académica <span className="req">*</span></label>
                  <select className="form-select" value={idgestion}
                    onChange={e => setIdgestion(e.target.value)} required>
                    <option value="">Seleccione gestión...</option>
                    {gestiones.map(g => (
                      <option key={g.idgestion} value={g.idgestion}>
                        {g.anio} — {g.periodo}
                      </option>
                    ))}
                  </select>
                  {gestiones.length === 0 && (
                    <div className="form-hint">No hay gestiones registradas en la base de datos.</div>
                  )}
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={!pagoPostulante}>
                    <i className="bi bi-save"></i> Registrar Inscripción
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

export default Inscripciones
