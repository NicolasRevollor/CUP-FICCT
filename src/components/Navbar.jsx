import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'

function Navbar({ usuario }) {
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await apiFetch('/api/logout', { method: 'POST' }) } catch {}
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    navigate('/')
  }

  return (
    <nav className="app-navbar">
      <div className="nav-brand">
        <div className="nav-brand-icon">FC</div>
        <span className="nav-brand-text">CUP · FICCT</span>
      </div>

      <div className="nav-spacer" />

      <div className="nav-user">
        <div className="nav-user-info">
          <div className="nav-user-name">{usuario.nombre}</div>
          <div className="nav-user-role">{usuario.rol}</div>
        </div>
        <button className="btn-nav-logout" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    </nav>
  )
}

export default Navbar
