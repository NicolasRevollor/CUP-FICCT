import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { apiFetch } from '../api'
import BASE_URL from '../api'

const BADGE = { PENDIENTE: 'warning', APROBADO: 'success', RECHAZADO: 'danger' }
const fmt = (f) => { try { return new Date(f).toLocaleDateString('es-BO') } catch { return '—' } }

export default function PostulacionesDocente() {
  const navigate  = useNavigate()
  const usuario   = JSON.parse(localStorage.getItem('usuario'))
  const [lista, setLista]           = useState([])
  const [loading, setLoading]       = useState(false)
  const [detalle, setDetalle]       = useState(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [error, setError]           = useState('')
  const [exito, setExito]           = useState('')
  const [obs, setObs]               = useState('')
  const [accionLoading, setAccion]  = useState(false)

  if (!usuario) { navigate('/'); return null }

  const load = () => {
    setLoading(true)
    apiFetch('/api/postulacion-docente')
      .then(r => r.ok ? r.json() : [])
      .then(setLista)
      .catch(() => setError('Error al cargar postulaciones'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const verDetalle = async (id) => {
    setLoadingDetalle(true); setDetalle(null); setObs(''); setError(''); setExito('')
    try {
      const r = await apiFetch(`/api/postulacion-docente/${id}`)
      const d = await r.json()
      setDetalle(d)
      setObs(d.postulacion.observacion || '')
    } catch { setError('Error al cargar detalle') }
    finally { setLoadingDetalle(false) }
  }

  const cambiarEstado = async (estado) => {
    if (!detalle) return
    setAccion(true); setError(''); setExito('')
    try {
      const r = await apiFetch(`/api/postulacion-docente/${detalle.postulacion.idpostulacion}`, {
        method: 'PUT',
        body: JSON.stringify({ estado, observacion: obs }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.message || 'Error'); return }
      setExito(estado === 'APROBADO' ? '¡Postulación aprobada! Se enviaron las credenciales por correo.' : 'Postulación rechazada.')
      setDetalle(prev => ({ ...prev, postulacion: { ...prev.postulacion, estado } }))
      load()
    } catch { setError('Error de conexión') }
    finally { setAccion(false) }
  }

  const descargarDoc = (idPostulacion, idDocumento, nombreOriginal) => {
    const token = localStorage.getItem('token')
    fetch(`${BASE_URL}/api/postulacion-docente/${idPostulacion}/documentos/${idDocumento}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
      .then(r => r.ok ? r.blob() : Promise.reject())
      .then(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = nombreOriginal; a.click()
        URL.revokeObjectURL(url)
      })
      .catch(() => setError('No se pudo descargar el archivo'))
  }

  const pendientes = lista.filter(p => p.estado === 'PENDIENTE').length

  return (
    <div className="page">
      <Navbar usuario={usuario} />
      <div className="page-content">

        <div className="page-header">
          <div>
            <div className="page-title">Postulaciones Docente</div>
            <div className="page-subtitle">
              {lista.length} postulaciones
              {pendientes > 0 && <span className="badge badge-warning" style={{ marginLeft: 8 }}>{pendientes} pendientes</span>}
            </div>
          </div>
          <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>
            <i className="bi bi-arrow-left"></i> Volver
          </button>
        </div>

        {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i> {error}</div>}
        {exito && <div className="alert alert-success"><i className="bi bi-check-circle"></i> {exito}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: detalle ? '1fr 380px' : '1fr', gap: 16, alignItems: 'start' }}>

          {/* Lista */}
          <div className="card">
            {loading ? (
              <div className="spinner-box"><span className="spinner"></span></div>
            ) : lista.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><i className="bi bi-person-badge"></i></div>
                <div className="empty-state-text">No hay postulaciones registradas</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>CI</th><th>Nombre</th><th>Profesión</th><th>Docs</th><th>Fecha</th><th>Estado</th><th></th></tr>
                  </thead>
                  <tbody>
                    {lista.map(p => (
                      <tr key={p.idpostulacion} style={{ cursor: 'pointer', background: detalle?.postulacion?.idpostulacion === p.idpostulacion ? '#f0f4ff' : '' }}
                        onClick={() => verDetalle(p.idpostulacion)}>
                        <td className="td-bold">{p.ci}</td>
                        <td>{p.nombres} {p.apellidos}</td>
                        <td className="td-muted">{p.profesion || '—'}</td>
                        <td><span className="badge badge-neutral"><i className="bi bi-paperclip"></i> {p.total_documentos}</span></td>
                        <td className="td-muted">{fmt(p.fecha_postulacion)}</td>
                        <td><span className={`badge badge-${BADGE[p.estado] || 'neutral'}`}>{p.estado}</span></td>
                        <td><i className="bi bi-chevron-right" style={{ color: '#9ca3af' }}></i></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Panel detalle */}
          {detalle && (
            <div className="card" style={{ position: 'sticky', top: 16 }}>
              <div className="card-header card-header-dark" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><i className="bi bi-person-badge"></i> Detalle</span>
                <button className="btn-nav-logout" style={{ marginLeft: 'auto' }} onClick={() => setDetalle(null)}>
                  <i className="bi bi-x"></i>
                </button>
              </div>
              <div className="card-body">
                {loadingDetalle ? (
                  <div className="spinner-box"><span className="spinner"></span></div>
                ) : (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>{detalle.postulacion.nombres} {detalle.postulacion.apellidos}</div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>CI: {detalle.postulacion.ci} · {detalle.postulacion.correo}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                      {[
                        ['Profesión', detalle.postulacion.profesion],
                        ['Maestría', detalle.postulacion.maestria],
                        ['Teléfono', detalle.postulacion.telefono],
                        ['Dip. Ed. Sup.', detalle.postulacion.diplomadoedsup ? 'Sí' : 'No'],
                      ].map(([k, v]) => v ? (
                        <div key={k} style={{ background: '#f3f4f6', borderRadius: 6, padding: '8px 10px' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 2 }}>{k}</div>
                          <div style={{ fontSize: 13, color: '#111827' }}>{v}</div>
                        </div>
                      ) : null)}
                    </div>

                    {/* Documentos */}
                    {detalle.documentos.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>DOCUMENTOS ADJUNTOS</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {detalle.documentos.map(doc => (
                            <button key={doc.iddocumento} type="button"
                              onClick={() => descargarDoc(detalle.postulacion.idpostulacion, doc.iddocumento, doc.nombre_original)}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                              <i className="bi bi-file-earmark-arrow-down" style={{ color: '#0d2451', fontSize: 16, flexShrink: 0 }}></i>
                              <span style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nombre_original}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Observación */}
                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label className="form-label">Observación (opcional)</label>
                      <textarea className="form-input" rows={2} value={obs} onChange={e => setObs(e.target.value)}
                        placeholder="Motivo de aprobación o rechazo..." style={{ resize: 'none' }} />
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <span className={`badge badge-${BADGE[detalle.postulacion.estado]}`} style={{ alignSelf: 'center', flex: 1, textAlign: 'center', padding: '6px 0' }}>
                        {detalle.postulacion.estado}
                      </span>
                      {detalle.postulacion.estado === 'PENDIENTE' && (
                        <>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => cambiarEstado('RECHAZADO')} disabled={accionLoading}>
                            <i className="bi bi-x-circle"></i> Rechazar
                          </button>
                          <button className="btn btn-sm btn-outline-info" onClick={() => cambiarEstado('APROBADO')} disabled={accionLoading}>
                            <i className="bi bi-check-circle"></i> Aprobar
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
