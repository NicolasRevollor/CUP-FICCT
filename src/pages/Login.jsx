import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'

function Login() {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res  = await apiFetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ Nombre_Usuario: usuario, Password: password }),
      })
      const data = await res.json()
      if (res.ok) {
        localStorage.setItem('token',   data.token)
        localStorage.setItem('usuario', JSON.stringify(data.usuario))
        navigate(data.usuario.rol === 'DOCENTE' ? '/docente-dashboard' : '/dashboard')
      } else {
        setError(data.message)
      }
    } catch {
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">

      {/* ── Panel izquierdo ── */}
      <div className="login-left">
        <div className="login-brand">
          <div className="login-brand-icon">FC</div>
          <div>
            <div className="login-brand-name">FICCT</div>
            <div className="login-brand-sub">UAGRM</div>
          </div>
        </div>

        <h1 className="login-title">
          Sistema de<br />Admisión<br />Académica
        </h1>
        <p className="login-desc">
          Gestión integral del proceso de admisión de la Facultad de Ingeniería
          en Ciencias de la Computación y Telecomunicaciones.
        </p>

        <div className="login-features">
          {[
            {
              icon: 'bi-shield-check',
              title: 'Acceso seguro por roles',
              sub:   'Administrador, Docente y Postulante',
            },
            {
              icon: 'bi-file-earmark-text',
              title: 'Gestión de expedientes',
              sub:   'Documentación digital del postulante',
            },
            {
              icon: 'bi-people',
              title: 'Apertura automática de grupos',
              sub:   'Algoritmo de distribución equitativa',
            },
          ].map((f) => (
            <div className="login-feature" key={f.title}>
              <div className="login-feature-icon">
                <i className={`bi ${f.icon}`}></i>
              </div>
              <div>
                <div className="login-feature-title">{f.title}</div>
                <div className="login-feature-sub">{f.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Panel derecho ── */}
      <div className="login-right">
        <div className="login-box">
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, padding: 0, marginBottom: 20 }}
          >
            <i className="bi bi-arrow-left"></i> Volver al inicio
          </button>
          <h2 className="login-heading">Bienvenido</h2>
          <p className="login-subheading">
            Ingresa tus credenciales para acceder al sistema
          </p>

          {error && (
            <div className="alert alert-danger">
              <i className="bi bi-exclamation-circle"></i>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Usuario</label>
              <div className="input-wrap">
                <i className="bi bi-person input-prefix-icon"></i>
                <input
                  type="text"
                  className="form-input with-icon"
                  placeholder="Nombre de usuario"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <div className="input-wrap">
                <i className="bi bi-lock input-prefix-icon"></i>
                <input
                  type="password"
                  className="form-input with-icon"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              style={{ marginTop: '8px', padding: '11px 16px', fontSize: '14px' }}
              disabled={loading}
            >
              {loading ? (
                <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, marginBottom: 0 }}></span> Iniciando sesión...</>
              ) : (
                'Ingresar al Sistema'
              )}
            </button>
          </form>

          <p className="login-footer-text">
            Las cuentas son gestionadas por el administrador del sistema.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
