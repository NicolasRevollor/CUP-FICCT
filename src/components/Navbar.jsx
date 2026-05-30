import { useNavigate } from 'react-router-dom'

function Navbar({ usuario }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('usuario')
    navigate('/')
  }

  return (
    <nav className="navbar navbar-expand-lg text-white shadow"
         style={{ backgroundColor: '#003087' }}>
      <div className="container">
        <span className="navbar-brand text-white fw-bold fs-4">
          CUP - FICCT
        </span>

        <div className="d-flex align-items-center gap-3">
          <span className="text-white">
            👤 {usuario.nombre} | {usuario.rol}
          </span>
          <button
            className="btn btn-outline-light btn-sm"
            onClick={handleLogout}
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar