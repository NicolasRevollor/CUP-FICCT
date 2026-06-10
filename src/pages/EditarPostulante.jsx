import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { apiFetch } from '../api'

function EditarPostulante() {
  const navigate    = useNavigate()
  const { id }      = useParams()
  const usuario     = JSON.parse(localStorage.getItem('usuario'))
  const [form, setForm]           = useState(null)
  const [idusuario, setIdusuario] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [vinculando, setVinculando] = useState(false)
  const [error, setError]         = useState('')
  const [exito, setExito]         = useState('')

  if (!usuario) { navigate('/'); return null }

  useEffect(() => {
    apiFetch(`/api/postulantes/${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => {
        setForm({
          ci: d.ci, nombres: d.nombres, apellidos: d.apellidos, sexo: d.sexo,
          direccion: d.direccion || '', telefono: d.telefono || '', correo: d.correo,
          colegioProcedencia: d.colegioprocedencia || '', ciudad: d.ciudad || '',
          tituloBachiller: d.titulobachiller, otrosRequisitos: d.otrosrequisitos || '',
        })
        setIdusuario(d.idusuario)
      })
      .catch(() => setError('Error al cargar datos del postulante'))
  }, [id])

  const onChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleVincular = async () => {
    setVinculando(true); setError(''); setExito('')
    try {
      const res  = await apiFetch(`/api/postulantes/${id}/vincular-usuario`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) { setIdusuario(data.idusuario); setExito(data.message) }
      else setError(data.message)
    } catch { setError('Error de conexión') }
    finally { setVinculando(false) }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError(''); setExito('')
    try {
      const res  = await apiFetch(`/api/postulantes/${id}`, { method: 'PUT', body: JSON.stringify(form) })
      const data = await res.json()
      if (res.ok) { setExito('Postulante actualizado correctamente'); setTimeout(() => navigate('/postulantes'), 1800) }
      else setError(data.message || 'Error al actualizar')
    } catch { setError('Error de conexión con el servidor') }
    finally { setLoading(false) }
  }

  if (!form) return (
    <div className="page">
      <Navbar usuario={usuario} />
      <div className="spinner-box" style={{ marginTop: 60 }}>
        <span className="spinner"></span>
        <span className="spinner-text">Cargando datos...</span>
      </div>
    </div>
  )

  return (
    <div className="page">
      <Navbar usuario={usuario} />
      <div className="page-content" style={{ maxWidth: 780 }}>

        <div className="back-header">
          <button className="btn-back" onClick={() => navigate('/postulantes')}>
            <i className="bi bi-arrow-left"></i>
          </button>
          <div className="back-header-info">
            <div className="back-header-title">Editar Postulante #{id}</div>
            <div className="back-header-sub">Modifique los campos necesarios</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {idusuario
              ? <span className="badge badge-success"><i className="bi bi-link-45deg"></i> Usuario vinculado (ID {idusuario})</span>
              : (
                <>
                  <span className="badge badge-danger"><i className="bi bi-link"></i> Sin usuario vinculado</span>
                  <button className="btn btn-sm btn-outline" onClick={handleVincular} disabled={vinculando}>
                    {vinculando ? 'Vinculando...' : 'Vincular por correo'}
                  </button>
                </>
              )
            }
          </div>
        </div>

        {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i>{error}</div>}
        {exito && <div className="alert alert-success"><i className="bi bi-check-circle"></i>{exito}</div>}

        <div className="card">
          <div className="card-body">
            <form onSubmit={onSubmit}>

              <div className="form-section">
                <div className="form-section-title"><i className="bi bi-person"></i> Datos Personales</div>
                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">CI</label>
                    <input className="form-input" value={form.ci} disabled />
                    <div className="form-hint">El CI no se puede modificar</div>
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
                <div className="form-section-title"><i className="bi bi-mortarboard"></i> Datos Académicos</div>
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
                  <i className="bi bi-save"></i> {loading ? 'Guardando...' : 'Guardar Cambios'}
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
