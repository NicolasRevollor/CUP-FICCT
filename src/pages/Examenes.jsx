import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { apiFetch } from '../api'

const BADGE = { APROBADO: 'success', REPROBADO: 'danger', PENDIENTE: 'warning' }
// Fórmula igual al TRIGGER 1: (n1*0.30) + (n2*0.30) + (n3*0.40)
const pond  = (n1, n2, n3) => ((+n1 * 0.30) + (+n2 * 0.30) + (+n3 * 0.40)).toFixed(2)

function Examenes() {
  const navigate  = useNavigate()
  const usuario   = JSON.parse(localStorage.getItem('usuario'))
  const [busci, setBusci]         = useState('')
  const [postulante, setPost]     = useState(null)
  const [examenes, setExamenes]   = useState([])
  const [materias, setMaterias]   = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [exito, setExito]         = useState('')
  const [form, setForm]           = useState({ idmateria: '', nota1: '', nota2: '', nota3: '' })
  const [editando, setEditando]   = useState(null)
  const [showForm, setShowForm]   = useState(false)

  useEffect(() => {
    if (!usuario) { navigate('/'); return }
    apiFetch('/api/materias').then(r => r.ok ? r.json() : []).then(setMaterias).catch(() => {})
  }, [])

  if (!usuario) return null

  const buscarPostulante = async (e) => {
    e.preventDefault(); setError(''); setPost(null); setExamenes([]); setLoading(true)
    try {
      const r = await apiFetch(`/api/postulantes/buscar?q=${encodeURIComponent(busci)}`)
      if (!r.ok) throw new Error()
      const d = await r.json()
      const p = d.data?.find(x => x.ci === busci)
      if (!p) { setError('No se encontró postulante con ese CI'); return }
      setPost(p)
      apiFetch(`/api/examenes/${p.idpostulante}`).then(r => r.ok ? r.json() : []).then(setExamenes)
    } catch { setError('Error de conexión con el servidor') }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setExito('')
    try {
      const body = editando
        ? JSON.stringify({ nota1: form.nota1, nota2: form.nota2, nota3: form.nota3 })
        : JSON.stringify({ idpostulante: postulante.idpostulante, idmateria: form.idmateria, nota1: form.nota1, nota2: form.nota2, nota3: form.nota3 })
      const res = await apiFetch(editando ? `/api/examenes/${editando}` : '/api/examenes', {
        method: editando ? 'PUT' : 'POST', body,
      })
      const data = await res.json()
      if (res.ok) {
        setExito(editando ? 'Notas actualizadas' : 'Notas registradas correctamente')
        setShowForm(false); setEditando(null); setForm({ idmateria: '', nota1: '', nota2: '', nota3: '' })
        apiFetch(`/api/examenes/${postulante.idpostulante}`).then(r => r.ok ? r.json() : []).then(setExamenes)
        apiFetch(`/api/postulantes/${postulante.idpostulante}`).then(r => r.ok ? r.json() : null).then(d => { if (d) setPost(d) })
      } else setError(data.message)
    } catch { setError('Error de conexión con el servidor') }
  }

  const handleEditar = (ex) => {
    setEditando(ex.idexamen)
    setForm({ idmateria: String(ex.idmateria), nota1: ex.nota1, nota2: ex.nota2, nota3: ex.nota3 })
    setShowForm(true)
  }

  const ponderada = pond(form.nota1, form.nota2, form.nota3)
  const showPrev  = form.nota1 !== '' && form.nota2 !== '' && form.nota3 !== ''

  return (
    <div className="page">
      <Navbar usuario={usuario} />
      <div className="page-content">

        <div className="page-header">
          <div>
            <div className="page-title">Registro de Exámenes</div>
            <div className="page-subtitle">Registre las notas de las materias por postulante</div>
          </div>
          <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>
            <i className="bi bi-arrow-left"></i> Volver
          </button>
        </div>

        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-header card-header-dark">
            <i className="bi bi-search"></i> Buscar Postulante por CI
          </div>
          <div className="card-body">
            <form onSubmit={buscarPostulante}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" placeholder="Ingrese CI exacto del postulante..."
                  value={busci} onChange={e => setBusci(e.target.value)} required style={{ flex: 1 }} />
                <button className="btn btn-primary" type="submit">
                  <i className="bi bi-search"></i> Buscar
                </button>
              </div>
            </form>
          </div>
        </div>

        {loading && <div className="spinner-box"><span className="spinner"></span></div>}

        {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i>{error}</div>}
        {exito && <div className="alert alert-success"><i className="bi bi-check-circle"></i>{exito}</div>}

        {postulante && (
          <>
            <div className="card" style={{ marginBottom: 18 }}>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                    {postulante.nombres} {postulante.apellidos}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 14 }}>
                    <span>CI: <strong>{postulante.ci}</strong></span>
                    <span>Promedio: <strong>{postulante.promedio_final ?? '—'}</strong></span>
                    <span>
                      <span className={`badge badge-${BADGE[postulante.estadopostulante] || 'neutral'}`}>
                        {postulante.estadopostulante}
                      </span>
                    </span>
                  </div>
                </div>
                {examenes.length < 4 && (
                  <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditando(null); setForm({ idmateria: '', nota1: '', nota2: '', nota3: '' }) }}>
                    <i className="bi bi-plus"></i> Registrar Notas
                  </button>
                )}
              </div>
            </div>

            {showForm && (
              <div className="card" style={{ marginBottom: 18 }}>
                <div className="card-header card-header-dark">
                  <i className="bi bi-pencil"></i> {editando ? 'Editar Notas' : 'Registrar Notas'}
                </div>
                <div className="card-body">
                  <form onSubmit={handleSubmit}>
                    {!editando && (
                      <div className="form-group">
                        <label className="form-label">Materia <span className="req">*</span></label>
                        <select className="form-select" value={form.idmateria}
                          onChange={e => setForm(f => ({ ...f, idmateria: e.target.value }))} required>
                          <option value="">Seleccione una materia</option>
                          {materias.filter(m => !examenes.find(e => e.materia === m.nombre)).map(m => (
                            <option key={m.idmateria} value={m.idmateria}>{m.nombre}</option>
                          ))}
                        </select>
                        {form.idmateria && (() => {
                          const mat = materias.find(m => String(m.idmateria) === String(form.idmateria))
                          return mat ? (
                            <div style={{ marginTop: 6, padding: '6px 10px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, fontSize: 13, color: '#0369a1' }}>
                              <i className="bi bi-check-circle-fill" style={{ marginRight: 6 }}></i>
                              Materia confirmada: <strong>{mat.nombre}</strong>
                            </div>
                          ) : null
                        })()}
                      </div>
                    )}
                    <div className="form-row-3">
                      {[['nota1','Examen 1','30%'],['nota2','Examen 2','30%'],['nota3','Examen 3','40%']].map(([k,lbl,p]) => (
                        <div className="form-group" key={k}>
                          <label className="form-label">{lbl} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({p})</span></label>
                          <input type="number" className="form-input" min="0" max="100" step="0.01"
                            value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} required />
                        </div>
                      ))}
                    </div>
                    {showPrev && (
                      <div className={`nota-preview ${+ponderada >= 60 ? 'nota-preview-ok' : 'nota-preview-bad'}`} style={{ marginBottom: 16 }}>
                        <strong>Nota ponderada: {ponderada}</strong>
                        {' '} — {+ponderada >= 60 ? 'APROBADO' : 'REPROBADO'}
                      </div>
                    )}
                    <div className="form-actions">
                      <button type="button" className="btn btn-outline" onClick={() => { setShowForm(false); setEditando(null) }}>Cancelar</button>
                      <button type="submit" className="btn btn-primary">
                        <i className="bi bi-save"></i> {editando ? 'Actualizar Notas' : 'Guardar Notas'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-header card-header-dark">
                <i className="bi bi-list-check"></i> Notas por Materia
                <span style={{ marginLeft: 6, background: 'rgba(255,255,255,.15)', borderRadius: 20, padding: '1px 9px', fontSize: 11 }}>
                  {examenes.length}/4
                </span>
              </div>
              {examenes.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><i className="bi bi-inbox"></i></div>
                  <div className="empty-state-text">No hay notas registradas aún</div>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Materia</th><th>Examen 1 (30%)</th><th>Examen 2 (30%)</th>
                        <th>Examen 3 (40%)</th><th>Nota Final</th><th>Estado</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {examenes.map(ex => (
                        <tr key={ex.idexamen}>
                          <td className="td-bold">{ex.materia}</td>
                          <td>{ex.nota1}</td><td>{ex.nota2}</td><td>{ex.nota3}</td>
                          <td><strong>{ex.promedio}</strong></td>
                          <td>
                            <span className={`badge badge-${BADGE[ex.estado] || 'neutral'}`}>
                              {ex.estado}
                            </span>
                          </td>
                          <td>
                            <button className="btn btn-sm btn-outline-info" onClick={() => handleEditar(ex)}>
                              <i className="bi bi-pencil"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Examenes
