import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'

function Navbar({ usuario }) {
  const navigate = useNavigate()
  const [showModal,   setShowModal]   = useState(false)
  const [form,        setForm]        = useState({ password_actual: '', password_nuevo: '', password_confirm: '' })
  const [showActual,  setShowActual]  = useState(false)
  const [showNuevo,   setShowNuevo]   = useState(false)
  const [error,       setError]       = useState('')
  const [exito,       setExito]       = useState('')
  const [loading,     setLoading]     = useState(false)

  const handleLogout = async () => {
    try { await apiFetch('/api/logout', { method: 'POST' }) } catch {}
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    navigate('/')
  }

  const abrirModal = () => {
    setForm({ password_actual: '', password_nuevo: '', password_confirm: '' })
    setError(''); setExito(''); setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setExito(''); setLoading(true)
    if (form.password_nuevo !== form.password_confirm) {
      setError('Las contraseñas nuevas no coinciden'); setLoading(false); return
    }
    try {
      const res  = await apiFetch('/api/cambiar-password', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) { setExito(data.message); setForm({ password_actual: '', password_nuevo: '', password_confirm: '' }) }
      else          setError(data.message)
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  const EyeBtn = ({ show, toggle }) => (
    <button type="button" onClick={toggle} tabIndex={-1}
      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
      <i className={`bi ${show ? 'bi-eye-slash' : 'bi-eye'}`}></i>
    </button>
  )

  return (
    <>
      <nav className="app-navbar">
        <div className="nav-brand">
          <div className="nav-brand-icon">FC</div>
          <span className="nav-brand-text">CUP · FICCT</span>
        </div>
        <div className="nav-spacer" />
        <div className="nav-user">
          <button className="btn btn-sm btn-outline" style={{ marginRight: 10, fontSize: 12 }} onClick={abrirModal}>
            <i className="bi bi-person-circle"></i> Mi Perfil
          </button>
          <div className="nav-user-info">
            <div className="nav-user-name">{usuario.nombre}</div>
            <div className="nav-user-role">{usuario.rol}</div>
          </div>
          <button className="btn-nav-logout" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </nav>

      {/* Modal cambiar contraseña */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: '100%', maxWidth: 420, boxShadow: '0 8px 32px rgba(0,0,0,.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 17 }}><i className="bi bi-key" style={{ marginRight: 8 }}></i>Cambiar contraseña</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6b7280' }}>×</button>
            </div>

            {error && <div className="alert alert-danger" style={{ marginBottom: 14 }}><i className="bi bi-exclamation-circle"></i>{error}</div>}
            {exito && <div className="alert alert-success" style={{ marginBottom: 14 }}><i className="bi bi-check-circle"></i>{exito}</div>}

            <form onSubmit={handleSubmit}>
              {[
                ['password_actual',  'Contraseña actual',         showActual, () => setShowActual(v => !v)],
                ['password_nuevo',   'Nueva contraseña',          showNuevo,  () => setShowNuevo(v => !v)],
                ['password_confirm', 'Confirmar nueva contraseña', showNuevo, () => setShowNuevo(v => !v)],
              ].map(([key, lbl, show, toggle]) => (
                <div className="form-group" key={key}>
                  <label className="form-label">{lbl}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={show ? 'text' : 'password'}
                      className="form-input"
                      value={form[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      required
                      style={{ paddingRight: 38 }}
                    />
                    <EyeBtn show={show} toggle={toggle} />
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default Navbar
