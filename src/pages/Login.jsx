import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Login() {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Nombre_Usuario: usuario,
          Password: password
        })
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('usuario', JSON.stringify(data.usuario))
        navigate('/dashboard')
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-fluid vh-100 d-flex align-items-center justify-content-center"
         style={{ backgroundColor: '#003087' }}>
      <div className="card shadow-lg" style={{ width: '400px' }}>
        <div className="card-body p-5">
          <div className="text-center mb-4">
            <h2 className="fw-bold" style={{ color: '#003087' }}>CUP - FICCT</h2>
            <p className="text-muted">Sistema de Admisión Universitaria</p>
          </div>

          {error && (
            <div className="alert alert-danger">{error}</div>
          )}

          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Usuario</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ingrese su usuario"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                required
              />
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold">Contraseña</label>
              <input
                type="password"
                className="form-control"
                placeholder="Ingrese su contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn w-100 fw-bold text-white"
              style={{ backgroundColor: '#003087' }}
              disabled={loading}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="text-center mt-3">
            <small className="text-muted">FICCT - UAGRM © 2026</small>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login