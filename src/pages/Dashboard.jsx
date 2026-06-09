import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { apiFetch } from '../api'

const MODULOS = [
  { icon: 'bi-person-lines-fill', title: 'Postulantes',   desc: 'Registro y gestión de postulantes',      ruta: '/postulantes',   label: 'Abrir' },
  { icon: 'bi-clipboard',         title: 'Inscripciones', desc: 'Gestión de inscripciones',               ruta: '/inscripciones', label: 'Abrir' },
  { icon: 'bi-journal-text',      title: 'Exámenes',      desc: 'Registro de notas y evaluaciones',       ruta: '/examenes',      label: 'Abrir' },
  { icon: 'bi-collection',        title: 'Grupos',         desc: 'Asignación automática de grupos',        ruta: '/grupos',        label: 'Abrir' },
  { icon: 'bi-cash-stack',        title: 'Pagos',          desc: 'Control de pagos de postulantes',        ruta: '/pagos',         label: 'Abrir' },
  { icon: 'bi-person-badge',      title: 'Docentes',       desc: 'Gestión del personal docente',           ruta: '/docentes',            label: 'Abrir' },
  { icon: 'bi-person-badge-fill', title: 'Postulaciones',  desc: 'Postulaciones de docentes pendientes',   ruta: '/postulaciones-docente', label: 'Abrir' },
  { icon: 'bi-bar-chart',         title: 'Reportes',       desc: 'Estadísticas y reportes gerenciales',    ruta: '/reportes',      label: 'Abrir' },
  { icon: 'bi-journal-text',      title: 'Bitácora',       desc: 'Registro de accesos al sistema',          ruta: '/bitacora',      label: 'Abrir', soloAdmin: true },
]

function Dashboard() {
  const navigate = useNavigate()
  const usuario  = JSON.parse(localStorage.getItem('usuario'))
  const [stats, setStats] = useState({ total_inscritos: 0, total_aprobados: 0, total_reprobados: 0, total_grupos: 0 })

  useEffect(() => {
    if (!usuario) { navigate('/'); return }
    apiFetch('/api/reportes/dashboard')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStats(d) })
      .catch(() => {})
  }, [])

  if (!usuario) return null

  const STATS = [
    { label: 'Total Inscritos', value: stats.total_inscritos,  icon: 'bi-people',      cls: 'stat-card-primary' },
    { label: 'Aprobados',       value: stats.total_aprobados,  icon: 'bi-check-circle', cls: 'stat-card-success' },
    { label: 'Reprobados',      value: stats.total_reprobados, icon: 'bi-x-circle',     cls: 'stat-card-danger'  },
    { label: 'Grupos Activos',  value: stats.total_grupos,     icon: 'bi-collection',   cls: 'stat-card-warning' },
  ]

  const ModuleCard = ({ m }) => (
    <div className="module-card" onClick={() => navigate(m.ruta)}>
      <div className="module-icon"><i className={`bi ${m.icon}`}></i></div>
      <div className="module-title">{m.title}</div>
      <div className="module-desc">{m.desc}</div>
      <button className="btn btn-primary btn-sm">
        <i className="bi bi-arrow-right"></i> {m.label}
      </button>
    </div>
  )

  return (
    <div className="page">
      <Navbar usuario={usuario} />
      <div className="page-content">

        <div style={{ marginBottom: 26 }}>
          <div className="page-title">Panel de control</div>
          <div className="page-subtitle">Bienvenido, {usuario.nombre} — {usuario.rol}</div>
        </div>

        <div className="stat-grid">
          {STATS.map(s => (
            <div key={s.label} className={`stat-card ${s.cls}`}>
              <div className="stat-icon"><i className={`bi ${s.icon}`}></i></div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="module-grid">
          {MODULOS.filter(m => !m.soloAdmin || usuario.rol === 'ADMINISTRADOR').map(m => <ModuleCard key={m.ruta} m={m} />)}
        </div>

      </div>
    </div>
  )
}

export default Dashboard
