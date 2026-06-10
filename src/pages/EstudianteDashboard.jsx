import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'

const TABS  = ['perfil', 'grupo', 'examenes', 'asistencia']
const TAB_LABELS = {
  perfil:     'Mi Perfil',
  grupo:      'Mi Grupo',
  examenes:   'Mis Exámenes',
  asistencia: 'Asistencia',
}

function EstudianteDashboard() {
  const [tab,        setTab]        = useState('perfil')
  const [perfil,     setPerfil]     = useState(null)
  const [grupo,      setGrupo]      = useState(null)
  const [examenes,   setExamenes]   = useState([])
  const [asistencia, setAsistencia] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [fotoLoading,    setFotoLoading]    = useState(false)
  const [cambioPass,     setCambioPass]     = useState(false)
  const [passForm,       setPassForm]       = useState({ password_actual: '', password_nuevo: '', password_confirm: '' })
  const [passError,      setPassError]      = useState('')
  const [passLoading,    setPassLoading]    = useState(false)
  const fileRef = useRef()
  const navigate = useNavigate()
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  useEffect(() => {
    if (usuario.debe_cambiar_password) setCambioPass(true)
  }, [])

  useEffect(() => {
    Promise.all([
      apiFetch('/api/estudiante/perfil').then(r => r.ok ? r.json() : null),
      apiFetch('/api/estudiante/grupo').then(r => r.ok ? r.json() : null),
      apiFetch('/api/estudiante/examenes').then(r => r.ok ? r.json() : []),
      apiFetch('/api/estudiante/asistencia').then(r => r.ok ? r.json() : []),
    ]).then(([p, g, e, a]) => {
      setPerfil(p)
      setGrupo(g)
      setExamenes(Array.isArray(e) ? e : [])
      setAsistencia(Array.isArray(a) ? a : [])
    }).finally(() => setLoading(false))
  }, [])

  const handleCambiarPassword = async (e) => {
    e.preventDefault()
    setPassError('')
    if (passForm.password_nuevo !== passForm.password_confirm) {
      setPassError('Las contraseñas nuevas no coinciden'); return
    }
    setPassLoading(true)
    try {
      const res  = await apiFetch('/api/cambiar-password', {
        method: 'POST',
        body: JSON.stringify(passForm),
      })
      const data = await res.json()
      if (res.ok) {
        const u = { ...usuario, debe_cambiar_password: false }
        localStorage.setItem('usuario', JSON.stringify(u))
        setCambioPass(false)
      } else {
        setPassError(data.message)
      }
    } catch { setPassError('Error de conexión') }
    finally { setPassLoading(false) }
  }

  const handleLogout = async () => {
    await apiFetch('/api/logout', { method: 'POST' })
    localStorage.clear()
    navigate('/login')
  }

  const handleFoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      setFotoLoading(true)
      try {
        await apiFetch('/api/estudiante/foto', {
          method: 'POST',
          body: JSON.stringify({ foto: ev.target.result }),
        })
        setPerfil(p => ({ ...p, foto: ev.target.result }))
      } finally {
        setFotoLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const estadoBadge = (estado) => {
    const map = {
      PRESENTE:    'badge-success',
      AUSENTE:     'badge-danger',
      JUSTIFICADO: 'badge-warning',
      APROBADO:    'badge-success',
      REPROBADO:   'badge-danger',
    }
    return map[estado] || 'badge-neutral'
  }

  const promedioTotal = examenes.length
    ? (examenes.reduce((s, e) => s + (parseFloat(e.promedio) || 0), 0) / examenes.length).toFixed(1)
    : null

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="spinner" style={{ width: 32, height: 32 }}></div>
    </div>
  )

  return (
    <div className="page">
      {/* Navbar */}
      <nav className="app-navbar">
        <div className="nav-brand">
          <div className="nav-brand-icon"><i className="bi bi-mortarboard-fill"></i></div>
          <span className="nav-brand-text">FICCT Portal</span>
        </div>
        <div className="nav-spacer" />
        <div className="nav-user">
          <div className="nav-user-info">
            <div className="nav-user-name">{usuario.nombre}</div>
            <div className="nav-user-role">Estudiante</div>
          </div>
          <button className="btn-nav-logout" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right"></i> Salir
          </button>
        </div>
      </nav>

      <div className="page-content">
        {/* Tabs */}
        <div className="filter-tabs" style={{ marginBottom: 24 }}>
          {TABS.map(t => (
            <button
              key={t}
              className={`filter-tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* ── PERFIL ── */}
        {tab === 'perfil' && !perfil && (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><i className="bi bi-person-x"></i></div>
              <div className="empty-state-text">Tu perfil aún no está vinculado. Contactá al administrador.</div>
            </div>
          </div>
        )}
        {tab === 'perfil' && perfil && (
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
            {/* Foto */}
            <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#e0e3e5', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #e0e3e5' }}>
                {perfil.foto
                  ? <img src={perfil.foto} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <i className="bi bi-person-fill" style={{ fontSize: 44, color: '#9ca3af' }}></i>
                }
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#191c1e' }}>{perfil.nombres} {perfil.apellidos}</div>
                <div style={{ fontSize: 12, color: '#737780', marginTop: 2 }}>CI: {perfil.ci}</div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFoto} />
              <button
                className="btn btn-outline btn-full"
                style={{ fontSize: 12 }}
                onClick={() => fileRef.current.click()}
                disabled={fotoLoading}
              >
                {fotoLoading ? 'Subiendo...' : <><i className="bi bi-camera"></i> Cambiar foto</>}
              </button>
            </div>

            {/* Datos personales */}
            <div className="card">
              <div className="card-header">
                <i className="bi bi-person-vcard"></i> Datos Personales
              </div>
              <div className="card-body">
                <div className="form-row" style={{ marginBottom: 16 }}>
                  <div>
                    <div className="form-label" style={{ color: '#737780', marginBottom: 2 }}>Nombres</div>
                    <div style={{ fontWeight: 600 }}>{perfil.nombres}</div>
                  </div>
                  <div>
                    <div className="form-label" style={{ color: '#737780', marginBottom: 2 }}>Apellidos</div>
                    <div style={{ fontWeight: 600 }}>{perfil.apellidos}</div>
                  </div>
                </div>
                <div className="form-row" style={{ marginBottom: 16 }}>
                  <div>
                    <div className="form-label" style={{ color: '#737780', marginBottom: 2 }}>Cédula de Identidad</div>
                    <div style={{ fontWeight: 600 }}>{perfil.ci}</div>
                  </div>
                  <div>
                    <div className="form-label" style={{ color: '#737780', marginBottom: 2 }}>Sexo</div>
                    <div style={{ fontWeight: 600 }}>{perfil.sexo === 'M' ? 'Masculino' : 'Femenino'}</div>
                  </div>
                </div>
                <div className="form-row" style={{ marginBottom: 16 }}>
                  <div>
                    <div className="form-label" style={{ color: '#737780', marginBottom: 2 }}>Correo</div>
                    <div style={{ fontWeight: 600 }}>{perfil.correo}</div>
                  </div>
                  <div>
                    <div className="form-label" style={{ color: '#737780', marginBottom: 2 }}>Teléfono</div>
                    <div style={{ fontWeight: 600 }}>{perfil.telefono || '—'}</div>
                  </div>
                </div>
                <div className="form-row" style={{ marginBottom: 16 }}>
                  <div>
                    <div className="form-label" style={{ color: '#737780', marginBottom: 2 }}>Ciudad</div>
                    <div style={{ fontWeight: 600 }}>{perfil.ciudad || '—'}</div>
                  </div>
                  <div>
                    <div className="form-label" style={{ color: '#737780', marginBottom: 2 }}>Colegio de Procedencia</div>
                    <div style={{ fontWeight: 600 }}>{perfil.colegioprocedencia || '—'}</div>
                  </div>
                </div>
                <div>
                  <div className="form-label" style={{ color: '#737780', marginBottom: 4 }}>Estado</div>
                  <span className={`badge ${perfil.estadopostulante === 'APROBADO' ? 'badge-success' : perfil.estadopostulante === 'REPROBADO' ? 'badge-danger' : 'badge-info'}`}>
                    {perfil.estadopostulante}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── GRUPO ── */}
        {tab === 'grupo' && (
          <div>
            {grupo ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="card">
                  <div className="card-header"><i className="bi bi-people"></i> Mi Grupo</div>
                  <div className="card-body">
                    <div style={{ marginBottom: 16 }}>
                      <div className="form-label" style={{ color: '#737780' }}>Nombre del grupo</div>
                      <div style={{ fontWeight: 700, fontSize: 18 }}>{grupo.grupo_nombre}</div>
                    </div>
                    <div>
                      <div className="form-label" style={{ color: '#737780' }}>Estudiantes inscritos</div>
                      <div style={{ fontWeight: 600 }}>{grupo.cantidadestudiante}</div>
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-header"><i className="bi bi-person-badge"></i> Docente</div>
                  <div className="card-body">
                    {grupo.docente_nombres ? (
                      <>
                        <div style={{ marginBottom: 16 }}>
                          <div className="form-label" style={{ color: '#737780' }}>Nombre</div>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{grupo.docente_nombres} {grupo.docente_apellidos}</div>
                        </div>
                        <div>
                          <div className="form-label" style={{ color: '#737780' }}>Materia</div>
                          <div style={{ fontWeight: 600 }}>{grupo.materia_nombre || '—'}</div>
                        </div>
                      </>
                    ) : (
                      <div className="empty-state" style={{ padding: 20 }}>
                        <div className="empty-state-text">Sin docente asignado aún</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-icon"><i className="bi bi-people"></i></div>
                  <div className="empty-state-text">Aún no has sido asignado a un grupo</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── EXÁMENES ── */}
        {tab === 'examenes' && (
          <div>
            {promedioTotal && (
              <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
                <div className={`stat-card ${parseFloat(promedioTotal) >= 65 ? 'stat-card-success' : 'stat-card-danger'}`}>
                  <div className="stat-icon"><i className="bi bi-graph-up"></i></div>
                  <div className="stat-value">{promedioTotal}</div>
                  <div className="stat-label">Promedio General</div>
                </div>
                <div className="stat-card stat-card-white">
                  <div className="stat-icon"><i className="bi bi-journal-check"></i></div>
                  <div className="stat-value">{examenes.filter(e => e.estado === 'APROBADO').length}</div>
                  <div className="stat-label">Materias aprobadas</div>
                </div>
                <div className="stat-card stat-card-white">
                  <div className="stat-icon"><i className="bi bi-journal-x"></i></div>
                  <div className="stat-value">{examenes.filter(e => e.estado === 'REPROBADO').length}</div>
                  <div className="stat-label">Materias reprobadas</div>
                </div>
              </div>
            )}
            <div className="card">
              <div className="card-header"><i className="bi bi-clipboard-data"></i> Resultados por Materia</div>
              {examenes.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><i className="bi bi-clipboard"></i></div>
                  <div className="empty-state-text">No hay exámenes registrados aún</div>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Materia</th>
                        <th>Nota 1 (30%)</th>
                        <th>Nota 2 (30%)</th>
                        <th>Nota 3 (40%)</th>
                        <th>Promedio</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examenes.map(ex => (
                        <tr key={ex.idexamen}>
                          <td className="td-bold">{ex.materia_nombre || '—'}</td>
                          <td>{ex.nota1 ?? '—'}</td>
                          <td>{ex.nota2 ?? '—'}</td>
                          <td>{ex.nota3 ?? '—'}</td>
                          <td><strong>{ex.promedio ?? '—'}</strong></td>
                          <td><span className={`badge ${estadoBadge(ex.estado)}`}>{ex.estado}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MODAL CAMBIO OBLIGATORIO DE CONTRASEÑA ── */}
        {cambioPass && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 36, width: '100%', maxWidth: 420, boxShadow: '0 8px 32px rgba(0,0,0,.2)' }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🔐</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#191c1e' }}>Cambia tu contraseña</div>
                <div style={{ fontSize: 13, color: '#737780', marginTop: 6, lineHeight: 1.5 }}>
                  Es tu primer ingreso. Por seguridad debes establecer una contraseña personal antes de continuar.
                </div>
              </div>

              {passError && (
                <div className="alert alert-danger" style={{ marginBottom: 14 }}>
                  <i className="bi bi-exclamation-circle"></i>{passError}
                </div>
              )}

              <form onSubmit={handleCambiarPassword}>
                <div className="form-group">
                  <label className="form-label">Contraseña temporal (recibida por email)</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Tu contraseña actual"
                    value={passForm.password_actual}
                    onChange={e => setPassForm(f => ({ ...f, password_actual: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nueva contraseña</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Mínimo 6 caracteres"
                    value={passForm.password_nuevo}
                    onChange={e => setPassForm(f => ({ ...f, password_nuevo: e.target.value }))}
                    required
                    minLength={6}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmar nueva contraseña</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Repite la nueva contraseña"
                    value={passForm.password_confirm}
                    onChange={e => setPassForm(f => ({ ...f, password_confirm: e.target.value }))}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn-login-primary"
                  disabled={passLoading}
                  style={{ marginTop: 8 }}
                >
                  {passLoading ? 'Guardando...' : 'ESTABLECER CONTRASEÑA'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── ASISTENCIA ── */}
        {tab === 'asistencia' && (
          <div className="card">
            <div className="card-header"><i className="bi bi-calendar-check"></i> Registro de Asistencia</div>
            {asistencia.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><i className="bi bi-calendar"></i></div>
                <div className="empty-state-text">No hay registros de asistencia aún</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Grupo</th>
                      <th>Estado</th>
                      <th>Observación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asistencia.map(a => (
                      <tr key={a.idasistencia}>
                        <td>{new Date(a.fecha).toLocaleDateString('es-BO')}</td>
                        <td>{a.grupo_nombre}</td>
                        <td><span className={`badge ${estadoBadge(a.estado)}`}>{a.estado}</span></td>
                        <td className="td-muted">{a.observacion || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default EstudianteDashboard
