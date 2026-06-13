import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { apiFetch } from '../api'

const ESTADOS = [
  { value: '',          label: 'Todos' },
  { value: 'APROBADO',  label: 'Aprobados' },
  { value: 'REPROBADO', label: 'Reprobados' },
  { value: 'PENDIENTE', label: 'Sin notas' },
]

const MATERIAS = ['computacion', 'matematicas', 'ingles', 'fisica']
const MATERIA_LABEL = {
  computacion:  'Computación',
  matematicas:  'Matemáticas',
  ingles:       'Inglés',
  fisica:       'Física',
}

function badge(estado) {
  if (estado === 'APROBADO')  return { bg: '#ecfdf5', color: '#059669', text: 'Aprobado' }
  if (estado === 'REPROBADO') return { bg: '#fef2f2', color: '#dc2626', text: 'Reprobado' }
  return { bg: '#f3f4f6', color: '#6b7280', text: 'Pendiente' }
}

function NotaBadge({ valor }) {
  if (valor === null || valor === undefined) {
    return <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>
  }
  const n = parseFloat(valor)
  const ok = n >= 60
  return (
    <span style={{
      fontWeight: 700, fontSize: 13,
      color: ok ? '#059669' : '#dc2626',
    }}>
      {n.toFixed(1)}
    </span>
  )
}

export default function Notas() {
  const navigate  = useNavigate()
  const usuario   = JSON.parse(localStorage.getItem('usuario') || 'null')

  const [postulantes, setPost]  = useState([])
  const [meta, setMeta]         = useState({ current_page: 1, last_page: 1, total: 0 })
  const [loading, setLoading]   = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado]     = useState('')
  const [pagina, setPagina]     = useState(1)
  const [detalle, setDetalle]   = useState(null)

  useEffect(() => {
    if (!usuario) { navigate('/'); return }
  }, [])

  const cargar = useCallback(async (pag = 1, q = busqueda, est = estado) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: pag })
      if (q)   params.set('q', q)
      if (est) params.set('estado', est)
      const r = await apiFetch(`/api/notas?${params}`)
      if (!r.ok) return
      const data = await r.json()
      setPost(data.data)
      setMeta({ current_page: data.current_page, last_page: data.last_page, total: data.total })
    } finally {
      setLoading(false)
    }
  }, [busqueda, estado])

  useEffect(() => { cargar(pagina) }, [pagina])

  const handleBuscar = (e) => {
    e.preventDefault()
    setPagina(1)
    cargar(1, busqueda, estado)
  }

  const handleEstado = (est) => {
    setEstado(est)
    setPagina(1)
    cargar(1, busqueda, est)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      <Navbar usuario={usuario} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>
              <i className="bi bi-mortarboard" style={{ marginRight: 10, color: '#0d2451' }}></i>
              Notas de Postulantes
            </h1>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>
              Vista consolidada de las 4 materias. Promedio ponderado: 30% + 30% + 40%.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-outline"
              onClick={() => navigate('/dashboard')}
              style={{ fontSize: 13 }}
            >
              <i className="bi bi-arrow-left"></i> Volver
            </button>
            <button
              className="btn btn-outline"
              onClick={() => navigate('/examenes')}
              style={{ fontSize: 13 }}
            >
              <i className="bi bi-pencil-square"></i> Registrar / editar notas
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>

              {/* Búsqueda */}
              <form onSubmit={handleBuscar} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 220 }}>
                <input
                  className="form-input"
                  placeholder="Buscar por CI o nombre..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  style={{ fontSize: 13 }}
                />
                <button type="submit" className="btn btn-primary" style={{ background: '#0d2451', borderColor: '#0d2451', whiteSpace: 'nowrap' }}>
                  <i className="bi bi-search"></i>
                </button>
              </form>

              {/* Tabs de estado */}
              <div style={{ display: 'flex', gap: 6 }}>
                {ESTADOS.map(e => (
                  <button
                    key={e.value}
                    onClick={() => handleEstado(e.value)}
                    style={{
                      padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: estado === e.value ? '#0d2451' : '#f3f4f6',
                      color: estado === e.value ? '#fff' : '#374151',
                    }}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af' }}>
                <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
                Cargando notas...
              </div>
            ) : postulantes.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af' }}>
                <i className="bi bi-inbox" style={{ fontSize: 32, display: 'block', marginBottom: 8 }}></i>
                No se encontraron postulantes
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280', whiteSpace: 'nowrap' }}>CI</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>Nombre</th>
                      {MATERIAS.map(m => (
                        <th key={m} style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#6b7280', whiteSpace: 'nowrap' }}>
                          {MATERIA_LABEL[m]}
                        </th>
                      ))}
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#6b7280', whiteSpace: 'nowrap' }}>Promedio</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 600, color: '#6b7280' }}>Estado</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#6b7280' }}>Materias</th>
                    </tr>
                  </thead>
                  <tbody>
                    {postulantes.map((p, i) => {
                      const b = badge(p.estadopostulante)
                      return (
                        <tr
                          key={p.idpostulante}
                          onClick={() => setDetalle(detalle?.idpostulante === p.idpostulante ? null : p)}
                          style={{
                            borderBottom: '1px solid #f3f4f6',
                            background: detalle?.idpostulante === p.idpostulante ? '#eff6ff' : i % 2 === 0 ? '#fff' : '#fafafa',
                            cursor: 'pointer',
                            transition: 'background .1s',
                          }}
                        >
                          <td style={{ padding: '10px 16px', fontWeight: 600, color: '#111827' }}>{p.ci}</td>
                          <td style={{ padding: '10px 16px', color: '#374151' }}>{p.nombres} {p.apellidos}</td>
                          {MATERIAS.map(m => (
                            <td key={m} style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <NotaBadge valor={p[m]} />
                            </td>
                          ))}
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {p.promedio_final
                              ? <strong style={{ color: '#111827' }}>{parseFloat(p.promedio_final).toFixed(1)}</strong>
                              : <span style={{ color: '#d1d5db' }}>—</span>
                            }
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                            <span style={{ background: b.bg, color: b.color, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                              {b.text}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: '#6b7280' }}>
                            {p.materias_registradas}/4
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Panel de detalle (click en fila) */}
        {detalle && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header card-header-dark" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                <i className="bi bi-person-lines-fill"></i> {detalle.nombres} {detalle.apellidos} — CI: {detalle.ci}
              </span>
              <button onClick={() => setDetalle(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18 }}>
                <i className="bi bi-x"></i>
              </button>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {MATERIAS.map(m => {
                  const n = detalle[m] !== null && detalle[m] !== undefined ? parseFloat(detalle[m]) : null
                  const ok = n !== null && n >= 60
                  return (
                    <div key={m} style={{ background: n === null ? '#f9fafb' : ok ? '#ecfdf5' : '#fef2f2', borderRadius: 10, padding: '14px 16px', border: `1px solid ${n === null ? '#e5e7eb' : ok ? '#a7f3d0' : '#fecaca'}` }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>{MATERIA_LABEL[m]}</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: n === null ? '#d1d5db' : ok ? '#059669' : '#dc2626' }}>
                        {n !== null ? n.toFixed(1) : '—'}
                      </div>
                      <div style={{ fontSize: 11, color: n === null ? '#9ca3af' : ok ? '#059669' : '#dc2626', marginTop: 2 }}>
                        {n === null ? 'Sin nota' : ok ? 'Aprobado' : 'Reprobado'}
                      </div>
                    </div>
                  )
                })}
                <div style={{ background: '#f0f4ff', borderRadius: 10, padding: '14px 16px', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Promedio Final</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#0d2451' }}>
                    {detalle.promedio_final ? parseFloat(detalle.promedio_final).toFixed(1) : '—'}
                  </div>
                  <div style={{ fontSize: 11, color: '#374151', marginTop: 2 }}>
                    {(() => { const b = badge(detalle.estadopostulante); return <span style={{ color: b.color }}>{b.text}</span> })()}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 14, textAlign: 'right' }}>
                <button
                  className="btn btn-outline"
                  style={{ fontSize: 12 }}
                  onClick={() => navigate(`/examenes?ci=${detalle.ci}`)}
                >
                  <i className="bi bi-pencil-square"></i> Editar notas
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Paginación */}
        {meta.last_page > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20, alignItems: 'center' }}>
            <button
              className="btn btn-outline"
              style={{ fontSize: 12, padding: '6px 12px' }}
              disabled={pagina === 1}
              onClick={() => setPagina(p => p - 1)}
            >
              <i className="bi bi-chevron-left"></i>
            </button>
            <span style={{ fontSize: 13, color: '#6b7280' }}>
              Página {meta.current_page} de {meta.last_page} · {meta.total} postulantes
            </span>
            <button
              className="btn btn-outline"
              style={{ fontSize: 12, padding: '6px 12px' }}
              disabled={pagina === meta.last_page}
              onClick={() => setPagina(p => p + 1)}
            >
              <i className="bi bi-chevron-right"></i>
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
