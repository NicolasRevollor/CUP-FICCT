import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

function Reportes() { 
  const navigate = useNavigate()
  const usuario = JSON.parse(localStorage.getItem('usuario'))
  const [dashboard, setDashboard] = useState(null)
  const [estadisticas, setEstadisticas] = useState([])
  const [grupos, setGrupos] = useState([])
  const [postulantes, setPostulantes] = useState([])
  const [loading, setLoading] = useState(false)
  const [reporte, setReporte] = useState('dashboard')
  const [admision, setAdmision] = useState([])
  const [reporteAdmision, setReporteAdmision] = useState([])
  const [loadingAdmision, setLoadingAdmision] = useState(false)

  useEffect(() => {
    if (!usuario) navigate('/')
    fetchDashboard()
    fetchEstadisticas()
    fetchGrupos()
  }, [])

  if (!usuario) return null

  const fetchDashboard = async () => {
    const res = await fetch('https://cup-ficct-production.up.railway.app/api/reportes/dashboard')
    const data = await res.json()
    setDashboard(data)
  }

  const fetchEstadisticas = async () => {
    const res = await fetch('https://cup-ficct-production.up.railway.app/api/reportes/estadisticas-materia')
    const data = await res.json()
    setEstadisticas(data)
  }

  const fetchGrupos = async () => {
    const res = await fetch('https://cup-ficct-production.up.railway.app/api/reportes/grupos-aprobados')
    const data = await res.json()
    setGrupos(data)
  }

  const fetchPostulantes = async (tipo) => {
    setLoading(true)
    const url = tipo === 'aprobados'
      ? 'https://cup-ficct-production.up.railway.app/api/reportes/aprobados'
      : tipo === 'reprobados'
      ? 'https://cup-ficct-production.up.railway.app/api/reportes/reprobados'
      : 'https://cup-ficct-production.up.railway.app/api/reportes/postulantes'
    const res = await fetch(url)
    const data = await res.json()
    setPostulantes(data)
    setLoading(false)
  }

  const getBadge = (estado) => {
    const badges = {
      'APROBADO':  'success',
      'REPROBADO': 'danger',
      'INSCRITO':  'primary',
      'PENDIENTE': 'warning'
    }
    return badges[estado] || 'secondary'
  }
  const exportarCSV = () => {
  if (postulantes.length === 0) return

  const headers = ['CI', 'Nombres', 'Apellidos', 'Ciudad', 'Promedio', 'Estado']
  const rows = postulantes.map(p => [
    p.ci, p.nombres, p.apellidos, p.ciudad, p.promedio_final, p.estadopostulante
  ])

  const csvContent = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `reporte_${reporte}_${new Date().toLocaleDateString()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
const exportarPDF = () => {
  if (postulantes.length === 0) return

  const doc = new jsPDF()

  // Título
  doc.setFontSize(18)
  doc.setTextColor(0, 48, 135)
  doc.text('CUP - FICCT', 14, 20)

  doc.setFontSize(12)
  doc.setTextColor(100)
  doc.text(
    reporte === 'todos' ? 'Lista General de Postulantes' :
    reporte === 'aprobados' ? 'Postulantes Aprobados' :
    'Postulantes Reprobados',
    14, 30
  )

  doc.setFontSize(10)
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 38)
  doc.text(`Total: ${postulantes.length}`, 14, 45)

  // Tabla
  autoTable(doc, {
    startY: 52,
    head: [['CI', 'Nombres', 'Apellidos', 'Ciudad', 'Promedio', 'Estado']],
    body: postulantes.map(p => [
      p.ci,
      p.nombres,
      p.apellidos,
      p.ciudad,
      p.promedio_final,
      p.estadopostulante
    ]),
    headStyles: { fillColor: [0, 48, 135] },
    alternateRowStyles: { fillColor: [240, 244, 255] },
    styles: { fontSize: 9 }
  })

  doc.save(`reporte_${reporte}_${new Date().toLocaleDateString()}.pdf`)

  const ejecutarAdmision = async () => {
  setLoadingAdmision(true)
  try {
    await fetch('https://cup-ficct-production.up.railway.app/api/reportes/admision', { method: 'POST' })
    const res = await fetch('https://cup-ficct-production.up.railway.app/api/reportes/admision')
    const data = await res.json()
    setReporteAdmision(data)
    setReporte('admision')
  } catch (err) {
    console.error(err)
  } finally {
    setLoadingAdmision(false)
  }
}
doc.save(`reporte_${reporte}_${new Date().toLocaleDateString()}.pdf`)
}

const ejecutarAdmision = async () => {
  setLoadingAdmision(true)
  try {
    const res = await fetch('https://cup-ficct-production.up.railway.app/api/reportes/admision', { method: 'POST' })
    const data = await res.json()
    setReporteAdmision(data)
  } catch (err) {
    console.error(err)
  } finally {
    setLoadingAdmision(false)
  }
}



  return (
    <div>
      <Navbar usuario={usuario} />
      <div className="container mt-4">

        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-bold" style={{ color: '#003087' }}>
              <i className="bi bi-bar-chart-fill me-2"></i>
              Reportes y Estadísticas
            </h4>
            <p className="text-muted mb-0">CUP - FICCT 2026</p>
          </div>
          <button className="btn text-white" style={{ backgroundColor: '#003087' }}
            onClick={() => navigate('/dashboard')}>
            <i className="bi bi-arrow-left me-2"></i>Volver
          </button>
        </div>

        {/* Estadísticas generales */}
        {dashboard && (
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <div className="card text-white shadow" style={{ backgroundColor: '#003087' }}>
                <div className="card-body text-center">
                  <i className="bi bi-people-fill fs-2"></i>
                  <h2 className="fw-bold mt-2">{dashboard.total_inscritos}</h2>
                  <p className="mb-0">Total Inscritos</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-white bg-success shadow">
                <div className="card-body text-center">
                  <i className="bi bi-check-circle-fill fs-2"></i>
                  <h2 className="fw-bold mt-2">{dashboard.total_aprobados}</h2>
                  <p className="mb-0">Aprobados</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-white bg-danger shadow">
                <div className="card-body text-center">
                  <i className="bi bi-x-circle-fill fs-2"></i>
                  <h2 className="fw-bold mt-2">{dashboard.total_reprobados}</h2>
                  <p className="mb-0">Reprobados</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-white bg-warning shadow">
                <div className="card-body text-center">
                  <i className="bi bi-clock-fill fs-2"></i>
                  <h2 className="fw-bold mt-2">{dashboard.total_pendientes}</h2>
                  <p className="mb-0">Pendientes</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs de reportes */}
        <div className="mb-4">
          <div className="btn-group flex-wrap">
            {[
              { key: 'dashboard', label: 'Estadísticas', icon: 'bi-bar-chart-fill' },
              { key: 'todos', label: 'Todos', icon: 'bi-people-fill' },
              { key: 'aprobados', label: 'Aprobados', icon: 'bi-check-circle-fill' },
              { key: 'reprobados', label: 'Reprobados', icon: 'bi-x-circle-fill' },
              { key: 'grupos', label: 'Grupos', icon: 'bi-collection-fill' },
              { key: 'admision', label: 'Admisión', icon: 'bi-mortarboard-fill' },
            ].map(tab => (
              <button key={tab.key}
                className={`btn ${reporte === tab.key ? 'text-white' : 'btn-outline-secondary'}`}
                style={reporte === tab.key ? { backgroundColor: '#003087' } : {}}
                onClick={() => {
                       setReporte(tab.key)
                      if (tab.key !== 'dashboard' && tab.key !== 'grupos' && tab.key !== 'admision') {
                         fetchPostulantes(tab.key)
                }
                 }}>
                <i className={`bi ${tab.icon} me-1`}></i>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido según tab */}

        {/* Estadísticas por materia */}
        {reporte === 'dashboard' && (
          <div className="card shadow">
            <div className="card-header fw-bold" style={{ backgroundColor: '#003087', color: 'white' }}>
              <i className="bi bi-graph-up me-2"></i>
              Estadísticas por Materia
            </div>
            <div className="card-body p-0">
              <table className="table table-hover mb-0">
                <thead style={{ backgroundColor: '#f8f9fa' }}>
                  <tr>
                    <th>Materia</th>
                    <th>Total Exámenes</th>
                    <th>Aprobados</th>
                    <th>Reprobados</th>
                    <th>Promedio General</th>
                    <th>% Aprobación</th>
                  </tr>
                </thead>
                <tbody>
                  {estadisticas.map((e, i) => (
                    <tr key={i}>
                      <td className="fw-semibold">{e.materia}</td>
                      <td>{e.total}</td>
                      <td><span className="badge bg-success">{e.aprobados}</span></td>
                      <td><span className="badge bg-danger">{e.reprobados}</span></td>
                      <td><strong>{e.promedio_general}</strong></td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="progress flex-grow-1" style={{ height: '8px' }}>
                            <div className="progress-bar bg-success"
                              style={{ width: `${e.total > 0 ? (e.aprobados/e.total*100) : 0}%` }}>
                            </div>
                          </div>
                          <small>{e.total > 0 ? Math.round(e.aprobados/e.total*100) : 0}%</small>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Lista de postulantes */}
        {(reporte === 'todos' || reporte === 'aprobados' || reporte === 'reprobados') && (
          <div className="card shadow">
            <div className="card-header fw-bold" style={{ backgroundColor: '#003087', color: 'white' }}>
              <i className="bi bi-list-ul me-2"></i>
              {reporte === 'todos' && 'Lista General de Postulantes'}
              {reporte === 'aprobados' && 'Postulantes Aprobados'}
              {reporte === 'reprobados' && 'Postulantes Reprobados'}
            <span className="ms-2 badge bg-light text-dark">{postulantes.length}</span>
            <button className="btn btn-sm btn-light ms-3" onClick={exportarCSV}>
                <i className="bi bi-file-earmark-spreadsheet me-1"></i>
               Exportar CSV
            </button>
            <button className="btn btn-sm btn-danger ms-2" onClick={exportarPDF}>
              <i className="bi bi-file-earmark-pdf me-1"></i>
              Exportar PDF
              </button>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center p-4">
                  <div className="spinner-border" style={{ color: '#003087' }}></div>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead style={{ backgroundColor: '#f8f9fa' }}>
                      <tr>
                        <th>CI</th>
                        <th>Nombres</th>
                        <th>Apellidos</th>
                        <th>Ciudad</th>
                        <th>Promedio</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {postulantes.map((p, i) => (
                        <tr key={i}>
                          <td>{p.ci}</td>
                          <td>{p.nombres}</td>
                          <td>{p.apellidos}</td>
                          <td>{p.ciudad}</td>
                          <td><strong>{p.promedio_final}</strong></td>
                          <td>
                            <span className={`badge bg-${getBadge(p.estadopostulante)}`}>
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
          </div>
        )}
        {/* Admisión */}
{reporte === 'admision' && (
  <div>
    <div className="d-flex justify-content-between align-items-center mb-3">
      <h5 className="fw-bold" style={{ color: '#003087' }}>
        <i className="bi bi-mortarboard-fill me-2"></i>
        Resultado de Admisión por Carrera
      </h5>
      <button className="btn text-white" style={{ backgroundColor: '#003087' }}
        onClick={ejecutarAdmision} disabled={loadingAdmision}>
        <i className="bi bi-play-circle me-2"></i>
        {loadingAdmision ? 'Procesando...' : 'Ejecutar Admisión'}
      </button>
    </div>

    {reporteAdmision.length === 0 ? (
      <div className="text-center text-muted p-4">
        <i className="bi bi-info-circle fs-1"></i>
        <p className="mt-2">Haga click en "Ejecutar Admisión" para procesar</p>
      </div>
    ) : (
      <div className="row g-3">
        {reporteAdmision.map((c, i) => (
          <div className="col-md-3" key={i}>
            <div className="card shadow-sm text-center">
              <div className="card-body">
                <i className="bi bi-building fs-2" style={{ color: '#003087' }}></i>
                <h6 className="fw-bold mt-2">{c.carrera}</h6>
                <h3 className="fw-bold" style={{ color: '#003087' }}>{c.admitidos}</h3>
                <p className="text-muted mb-1">de {c.cupo} cupos</p>
                <div className="progress" style={{ height: '8px' }}>
                  <div className="progress-bar bg-success"
                    style={{ width: `${(c.admitidos/c.cupo)*100}%` }}>
                  </div>
                </div>
                <small className="text-muted">{c.disponibles} disponibles</small>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}

        {/* Grupos */}
        {reporte === 'grupos' && (
          <div className="card shadow">
            <div className="card-header fw-bold" style={{ backgroundColor: '#003087', color: 'white' }}>
              <i className="bi bi-collection-fill me-2"></i>
              Grupos con Mayor Cantidad de Aprobados
            </div>
            <div className="card-body p-0">
              <table className="table table-hover mb-0">
                <thead style={{ backgroundColor: '#f8f9fa' }}>
                  <tr>
                    <th>Grupo</th>
                    <th>Turno</th>
                    <th>Total Estudiantes</th>
                    <th>Aprobados</th>
                    <th>Reprobados</th>
                    <th>% Aprobación</th>
                  </tr>
                </thead>
                <tbody>
                  {grupos.map((g, i) => (
                    <tr key={i}>
                      <td className="fw-semibold">{g.nombregrupo}</td>
                      <td><span className="badge bg-secondary">{g.turno}</span></td>
                      <td>{g.total_estudiantes}</td>
                      <td><span className="badge bg-success">{g.aprobados}</span></td>
                      <td><span className="badge bg-danger">{g.reprobados}</span></td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="progress flex-grow-1" style={{ height: '8px' }}>
                            <div className="progress-bar bg-success"
                              style={{ width: `${g.total_estudiantes > 0 ? (g.aprobados/g.total_estudiantes*100) : 0}%` }}>
                            </div>
                          </div>
                          <small>{g.total_estudiantes > 0 ? Math.round(g.aprobados/g.total_estudiantes*100) : 0}%</small>
                        </div>
                      </td>
                    </tr>
                  ))}
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
