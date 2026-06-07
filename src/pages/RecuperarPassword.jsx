import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'

export default function RecuperarPassword() {
  const navigate = useNavigate()
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error,   setError]   = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError(''); setMensaje('')
    try {
      const res  = await apiFetch('/api/recuperar-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) setMensaje(data.message)
      else        setError(data.message || 'Error al procesar la solicitud')
    } catch {
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">

      <div className="login-left">
        <div className="login-brand">
          <div className="login-brand-icon">FC</div>
          <div>
            <div className="login-brand-name">FICCT</div>
            <div className="login-brand-sub">UAGRM</div>
          </div>
        </div>
        <h1 className="login-title">Recupera tu<br />contraseña</h1>
        <p className="login-desc">
          Ingresa el correo asociado a tu cuenta y recibirás una contraseña temporal para volver a acceder.
        </p>
      </div>

      <div className="login-right">
        <div className="login-box">
          <button
            onClick={() => navigate('/login')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, padding: 0, marginBottom: 20 }}
          >
            <i className="bi bi-arrow-left"></i> Volver al login
          </button>

          <h2 className="login-heading">Recuperar contraseña</h2>
          <p className="login-subheading">
            Te enviaremos una contraseña temporal a tu correo registrado.
          </p>

          {error   && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i>{error}</div>}
          {mensaje && (
            <div className="alert alert-success">
              <i className="bi bi-check-circle"></i>{mensaje}
              <div style={{ marginTop: 12 }}>
                <button className="btn btn-primary btn-full" onClick={() => navigate('/login')}>
                  Ir al login
                </button>
              </div>
            </div>
          )}

          {!mensaje && (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Correo electrónico</label>
                <div className="input-wrap">
                  <i className="bi bi-envelope input-prefix-icon"></i>
                  <input
                    type="email"
                    className="form-input with-icon"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-full"
                style={{ marginTop: 8, padding: '11px 16px', fontSize: 14 }}
                disabled={loading}
              >
                {loading
                  ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, marginBottom: 0 }}></span> Enviando...</>
                  : 'Enviar contraseña temporal'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
