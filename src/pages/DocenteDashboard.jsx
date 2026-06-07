import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'

const BADGE      = { APROBADO: 'success', REPROBADO: 'danger', PENDIENTE: 'warning' }
const TURNO_ICON = { 'MAÑANA': 'bi-sunrise', TARDE: 'bi-sun', NOCHE: 'bi-moon-stars' }
const pond = (n1, n2, n3) => ((+n1 * 0.30) + (+n2 * 0.30) + (+n3 * 0.40)).toFixed(2)

export default function DocenteDashboard() {
  const navigate = useNavigate()
  const usuario  = JSON.parse(localStorage.getItem('usuario'))

  const [docente,      setDocente]      = useState(null)
  const [grupos,       setGrupos]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [mostrarPerfil,  setMostrarPerfil]  = useState(false)
  const [formPass,       setFormPass]       = useState({ password_actual: '', password_nuevo: '', password_confirm: '' })
  const [showPassActual, setShowPassActual] = useState(false)
  const [showPassNuevo,  setShowPassNuevo]  = useState(false)
  const [errorPass,      setErrorPass]      = useState('')
  const [exitoPass,      setExitoPass]      = useState('')
  const [loadingPass,    setLoadingPass]    = useState(false)

  const [grupoActivo,    setGrupoActivo]    = useState(null)
  const [postulantes,    setPostulantes]    = useState([])
  const [examenesGrupo,  setExamenesGrupo]  = useState({})
  const [loadingPost,    setLoadingPost]    = useState(false)

  const [postulanteExamen, setPostExamen]   = useState(null)
  const [form,             setForm]         = useState({ nota1: '', nota2: '', nota3: '' })
  const [examenEditId,     setExamenEditId] = useState(null)
  const [errorExamen,      setErrorExamen]  = useState('')
  const [exitoExamen,      setExitoExamen]  = useState('')

  useEffect(() => {
    if (!usuario) { navigate('/'); return }
    if (usuario.rol !== 'DOCENTE') { navigate('/dashboard'); return }
    Promise.all([
      apiFetch('/api/docentes/mi-perfil'),
      apiFetch('/api/docentes/mis-grupos'),
    ]).then(async ([rp, rg]) => {
      if (rp.ok) setDocente(await rp.json())
      if (rg.ok) setGrupos(await rg.json())
    }).catch(() => setError('Error al cargar datos')).finally(() => setLoading(false))
  }, [])

  const verPostulantes = async (grupo) => {
    setGrupoActivo(grupo)
    setPostulantes([])
    setExamenesGrupo({})
    setPostExamen(null)
    setLoadingPost(true)
    try {
      const [rp, re] = await Promise.all([
        apiFetch(`/api/grupos/${grupo.idgrupo}/postulantes`),
        apiFetch(`/api/grupos/${grupo.idgrupo}/examenes/${grupo.idmateria}`),
      ])
      if (rp.ok) setPostulantes(await rp.json())
      if (re.ok) setExamenesGrupo(await re.json())
    } catch {} finally { setLoadingPost(false) }
  }

  const refrescarExamenes = async () => {
    if (!grupoActivo) return
    const re = await apiFetch(`/api/grupos/${grupoActivo.idgrupo}/examenes/${grupoActivo.idmateria}`)
    if (re.ok) setExamenesGrupo(await re.json())
  }

  const handleGuardarNotas = async (e) => {
    e.preventDefault(); setErrorExamen(''); setExitoExamen('')
    try {
      const body = examenEditId
        ? JSON.stringify({ nota1: form.nota1, nota2: form.nota2, nota3: form.nota3 })
        : JSON.stringify({ idpostulante: postulanteExamen.idpostulante, idmateria: grupoActivo.idmateria, nota1: form.nota1, nota2: form.nota2, nota3: form.nota3 })
      const res  = await apiFetch(examenEditId ? `/api/examenes/${examenEditId}` : '/api/examenes', {
        method: examenEditId ? 'PUT' : 'POST', body,
      })
      const data = await res.json()
      if (res.ok) {
        setExitoExamen(examenEditId ? 'Notas actualizadas' : 'Notas guardadas')
        setForm({ nota1: '', nota2: '', nota3: '' }); setExamenEditId(null)
        setPostExamen(null)
        await refrescarExamenes()
      } else setErrorExamen(data.message)
    } catch { setErrorExamen('Error de conexión') }
  }

  const handleCambiarPass = async (e) => {
    e.preventDefault(); setErrorPass(''); setExitoPass(''); setLoadingPass(true)
    if (formPass.password_nuevo !== formPass.password_confirm) {
      setErrorPass('Las contraseñas nuevas no coinciden'); setLoadingPass(false); return
    }
    try {
      const res  = await apiFetch('/api/cambiar-password', { method: 'POST', body: JSON.stringify(formPass) })
      const data = await res.json()
      if (res.ok) { setExitoPass(data.message); setFormPass({ password_actual: '', password_nuevo: '', password_confirm: '' }) }
      else          setErrorPass(data.message)
    } catch { setErrorPass('Error de conexión') }
    finally { setLoadingPass(false) }
  }

  const handleLogout = async () => {
    try { await apiFetch('/api/logout', { method: 'POST' }) } catch {}
    localStorage.removeItem('token'); localStorage.removeItem('usuario')
    navigate('/')
  }

  if (!usuario || usuario.rol !== 'DOCENTE') return null

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
      <div className="spinner-box"><span className="spinner"></span><span className="spinner-text">Cargando...</span></div>
    </div>
  )

  // Stats del grupo activo
  const totalEst    = postulantes.length
  const conNota     = postulantes.filter(p => examenesGrupo[p.idpostulante]).length
  const aprobados   = postulantes.filter(p => examenesGrupo[p.idpostulante]?.estado === 'APROBADO').length
  const reprobados  = postulantes.filter(p => examenesGrupo[p.idpostulante]?.estado === 'REPROBADO').length
  const pendientes  = totalEst - conNota

  return (
    <div className="page">

      {/* ── Navbar ── */}
      <nav className="app-navbar">
        <div className="nav-brand">
          <div className="nav-brand-icon">FC</div>
          <span className="nav-brand-text">CUP · FICCT — Docente</span>
        </div>
        <div className="nav-spacer" />
        <div className="nav-user">
          <button
            className="btn btn-sm btn-outline"
            style={{ marginRight: 10, fontSize: 12 }}
            onClick={() => setMostrarPerfil(v => !v)}
          >
            <i className="bi bi-person-circle"></i> Mi Perfil
          </button>
          <div className="nav-user-info">
            <div className="nav-user-name">{usuario.nombre}</div>
            <div className="nav-user-role">Docente</div>
          </div>
          <button className="btn-nav-logout" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </nav>

      <div className="page-content">

        {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i>{error}</div>}

        {/* ── Panel Mi Perfil ── */}
        {mostrarPerfil && docente && (
          <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid #0d2451' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><i className="bi bi-person-badge"></i> Mi Perfil</span>
              <button className="btn btn-sm btn-outline" onClick={() => setMostrarPerfil(false)}>
                <i className="bi bi-x"></i>
              </button>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                {[
                  ['Nombres',    docente.nombres],
                  ['Apellidos',  docente.apellidos],
                  ['CI',         docente.ci],
                  ['Profesión',  docente.profesion  || '—'],
                  ['Maestría',   docente.maestria   || '—'],
                  ['Diplomado',  docente.diplomadoedsup || '—'],
                  ['Teléfono',   docente.telefono   || '—'],
                  ['Correo',     docente.correo],
                ].map(([lbl, val]) => (
                  <div key={lbl}>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{lbl}</div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{val}</div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 20, paddingTop: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}><i className="bi bi-key" style={{ marginRight: 6 }}></i>Cambiar contraseña</div>
                {errorPass && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i>{errorPass}</div>}
                {exitoPass && <div className="alert alert-success"><i className="bi bi-check-circle"></i>{exitoPass}</div>}
                <form onSubmit={handleCambiarPass}>
                  <div className="form-row-3">
                    {[
                      ['password_actual',  'Contraseña actual',    showPassActual, () => setShowPassActual(v => !v)],
                      ['password_nuevo',   'Nueva contraseña',     showPassNuevo,  () => setShowPassNuevo(v => !v)],
                      ['password_confirm', 'Confirmar contraseña', showPassNuevo,  () => setShowPassNuevo(v => !v)],
                    ].map(([key, lbl, show, toggle]) => (
                      <div className="form-group" key={key}>
                        <label className="form-label" style={{ fontSize: 12 }}>{lbl}</label>
                        <div style={{ position: 'relative' }}>
                          <input type={show ? 'text' : 'password'} className="form-input"
                            value={formPass[key]} onChange={e => setFormPass(f => ({ ...f, [key]: e.target.value }))}
                            required style={{ paddingRight: 36, fontSize: 13 }} />
                          <button type="button" onClick={toggle} tabIndex={-1}
                            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2 }}>
                            <i className={`bi ${show ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={loadingPass}>
                    <i className="bi bi-save"></i> {loadingPass ? 'Guardando...' : 'Actualizar contraseña'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ── Bienvenida ── */}
        {docente && !mostrarPerfil && (
          <div style={{ marginBottom: 20 }}>
            <div className="page-title">Panel Docente</div>
            <div className="page-subtitle">
              Bienvenido/a, <strong>{docente.nombres} {docente.apellidos}</strong>
              {docente.profesion && <> — {docente.profesion}</>}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: grupoActivo ? '300px 1fr' : '1fr', gap: 20 }}>

          {/* ── Lista de grupos ── */}
          <div>
            <div style={{ fontWeight: 600, color: '#374151', fontSize: 12, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Mis grupos asignados ({grupos.length})
            </div>
            {grupos.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-icon"><i className="bi bi-collection"></i></div>
                  <div className="empty-state-text">No tienes grupos asignados</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {grupos.map(g => {
                  const activo = grupoActivo?.idasignacion === g.idasignacion
                  return (
                    <div key={g.idasignacion} onClick={() => verPostulantes(g)} style={{
                      background: activo ? '#0d2451' : '#fff',
                      border: `1px solid ${activo ? '#0d2451' : '#e5e7eb'}`,
                      borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
                      transition: 'all .15s', boxShadow: '0 1px 3px rgba(0,0,0,.06)',
                    }}>
                      {/* Nombre + turno */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: activo ? '#fff' : '#111827' }}>
                          {g.nombregrupo}
                        </span>
                        <span style={{ fontSize: 11, background: activo ? 'rgba(255,255,255,.15)' : '#f3f4f6', color: activo ? '#fff' : '#6b7280', padding: '2px 7px', borderRadius: 20 }}>
                          <i className={`bi ${TURNO_ICON[g.turno] || 'bi-circle'} me-1`}></i>{g.turno}
                        </span>
                      </div>
                      {/* Materia */}
                      <div style={{ fontSize: 12, color: activo ? 'rgba(255,255,255,.8)' : '#374151', marginBottom: 3, fontWeight: 500 }}>
                        <i className="bi bi-journal-text" style={{ marginRight: 4 }}></i>{g.materia}
                      </div>
                      {/* Horario */}
                      {(g.dias || g.horarioinicio) && (
                        <div style={{ fontSize: 11, color: activo ? 'rgba(255,255,255,.65)' : '#6b7280', marginBottom: 3 }}>
                          <i className="bi bi-clock" style={{ marginRight: 4 }}></i>
                          {g.dias && <span>{g.dias} </span>}
                          {g.horarioinicio && <span>{g.horarioinicio}{g.horariofin ? ` - ${g.horariofin}` : ''}</span>}
                        </div>
                      )}
                      {/* Aula + estudiantes */}
                      <div style={{ fontSize: 11, color: activo ? 'rgba(255,255,255,.6)' : '#9ca3af' }}>
                        <i className="bi bi-people" style={{ marginRight: 3 }}></i>{g.cantidadestudiante}/{g.capacidadmaxima}
                        {g.aula && <><i className="bi bi-building" style={{ margin: '0 3px 0 8px' }}></i>{g.aula}</>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Panel derecho ── */}
          {grupoActivo && (
            <div>
              <div style={{ fontWeight: 600, color: '#374151', fontSize: 12, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                {grupoActivo.nombregrupo} — {grupoActivo.materia}
              </div>

              {/* Stats bar */}
              {!postulanteExamen && totalEst > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
                  {[
                    { lbl: 'Total',      val: totalEst,   cls: 'stat-card-primary' },
                    { lbl: 'Aprobados',  val: aprobados,  cls: 'stat-card-success' },
                    { lbl: 'Reprobados', val: reprobados, cls: 'stat-card-danger'  },
                    { lbl: 'Pendientes', val: pendientes, cls: 'stat-card-warning' },
                  ].map(s => (
                    <div key={s.lbl} className={`stat-card ${s.cls}`} style={{ padding: '10px 12px' }}>
                      <div className="stat-value" style={{ fontSize: 22 }}>{s.val}</div>
                      <div className="stat-label">{s.lbl}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Feedback */}
              {errorExamen && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i>{errorExamen}</div>}
              {exitoExamen && <div className="alert alert-success"><i className="bi bi-check-circle"></i>{exitoExamen}</div>}

              {/* Lista de postulantes */}
              {!postulanteExamen && (
                <div className="card">
                  <div className="card-header card-header-dark">
                    <i className="bi bi-people"></i> Estudiantes del grupo
                    <span style={{ marginLeft: 6, background: 'rgba(255,255,255,.15)', borderRadius: 20, padding: '1px 9px', fontSize: 11 }}>{totalEst}</span>
                  </div>
                  {loadingPost ? (
                    <div className="spinner-box"><span className="spinner"></span></div>
                  ) : totalEst === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon"><i className="bi bi-inbox"></i></div>
                      <div className="empty-state-text">No hay estudiantes asignados</div>
                    </div>
                  ) : (
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>CI</th><th>Apellidos</th><th>Nombres</th>
                            <th>Ex.1</th><th>Ex.2</th><th>Ex.3</th>
                            <th>Nota Final</th><th>Estado</th><th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {postulantes.map(p => {
                            const ex = examenesGrupo[p.idpostulante]
                            return (
                              <tr key={p.idpostulante}>
                                <td className="td-bold">{p.ci}</td>
                                <td>{p.apellidos}</td>
                                <td>{p.nombres}</td>
                                <td>{ex ? ex.nota1 : <span style={{ color: '#d1d5db' }}>—</span>}</td>
                                <td>{ex ? ex.nota2 : <span style={{ color: '#d1d5db' }}>—</span>}</td>
                                <td>{ex ? ex.nota3 : <span style={{ color: '#d1d5db' }}>—</span>}</td>
                                <td><strong>{ex ? ex.promedio : '—'}</strong></td>
                                <td>
                                  {ex
                                    ? <span className={`badge badge-${BADGE[ex.estado] || 'neutral'}`}>{ex.estado}</span>
                                    : <span style={{ color: '#d1d5db' }}>—</span>}
                                </td>
                                <td>
                                  <button
                                    className={`btn btn-sm ${ex ? 'btn-outline-info' : 'btn-primary'}`}
                                    onClick={() => {
                                      setPostExamen(p); setErrorExamen(''); setExitoExamen('')
                                      if (ex) {
                                        setExamenEditId(ex.idexamen)
                                        setForm({ nota1: ex.nota1, nota2: ex.nota2, nota3: ex.nota3 })
                                      } else {
                                        setExamenEditId(null)
                                        setForm({ nota1: '', nota2: '', nota3: '' })
                                      }
                                    }}
                                  >
                                    <i className={`bi ${ex ? 'bi-pencil' : 'bi-plus'}`}></i>
                                    {ex ? ' Editar' : ' Registrar'}
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Formulario de notas */}
              {postulanteExamen && (
                <div>
                  <button className="btn btn-outline" style={{ marginBottom: 14 }} onClick={() => { setPostExamen(null); setExamenEditId(null) }}>
                    <i className="bi bi-arrow-left"></i> Volver a lista
                  </button>

                  <div className="card" style={{ marginBottom: 14 }}>
                    <div className="card-body" style={{ paddingBottom: 12 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
                        {postulanteExamen.nombres} {postulanteExamen.apellidos}
                      </div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>
                        CI: {postulanteExamen.ci} · Materia: <strong>{grupoActivo.materia}</strong>
                      </div>
                    </div>
                  </div>

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
                          <button type="button" className="btn btn-outline" onClick={() => { setPostExamen(null); setExamenEditId(null) }}>Cancelar</button>
                          <button type="submit" className="btn btn-primary">
                            <i className="bi bi-save"></i> {examenEditId ? 'Actualizar' : 'Guardar notas'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
