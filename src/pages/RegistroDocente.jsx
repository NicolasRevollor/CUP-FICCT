import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BASE_URL from '../api'

const DOCS_CAMPOS = [
  { key: 'titulo_profesional', label: 'Título Profesional', icon: 'bi-mortarboard', hint: 'PDF o imagen de tu título universitario' },
  { key: 'maestria_doc',       label: 'Maestría',           icon: 'bi-award',       hint: 'PDF o imagen del diploma de maestría (si aplica)' },
  { key: 'diplomado_doc',      label: 'Diplomado en Educación Superior', icon: 'bi-patch-check', hint: 'PDF o imagen del diplomado (si aplica)' },
  { key: 'cv',                 label: 'CV / Hoja de Vida',  icon: 'bi-file-person', hint: 'PDF o DOC con tu currículum vitae' },
]
const ACEPTA = '.pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx'

export default function RegistroDocente() {
  const navigate = useNavigate()
  const [step, setStep]       = useState(1)
  const [completado, setComp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [docs, setDocs]       = useState({ titulo_profesional: null, maestria_doc: null, diplomado_doc: null, cv: null })
  const [form, setForm] = useState({
    ci: '', nombres: '', apellidos: '', sexo: 'M',
    correo: '', telefono: '', profesion: '', maestria: '',
  })
  const [errors, setErrors] = useState({})

  const onChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setErrors(er => ({ ...er, [name]: '' }))
  }

  const onDocChange = (key, e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError(`"${key}" supera los 10MB`); return }
    setDocs(d => ({ ...d, [key]: file }))
    setError('')
  }

  const removeDoc = (key) => setDocs(d => ({ ...d, [key]: null }))

  const validar = () => {
    const e = {}
    if (!form.ci.trim())        e.ci        = 'El CI es requerido'
    if (!form.nombres.trim())   e.nombres   = 'Los nombres son requeridos'
    if (!form.apellidos.trim()) e.apellidos = 'Los apellidos son requeridos'
    if (!form.correo.trim())    e.correo    = 'El correo es requerido'
    if (!/\S+@\S+\.\S+/.test(form.correo)) e.correo = 'Correo no válido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    try {
      const token = localStorage.getItem('token')
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''))
      Object.entries(docs).forEach(([k, f]) => { if (f) fd.append(k, f) })

      const res = await fetch(`${BASE_URL}/api/postulacion-docente`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: fd,
      })

      clearTimeout(timeout)
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { data = { message: text || 'Error del servidor' } }

      if (!res.ok) { setError(data.message || 'Error al enviar la postulación'); return }
      setComp(true)
    } catch (err) {
      clearTimeout(timeout)
      if (err.name === 'AbortError') {
        setError('La solicitud tardó demasiado. Verifica tu conexión e intenta de nuevo.')
      } else {
        setError('Error de conexión. Intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  const iconoArchivo = (tipo) => {
    if (!tipo) return 'bi-file-earmark'
    if (tipo.includes('pdf'))   return 'bi-file-earmark-pdf-fill'
    if (tipo.includes('image')) return 'bi-file-earmark-image-fill'
    return 'bi-file-earmark-word-fill'
  }

  if (completado) return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div className="card-body">
          <div style={{ width: 64, height: 64, background: '#ecfdf5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <i className="bi bi-check-circle-fill" style={{ fontSize: 32, color: '#059669' }}></i>
          </div>
          <h2 style={{ fontWeight: 800, color: '#111827', marginBottom: 8 }}>¡Postulación enviada!</h2>
          <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>
            Tu postulación como docente del CUP-FICCT fue recibida correctamente.<br />
            El administrador revisará tu solicitud y te notificará por correo a <strong>{form.correo}</strong>.
          </p>
          <button className="btn btn-primary btn-full" onClick={() => navigate('/')} style={{ background: '#0d2451', borderColor: '#0d2451' }}>
            <i className="bi bi-house"></i> Volver al inicio
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      <nav style={{ background: '#0d2451', padding: '0 24px', height: 58, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => step === 1 ? navigate('/tipo-inscripcion') : setStep(1)}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: 20, padding: 0, display: 'flex', alignItems: 'center' }}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>CUP · FICCT — Postulación Docente</span>
      </nav>

      <div style={{ maxWidth: 620, margin: '0 auto', padding: '36px 24px' }}>

        {/* Steps */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32, gap: 8 }}>
          {[{ n: 1, label: 'Datos personales' }, { n: 2, label: 'Documentos' }].map((s, i) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: step >= s.n ? '#c62828' : '#e5e7eb', color: step >= s.n ? '#fff' : '#9ca3af', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.n}</div>
                <span style={{ fontSize: 13, fontWeight: step === s.n ? 600 : 400, color: step === s.n ? '#111827' : '#6b7280' }}>{s.label}</span>
              </div>
              {i < 1 && <div style={{ flex: 1, height: 1, background: '#e5e7eb', margin: '0 12px' }} />}
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header card-header-dark" style={{ background: '#c62828' }}>
            <i className={`bi ${step === 1 ? 'bi-person-badge' : 'bi-folder2-open'}`}></i>
            {step === 1 ? 'Datos del postulante' : 'Documentos de respaldo'}
          </div>
          <div className="card-body">
            {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i> {error}</div>}

            {/* ── PASO 1: Datos ── */}
            {step === 1 && (
              <form onSubmit={(e) => { e.preventDefault(); if (validar()) { setError(''); setStep(2) } }}>
                <div className="form-section">
                  <div className="form-section-title"><i className="bi bi-person"></i> Datos Personales</div>
                  <div className="form-row-3">
                    <div className="form-group">
                      <label className="form-label">CI <span className="req">*</span></label>
                      <input className={`form-input ${errors.ci ? 'border-red' : ''}`} name="ci" value={form.ci} onChange={onChange} placeholder="Ej: 12345678" />
                      {errors.ci && <div className="form-hint" style={{ color: '#dc2626' }}>{errors.ci}</div>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nombres <span className="req">*</span></label>
                      <input className="form-input" name="nombres" value={form.nombres} onChange={onChange} />
                      {errors.nombres && <div className="form-hint" style={{ color: '#dc2626' }}>{errors.nombres}</div>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Apellidos <span className="req">*</span></label>
                      <input className="form-input" name="apellidos" value={form.apellidos} onChange={onChange} />
                      {errors.apellidos && <div className="form-hint" style={{ color: '#dc2626' }}>{errors.apellidos}</div>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Sexo <span className="req">*</span></label>
                      <select className="form-select" name="sexo" value={form.sexo} onChange={onChange}>
                        <option value="M">Masculino</option>
                        <option value="F">Femenino</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Correo <span className="req">*</span></label>
                      <input type="email" className="form-input" name="correo" value={form.correo} onChange={onChange} />
                      {errors.correo && <div className="form-hint" style={{ color: '#dc2626' }}>{errors.correo}</div>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Teléfono</label>
                      <input className="form-input" name="telefono" value={form.telefono} onChange={onChange} placeholder="Ej: 70000000" />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-title"><i className="bi bi-award"></i> Formación Académica</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Profesión / Título</label>
                      <input className="form-input" name="profesion" value={form.profesion} onChange={onChange} placeholder="Ej: Lic. en Informática" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Maestría</label>
                      <input className="form-input" name="maestria" value={form.maestria} onChange={onChange} placeholder="Ej: Maestría en IA" />
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => navigate('/tipo-inscripcion')}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" style={{ background: '#c62828', borderColor: '#c62828' }}>
                    Continuar <i className="bi bi-arrow-right"></i>
                  </button>
                </div>
              </form>
            )}

            {/* ── PASO 2: Documentos ── */}
            {step === 2 && (
              <form onSubmit={handleSubmit}>
                <div className="form-section">
                  <div className="form-section-title"><i className="bi bi-paperclip"></i> Documentos de respaldo</div>
                  <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
                    Sube un archivo por cada documento. Formatos: PDF, JPG, PNG, DOC/DOCX. Máximo 10MB por archivo.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {DOCS_CAMPOS.map(({ key, label, icon, hint }) => (
                      <div key={key} style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ background: '#f9fafb', padding: '10px 14px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <i className={`bi ${icon}`} style={{ color: '#c62828', fontSize: 16 }}></i>
                          <span style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{label}</span>
                        </div>
                        <div style={{ padding: '12px 14px' }}>
                          {docs[key] ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f3f4f6', borderRadius: 8, padding: '8px 12px' }}>
                              <i className={`bi ${iconoArchivo(docs[key].type)}`} style={{ fontSize: 18, color: '#c62828', flexShrink: 0 }}></i>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{docs[key].name}</div>
                                <div style={{ fontSize: 11, color: '#9ca3af' }}>{(docs[key].size / 1024).toFixed(0)} KB</div>
                              </div>
                              <button type="button" onClick={() => removeDoc(key)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 18, padding: 0, flexShrink: 0 }}>
                                <i className="bi bi-x-circle"></i>
                              </button>
                            </div>
                          ) : (
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                              <div style={{ background: '#fff', border: '1px dashed #d1d5db', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#6b7280', flex: 1, textAlign: 'center' }}>
                                <i className="bi bi-upload" style={{ marginRight: 6 }}></i> Seleccionar archivo
                              </div>
                              <input type="file" accept={ACEPTA} onChange={(e) => onDocChange(key, e)} style={{ display: 'none' }} />
                            </label>
                          )}
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 5 }}>{hint}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 14 }}>
                    Todos los campos son opcionales. Puedes enviar la postulación sin archivos.
                  </p>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setStep(1)} disabled={loading}>
                    <i className="bi bi-arrow-left"></i> Volver
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading} style={{ background: '#c62828', borderColor: '#c62828' }}>
                    {loading
                      ? <><span className="spinner" style={{ width: 15, height: 15, borderWidth: 2, marginBottom: 0 }}></span> Enviando...</>
                      : <><i className="bi bi-send"></i> Enviar postulación</>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
