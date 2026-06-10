import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { apiFetch } from '../api'

const ESTADO_BADGE  = { PRESENTE: 'success', AUSENTE: 'danger', JUSTIFICADO: 'warning' }
const ESTADOS       = ['PRESENTE', 'AUSENTE', 'JUSTIFICADO']

const hoy = () => new Date().toISOString().slice(0, 10)

export default function Asistencia() {
  const navigate = useNavigate()
  const usuario  = JSON.parse(localStorage.getItem('usuario'))

  const [grupos, setGrupos]           = useState([])
  const [idGrupo, setIdGrupo]         = useState('')
  const [fecha, setFecha]             = useState(hoy())
  const [postulantes, setPostulantes] = useState([])
  const [registros, setRegistros]     = useState({}) // { idpostulante: { estado, observacion } }
  const [loading, setLoading]         = useState(false)
  const [guardando, setGuardando]     = useState(false)
  const [error, setError]             = useState('')
  const [exito, setExito]             = useState('')

  if (!usuario || !['ADMINISTRADOR', 'DOCENTE'].includes(usuario.rol)) { navigate('/dashboard'); return null }

  useEffect(() => {
    apiFetch('/api/grupos').then(r => r.ok ? r.json() : []).then(setGrupos).catch(() => {})
  }, [])

  const cargarAsistencia = async () => {
    if (!idGrupo || !fecha) return
    setLoading(true); setError(''); setExito('')

    try {
      // Cargar postulantes del grupo
      const rPost = await apiFetch(`/api/grupos/${idGrupo}/postulantes`)
      const post  = rPost.ok ? await rPost.json() : []

      // Cargar asistencia existente para esa fecha
      const rAsist = await apiFetch(`/api/asistencia/grupo/${idGrupo}?fecha=${fecha}`)
      const asist  = rAsist.ok ? await rAsist.json() : []

      // Construir mapa de registros existentes
      const mapa = {}
      asist.forEach(a => { mapa[a.idpostulante] = { estado: a.estado, observacion: a.observacion || '' } })

      // Para postulantes sin registro previo, default PRESENTE
      post.forEach(p => {
        if (!mapa[p.idpostulante]) mapa[p.idpostulante] = { estado: 'PRESENTE', observacion: '' }
      })

      setPostulantes(post)
      setRegistros(mapa)
    } catch { setError('Error al cargar datos') }
    finally { setLoading(false) }
  }

  useEffect(() => { cargarAsistencia() }, [idGrupo, fecha])

  const setEstado = (idPostulante, estado) =>
    setRegistros(r => ({ ...r, [idPostulante]: { ...r[idPostulante], estado } }))

  const setObservacion = (idPostulante, observacion) =>
    setRegistros(r => ({ ...r, [idPostulante]: { ...r[idPostulante], observacion } }))

  const marcarTodos = estado =>
    setRegistros(r => {
      const nuevo = { ...r }
      postulantes.forEach(p => { nuevo[p.idpostulante] = { ...nuevo[p.idpostulante], estado } })
      return nuevo
    })

  const guardar = async () => {
    if (!idGrupo || !fecha || postulantes.length === 0) return
    setGuardando(true); setError(''); setExito('')

    const listaRegistros = postulantes.map(p => ({
      idpostulante: p.idpostulante,
      estado:       registros[p.idpostulante]?.estado || 'PRESENTE',
      observacion:  registros[p.idpostulante]?.observacion || null,
    }))

    try {
      const res  = await apiFetch('/api/asistencia', {
        method: 'POST',
        body: JSON.stringify({ idgrupo: Number(idGrupo), fecha, registros: listaRegistros }),
      })
      const data = await res.json()
      if (res.ok) setExito(`Asistencia guardada: ${data.insertados} nuevos, ${data.actualizados} actualizados.`)
      else setError(data.message || 'Error al guardar')
    } catch { setError('Error de conexión') }
    finally { setGuardando(false) }
  }

  const resumen = {
    PRESENTE:    postulantes.filter(p => registros[p.idpostulante]?.estado === 'PRESENTE').length,
    AUSENTE:     postulantes.filter(p => registros[p.idpostulante]?.estado === 'AUSENTE').length,
    JUSTIFICADO: postulantes.filter(p => registros[p.idpostulante]?.estado === 'JUSTIFICADO').length,
  }

  return (
    <div className="page">
      <Navbar usuario={usuario} />
      <div className="page-content">

        <div className="page-header">
          <div>
            <div className="page-title">Asistencia</div>
            <div className="page-subtitle">Registro de asistencia por grupo y fecha</div>
          </div>
          <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>
            <i className="bi bi-arrow-left"></i> Volver
          </button>
        </div>

        {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i> {error}</div>}
        {exito && <div className="alert alert-success"><i className="bi bi-check-circle"></i> {exito}</div>}

        {/* Filtros */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ padding: '14px 20px' }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ margin: 0, flex: '2 1 200px' }}>
                <label className="form-label">Grupo</label>
                <select className="form-select" value={idGrupo} onChange={e => setIdGrupo(e.target.value)}>
                  <option value="">Seleccione un grupo...</option>
                  {grupos.map(g => <option key={g.idgrupo} value={g.idgrupo}>{g.nombregrupo} — {g.turno}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0, flex: '1 1 160px' }}>
                <label className="form-label">Fecha</label>
                <input type="date" className="form-input" value={fecha} onChange={e => setFecha(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Lista */}
        {idGrupo && (
          <>
            {postulantes.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#6b7280', marginRight: 4 }}>Marcar todos:</span>
                {ESTADOS.map(e => (
                  <button key={e} className={`btn btn-sm badge badge-${ESTADO_BADGE[e]}`}
                    style={{ cursor: 'pointer', border: 'none' }} onClick={() => marcarTodos(e)}>
                    {e}
                  </button>
                ))}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <span className="badge badge-success"><i className="bi bi-check-circle"></i> {resumen.PRESENTE}</span>
                  <span className="badge badge-danger"><i className="bi bi-x-circle"></i> {resumen.AUSENTE}</span>
                  <span className="badge badge-warning"><i className="bi bi-clock"></i> {resumen.JUSTIFICADO}</span>
                </div>
              </div>
            )}

            <div className="card">
              {loading ? (
                <div className="spinner-box"><span className="spinner"></span></div>
              ) : postulantes.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><i className="bi bi-people"></i></div>
                  <div className="empty-state-text">No hay postulantes en este grupo</div>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr><th>CI</th><th>Nombre</th><th>Estado</th><th>Observación</th></tr>
                    </thead>
                    <tbody>
                      {postulantes.map(p => {
                        const reg = registros[p.idpostulante] || { estado: 'PRESENTE', observacion: '' }
                        return (
                          <tr key={p.idpostulante}>
                            <td className="td-bold">{p.ci}</td>
                            <td>{p.nombres} {p.apellidos}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                {ESTADOS.map(e => (
                                  <button key={e} type="button"
                                    className={`btn btn-sm ${reg.estado === e ? `badge badge-${ESTADO_BADGE[e]}` : 'btn-outline'}`}
                                    style={{ fontSize: 11, padding: '3px 8px', border: reg.estado === e ? 'none' : undefined }}
                                    onClick={() => setEstado(p.idpostulante, e)}>
                                    {e === 'PRESENTE' ? 'P' : e === 'AUSENTE' ? 'A' : 'J'}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td>
                              {reg.estado !== 'PRESENTE' && (
                                <input className="form-input" style={{ fontSize: 12, padding: '4px 8px', minWidth: 180 }}
                                  placeholder="Observación..." value={reg.observacion}
                                  onChange={e => setObservacion(p.idpostulante, e.target.value)} />
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {postulantes.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button className="btn btn-primary" onClick={guardar} disabled={guardando}>
                  {guardando
                    ? <><span className="spinner" style={{ width: 15, height: 15, borderWidth: 2, marginBottom: 0 }}></span> Guardando...</>
                    : <><i className="bi bi-save"></i> Guardar asistencia</>}
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
