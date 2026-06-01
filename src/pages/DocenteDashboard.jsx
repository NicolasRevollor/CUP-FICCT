import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'

const TURNO_COLOR = { 'MAÑANA': '#d97706', TARDE: '#2563eb', NOCHE: '#374151' }
const TURNO_ICON  = { 'MAÑANA': 'bi-sunrise', TARDE: 'bi-sun', NOCHE: 'bi-moon-stars' }

export default function DocenteDashboard() {
  const navigate = useNavigate()
  const usuario  = JSON.parse(localStorage.getItem('usuario'))
  const [docente, setDocente]   = useState(null)
  const [grupos, setGrupos]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  // Grupo seleccionado para ver postulantes
  const [grupoActivo, setGrupoActivo]       = useState(null)
  const [postulantes, setPostulantes]       = useState([])
  const [loadingPost, setLoadingPost]       = useState(false)

  // Estado para registrar notas
  const [postulanteExamen, setPostExamen]   = useState(null)
  const [examenes, setExamenes]             = useState([])
  const [form, setForm]                     = useState({ nota1: '', nota2: '', nota3: '' })
  const [examenEditId, setExamenEditId]     = useState(null)
  const [errorExamen, setErrorExamen]       = useState('')
  const [exitoExamen, setExitoExamen]       = useState('')

  useEffect(() => {
    if (!usuario) { navigate('/'); return }
    if (usuario.rol !== 'DOCENTE') { navigate('/dashboard'); return }
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      const [rp, rg] = await Promise.all([
        apiFetch('/api/docentes/mi-perfil'),
        apiFetch('/api/docentes/mis-grupos'),
      ])
      if (rp.ok) setDocente(await rp.json())
      if (rg.ok) setGrupos(await rg.json())
    } catch { setError('Error al cargar datos') }
    finally { setLoading(false) }
  }

  const verPostulantes = async (grupo) => {
    setGrupoActivo(grupo)
    setPostulantes([])
    setPostExamen(null)
    setLoadingPost(true)
    try {
      const r = await apiFetch(`/api/grupos/${grupo.idgrupo}/postulantes`)
      if (r.ok) setPostulantes(await r.json())
    } catch {} finally { setLoadingPost(false) }
  }

  const verExamenes = async (p) => {
    setPostExamen(p)
    setErrorExamen(''); setExitoExamen('')
    setForm({ nota1: '', nota2: '', nota3: '' }); setExamenEditId(null)
    const r = await apiFetch(`/api/examenes/${p.idpostulante}`)
    if (r.ok) setExamenes(await r.json())
  }

  const handleGuardarNotas = async (e) => {
    e.preventDefault(); setErrorExamen(''); setExitoExamen('')
    try {
      const body = examenEditId
        ? JSON.stringify({ nota1: form.nota1, nota2: form.nota2, nota3: form.nota3 })
        : JSON.stringify({ idpostulante: postulanteExamen.idpostulante, idmateria: grupoActivo.idmateria, nota1: form.nota1, nota2: form.nota2, nota3: form.nota3 })
      const res = await apiFetch(examenEditId ? `/api/examenes/${examenEditId}` : '/api/examenes', {
        method: examenEditId ? 'PUT' : 'POST', body,
      })
      const data = await res.json()
      if (res.ok) {
        setExitoExamen('Notas guardadas correctamente')
        setForm({ nota1: '', nota2: '', nota3: '' }); setExamenEditId(null)
        const r = await apiFetch(`/api/examenes/${postulanteExamen.idpostulante}`)
        if (r.ok) setExamenes(await r.json())
      } else setErrorExamen(data.message)
    } catch { setErrorExamen('Error de conexión') }
  }

  const handleLogout = async () => {
    try { await apiFetch('/api/logout', { method: 'POST' }) } catch {}
    localStorage.removeItem('token'); localStorage.removeItem('usuario')
    navigate('/')
  }

  const pond = (n1, n2, n3) => ((+n1 * 0.30) + (+n2 * 0.30) + (+n3 * 0.40)).toFixed(2)
  const BADGE = { APROBADO: 'success', REPROBADO: 'danger', PENDIENTE: 'warning' }

  if (!usuario || usuario.rol !== 'DOCENTE') return null

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
      <div className="spinner-box"><span className="spinner"></span><span className="spinner-text">Cargando...</span></div>
    </div>
  )

  return (
    <div className="page">
      {/* Navbar docente */}
      <nav className="app-navbar">
        <div className="nav-brand">
          <div className="nav-brand-icon">FC</div>
          <span className="nav-brand-text">CUP · FICCT — Docente</span>
        </div>
        <div className="nav-spacer" />
        <div className="nav-user">
          <div className="nav-user-info">
            <div className="nav-user-name">{usuario.nombre}</div>
            <div className="nav-user-role">Docente</div>
          </div>
          <button className="btn-nav-logout" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </nav>

      <div className="page-content">

        {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i>{error}</div>}

        {/* Bienvenida docente */}
        {docente && (
          <div style={{ marginBottom: 24 }}>
            <div className="page-title">Panel Docente</div>
            <div className="page-subtitle">
              Bienvenido/a, <strong>{docente.nombres} {docente.apellidos}</strong> — {docente.profesion || 'Docente CUP'}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: grupoActivo ? '320px 1fr' : '1fr', gap: 20 }}>

          {/* Lista de grupos */}
          <div>
            <div style={{ fontWeight: 600, color: '#374151', fontSize: 13, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Mis grupos asignados
            </div>
            {grupos.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-icon"><i className="bi bi-collection"></i></div>
                  <div className="empty-state-text">No tienes grupos asignados</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {grupos.map(g => (
                  <div key={g.idasignacion}
                    onClick={() => verPostulantes(g)}
                    style={{
                      background: grupoActivo?.idasignacion === g.idasignacion ? '#0d2451' : '#fff',
                      border: `1px solid ${grupoActivo?.idasignacion === g.idasignacion ? '#0d2451' : '#e5e7eb'}`,
                      borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                      transition: 'all .15s',
                      boxShadow: '0 1px 3px rgba(0,0,0,.06)',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: grupoActivo?.idasignacion === g.idasignacion ? '#fff' : '#111827' }}>
                        {g.nombregrupo}
                      </span>
                      <span style={{ fontSize: 11, background: grupoActivo?.idasignacion === g.idasignacion ? 'rgba(255,255,255,.15)' : '#f3f4f6', color: grupoActivo?.idasignacion === g.idasignacion ? '#fff' : '#6b7280', padding: '2px 8px', borderRadius: 20 }}>
                        <i className={`bi ${TURNO_ICON[g.turno] || 'bi-circle'} me-1`}></i>{g.turno}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: grupoActivo?.idasignacion === g.idasignacion ? 'rgba(255,255,255,.7)' : '#6b7280' }}>
                      <i className="bi bi-journal-text" style={{ marginRight: 4 }}></i>{g.materia}
                    </div>
                    <div style={{ fontSize: 12, color: grupoActivo?.idasignacion === g.idasignacion ? 'rgba(255,255,255,.6)' : '#9ca3af', marginTop: 3 }}>
                      <i className="bi bi-people" style={{ marginRight: 4 }}></i>{g.cantidadestudiante}/{g.capacidadmaxima} estudiantes
                      {g.aula && <> · <i className="bi bi-building" style={{ marginRight: 4 }}></i>{g.aula}</>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Panel derecho: postulantes + notas */}
          {grupoActivo && (
            <div>
              <div style={{ fontWeight: 600, color: '#374151', fontSize: 13, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                {grupoActivo.nombregrupo} — {grupoActivo.materia}
              </div>

              {/* Lista de postulantes */}
              {!postulanteExamen && (
                <div className="card">
                  <div className="card-header card-header-dark">
                    <i className="bi bi-people"></i> Estudiantes del grupo
                    <span style={{ marginLeft: 6, background: 'rgba(255,255,255,.15)', borderRadius: 20, padding: '1px 9px', fontSize: 11 }}>{postulantes.length}</span>
                  </div>
                  {loadingPost ? (
                    <div className="spinner-box"><span className="spinner"></span></div>
                  ) : postulantes.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon"><i className="bi bi-inbox"></i></div>
                      <div className="empty-state-text">No hay estudiantes asignados</div>
                    </div>
                  ) : (
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr><th>CI</th><th>Nombres</th><th>Apellidos</th><th>Promedio</th><th>Estado</th><th></th></tr>
                        </thead>
                        <tbody>
                          {postulantes.map(p => (
                            <tr key={p.idpostulante}>
                              <td className="td-bold">{p.ci}</td>
                              <td>{p.nombres}</td>
                              <td>{p.apellidos}</td>
                              <td>{p.promedio_final ?? '—'}</td>
                              <td><span className={`badge badge-${BADGE[p.estadopostulante] || 'neutral'}`}>{p.estadopostulante}</span></td>
                              <td>
                                <button className="btn btn-sm btn-primary" onClick={() => verExamenes(p)}>
                                  <i className="bi bi-pencil-square"></i> Notas
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Panel de notas */}
              {postulanteExamen && (
                <div>
                  <button className="btn btn-outline" style={{ marginBottom: 14 }} onClick={() => setPostExamen(null)}>
                    <i className="bi bi-arrow-left"></i> Volver a lista
                  </button>

                  <div className="card" style={{ marginBottom: 16 }}>
                    <div className="card-body" style={{ paddingBottom: 12 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{postulanteExamen.nombres} {postulanteExamen.apellidos}</div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>CI: {postulanteExamen.ci} · Materia: <strong>{grupoActivo.materia}</strong></div>
                    </div>
                  </div>

                  {errorExamen && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i>{errorExamen}</div>}
                  {exitoExamen && <div className="alert alert-success"><i className="bi bi-check-circle"></i>{exitoExamen}</div>}

                  {/* Examen existente o formulario */}
                  {(() => {
                    const examenExistente = examenes.find(e => e.materia === grupoActivo.materia)
                    return (
                      <>
                        {examenExistente && !examenEditId && (
                          <div className="card" style={{ marginBottom: 14 }}>
                            <div className="card-header"><i className="bi bi-journal-check"></i> Notas registradas — {grupoActivo.materia}</div>
                            <div className="card-body">
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 14 }}>
                                {[['Examen 1 (30%)', examenExistente.nota1], ['Examen 2 (30%)', examenExistente.nota2], ['Examen 3 (40%)', examenExistente.nota3], ['Nota Final', examenExistente.promedio]].map(([lbl, val]) => (
                                  <div key={lbl} style={{ textAlign: 'center', background: '#f8f9fa', borderRadius: 8, padding: '12px 8px' }}>
                                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{lbl}</div>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: '#0d2451' }}>{val}</div>
                                  </div>
                                ))}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className={`badge badge-${BADGE[examenExistente.estado] || 'neutral'}`} style={{ fontSize: 13, padding: '5px 14px' }}>{examenExistente.estado}</span>
                                <button className="btn btn-sm btn-outline-info" onClick={() => { setExamenEditId(examenExistente.idexamen); setForm({ nota1: examenExistente.nota1, nota2: examenExistente.nota2, nota3: examenExistente.nota3 }) }}>
                                  <i className="bi bi-pencil"></i> Editar
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {(!examenExistente || examenEditId) && (
                          <div className="card">
                            <div className="card-header card-header-dark">
                              <i className="bi bi-pencil"></i> {examenEditId ? 'Editar notas' : 'Registrar notas'} — {grupoActivo.materia}
                            </div>
                            <div className="card-body">
                              <form onSubmit={handleGuardarNotas}>
                                <div className="form-row-3">
                                  {[['nota1','Examen 1','30%'],['nota2','Examen 2','30%'],['nota3','Examen 3','40%']].map(([k,lbl,p]) => (
                                    <div className="form-group" key={k}>
                                      <label className="form-label">{lbl} <span style={{ color: '#9ca3af', fontWeight: 400 }}>({p})</span></label>
                                      <input type="number" className="form-input" min="0" max="100" step="0.01"
                                        value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} required />
                                    </div>
                                  ))}
                                </div>
                                {form.nota1 && form.nota2 && form.nota3 && (
                                  <div className={`nota-preview ${+pond(form.nota1,form.nota2,form.nota3) >= 60 ? 'nota-preview-ok' : 'nota-preview-bad'}`} style={{ marginBottom: 14 }}>
                                    <strong>Nota ponderada: {pond(form.nota1,form.nota2,form.nota3)}</strong>
                                    {' '}— {+pond(form.nota1,form.nota2,form.nota3) >= 60 ? 'APROBADO' : 'REPROBADO'}
                                  </div>
                                )}
                                <div className="form-actions">
                                  {examenEditId && <button type="button" className="btn btn-outline" onClick={() => { setExamenEditId(null); setForm({ nota1:'',nota2:'',nota3:'' }) }}>Cancelar</button>}
                                  <button type="submit" className="btn btn-primary">
                                    <i className="bi bi-save"></i> {examenEditId ? 'Actualizar' : 'Guardar notas'}
                                  </button>
                                </div>
                              </form>
                            </div>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
