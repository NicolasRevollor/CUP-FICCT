// ─────────────────────────────────────────────────────────────
// PÁGINA: Usuarios del sistema
// Solo accesible para el rol ADMINISTRADOR.
// Permite ver, buscar, crear, editar y desactivar usuarios.
// Incluye paginación (20 por página) y búsqueda por nombre/email.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { apiFetch } from '../api'

// Valores iniciales del formulario cuando se va a crear un usuario nuevo.
// Así podemos resetear el form fácilmente con setForm(INIT).
const INIT = { nombre_usuario: '', email: '', password: '', idrol: '', estado: 'ACTIVO' }

export default function Usuarios() {
  const navigate = useNavigate()

  // Usuario logueado (guardado en localStorage al hacer login)
  const usuario = JSON.parse(localStorage.getItem('usuario'))

  // ── Estados ──

  // Lista de usuarios que se muestra en la tabla (una página a la vez)
  const [lista, setLista] = useState([])

  // Lista de roles disponibles para asignar (ADMINISTRADOR, DOCENTE, etc.)
  const [roles, setRoles] = useState([])

  // true mientras se espera respuesta del servidor (muestra spinner en la tabla)
  const [loading, setLoading] = useState(false)

  // Mensaje de error visible en pantalla
  const [error, setError] = useState('')

  // Mensaje de éxito visible en pantalla
  const [exito, setExito] = useState('')

  // true = el modal de crear/editar usuario está abierto
  const [modal, setModal] = useState(false)

  // Si estamos editando, guardamos el id del usuario. null = creando nuevo.
  const [editando, setEditando] = useState(null)

  // Valores del formulario del modal
  const [form, setForm] = useState(INIT)

  // Texto de búsqueda (lo que escribe el usuario en la barra de búsqueda)
  const [query, setQuery] = useState('')

  // Página actual de la paginación (empieza en 1)
  const [page, setPage] = useState(1)

  // Última página disponible (lo devuelve el servidor)
  const [lastPage, setLastPage] = useState(1)

  // Total de usuarios que coinciden con la búsqueda actual (para mostrar en el header)
  const [total, setTotal] = useState(0)

  // Si el usuario no está logueado o no es ADMINISTRADOR, redirigir al dashboard
  if (!usuario || usuario.rol !== 'ADMINISTRADOR') { navigate('/dashboard'); return null }

  // ── Función principal: cargar usuarios del servidor ──
  // p = página a cargar (default 1), q = texto de búsqueda (default '')
  const load = (p = 1, q = '') => {
    setLoading(true)

    // Si hay búsqueda, la agregamos como parámetro ?q= en la URL
    const path = q
      ? `/api/usuarios?q=${encodeURIComponent(q)}&page=${p}`
      : `/api/usuarios?page=${p}`

    apiFetch(path)
      .then(r => r.ok ? r.json() : { data: [], last_page: 1, total: 0, current_page: 1 })
      .then(d => {
        // El servidor devuelve un objeto con paginación de Laravel:
        //   data: array de usuarios de esta página
        //   last_page: número total de páginas
        //   total: cantidad total de registros
        //   current_page: página actual confirmada por el servidor
        setLista(d.data ?? [])
        setLastPage(d.last_page ?? 1)
        setTotal(d.total ?? 0)
        setPage(d.current_page ?? 1)
      })
      .catch(() => setError('Error al cargar usuarios'))
      .finally(() => setLoading(false))
  }

  // ── Función: cargar los roles disponibles para el select del modal ──
  const loadRoles = () => {
    apiFetch('/api/usuarios/roles')
      .then(r => r.ok ? r.json() : [])
      .then(setRoles)
      .catch(() => {})
  }

  // Al montar el componente, cargamos usuarios (página 1) y roles
  useEffect(() => { load(1, ''); loadRoles() }, [])

  // Actualiza el estado del formulario cuando el usuario escribe en cualquier campo
  // [e.target.name]: e.target.value → actualiza solo el campo que cambió
  const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  // Prepara el modal para CREAR un usuario nuevo
  const abrirNuevo = () => {
    setForm(INIT) // resetear todos los campos
    setEditando(null)
    setModal(true)
    setError(''); setExito('')
  }

  // Prepara el modal para EDITAR un usuario existente
  const abrirEditar = u => {
    // Llenamos el form con los datos del usuario seleccionado
    // password queda vacío porque no se muestra/edita en modo edición
    setForm({ nombre_usuario: u.nombre_usuario, email: u.email, password: '', idrol: '', estado: u.estado })
    setEditando(u.idusuario)
    setModal(true)
    setError(''); setExito('')
  }

  // ── Función: guardar el formulario (crear o editar) ──
  const onSubmit = async e => {
    e.preventDefault()
    setError('')

    try {
      // Al editar solo se puede cambiar email y estado (no nombre ni contraseña)
      // Al crear se envían todos los campos
      const body = editando
        ? { email: form.email, estado: form.estado }
        : { nombre_usuario: form.nombre_usuario, email: form.email, password: form.password, idrol: form.idrol }

      // PUT para actualizar, POST para crear
      const res = editando
        ? await apiFetch(`/api/usuarios/${editando}`, { method: 'PUT', body: JSON.stringify(body) })
        : await apiFetch('/api/usuarios', { method: 'POST', body: JSON.stringify(body) })

      const data = await res.json()

      if (res.ok) {
        // Guardado OK: cerramos modal y recargamos la misma página con el mismo filtro
        setExito(data.message)
        setModal(false)
        load(page, query)
      } else {
        setError(data.message || 'Error al guardar')
      }
    } catch {
      setError('Error de conexión')
    }
  }

  // ── Función: desactivar un usuario ──
  // No se elimina de la BD, solo se cambia su estado a INACTIVO
  const desactivar = async u => {
    // Confirmación antes de hacer algo irreversible
    if (!window.confirm(`¿Desactivar al usuario "${u.nombre_usuario}"?`)) return

    try {
      const res = await apiFetch(`/api/usuarios/${u.idusuario}`, { method: 'DELETE' })

      if (res.ok) {
        // Recargamos la misma página con el mismo filtro para ver el cambio
        load(page, query)
        setExito('Usuario desactivado')
      } else {
        const d = await res.json()
        setError(d.message)
      }
    } catch {
      setError('Error de conexión')
    }
  }

  // ── RENDER ──
  return (
    <div className="page">
      <Navbar usuario={usuario} />
      <div className="page-content">

        {/* ── Encabezado ── */}
        <div className="page-header">
          <div>
            <div className="page-title">Usuarios del sistema</div>
            <div className="page-subtitle">
              {/* Mostramos el total real (de todos los usuarios, no solo los de esta página) */}
              {total} usuarios ·{' '}
              {/* Contamos activos/inactivos solo de la página actual (datos disponibles) */}
              <span className="badge badge-success">{lista.filter(u => u.estado === 'ACTIVO').length} activos</span>
              {' '}
              <span className="badge badge-danger">{lista.filter(u => u.estado === 'INACTIVO').length} inactivos</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>
              <i className="bi bi-arrow-left"></i> Volver
            </button>
            <button className="btn btn-primary" onClick={abrirNuevo}>
              <i className="bi bi-person-plus"></i> Nuevo Usuario
            </button>
          </div>
        </div>

        {/* Alertas globales (fuera de la tabla y del modal) */}
        {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i> {error}</div>}
        {exito && <div className="alert alert-success"><i className="bi bi-check-circle"></i> {exito}</div>}

        {/* ── Barra de búsqueda ──
            Al enviar el form buscamos desde la página 1 con el query actual.
            El botón "Limpiar" resetea el query y vuelve a la página 1. */}
        <form className="search-bar" onSubmit={e => { e.preventDefault(); load(1, query) }}>
          <input
            className="form-input"
            placeholder="Buscar por nombre de usuario o email..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button className="btn btn-primary" type="submit">
            <i className="bi bi-search"></i> Buscar
          </button>
          <button className="btn btn-outline" type="button" onClick={() => { setQuery(''); load(1, '') }}>
            <i className="bi bi-x"></i> Limpiar
          </button>
        </form>

        {/* ── Card con la tabla de usuarios ── */}
        <div className="card">
          {loading ? (
            // Spinner mientras carga
            <div className="spinner-box"><span className="spinner"></span></div>
          ) : lista.length === 0 ? (
            // Sin resultados
            <div className="empty-state">
              <div className="empty-state-icon"><i className="bi bi-people"></i></div>
              <div className="empty-state-text">No hay usuarios registrados</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th></th>{/* columna de botones */}
                  </tr>
                </thead>
                <tbody>
                  {lista.map(u => (
                    <tr key={u.idusuario}>
                      {/* Nombre del usuario con ícono de persona */}
                      <td className="td-bold">
                        <i className="bi bi-person-circle" style={{ marginRight: 6, color: '#9ca3af' }}></i>
                        {u.nombre_usuario}
                      </td>
                      <td className="td-muted">{u.email}</td>
                      {/* Badge gris con el nombre del rol (ADMINISTRADOR, DOCENTE, etc.) */}
                      <td><span className="badge badge-neutral">{u.rol || 'SIN ROL'}</span></td>
                      {/* Badge verde si ACTIVO, rojo si INACTIVO */}
                      <td>
                        <span className={`badge ${u.estado === 'ACTIVO' ? 'badge-success' : 'badge-danger'}`}>
                          {u.estado}
                        </span>
                      </td>
                      {/* Botones de acción por fila */}
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {/* Botón editar (lápiz) */}
                          <button className="btn btn-sm btn-outline-info" onClick={() => abrirEditar(u)} title="Editar">
                            <i className="bi bi-pencil"></i>
                          </button>
                          {/* Botón desactivar: solo aparece si el usuario está ACTIVO */}
                          {u.estado === 'ACTIVO' && (
                            <button className="btn btn-sm btn-outline-danger" onClick={() => desactivar(u)} title="Desactivar">
                              <i className="bi bi-person-x"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Paginación ──
            Muestra en qué página estamos y permite ir a anterior/siguiente.
            Los botones se deshabilitan cuando no se puede avanzar/retroceder. */}
        <div className="pagination-row">
          <span>Página {page} de {lastPage} · {total} usuarios</span>
          <div className="pagination-btns">
            {/* Anterior: deshabilitado si ya estamos en la página 1 */}
            <button className="page-btn" disabled={page === 1} onClick={() => load(page - 1, query)}>
              Anterior
            </button>
            {/* Siguiente: deshabilitado si ya estamos en la última página */}
            <button className="page-btn" disabled={page === lastPage} onClick={() => load(page + 1, query)}>
              Siguiente
            </button>
          </div>
        </div>

      </div>

      {/* ── Modal: crear o editar usuario ──
          Se muestra encima de todo con fondo oscuro semi-transparente */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>

            {/* Encabezado del modal: ícono y título cambian según si editamos o creamos */}
            <div className="card-header card-header-dark">
              <i className={`bi ${editando ? 'bi-pencil' : 'bi-person-plus'}`}></i>
              {editando ? 'Editar Usuario' : 'Nuevo Usuario'}
              {/* Botón X para cerrar el modal sin guardar */}
              <button className="btn-nav-logout" style={{ marginLeft: 'auto' }} onClick={() => setModal(false)}>
                <i className="bi bi-x"></i>
              </button>
            </div>

            <div className="card-body">
              {/* Error dentro del modal (ej: email ya existe) */}
              {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i> {error}</div>}

              <form onSubmit={onSubmit}>
                {/* Campos para CREAR un usuario nuevo */}
                {!editando ? (
                  <>
                    <div className="form-group">
                      <label className="form-label">Nombre de usuario <span className="req">*</span></label>
                      <input className="form-input" name="nombre_usuario" value={form.nombre_usuario} onChange={onChange} required placeholder="Ej: jperez" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email <span className="req">*</span></label>
                      <input type="email" className="form-input" name="email" value={form.email} onChange={onChange} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contraseña inicial <span className="req">*</span></label>
                      <input type="password" className="form-input" name="password" value={form.password} onChange={onChange} required minLength={6} />
                      <div className="form-hint">El usuario deberá cambiarla en su primer ingreso.</div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Rol <span className="req">*</span></label>
                      <select className="form-select" name="idrol" value={form.idrol} onChange={onChange} required>
                        <option value="">Seleccione un rol...</option>
                        {/* Cada opción viene del endpoint /api/usuarios/roles */}
                        {roles.map(r => <option key={r.idrol} value={r.idrol}>{r.nombre}</option>)}
                      </select>
                    </div>
                  </>
                ) : (
                  /* Campos para EDITAR un usuario existente (solo email y estado) */
                  <>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input type="email" className="form-input" name="email" value={form.email} onChange={onChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Estado</label>
                      <select className="form-select" name="estado" value={form.estado} onChange={onChange}>
                        <option value="ACTIVO">Activo</option>
                        <option value="INACTIVO">Inactivo</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Botones del modal */}
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-save"></i> {editando ? 'Guardar Cambios' : 'Crear Usuario'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
