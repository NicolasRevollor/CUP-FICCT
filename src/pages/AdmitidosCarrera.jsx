import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import BASE_URL from '../api'

const CARRERA_DESIGN = {
  'Inform': { color: '#1565c0', icono: 'bi-laptop',    gradiente: 'linear-gradient(135deg,#1565c0,#1976d2)' },
  'Sistema': { color: '#6a1b9a', icono: 'bi-diagram-3', gradiente: 'linear-gradient(135deg,#6a1b9a,#7b1fa2)' },
  'Redes':  { color: '#00695c', icono: 'bi-wifi',       gradiente: 'linear-gradient(135deg,#00695c,#00796b)' },
  'Rob':    { color: '#b71c1c', icono: 'bi-cpu',        gradiente: 'linear-gradient(135deg,#b71c1c,#c62828)' },
}

function getDesign(nombre = '') {
  for (const [key, val] of Object.entries(CARRERA_DESIGN)) {
    if (nombre.includes(key)) return val
  }
  return { color: '#0d2451', icono: 'bi-mortarboard', gradiente: 'linear-gradient(135deg,#0d2451,#1a3a7a)' }
}

function PorcentajeBarra({ valor, max, color }) {
  const pct = max > 0 ? Math.min(100, (valor / max) * 100) : 0
  return (
    <div style={{ background: '#e5e7eb', borderRadius: 99, height: 8, overflow: 'hidden', flex: 1 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width .6s ease' }} />
    </div>
  )
}

export default function AdmitidosCarrera() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`${BASE_URL}/api/carreras/${id}/admitidos`)
      .then(r => {
        if (!r.ok) throw new Error('No encontrado')
        return r.json()
      })
      .then(setData)
      .catch(() => setError('No se pudo cargar la información de esta carrera.'))
      .finally(() => setLoading(false))
  }, [id])

  const design    = getDesign(data?.carrera?.nombre || '')
  const admitidos = data?.admitidos || []
  const filtrados = busqueda.trim()
    ? admitidos.filter(a =>
        `${a.nombres} ${a.apellidos} ${a.ci}`.toLowerCase().includes(busqueda.toLowerCase())
      )
    : admitidos

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }}></div>
      <span style={{ color: '#6b7280', fontSize: 14 }}>Cargando lista de admitidos...</span>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <i className="bi bi-exclamation-triangle" style={{ fontSize: 40, color: '#d97706' }}></i>
      <p style={{ color: '#374151', fontSize: 15 }}>{error}</p>
      <button className="btn btn-outline" onClick={() => navigate('/')}>
        <i className="bi bi-arrow-left"></i> Volver al inicio
      </button>
    </div>
  )

  const carrera      = data.carrera
  const total        = data.total_admitidos
  const disponibles  = Math.max(0, carrera.cupomaximo - total)
  const pctOcupado   = carrera.cupomaximo > 0 ? Math.round((total / carrera.cupomaximo) * 100) : 0

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif' }}>

      {/* ── HERO HEADER ── */}
      <div style={{ background: design.gradiente, padding: '0 32px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 0 28px' }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', padding: '6px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, transition: 'background .18s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.12)'}
          >
            <i className="bi bi-arrow-left"></i> Volver al inicio
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ width: 56, height: 56, background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.25)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className={`bi ${design.icono}`} style={{ fontSize: 26, color: '#fff' }}></i>
            </div>
            <div>
              <div style={{ color: 'rgba(255,255,255,.65)', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                Lista de Admitidos · CUP 1-2026
              </div>
              <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
                {carrera.nombre}
              </h1>
            </div>
          </div>

          {/* Stats rápidos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 24 }}>
            {[
              { icono: 'bi-trophy', label: 'Admitidos', valor: total, color: '#fff' },
              { icono: 'bi-people', label: 'Cupo total', valor: carrera.cupomaximo, color: 'rgba(255,255,255,.8)' },
              { icono: 'bi-door-open', label: 'Disponibles', valor: disponibles, color: disponibles === 0 ? '#fca5a5' : 'rgba(255,255,255,.8)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 10, padding: '14px 18px' }}>
                <i className={`bi ${s.icono}`} style={{ color: 'rgba(255,255,255,.6)', fontSize: 16, marginBottom: 6, display: 'block' }}></i>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.valor}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Barra de ocupación */}
          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
            <PorcentajeBarra valor={total} max={carrera.cupomaximo} color="rgba(255,255,255,.9)" />
            <span style={{ color: 'rgba(255,255,255,.75)', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>{pctOcupado}% ocupado</span>
          </div>
        </div>
      </div>

      {/* ── CONTENIDO ── */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 20px 48px' }}>

        {admitidos.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '64px 32px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            <i className="bi bi-hourglass-split" style={{ fontSize: 44, color: '#d1d5db', display: 'block', marginBottom: 14 }}></i>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
              El proceso de admisión aún no ha sido ejecutado
            </div>
            <p style={{ color: '#6b7280', fontSize: 14, maxWidth: 400, margin: '0 auto' }}>
              Los resultados aparecerán aquí una vez que el administrador ejecute el algoritmo de admisión.
            </p>
          </div>
        ) : (
          <>
            {/* Búsqueda */}
            <div style={{ marginBottom: 16, display: 'flex', gap: 10 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <i className="bi bi-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14 }}></i>
                <input
                  className="form-input"
                  placeholder="Buscar por nombre o CI..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  style={{ paddingLeft: 36, fontSize: 13 }}
                />
              </div>
              {busqueda && (
                <button className="btn btn-outline" onClick={() => setBusqueda('')} style={{ fontSize: 12 }}>
                  <i className="bi bi-x"></i> Limpiar
                </button>
              )}
            </div>

            {/* Tabla */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  <i className="bi bi-list-ol" style={{ marginRight: 8, color: design.color }}></i>
                  {filtrados.length === admitidos.length
                    ? `${admitidos.length} estudiantes admitidos`
                    : `${filtrados.length} de ${admitidos.length} resultados`}
                </span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>Ordenado por promedio (mayor → menor)</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#fafafa' }}>
                      {['#', 'CI', 'Nombre completo', 'Promedio final', 'Preferencia'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: h === '#' || h === 'Promedio final' || h === 'Preferencia' ? 'center' : 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((a, idx) => {
                      const rankReal = admitidos.findIndex(x => x.ci === a.ci) + 1
                      return (
                        <tr
                          key={a.ci}
                          style={{
                            borderBottom: '1px solid #f3f4f6',
                            background: idx % 2 === 0 ? '#fff' : '#fafafa',
                            transition: 'background .12s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                          onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
                        >
                          {/* Rank */}
                          <td style={{ padding: '11px 16px', textAlign: 'center', width: 56 }}>
                            <span style={{ fontWeight: 700, color: design.color, fontSize: 13 }}>
                              {rankReal}
                            </span>
                          </td>
                          {/* CI */}
                          <td style={{ padding: '11px 16px', fontWeight: 600, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
                            {a.ci}
                          </td>
                          {/* Nombre */}
                          <td style={{ padding: '11px 16px', color: '#374151' }}>
                            <span style={{ fontWeight: 600 }}>{a.apellidos}</span>, {a.nombres}
                          </td>
                          {/* Promedio */}
                          <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                            <span style={{
                              fontWeight: 800,
                              fontSize: 15,
                              color: parseFloat(a.promedio_final) >= 80 ? '#059669' : parseFloat(a.promedio_final) >= 60 ? '#d97706' : '#dc2626',
                            }}>
                              {parseFloat(a.promedio_final).toFixed(2)}
                            </span>
                          </td>
                          {/* Opción */}
                          <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                            <span style={{
                              background: a.opcion === 1 ? design.color + '15' : '#f3f4f6',
                              color: a.opcion === 1 ? design.color : '#6b7280',
                              border: `1px solid ${a.opcion === 1 ? design.color + '40' : '#e5e7eb'}`,
                              padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                            }}>
                              {a.opcion === 1 ? '1ra opción' : '2da opción'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {filtrados.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                  <i className="bi bi-search" style={{ fontSize: 28, display: 'block', marginBottom: 8 }}></i>
                  No hay resultados para "{busqueda}"
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
