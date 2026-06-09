import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'

function Login() {
  const [usuario,        setUsuario]        = useState('')
  const [password,       setPassword]       = useState('')
  const [showPassword,   setShowPassword]   = useState(false)
  const [rememberMe,     setRememberMe]     = useState(false)
  const [error,          setError]          = useState('')
  const [loading,        setLoading]        = useState(false)
  const [blockedSeconds, setBlockedSeconds] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    if (blockedSeconds <= 0) return
    const timer = setInterval(() => {
      setBlockedSeconds(s => {
        if (s <= 1) { clearInterval(timer); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [blockedSeconds])

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return m > 0 ? `${m}:${String(s).padStart(2, '0')} min` : `${s}s`
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (blockedSeconds > 0) return
    setLoading(true); setError('')
    try {
      const res  = await apiFetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ Nombre_Usuario: usuario, Password: password }),
      })
      const data = await res.json()
      if (res.ok) {
        localStorage.setItem('token',   data.token)
        localStorage.setItem('usuario', JSON.stringify(data.usuario))
        const destino = data.usuario.rol === 'DOCENTE'
          ? '/docente-dashboard'
          : data.usuario.rol === 'ESTUDIANTE'
            ? '/estudiante-dashboard'
            : '/dashboard'
        navigate(destino, { replace: true })
      } else {
        setError(data.message)
        if (data.blocked_seconds) setBlockedSeconds(data.blocked_seconds)
      }
    } catch {
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  const fechas = [
    { evento: 'Semestre I - 2027',        fecha: '15 Ene – 30 Ene' },
    { evento: 'Exámenes de Suficiencia',  fecha: '05 Feb – 12 Feb' },
    { evento: 'Cursos de Verano',         fecha: 'Terminado'       },
  ]

  return (
    <div className="login-page">

      {/* ── Panel izquierdo ── */}
      <div className="login-left">
        <div className="login-brand">
          <div className="login-brand-icon">
            <i className="bi bi-bank"></i>
          </div>
          <span className="login-brand-name">FICCT Portal</span>
        </div>

        <div className="login-left-content">
          <h1 className="login-title">Gestión Académica<br />Integral</h1>
          <p className="login-desc">
            Bienvenido al sistema central de la Facultad de Ingeniería en Ciencias de la Computación
            y Telecomunicaciones. Acceda a sus recursos académicos, registros y servicios administrativos.
          </p>

          <div className="login-dates-card">
            <div className="login-dates-header">PRÓXIMAS FECHAS DE INSCRIPCIÓN</div>
            {fechas.map(f => (
              <div className="login-dates-row" key={f.evento}>
                <span className="login-dates-evento">{f.evento}</span>
                <span className="login-dates-fecha">{f.fecha}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="login-left-footer">
          © 2024 Facultad de Ingeniería en Ciencias de la Computación y Telecomunicaciones
        </div>
      </div>

      {/* ── Panel derecho ── */}
      <div className="login-right">
        <div className="login-box">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="login-back-btn"
          >
            <i className="bi bi-arrow-left"></i> Volver al inicio
          </button>

          <h2 className="login-heading">Iniciar Sesión</h2>
          <p className="login-subheading">Ingrese sus credenciales institucionales para continuar.</p>

          {blockedSeconds > 0 && (
            <div className="alert alert-danger" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div><i className="bi bi-lock-fill"></i> Cuenta bloqueada temporalmente</div>
              <div style={{ fontSize: 28, fontWeight: 800, margin: '8px 0 4px', fontFamily: 'monospace', color: '#dc2626' }}>
                {formatCountdown(blockedSeconds)}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Intenta nuevamente cuando expire el tiempo</div>
            </div>
          )}

          {error && blockedSeconds === 0 && (
            <div className="alert alert-danger">
              <i className="bi bi-exclamation-circle"></i>{error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <div className="login-label-row">
                <label className="form-label" style={{ marginBottom: 0 }}>Usuario o Correo Institucional</label>
                <button type="button" className="login-link-btn" tabIndex={-1}>¿Olvidó su usuario?</button>
              </div>
              <div className="input-wrap" style={{ marginTop: 6 }}>
                <i className="bi bi-person input-prefix-icon"></i>
                <input
                  type="text"
                  className="form-input with-icon"
                  placeholder="ej. p.perez@uagrm.edu.bo"
                  value={usuario}
                  onChange={e => setUsuario(e.target.value)}
                  required
                  autoComplete="username"
                  disabled={blockedSeconds > 0}
                />
              </div>
            </div>

            <div className="form-group">
              <div className="login-label-row">
                <label className="form-label" style={{ marginBottom: 0 }}>Contraseña</label>
                <button
                  type="button"
                  className="login-link-btn"
                  onClick={() => navigate('/recuperar-password')}
                  tabIndex={-1}
                >¿Olvidó su contraseña?</button>
              </div>
              <div className="input-wrap" style={{ marginTop: 6, position: 'relative' }}>
                <i className="bi bi-lock input-prefix-icon"></i>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input with-icon"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={blockedSeconds > 0}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}
                  tabIndex={-1}
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
            </div>

            <div className="checkbox-row" style={{ marginBottom: 24 }}>
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
              <label className="checkbox-label" htmlFor="remember">Mantener sesión iniciada</label>
            </div>

            <button
              type="submit"
              className="btn-login-primary"
              disabled={loading || blockedSeconds > 0}
            >
              {loading
                ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, marginBottom: 0, borderTopColor: '#fff' }}></span> Iniciando sesión...</>
                : 'INGRESAR AL PORTAL'}
            </button>
          </form>

          <div style={{ margin: '20px 0 12px', textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: '#43474f' }}>¿Es un nuevo estudiante?</span>
          </div>

          <button
            type="button"
            className="btn-login-outline"
            onClick={() => navigate('/registro')}
          >
            Solicitar Registro de Usuario
          </button>

          <div className="login-meta-links">
            <button type="button" className="login-meta-btn">
              <i className="bi bi-question-circle"></i> Soporte Técnico
            </button>
            <button type="button" className="login-meta-btn">
              <i className="bi bi-globe"></i> Idioma: Español
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
