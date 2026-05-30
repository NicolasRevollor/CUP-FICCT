import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'

function EditarPostulante() {
  const navigate = useNavigate()
  const { id } = useParams()
  const usuario = JSON.parse(localStorage.getItem('usuario'))
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  const [form, setForm] = useState({
    ci: '', nombres: '', apellidos: '', sexo: 'M',
    direccion: '', telefono: '', correo: '',
    colegioProcedencia: '', ciudad: '',
    tituloBachiller: false, otrosRequisitos: ''
  })

  if (!usuario) { navigate('/'); return null }

  useEffect(() => {
    const fetchPostulante = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/postulantes/${id}`)
        const data = await res.json()
        setForm({
          ci: data.ci,
          nombres: data.nombres,
          apellidos: data.apellidos,
          sexo: data.sexo,
          direccion: data.direccion || '',
          telefono: data.telefono || '',
          correo: data.correo,
          colegioProcedencia: data.colegioprocedencia || '',
          ciudad: data.ciudad || '',
          tituloBachiller: data.titulobachiller,
          otrosRequisitos: data.otrosrequisitos || ''
        })
      } catch (err) {
        setError('Error al cargar datos del postulante')
      } finally {
        setLoadingData(false)
      }
    }
    fetchPostulante()
  }, [id])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setExito('')

    try {
      const res = await fetch(`http://localhost:8000/api/postulantes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      const data = await res.json()

      if (res.ok) {
        setExito('Postulante actualizado correctamente!')
        setTimeout(() => navigate('/postulantes'), 2000)
      } else {
        setError(data.message || 'Error al actualizar postulante')
      }
    } catch (err) {
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) return (
    <div>
      <Navbar usuario={usuario} />
      <div className="text-center mt-5">
        <div className="spinner-border" style={{ color: '#003087' }}></div>
        <p className="mt-2">Cargando datos...</p>
      </div>
    </div>
  )

  return (
    <div>
      <Navbar usuario={usuario} />
      <div className="container mt-4" style={{ maxWidth: '800px' }}>

        {/* Header */}
        <div className="d-flex align-items-center mb-4">
          <button className="btn btn-outline-secondary me-3"
            onClick={() => navigate('/postulantes')}>
            <i className="bi bi-arrow-left"></i>
          </button>
          <div>
            <h4 className="fw-bold mb-0" style={{ color: '#003087' }}>
              <i className="bi bi-pencil-fill me-2"></i>
              Editar Postulante #{id}
            </h4>
            <small className="text-muted">Modifique los campos necesarios</small>
          </div>
        </div>

        {/* Alertas */}
        {error && <div className="alert alert-danger">{error}</div>}
        {exito && <div className="alert alert-success">{exito}</div>}

        {/* Formulario */}
        <div className="card shadow">
          <div className="card-body p-4">
            <form onSubmit={handleSubmit}>

              {/* Datos personales */}
              <h6 className="fw-bold mb-3" style={{ color: '#003087' }}>
                <i className="bi bi-person-fill me-2"></i>Datos Personales
              </h6>
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <label className="form-label fw-semibold">CI</label>
                  <input type="text" className="form-control"
                    value={form.ci} disabled />
                  <small className="text-muted">El CI no se puede modificar</small>
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Nombres *</label>
                  <input type="text" className="form-control" name="nombres"
                    value={form.nombres} onChange={handleChange} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Apellidos *</label>
                  <input type="text" className="form-control" name="apellidos"
                    value={form.apellidos} onChange={handleChange} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Sexo *</label>
                  <select className="form-select" name="sexo"
                    value={form.sexo} onChange={handleChange} required>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Teléfono</label>
                  <input type="text" className="form-control" name="telefono"
                    value={form.telefono} onChange={handleChange} />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Correo *</label>
                  <input type="email" className="form-control" name="correo"
                    value={form.correo} onChange={handleChange} required />
                </div>
              </div>

              {/* Datos académicos */}
              <h6 className="fw-bold mb-3" style={{ color: '#003087' }}>
                <i className="bi bi-mortarboard-fill me-2"></i>Datos Académicos
              </h6>
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Colegio de Procedencia</label>
                  <input type="text" className="form-control" name="colegioProcedencia"
                    value={form.colegioProcedencia} onChange={handleChange} />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Ciudad</label>
                  <input type="text" className="form-control" name="ciudad"
                    value={form.ciudad} onChange={handleChange} />
                </div>
                <div className="col-md-12">
                  <label className="form-label fw-semibold">Dirección</label>
                  <input type="text" className="form-control" name="direccion"
                    value={form.direccion} onChange={handleChange} />
                </div>
                <div className="col-md-12">
                  <label className="form-label fw-semibold">Otros Requisitos</label>
                  <textarea className="form-control" name="otrosRequisitos"
                    value={form.otrosRequisitos} onChange={handleChange} rows={3} />
                </div>
                <div className="col-md-12">
                  <div className="form-check">
                    <input type="checkbox" className="form-check-input"
                      name="tituloBachiller" checked={form.tituloBachiller}
                      onChange={handleChange} id="tituloBachiller" />
                    <label className="form-check-label fw-semibold" htmlFor="tituloBachiller">
                      Tiene Título de Bachiller
                    </label>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="d-flex gap-2 justify-content-end">
                <button type="button" className="btn btn-outline-secondary"
                  onClick={() => navigate('/postulantes')}>
                  Cancelar
                </button>
                <button type="submit" className="btn text-white"
                  style={{ backgroundColor: '#003087' }} disabled={loading}>
                  <i className="bi bi-save me-2"></i>
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditarPostulante