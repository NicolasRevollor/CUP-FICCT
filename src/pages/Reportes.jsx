import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { apiFetch } from '../api'

const BADGE = { APROBADO: 'success', REPROBADO: 'danger', INSCRITO: 'info', PENDIENTE: 'warning' }
const TURNO_BADGE = { 'MAÑANA': 'warning', TARDE: 'info', NOCHE: 'neutral' }

const TABS = [
  { key: 'dashboard', label: 'Estadísticas', icon: 'bi-bar-chart' },
  { key: 'todos',     label: 'Todos',        icon: 'bi-people' },
  { key: 'aprobados', label: 'Aprobados',    icon: 'bi-check-circle' },
  { key: 'reprobados',label: 'Reprobados',   icon: 'bi-x-circle' },
  { key: 'notas',     label: 'Notas',        icon: 'bi-journal-text' },
  { key: 'grupos',    label: 'Grupos',       icon: 'bi-collection' },
  { key: 'admision',  label: 'Admisión',     icon: 'bi-mortarboard' },
]

function Reportes() {
  const navigate = useNavigate()
  const usuario  = JSON.parse(localStorage.getItem('usuario'))
  const [tab, setTab]                   = useState('dashboard')
  const [dashboard, setDashboard]       = useState(null)
  const [estadisticas, setEstadisticas] = useState([])
  const [grupos, setGrupos]             = useState([])
  const [postulantes, setPostulantes]   = useState([])
  const [reporteAdmision, setAdmision]  = useState([])
  const [loading, setLoading]                   = useState(false)
  const [loadingAdm, setLoadingAdm]             = useState(false)
  const [materias, setMaterias]                 = useState([])
  const [materiaSeleccionada, setMateriaSel]    = useState('')
  const [notasMateria, setNotasMateria]         = useState([])

  useEffect(() => {
    if (!usuario) { navigate('/'); return }
    apiFetch('/api/reportes/dashboard').then(r => r.ok ? r.json() : null).then(d => { if (d) setDashboard(d) }).catch(() => {})
    apiFetch('/api/reportes/estadisticas-materia').then(r => r.ok ? r.json() : []).then(setEstadisticas).catch(() => {})
    apiFetch('/api/reportes/grupos-aprobados').then(r => r.ok ? r.json() : []).then(setGrupos).catch(() => {})
    apiFetch('/api/materias').then(r => r.ok ? r.json() : []).then(setMaterias).catch(() => {})
  }, [])

  if (!usuario) return null

  const loadPostulantes = async (tipo) => {
    setLoading(true)
    const paths = { todos: '/api/reportes/postulantes', aprobados: '/api/reportes/aprobados', reprobados: '/api/reportes/reprobados' }
    apiFetch(paths[tipo]).then(r => r.ok ? r.json() : []).then(setPostulantes).catch(() => {}).finally(() => setLoading(false))
  }

  const loadNotasMateria = (idMateria) => {
    if (!idMateria) { setNotasMateria([]); return }
    setLoading(true)
    apiFetch(`/api/examenes/materia/${idMateria}`).then(r => r.ok ? r.json() : []).then(setNotasMateria).catch(() => {}).finally(() => setLoading(false))
  }

  const exportarPDFNotas = () => {
    if (!notasMateria.length) return
    const mat = materias.find(m => String(m.idmateria) === String(materiaSeleccionada))
    const doc = new jsPDF()
    doc.setFontSize(18); doc.setTextColor(17,24,39); doc.text('CUP · FICCT', 14, 20)
    doc.setFontSize(11); doc.setTextColor(100); doc.text(`Notas — ${mat?.nombre || 'Materia'}`, 14, 30)
    doc.setFontSize(9); doc.text(`Fecha: ${new Date().toLocaleDateString()} · Total: ${notasMateria.length}`, 14, 38)
    autoTable(doc, {
      startY: 44,
      head: [['CI','Nombres','Apellidos','Ex. 1','Ex. 2','Ex. 3','Nota Final','Estado']],
      body: notasMateria.map(n => [n.ci, n.nombres, n.apellidos, n.nota1, n.nota2, n.nota3, n.promedio, n.estado]),
      headStyles: { fillColor: [17,24,39] },
      alternateRowStyles: { fillColor: [249,250,251] },
      styles: { fontSize: 8.5 },
    })
    doc.save(`notas_${mat?.nombre || 'materia'}_${new Date().toLocaleDateString()}.pdf`)
  }

  const handleTab = (key) => {
    setTab(key)
    if (['todos','aprobados','reprobados'].includes(key)) loadPostulantes(key)
    if (key !== 'notas') { setMateriaSel(''); setNotasMateria([]) }
  }

  const ejecutarAdmision = async () => {
    setLoadingAdm(true)
    try {
      await apiFetch('/api/reportes/admision', { method: 'POST' })
      const r = await apiFetch('/api/reportes/admision')
      if (r.ok) setAdmision(await r.json())
    } catch {} finally { setLoadingAdm(false) }
  }

  const exportarCSV = () => {
    if (!postulantes.length) return
    const rows = [['CI','Nombres','Apellidos','Ciudad','Promedio','Estado'], ...postulantes.map(p => [p.ci,p.nombres,p.apellidos,p.ciudad,p.promedio_final,p.estadopostulante])]
    const csv  = rows.map(r => r.join(',')).join('\n')
    const a    = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: `reporte_${tab}_${new Date().toLocaleDateString()}.csv` })
    a.click(); URL.revokeObjectURL(a.href)
  }

  const exportarPDF = () => {
    if (!postulantes.length) return
    const doc = new jsPDF()
    doc.setFontSize(18); doc.setTextColor(17,24,39); doc.text('CUP · FICCT', 14, 20)
    doc.setFontSize(11); doc.setTextColor(100)
    doc.text(tab === 'todos' ? 'Lista General de Postulantes' : tab === 'aprobados' ? 'Postulantes Aprobados' : 'Postulantes Reprobados', 14, 30)
    doc.setFontSize(9); doc.text(`Fecha: ${new Date().toLocaleDateString()} · Total: ${postulantes.length}`, 14, 38)
    autoTable(doc, {
      startY: 44,
      head: [['CI','Nombres','Apellidos','Ciudad','Promedio','Estado']],
      body: postulantes.map(p => [p.ci,p.nombres,p.apellidos,p.ciudad,p.promedio_final,p.estadopostulante]),
      headStyles: { fillColor: [17,24,39] },
      alternateRowStyles: { fillColor: [249,250,251] },
      styles: { fontSize: 8.5 },
    })
    doc.save(`reporte_${tab}_${new Date().toLocaleDateString()}.pdf`)
  }

  const STATS = dashboard ? [
    { label: 'Total Inscritos', value: dashboard.total_inscritos,  cls: 'stat-card-primary', icon: 'bi-people' },
    { label: 'Aprobados',       value: dashboard.total_aprobados,  cls: 'stat-card-success', icon: 'bi-check-circle' },
    { label: 'Reprobados',      value: dashboard.total_reprobados, cls: 'stat-card-danger',  icon: 'bi-x-circle' },
    { label: 'Pendientes',      value: dashboard.total_pendientes, cls: 'stat-card-warning', icon: 'bi-clock' },
  ] : []

  return (
    <div className="page">
      <Navbar usuario={usuario} />
      <div className="page-content">

        <div className="page-header">
          <div>
            <div className="page-title">Reportes y Estadísticas</div>
            <div className="page-subtitle">CUP · FICCT 2026</div>
          </div>
          <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>
            <i className="bi bi-arrow-left"></i> Volver
          </button>
        </div>

        {STATS.length > 0 && (
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            {STATS.map(s => (
              <div key={s.label} className={`stat-card ${s.cls}`}>
                <div className="stat-icon"><i className={`bi ${s.icon}`}></i></div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="filter-tabs" style={{ marginBottom: 20 }}>
          {TABS.map(t => (
            <button key={t.key} className={`filter-tab ${tab === t.key ? 'active' : ''}`} onClick={() => handleTab(t.key)}>
              <i className={`bi ${t.icon}`}></i> {t.label}
            </button>
          ))}
        </div>

        {/* ── Estadísticas por materia ── */}
        {tab === 'dashboard' && (
          <div className="card">
            <div className="card-header"><i className="bi bi-graph-up"></i> Rendimiento por Materia</div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Materia</th><th>Total</th><th>Aprobados</th><th>Reprobados</th><th>Promedio</th><th>% Aprobación</th></tr>
                </thead>
                <tbody>
                  {estadisticas.map((e, i) => {
                    const pct = e.total > 0 ? Math.round(e.aprobados / e.total * 100) : 0
                    return (
                      <tr key={i}>
                        <td className="td-bold">{e.materia}</td>
                        <td>{e.total}</td>
                        <td><span className="badge badge-success">{e.aprobados}</span></td>
                        <td><span className="badge badge-danger">{e.reprobados}</span></td>
                        <td><strong>{e.promedio_general}</strong></td>
                        <td>
                          <div className="progress-row">
                            <div className="progress-track">
                              <div className="progress-fill progress-fill-success" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="progress-label">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Lista de postulantes ── */}
        {['todos','aprobados','reprobados'].includes(tab) && (
          <div className="card">
            <div className="card-header">
              <i className="bi bi-list-ul"></i>
              {tab === 'todos' && 'Lista General'}
              {tab === 'aprobados' && 'Postulantes Aprobados'}
              {tab === 'reprobados' && 'Postulantes Reprobados'}
              <span style={{ marginLeft: 6, background: 'var(--bg)', borderRadius: 20, padding: '1px 9px', fontSize: 11, color: 'var(--text-muted)' }}>
                {postulantes.length}
              </span>
              <div className="card-header-actions">
                <button className="btn btn-sm btn-outline" onClick={exportarCSV} disabled={!postulantes.length}>
                  <i className="bi bi-file-earmark-spreadsheet"></i> CSV
                </button>
                <button className="btn btn-sm btn-outline-danger" onClick={exportarPDF} disabled={!postulantes.length}>
                  <i className="bi bi-file-earmark-pdf"></i> PDF
                </button>
              </div>
            </div>
            {loading ? (
              <div className="spinner-box"><span className="spinner"></span></div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>CI</th><th>Nombres</th><th>Apellidos</th><th>Ciudad</th><th>Promedio</th><th>Estado</th></tr>
                  </thead>
                  <tbody>
                    {postulantes.map((p, i) => (
                      <tr key={i}>
                        <td className="td-bold">{p.ci}</td>
                        <td>{p.nombres}</td>
                        <td>{p.apellidos}</td>
                        <td className="td-muted">{p.ciudad}</td>
                        <td><strong>{p.promedio_final}</strong></td>
                        <td><span className={`badge badge-${BADGE[p.estadopostulante] || 'neutral'}`}>{p.estadopostulante}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Admisión ── */}
        {tab === 'admision' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div className="page-title" style={{ fontSize: 16 }}>Resultado de Admisión por Carrera</div>
                <div className="page-subtitle">Asignación por cupos y promedio</div>
              </div>
              <button className="btn btn-primary" onClick={ejecutarAdmision} disabled={loadingAdm}>
                <i className="bi bi-play-circle"></i> {loadingAdm ? 'Procesando...' : 'Ejecutar Admisión'}
              </button>
            </div>
            {reporteAdmision.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-icon"><i className="bi bi-info-circle"></i></div>
                  <div className="empty-state-text">Haga clic en "Ejecutar Admisión" para procesar los resultados</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
                {reporteAdmision.map((c, i) => (
                  <div key={i} className="card" style={{ textAlign: 'center', padding: 20 }}>
                    <div style={{ fontSize: 20, marginBottom: 8 }}><i className="bi bi-building" style={{ color: 'var(--primary)' }}></i></div>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{c.carrera}</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)', marginBottom: 2 }}>{c.admitidos}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>de {c.cupo} cupos</div>
                    <div className="progress-track" style={{ marginBottom: 6 }}>
                      <div className="progress-fill progress-fill-success" style={{ width: `${Math.round(c.admitidos/c.cupo*100)}%` }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.disponibles} disponibles</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Notas por Materia ── */}
        {tab === 'notas' && (
          <div className="card">
            <div className="card-header">
              <i className="bi bi-journal-text"></i> Notas por Materia
              <span style={{ marginLeft: 6, background: 'var(--bg)', borderRadius: 20, padding: '1px 9px', fontSize: 11, color: 'var(--text-muted)' }}>
                {notasMateria.length}
              </span>
              <div className="card-header-actions">
                <select className="form-select" style={{ width: 'auto', padding: '4px 10px', fontSize: 13 }}
                  value={materiaSeleccionada}
                  onChange={e => { setMateriaSel(e.target.value); loadNotasMateria(e.target.value) }}>
                  <option value="">Seleccione una materia</option>
                  {materias.map(m => <option key={m.idmateria} value={m.idmateria}>{m.nombre}</option>)}
                </select>
                <button className="btn btn-sm btn-outline-danger" onClick={exportarPDFNotas} disabled={!notasMateria.length}>
                  <i className="bi bi-file-earmark-pdf"></i> PDF
                </button>
              </div>
            </div>
            {loading ? (
              <div className="spinner-box"><span className="spinner"></span></div>
            ) : notasMateria.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><i className="bi bi-inbox"></i></div>
                <div className="empty-state-text">
                  {materiaSeleccionada ? 'No hay notas registradas para esta materia' : 'Seleccione una materia para ver las notas'}
                </div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>CI</th><th>Nombres</th><th>Apellidos</th><th>Ex. 1 (30%)</th><th>Ex. 2 (30%)</th><th>Ex. 3 (40%)</th><th>Nota Final</th><th>Estado</th></tr>
                  </thead>
                  <tbody>
                    {notasMateria.map((n, i) => (
                      <tr key={i}>
                        <td className="td-bold">{n.ci}</td>
                        <td>{n.nombres}</td>
                        <td>{n.apellidos}</td>
                        <td>{n.nota1}</td>
                        <td>{n.nota2}</td>
                        <td>{n.nota3}</td>
                        <td><strong>{n.promedio}</strong></td>
                        <td><span className={`badge badge-${BADGE[n.estado] || 'neutral'}`}>{n.estado}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Grupos ── */}
        {tab === 'grupos' && (
          <div className="card">
            <div className="card-header"><i className="bi bi-collection"></i> Grupos con Mayor Cantidad de Aprobados</div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Grupo</th><th>Turno</th><th>Total</th><th>Aprobados</th><th>Reprobados</th><th>% Aprobación</th></tr>
                </thead>
                <tbody>
                  {grupos.map((g, i) => {
                    const pct = g.total_estudiantes > 0 ? Math.round(g.aprobados / g.total_estudiantes * 100) : 0
                    return (
                      <tr key={i}>
                        <td className="td-bold">{g.nombregrupo}</td>
                        <td><span className={`badge badge-${TURNO_BADGE[g.turno] || 'neutral'}`}>{g.turno}</span></td>
                        <td>{g.total_estudiantes}</td>
                        <td><span className="badge badge-success">{g.aprobados}</span></td>
                        <td><span className="badge badge-danger">{g.reprobados}</span></td>
                        <td>
                          <div className="progress-row">
                            <div className="progress-track">
                              <div className="progress-fill progress-fill-success" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="progress-label">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default Reportes
