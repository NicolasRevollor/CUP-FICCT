// ─────────────────────────────────────────────────────────────
// PÁGINA: Reportes y Estadísticas
// Muestra distintos reportes en tabs: estadísticas generales,
// listas de postulantes, notas por materia, docentes por grupo,
// grupos con más aprobados y proceso de admisión final.
// ─────────────────────────────────────────────────────────────

// jsPDF: librería para generar archivos PDF en el navegador
import jsPDF from 'jspdf'
// autoTable: plugin de jsPDF para generar tablas dentro del PDF
import autoTable from 'jspdf-autotable'

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { apiFetch } from '../api'

// Mapea estado de postulante a color de badge
const BADGE = { APROBADO: 'success', REPROBADO: 'danger', INSCRITO: 'info', PENDIENTE: 'warning' }

// Mapea turno a color de badge
const TURNO_BADGE = { 'MAÑANA': 'warning', TARDE: 'info', NOCHE: 'neutral' }

// Definición de los tabs de navegación de esta página.
// key: identificador interno; label: texto visible; icon: clase de Bootstrap Icons
const TABS = [
  { key: 'dashboard',  label: 'Estadísticas', icon: 'bi-bar-chart' },
  { key: 'todos',      label: 'Todos',        icon: 'bi-people' },
  { key: 'aprobados',  label: 'Aprobados',    icon: 'bi-check-circle' },
  { key: 'reprobados', label: 'Reprobados',   icon: 'bi-x-circle' },
  { key: 'notas',      label: 'Notas',        icon: 'bi-journal-text' },
  { key: 'grupos',     label: 'Grupos',       icon: 'bi-collection' },
  { key: 'docentes',   label: 'Docentes',     icon: 'bi-person-badge' },
  { key: 'admision',   label: 'Admisión',     icon: 'bi-mortarboard' },
]

function Reportes() {
  const navigate = useNavigate()
  const usuario  = JSON.parse(localStorage.getItem('usuario'))

  // ── Estados ──

  // Qué tab está activo actualmente
  const [tab, setTab] = useState('dashboard')

  // Datos del tab "Estadísticas": totales generales (inscritos, aprobados, etc.)
  const [dashboard, setDashboard] = useState(null)

  // Datos de la tabla "Rendimiento por Materia"
  const [estadisticas, setEstadisticas] = useState([])

  // Datos del tab "Grupos": grupos con mayor cantidad de aprobados
  const [grupos, setGrupos] = useState([])

  // Lista de postulantes (para tabs: todos, aprobados, reprobados)
  const [postulantes, setPostulantes] = useState([])

  // Resultado del proceso de admisión (tab "Admisión")
  const [reporteAdmision, setAdmision] = useState([])

  // Indicadores de carga para distintas secciones
  const [loading, setLoading]       = useState(false) // para lista de postulantes y notas
  const [loadingAdm, setLoadingAdm] = useState(false) // para el proceso de admisión

  // Lista de materias para el select del tab "Notas"
  const [materias, setMaterias] = useState([])

  // Qué materia está seleccionada en el tab "Notas"
  const [materiaSeleccionada, setMateriaSel] = useState('')

  // Notas de los postulantes para la materia seleccionada
  const [notasMateria, setNotasMateria] = useState([])

  // Datos del tab "Docentes": docentes asignados por grupo
  const [docentesGrupo, setDocentesGrupo] = useState([])

  // true mientras carga el tab de docentes
  const [loadingDoc, setLoadingDoc] = useState(false)

  // Al montar el componente, cargamos los datos que siempre se necesitan
  useEffect(() => {
    if (!usuario) { navigate('/'); return }

    // Totales para las tarjetas del dashboard (inscritos, aprobados, etc.)
    apiFetch('/api/reportes/dashboard')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setDashboard(d) })
      .catch(() => {})

    // Estadísticas por materia (tabla del tab "Estadísticas")
    apiFetch('/api/reportes/estadisticas-materia')
      .then(r => r.ok ? r.json() : [])
      .then(setEstadisticas)
      .catch(() => {})

    // Grupos con más aprobados (tab "Grupos")
    apiFetch('/api/reportes/grupos-aprobados')
      .then(r => r.ok ? r.json() : [])
      .then(setGrupos)
      .catch(() => {})

    // Materias para el select del tab "Notas"
    apiFetch('/api/materias')
      .then(r => r.ok ? r.json() : [])
      .then(setMaterias)
      .catch(() => {})
  }, [])

  if (!usuario) return null

  // ── Función: cargar lista de postulantes según el tipo de tab ──
  // tipo puede ser: 'todos', 'aprobados' o 'reprobados'
  const loadPostulantes = async (tipo) => {
    setLoading(true)
    // Cada tipo tiene su propio endpoint en el servidor
    const paths = {
      todos:      '/api/reportes/postulantes',
      aprobados:  '/api/reportes/aprobados',
      reprobados: '/api/reportes/reprobados'
    }
    apiFetch(paths[tipo])
      .then(r => r.ok ? r.json() : [])
      .then(setPostulantes)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  // ── Función: cargar notas de una materia específica ──
  const loadNotasMateria = (idMateria) => {
    if (!idMateria) {
      // Si no hay materia seleccionada, limpiar la lista
      setNotasMateria([])
      return
    }
    setLoading(true)
    apiFetch(`/api/examenes/materia/${idMateria}`)
      .then(r => r.ok ? r.json() : [])
      .then(setNotasMateria)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  // ── Función: exportar las notas de la materia seleccionada a PDF ──
  const exportarPDFNotas = () => {
    if (!notasMateria.length) return

    // Buscamos el nombre de la materia seleccionada para el título del PDF
    const mat = materias.find(m => String(m.idmateria) === String(materiaSeleccionada))

    const doc = new jsPDF()

    // Título y subtítulo del PDF
    doc.setFontSize(18); doc.setTextColor(17, 24, 39); doc.text('CUP · FICCT', 14, 20)
    doc.setFontSize(11); doc.setTextColor(100); doc.text(`Notas — ${mat?.nombre || 'Materia'}`, 14, 30)
    doc.setFontSize(9); doc.text(`Fecha: ${new Date().toLocaleDateString()} · Total: ${notasMateria.length}`, 14, 38)

    // Tabla con las notas
    autoTable(doc, {
      startY: 44, // comienza debajo del título
      head: [['CI', 'Nombres', 'Apellidos', 'Ex. 1', 'Ex. 2', 'Ex. 3', 'Nota Final', 'Estado']],
      body: notasMateria.map(n => [n.ci, n.nombres, n.apellidos, n.nota1, n.nota2, n.nota3, n.promedio, n.estado]),
      headStyles: { fillColor: [17, 24, 39] },          // encabezado negro
      alternateRowStyles: { fillColor: [249, 250, 251] }, // filas alternadas gris muy claro
      styles: { fontSize: 8.5 },
    })

    // Descarga el archivo con el nombre de la materia y la fecha
    doc.save(`notas_${mat?.nombre || 'materia'}_${new Date().toLocaleDateString()}.pdf`)
  }

  // ── Función: cargar docentes asignados por grupo ──
  const loadDocentesGrupo = () => {
    setLoadingDoc(true)
    apiFetch('/api/reportes/docentes-por-grupo')
      .then(r => r.ok ? r.json() : [])
      .then(setDocentesGrupo)
      .catch(() => {})
      .finally(() => setLoadingDoc(false))
  }

  // ── Función: manejar el cambio de tab ──
  // Carga los datos necesarios para cada tab al activarlo
  const handleTab = (key) => {
    setTab(key)

    // Estos tabs necesitan cargar la lista de postulantes
    if (['todos', 'aprobados', 'reprobados'].includes(key)) loadPostulantes(key)

    // Si salimos del tab "Notas", limpiamos la selección de materia
    if (key !== 'notas') { setMateriaSel(''); setNotasMateria([]) }

    // El tab "Docentes" carga su propia lista
    if (key === 'docentes') loadDocentesGrupo()
  }

  // ── Función: exportar docentes por grupo a PDF ──
  const exportarPDFDocentes = () => {
    if (!docentesGrupo.length) return

    const doc = new jsPDF()
    doc.setFontSize(18); doc.setTextColor(17, 24, 39); doc.text('CUP · FICCT', 14, 20)
    doc.setFontSize(11); doc.setTextColor(100); doc.text('Docentes por Grupo', 14, 30)
    doc.setFontSize(9); doc.text(`Fecha: ${new Date().toLocaleDateString()} · Total: ${docentesGrupo.length}`, 14, 38)

    autoTable(doc, {
      startY: 44,
      head: [['Grupo', 'Turno', 'Materia', 'Docente', 'Estado']],
      // 'ACTIVO' es estático porque el endpoint solo retorna asignaciones activas
      body: docentesGrupo.map(d => [d.nombregrupo, d.turno, d.materia, d.docente, 'ACTIVO']),
      headStyles: { fillColor: [17, 24, 39] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      styles: { fontSize: 8.5 },
    })

    doc.save(`docentes_por_grupo_${new Date().toLocaleDateString()}.pdf`)
  }

  // ── Función: ejecutar el proceso de admisión y luego cargar sus resultados ──
  const ejecutarAdmision = async () => {
    setLoadingAdm(true)
    try {
      // POST ejecuta el proceso en el servidor (asigna admitidos por cupo y promedio)
      await apiFetch('/api/reportes/admision', { method: 'POST' })
      // Luego GET trae los resultados
      const r = await apiFetch('/api/reportes/admision')
      if (r.ok) setAdmision(await r.json())
    } catch {
      // Si falla, no mostramos error explícito (la tabla simplemente queda vacía)
    } finally {
      setLoadingAdm(false)
    }
  }

  // ── Función: exportar lista de postulantes a CSV ──
  const exportarCSV = () => {
    if (!postulantes.length) return

    // Construimos las filas: primera fila = encabezados, resto = datos
    const rows = [
      ['CI', 'Nombres', 'Apellidos', 'Ciudad', 'Promedio', 'Estado'],
      ...postulantes.map(p => [p.ci, p.nombres, p.apellidos, p.ciudad, p.promedio_final, p.estadopostulante])
    ]

    // Convertimos a texto CSV: cada fila separada por salto de línea, celdas por coma
    const csv = rows.map(r => r.join(',')).join('\n')

    // Creamos un enlace temporal, lo "clickeamos" para forzar la descarga y lo eliminamos
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: `reporte_${tab}_${new Date().toLocaleDateString()}.csv`
    })
    a.click()
    URL.revokeObjectURL(a.href) // liberamos la memoria del objeto URL temporal
  }

  // ── Función: exportar lista de postulantes a PDF ──
  const exportarPDF = () => {
    if (!postulantes.length) return

    const doc = new jsPDF()
    doc.setFontSize(18); doc.setTextColor(17, 24, 39); doc.text('CUP · FICCT', 14, 20)
    doc.setFontSize(11); doc.setTextColor(100)

    // El título del PDF cambia según qué tab estamos exportando
    doc.text(
      tab === 'todos'      ? 'Lista General de Postulantes' :
      tab === 'aprobados'  ? 'Postulantes Aprobados'        :
                             'Postulantes Reprobados',
      14, 30
    )
    doc.setFontSize(9); doc.text(`Fecha: ${new Date().toLocaleDateString()} · Total: ${postulantes.length}`, 14, 38)

    autoTable(doc, {
      startY: 44,
      head: [['CI', 'Nombres', 'Apellidos', 'Ciudad', 'Promedio', 'Estado']],
      body: postulantes.map(p => [p.ci, p.nombres, p.apellidos, p.ciudad, p.promedio_final, p.estadopostulante]),
      headStyles: { fillColor: [17, 24, 39] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      styles: { fontSize: 8.5 },
    })

    doc.save(`reporte_${tab}_${new Date().toLocaleDateString()}.pdf`)
  }

  // ── Armamos las tarjetas de estadística si ya cargaron los datos del dashboard ──
  // Cada objeto define: etiqueta, número, estilo y ícono de la tarjeta
  const STATS = dashboard ? [
    { label: 'Total Inscritos', value: dashboard.total_inscritos,  cls: 'stat-card-primary', icon: 'bi-people' },
    { label: 'Aprobados',       value: dashboard.total_aprobados,  cls: 'stat-card-success', icon: 'bi-check-circle' },
    { label: 'Reprobados',      value: dashboard.total_reprobados, cls: 'stat-card-danger',  icon: 'bi-x-circle' },
    { label: 'Pendientes',      value: dashboard.total_pendientes, cls: 'stat-card-warning', icon: 'bi-clock' },
  ] : []

  // ── RENDER ──
  return (
    <div className="page">
      <Navbar usuario={usuario} />
      <div className="page-content">

        {/* ── Encabezado ── */}
        <div className="page-header">
          <div>
            <div className="page-title">Reportes y Estadísticas</div>
            <div className="page-subtitle">CUP · FICCT 2026</div>
          </div>
          <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>
            <i className="bi bi-arrow-left"></i> Volver
          </button>
        </div>

        {/* ── Tarjetas de estadística (solo si ya cargaron) ── */}
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

        {/* ── Pestañas de navegación ──
            Al hacer click en una pestaña se llama a handleTab() que carga los datos correspondientes */}
        <div className="filter-tabs" style={{ marginBottom: 20 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              className={`filter-tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => handleTab(t.key)}
            >
              <i className={`bi ${t.icon}`}></i> {t.label}
            </button>
          ))}
        </div>

        {/* ─────────────────────────────────────────────────
            Tab: Estadísticas (dashboard)
            Tabla con rendimiento de cada materia
        ───────────────────────────────────────────────── */}
        {tab === 'dashboard' && (
          <div className="card">
            <div className="card-header"><i className="bi bi-graph-up"></i> Rendimiento por Materia</div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Materia</th><th>Total</th><th>Aprobados</th>
                    <th>Reprobados</th><th>Promedio</th><th>% Aprobación</th>
                  </tr>
                </thead>
                <tbody>
                  {estadisticas.map((e, i) => {
                    // Calculamos el porcentaje de aprobación para la barra de progreso
                    const pct = e.total > 0 ? Math.round(e.aprobados / e.total * 100) : 0
                    return (
                      <tr key={i}>
                        <td className="td-bold">{e.materia}</td>
                        <td>{e.total}</td>
                        <td><span className="badge badge-success">{e.aprobados}</span></td>
                        <td><span className="badge badge-danger">{e.reprobados}</span></td>
                        <td><strong>{e.promedio_general}</strong></td>
                        <td>
                          {/* Barra de progreso + porcentaje numérico */}
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

        {/* ─────────────────────────────────────────────────
            Tabs: Todos / Aprobados / Reprobados
            Lista de postulantes con exportación CSV y PDF
        ───────────────────────────────────────────────── */}
        {['todos', 'aprobados', 'reprobados'].includes(tab) && (
          <div className="card">
            <div className="card-header">
              <i className="bi bi-list-ul"></i>
              {/* Título dinámico según el tab activo */}
              {tab === 'todos'      && 'Lista General'}
              {tab === 'aprobados'  && 'Postulantes Aprobados'}
              {tab === 'reprobados' && 'Postulantes Reprobados'}

              {/* Contador de resultados */}
              <span style={{ marginLeft: 6, background: 'var(--bg)', borderRadius: 20, padding: '1px 9px', fontSize: 11, color: 'var(--text-muted)' }}>
                {postulantes.length}
              </span>

              {/* Botones de exportación en el encabezado de la card */}
              <div className="card-header-actions">
                <button className="btn btn-sm btn-outline" onClick={exportarCSV} disabled={!postulantes.length}>
                  <i className="bi bi-file-earmark-spreadsheet"></i> CSV
                </button>
                <button className="btn btn-sm btn-outline-danger" onClick={exportarPDF} disabled={!postulantes.length}>
                  <i className="bi bi-file-earmark-pdf"></i> PDF
                </button>
              </div>
            </div>

            {/* Spinner o tabla según el estado de carga */}
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
                        <td>
                          <span className={`badge badge-${BADGE[p.estadopostulante] || 'neutral'}`}>
                            {p.estadopostulante}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────
            Tab: Docentes
            Muestra qué docente está asignado a cada grupo y materia
        ───────────────────────────────────────────────── */}
        {tab === 'docentes' && (
          <div className="card">
            <div className="card-header">
              <i className="bi bi-person-badge"></i> Docentes por Grupo
              <span style={{ marginLeft: 6, background: 'var(--bg)', borderRadius: 20, padding: '1px 9px', fontSize: 11, color: 'var(--text-muted)' }}>
                {docentesGrupo.length}
              </span>
              <div className="card-header-actions">
                <button className="btn btn-sm btn-outline-danger" onClick={exportarPDFDocentes} disabled={!docentesGrupo.length}>
                  <i className="bi bi-file-earmark-pdf"></i> PDF
                </button>
              </div>
            </div>

            {/* Spinner, mensaje vacío o tabla según el estado */}
            {loadingDoc ? (
              <div className="spinner-box"><span className="spinner"></span></div>
            ) : docentesGrupo.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><i className="bi bi-inbox"></i></div>
                <div className="empty-state-text">No hay docentes asignados a grupos</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Grupo</th><th>Turno</th><th>Materia</th><th>Docente</th><th>Estado</th></tr>
                  </thead>
                  <tbody>
                    {docentesGrupo.map((d, i) => (
                      <tr key={i}>
                        <td className="td-bold">{d.nombregrupo}</td>
                        {/* Badge de color según el turno */}
                        <td><span className={`badge badge-${TURNO_BADGE[d.turno] || 'neutral'}`}>{d.turno}</span></td>
                        <td>{d.materia}</td>
                        <td>{d.docente}</td>
                        {/* Siempre ACTIVO porque el endpoint filtra por estado='ACTIVO' en SQL */}
                        <td><span className="badge badge-success">ACTIVO</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────
            Tab: Admisión
            Ejecuta el proceso de admisión y muestra cuántos
            postulantes fueron admitidos por carrera
        ───────────────────────────────────────────────── */}
        {tab === 'admision' && (
          <div>
            {/* Header con botón para ejecutar el proceso */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div className="page-title" style={{ fontSize: 16 }}>Resultado de Admisión por Carrera</div>
                <div className="page-subtitle">Asignación por cupos y promedio</div>
              </div>
              <button className="btn btn-primary" onClick={ejecutarAdmision} disabled={loadingAdm}>
                <i className="bi bi-play-circle"></i> {loadingAdm ? 'Procesando...' : 'Ejecutar Admisión'}
              </button>
            </div>

            {/* Antes de ejecutar: instrucción; después: grilla de tarjetas por carrera */}
            {reporteAdmision.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-icon"><i className="bi bi-info-circle"></i></div>
                  <div className="empty-state-text">Haga clic en "Ejecutar Admisión" para procesar los resultados</div>
                </div>
              </div>
            ) : (
              /* Grilla responsiva: columnas de mínimo 200px */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
                {reporteAdmision.map((c, i) => (
                  <div key={i} className="card" style={{ textAlign: 'center', padding: 20 }}>
                    <div style={{ fontSize: 20, marginBottom: 8 }}>
                      <i className="bi bi-building" style={{ color: 'var(--primary)' }}></i>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{c.carrera}</div>
                    {/* Número grande: admitidos */}
                    <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)', marginBottom: 2 }}>{c.admitidos}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>de {c.cupo} cupos</div>
                    {/* Barra de progreso de ocupación de cupos */}
                    <div className="progress-track" style={{ marginBottom: 6 }}>
                      <div className="progress-fill progress-fill-success" style={{ width: `${Math.round(c.admitidos / c.cupo * 100)}%` }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.disponibles} disponibles</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────
            Tab: Notas por Materia
            Selector de materia → tabla de notas de todos los postulantes
        ───────────────────────────────────────────────── */}
        {tab === 'notas' && (
          <div className="card">
            <div className="card-header">
              <i className="bi bi-journal-text"></i> Notas por Materia
              <span style={{ marginLeft: 6, background: 'var(--bg)', borderRadius: 20, padding: '1px 9px', fontSize: 11, color: 'var(--text-muted)' }}>
                {notasMateria.length}
              </span>
              <div className="card-header-actions">
                {/* Select de materia dentro del encabezado de la card */}
                <select
                  className="form-select"
                  style={{ width: 'auto', padding: '4px 10px', fontSize: 13 }}
                  value={materiaSeleccionada}
                  onChange={e => {
                    setMateriaSel(e.target.value)
                    loadNotasMateria(e.target.value) // cargamos las notas al cambiar
                  }}
                >
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
                  {/* Mensaje diferente según si ya seleccionó materia o no */}
                  {materiaSeleccionada ? 'No hay notas registradas para esta materia' : 'Seleccione una materia para ver las notas'}
                </div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>CI</th><th>Nombres</th><th>Apellidos</th>
                      <th>Ex. 1 (30%)</th><th>Ex. 2 (30%)</th><th>Ex. 3 (40%)</th>
                      <th>Nota Final</th><th>Estado</th>
                    </tr>
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
                        <td>
                          <span className={`badge badge-${BADGE[n.estado] || 'neutral'}`}>{n.estado}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────
            Tab: Grupos
            Grupos con mayor cantidad de aprobados
        ───────────────────────────────────────────────── */}
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
                    // Porcentaje de aprobados sobre el total del grupo
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
