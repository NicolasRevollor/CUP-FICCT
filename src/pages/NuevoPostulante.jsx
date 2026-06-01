import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { apiFetch } from '../api'

const INIT = {
  ci: '', nombres: '', apellidos: '', sexo: 'M',
  direccion: '', telefono: '', correo: '',
  colegioProcedencia: '', ciudad: '',
  tituloBachiller: false, otrosRequisitos: '',
}

function NuevoPostulante() {
  const navigate = useNavigate()
  const usuario  = JSON.parse(localStorage.getItem('usuario'))
  const [form, setForm]       = useState(INIT)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [exito, setExito]     = useState('')

  if (!usuario) { navigate('/'); return null }

  const onChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.tituloBachiller) { setError('El postulante debe tener Título de Bachiller'); return }
    setLoading(true); setError(''); setExito('')
    try {
      const res  = await apiFetch('/api/postulantes', { method: 'POST', body: JSON.stringify(form) })
      const data = await res.json()
      if (res.ok) { setExito('Postulante registrado correctamente'); setTimeout(() => navigate('/postulantes'), 1800) }
      else setError(data.message || 'Error al registrar')
    } catch { setError('Error de conexión con el servidor') }
    finally { setLoading(false) }
  }

  return (
    <div className="page">
      <Navbar usuario={usuario} />
      <div className="page-content" style={{ maxWidth: 780 }}>

        <div className="back-header">
          <button className="btn-back" onClick={() => navigate('/postulantes')}>
            <i className="bi bi-arrow-left"></i>
          </button>
          <div className="back-header-info">
            <div className="back-header-title">Nuevo Postulante</div>
            <div className="back-header-sub">Complete todos los campos requeridos</div>
          </div>
        </div>

        {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i>{error}</div>}
        {exito && <div className="alert alert-success"><i className="bi bi-check-circle"></i>{exito}</div>}

        <div className="card">
          <div className="card-body">
            <form onSubmit={onSubmit}>

              <div className="form-section">
                <div className="form-section-title">
                  <i className="bi bi-person"></i> Datos Personales
                </div>
                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">CI <span className="req">*</span></label>
                    <input className="form-input" name="ci" value={form.ci} onChange={onChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nombres <span className="req">*</span></label>
                    <input className="form-input" name="nombres" value={form.nombres} onChange={onChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Apellidos <span className="req">*</span></label>
                    <input className="form-input" name="apellidos" value={form.apellidos} onChange={onChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sexo <span className="req">*</span></label>
                    <select className="form-select" name="sexo" value={form.sexo} onChange={onChange} required>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <input className="form-input" name="telefono" value={form.telefono} onChange={onChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Correo <span className="req">*</span></label>
                    <input type="email" className="form-input" name="correo" value={form.correo} onChange={onChange} required />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-title">
                  <i className="bi bi-mortarboard"></i> Datos Académicos
                </div>
                <div className="form-row" style={{ marginBottom: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Colegio de Procedencia</label>
                    <input className="form-input" name="colegioProcedencia" value={form.colegioProcedencia} onChange={onChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ciudad</label>
                    <input className="form-input" name="ciudad" value={form.ciudad} onChange={onChange} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Dirección</label>
                  <input className="form-input" name="direccion" value={form.direccion} onChange={onChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Otros Requisitos</label>
                  <textarea className="form-textarea" name="otrosRequisitos" value={form.otrosRequisitos} onChange={onChange} rows={3} />
                </div>
                <label className="checkbox-row">
                  <input type="checkbox" name="tituloBachiller" checked={form.tituloBachiller} onChange={onChange} />
                  <span className="checkbox-label">Tiene Título de Bachiller</span>
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => navigate('/postulantes')}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <i className="bi bi-save"></i> {loading ? 'Guardando...' : 'Guardar Postulante'}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NuevoPostulante
