import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { apiFetch } from '../api'

const MODULOS = [
  { icon: 'bi-person-lines-fill', title: 'Postulantes',   desc: 'Consultar y gestionar postulantes',       ruta: '/postulantes',    badge: null },
  { icon: 'bi-clipboard-check',   title: 'Inscripciones', desc: 'Revisar y confirmar inscripciones',        ruta: '/inscripciones',  badge: null },
  { icon: 'bi-cash-stack',        title: 'Pagos',          desc: 'Verificar pagos y estados de pago',       ruta: '/pagos',          badge: null },
  { icon: 'bi-collection',        title: 'Grupos',         desc: 'Ver grupos y asignar postulantes',         ruta: '/grupos',         badge: null },
  { icon: 'bi-calendar-check',    title: 'Asistencia',     desc: 'Consultar asistencia por grupo',           ruta: '/asistencia',     badge: null },
  { icon: 'bi-mortarboard',       title: 'Notas',          desc: 'Vista consolidada de calificaciones',      ruta: '/notas',          badge: null },
  { icon: 'bi-journal-text',      title: 'Exámenes',       desc: 'Registrar y editar notas por materia',     ruta: '/examenes',       badge: null },
  { icon: 'bi-person-badge',      title: 'Docentes',       desc: 'Consultar personal docente y grupos',      ruta: '/docentes',       badge: null },
  { icon: 'bi-bar-chart',         title: 'Reportes',       desc: 'Estadísticas generales del período',       ruta: '/reportes',       badge: null },
]

function CoordinadorDashboard() {
  const navigate = useNavigate()
  const usuario  = JSON.parse(localStorage.getItem('usuario'))
  const [stats, setStats] = useState({
    total_inscritos:  0,
    total_aprobados:  0,
    total_reprobados: 0,
    total_grupos:     0,
  })

  useEffect(() => {
    if (!usuario || usuario.rol !== 'COORDINADOR') {
      navigate('/')
      return
    }
    apiFetch('/api/reportes/dashboard')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStats(d) })
      .catch(() => {})
  }, [])

  if (!usuario || usuario.rol !== 'COORDINADOR') return null

  const STATS = [
    { label: 'Total Inscritos', value: stats.total_inscritos,  icon: 'bi-people',       cls: 'stat-card-primary' },
    { label: 'Aprobados',       value: stats.total_aprobados,  icon: 'bi-check-circle',  cls: 'stat-card-success' },
    { label: 'Reprobados',      value: stats.total_reprobados, icon: 'bi-x-circle',      cls: 'stat-card-danger'  },
    { label: 'Grupos Activos',  value: stats.total_grupos,     icon: 'bi-collection',    cls: 'stat-card-warning' },
  ]

  return (
    <div className="page">
      <Navbar usuario={usuario} />
      <div className="page-content">

        {/* Encabezado */}
        <div style={{ marginBottom: 26 }}>
          <div className="page-title">Panel del Coordinador</div>
          <div className="page-subtitle">
            Bienvenido, <strong>{usuario.nombre}</strong> — Coordinación Académica CUP · FICCT
          </div>
        </div>

        {/* Tarjetas de estadísticas */}
        <div className="stat-grid">
          {STATS.map(s => (
            <div key={s.label} className={`stat-card ${s.cls}`}>
              <div className="stat-icon"><i className={`bi ${s.icon}`}></i></div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Módulos disponibles */}
        <div style={{ margin: '8px 0 16px' }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#374151', marginBottom: 4 }}>
            <i className="bi bi-grid-3x3-gap" style={{ marginRight: 7 }}></i>Módulos disponibles
          </div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>
            Acceda a las secciones que tiene habilitadas como coordinador.
          </div>
        </div>

        <div className="module-grid">
          {MODULOS.map(m => (
            <div key={m.ruta} className="module-card" onClick={() => navigate(m.ruta)}>
              <div className="module-icon"><i className={`bi ${m.icon}`}></i></div>
              <div className="module-title">{m.title}</div>
              <div className="module-desc">{m.desc}</div>
              <button className="btn btn-primary btn-sm">
                <i className="bi bi-arrow-right"></i> Abrir
              </button>
            </div>
          ))}
        </div>

        {/* Nota informativa */}
        <div style={{
          marginTop: 32,
          padding: '14px 18px',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          fontSize: 13,
          color: '#1e40af',
        }}>
          <i className="bi bi-info-circle-fill" style={{ fontSize: 16, marginTop: 1, flexShrink: 0 }}></i>
          <div>
            Como <strong>Coordinador</strong>, tiene acceso de lectura y gestión operativa del curso de ingreso.
            Las funciones administrativas del sistema (usuarios, auditoría, configuración) están reservadas al Administrador.
          </div>
        </div>

      </div>
    </div>
  )
}

export default CoordinadorDashboard
