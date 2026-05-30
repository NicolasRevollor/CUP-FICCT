import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

function Examenes() {
  const navigate = useNavigate()
  const usuario = JSON.parse(localStorage.getItem('usuario'))
  const [busquedaCI, setBusquedaCI] = useState('')
  const [postulante, setPostulante] = useState(null)
  const [examenes, setExamenes] = useState([])
  const [materias, setMaterias] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({
    idmateria: '', nota1: '', nota2: '', nota3: ''
  })
  const [editando, setEditando] = useState(null)

  useEffect(() => {
    if (!usuario) navigate('/')
    fetchMaterias()
  }, [])

  if (!usuario) return null

  const fetchMaterias = async () => {
    const res = await fetch('http://localhost:8000/api/materias')
    const data = await res.json()
    setMaterias(data)
  }

  const buscarPostulante = async (e) => {
    e.preventDefault()
    setError('')
    setPostulante(null)
    setExamenes([])
    setLoading(true)

    try {
      const res = await fetch(`http://localhost:8000/api/postulantes/buscar?q=${busquedaCI}`)
      const data = await res.json()
      const p = data.data?.find(p => p.ci === busquedaCI)

      if (!p) {
        setError('No se encontró postulante con ese CI')
        return
      }

      setPostulante(p)
      fetchExamenes(p.idpostulante)
    } catch (err) {
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  const fetchExamenes = async (idPostulante) => {
    const res = await fetch(`http://localhost:8000/api/examenes/${idPostulante}`)
    const data = await res.json()
    setExamenes(data)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setExito('')

    try {
      if (editando) {
        const res = await fetch(`http://localhost:8000/api/examenes/${editando}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        })
        const data = await res.json()
        if (res.ok) {
          setExito('Notas actualizadas correctamente')
          setEditando(null)
          setMostrarForm(false)
          fetchExamenes(postulante.idpostulante)
        } else {
          setError(data.message)
        }
      } else {
        const res = await fetch('http://localhost:8000/api/examenes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idpostulante: postulante.idpostulante,
            idmateria: form.idmateria,
            nota1: form.nota1,
            nota2: form.nota2,
            nota3: form.nota3
          })
        })
        const data = await res.json()
        if (res.ok) {
          setExito('Notas registradas correctamente')
          setMostrarForm(false)
          setForm({ idmateria: '', nota1: '', nota2: '', nota3: '' })
          fetchExamenes(postulante.idpostulante)
        } else {
          setError(data.message)
        }
      }
    } catch (err) {
      setError('Error de conexión con el servidor')
    }
  }

  const handleEditar = (examen) => {
    setEditando(examen.idexamen)
    setForm({
      idmateria: examen.idmateria,
      nota1: examen.nota1,
      nota2: examen.nota2,
      nota3: examen.nota3
    })
    setMostrarForm(true)
  }

  const getNotaPonderada = (nota1, nota2, nota3) => {
    return ((nota1 * 0.30) + (nota2 * 0.30) + (nota3 * 0.40)).toFixed(2)
  }

  const getBadge = (estado) => {
    return estado === 'APROBADO' ? 'success' : estado === 'REPROBADO' ? 'danger' : 'warning'
  }

  return (
    <div>
      <Navbar usuario={usuario} />
      <div className="container mt-4">

        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-bold" style={{ color: '#003087' }}>
              <i className="bi bi-journal-text me-2"></i>
              Registro de Exámenes
            </h4>
            <p className="text-muted mb-0">Registre las notas de las 4 materias por postulante</p>
          </div>
          <button className="btn text-white" style={{ backgroundColor: '#003087' }}
            onClick={() => navigate('/dashboard')}>
            <i className="bi bi-arrow-left me-2"></i>Volver
          </button>
        </div>

        {/* Buscar postulante */}
        <div className="card shadow mb-4">
          <div className="card-header fw-bold" style={{ backgroundColor: '#003087', color: 'white' }}>
            <i className="bi bi-search me-2"></i>Buscar Postulante por CI
          </div>
          <div className="card-body">
            <form onSubmit={buscarPostulante}>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ingrese CI del postulante..."
                  value={busquedaCI}
                  onChange={(e) => setBusquedaCI(e.target.value)}
                  required
                />
                <button className="btn text-white" style={{ backgroundColor: '#003087' }} type="submit">
                  <i className="bi bi-search me-1"></i>Buscar
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Alertas */}
        {error && <div className="alert alert-danger">{error}</div>}
        {exito && <div className="alert alert-success">{exito}</div>}

        {/* Info del postulante */}
        {postulante && (
          <>
            <div className="card shadow mb-4">
              <div className="card-body">
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <h5 className="fw-bold mb-1" style={{ color: '#003087' }}>
                      <i className="bi bi-person-fill me-2"></i>
                      {postulante.nombres} {postulante.apellidos}
                    </h5>
                    <p className="mb-0 text-muted">
                      CI: {postulante.ci} | 
                      Promedio: <strong>{postulante.promedio_final}</strong> | 
                      Estado: <span className={`badge bg-${getBadge(postulante.estadopostulante)}`}>
                        {postulante.estadopostulante}
                      </span>
                    </p>
                  </div>
                  <div className="col-md-4 text-end">
                    {examenes.length < 4 && (
                      <button
                        className="btn text-white"
                        style={{ backgroundColor: '#003087' }}
                        onClick={() => { setMostrarForm(true); setEditando(null); setForm({ idmateria: '', nota1: '', nota2: '', nota3: '' }) }}
                      >
                        <i className="bi bi-plus-circle me-2"></i>
                        Registrar Notas
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Formulario registrar/editar notas */}
            {mostrarForm && (
              <div className="card shadow mb-4">
                <div className="card-header fw-bold" style={{ backgroundColor: '#003087', color: 'white' }}>
                  <i className="bi bi-pencil-fill me-2"></i>
                  {editando ? 'Editar Notas' : 'Registrar Notas'}
                </div>
                <div className="card-body">
                  <form onSubmit={handleSubmit}>
                    <div className="row g-3">
                      {!editando && (
                        <div className="col-md-12">
                          <label className="form-label fw-semibold">Materia *</label>
                          <select className="form-select" value={form.idmateria}
                            onChange={(e) => setForm({ ...form, idmateria: e.target.value })} required>
                            <option value="">Seleccione una materia</option>
                            {materias.filter(m => !examenes.find(e => e.materia === m.nombre)).map(m => (
                              <option key={m.idmateria} value={m.idmateria}>{m.nombre}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="col-md-4">
                        <label className="form-label fw-semibold">
                          Examen 1 <span className="text-muted">(30%)</span>
                        </label>
                        <input type="number" className="form-control" min="0" max="100" step="0.01"
                          value={form.nota1} onChange={(e) => setForm({ ...form, nota1: e.target.value })} required />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-semibold">
                          Examen 2 <span className="text-muted">(30%)</span>
                        </label>
                        <input type="number" className="form-control" min="0" max="100" step="0.01"
                          value={form.nota2} onChange={(e) => setForm({ ...form, nota2: e.target.value })} required />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-semibold">
                          Examen 3 <span className="text-muted">(40%)</span>
                        </label>
                        <input type="number" className="form-control" min="0" max="100" step="0.01"
                          value={form.nota3} onChange={(e) => setForm({ ...form, nota3: e.target.value })} required />
                      </div>
                      {form.nota1 && form.nota2 && form.nota3 && (
                        <div className="col-md-12">
                          <div className={`alert ${getNotaPonderada(form.nota1, form.nota2, form.nota3) >= 60 ? 'alert-success' : 'alert-danger'}`}>
                            <strong>Nota ponderada: {getNotaPonderada(form.nota1, form.nota2, form.nota3)}</strong>
                            {' '}→ {getNotaPonderada(form.nota1, form.nota2, form.nota3) >= 60 ? '✅ APROBADO' : '❌ REPROBADO'}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="d-flex gap-2 justify-content-end mt-3">
                      <button type="button" className="btn btn-outline-secondary"
                        onClick={() => { setMostrarForm(false); setEditando(null) }}>
                        Cancelar
                      </button>
                      <button type="submit" className="btn text-white" style={{ backgroundColor: '#003087' }}>
                        <i className="bi bi-save me-2"></i>
                        {editando ? 'Actualizar Notas' : 'Guardar Notas'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Tabla de examenes */}
            <div className="card shadow">
              <div className="card-header fw-bold" style={{ backgroundColor: '#003087', color: 'white' }}>
                <i className="bi bi-list-check me-2"></i>
                Notas por Materia ({examenes.length}/4)
              </div>
              <div className="card-body p-0">
                {examenes.length === 0 ? (
                  <div className="text-center p-4 text-muted">
                    <i className="bi bi-inbox fs-1"></i>
                    <p className="mt-2">No hay notas registradas aún</p>
                  </div>
                ) : (
                  <table className="table table-hover mb-0">
                    <thead style={{ backgroundColor: '#f8f9fa' }}>
                      <tr>
                        <th>Materia</th>
                        <th>Examen 1 (30%)</th>
                        <th>Examen 2 (30%)</th>
                        <th>Examen 3 (40%)</th>
                        <th>Nota Final</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examenes.map((e) => (
                        <tr key={e.idexamen}>
                          <td className="fw-semibold">{e.materia}</td>
                          <td>{e.nota1}</td>
                          <td>{e.nota2}</td>
                          <td>{e.nota3}</td>
                          <td><strong>{e.promedio}</strong></td>
                          <td>
                            <span className={`badge bg-${getBadge(e.estado)}`}>
                              {e.estado === 'APROBADO' && <><i className="bi bi-check-circle-fill me-1"></i>Aprobado</>}
                              {e.estado === 'REPROBADO' && <><i className="bi bi-x-circle-fill me-1"></i>Reprobado</>}
                              {e.estado === 'PENDIENTE' && <><i className="bi bi-clock-fill me-1"></i>Pendiente</>}
                            </span>
                          </td>
                          <td>
                            <button className="btn btn-sm btn-outline-primary"
                              onClick={() => handleEditar(e)}>
                              <i className="bi bi-pencil"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Examenes