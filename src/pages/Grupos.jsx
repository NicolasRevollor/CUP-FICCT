// ─────────────────────────────────────────────────────────────
// PÁGINA: Grupos
// Muestra todos los grupos de admisión con su ocupación, turno,
// aula y horario. El ADMINISTRADOR puede crear nuevos grupos.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { apiFetch } from '../api'

// Mapea cada turno a un color de badge:
//   MAÑANA → amarillo (warning), TARDE → azul (info), NOCHE → gris (neutral)
const TURNO_BADGE = { 'MAÑANA': 'warning', TARDE: 'info', NOCHE: 'neutral' }

// Mapea cada turno a un ícono de Bootstrap Icons
const TURNO_ICON = { 'MAÑANA': 'bi-sunrise', TARDE: 'bi-sun', NOCHE: 'bi-moon-stars' }

// Valores iniciales del formulario "Nuevo Grupo".
// turno empieza en 'MAÑANA' como valor por defecto del select.
const INIT_GRUPO = {
  nombregrupo: '',
  turno: 'MAÑANA',
  capacidadmaxima: '',
  idaula: '',        // opcional: id del aula asignada
  horarioinicio: '', // opcional: hora de inicio (ej: "08:00")
  horariofin: '',    // opcional: hora de fin (ej: "12:00")
  dias: ''           // opcional: días de cursado (ej: "Lun-Mié-Vie")
}

function Grupos() {
  const navigate = useNavigate()

  // Usuario logueado
  const usuario = JSON.parse(localStorage.getItem('usuario'))

  // true si el usuario tiene rol ADMINISTRADOR (para mostrar botón "Nuevo Grupo")
  const esAdmin = usuario?.rol === 'ADMINISTRADOR'

  // ── Estados ──

  // Lista de todos los grupos (viene del servidor)
  const [grupos, setGrupos] = useState([])

  // Lista de aulas disponibles para asignar al nuevo grupo
  const [aulas, setAulas] = useState([])

  // true mientras carga la lista de grupos
  const [loading, setLoading] = useState(false)

  // Mensaje de error
  const [error, setError] = useState('')

  // Mensaje de éxito (ej: "Grupo creado correctamente")
  const [exito, setExito] = useState('')

  // Filtro de turno activo: 'TODOS', 'MAÑANA', 'TARDE' o 'NOCHE'
  const [filtro, setFiltro] = useState('TODOS')

  // true = mostrar el modal de crear grupo
  const [modal, setModal] = useState(false)

  // Valores del formulario del modal
  const [form, setForm] = useState(INIT_GRUPO)

  // true mientras se envía el formulario al servidor (deshabilita el botón Guardar)
  const [guardando, setGuardando] = useState(false)

  // ── Función: cargar grupos del servidor ──
  const loadGrupos = () => {
    setLoading(true)
    apiFetch('/api/grupos')
      .then(r => {
        if (!r.ok) throw new Error('Error al cargar grupos')
        return r.json()
      })
      .then(setGrupos)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  // Al montar el componente, cargamos grupos y aulas
  useEffect(() => {
    if (!usuario) { navigate('/'); return }
    loadGrupos()
    // Cargamos las aulas para el select del modal
    apiFetch('/api/aulas').then(r => r.ok ? r.json() : []).then(setAulas).catch(() => {})
  }, [])

  // Si no hay sesión, no renderizamos nada (el useEffect ya redirigió)
  if (!usuario) return null

  // Filtramos la lista según el filtro de turno activo
  const filtrados = filtro === 'TODOS' ? grupos : grupos.filter(g => g.turno === filtro)

  // Calcula el porcentaje de ocupación de un grupo.
  // Math.min(100, ...) evita que supere el 100% si hay errores de datos.
  const pct = (actual, max) => max > 0 ? Math.min(100, Math.round((actual / max) * 100)) : 0

  // Actualiza el form cuando el usuario escribe o selecciona algo
  const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  // Abre el modal limpio para crear un grupo nuevo
  const abrirNuevo = () => {
    setForm(INIT_GRUPO)
    setError(''); setExito('')
    setModal(true)
  }

  // ── Función: enviar el formulario de nuevo grupo ──
  const onSubmit = async e => {
    e.preventDefault()
    setError('')
    setGuardando(true)

    try {
      const body = {
        nombregrupo:     form.nombregrupo,
        turno:           form.turno,
        capacidadmaxima: Number(form.capacidadmaxima), // convertimos string a número
        // Si los campos opcionales están vacíos, enviamos null al servidor
        idaula:        form.idaula       ? Number(form.idaula) : null,
        horarioinicio: form.horarioinicio || null,
        horariofin:    form.horariofin   || null,
        dias:          form.dias         || null,
      }

      const res  = await apiFetch('/api/grupos', { method: 'POST', body: JSON.stringify(body) })
      const data = await res.json()

      if (res.ok) {
        // Grupo creado: mostramos mensaje, cerramos modal y recargamos la tabla
        setExito(data.message || 'Grupo creado correctamente')
        setModal(false)
        loadGrupos()
      } else {
        // El servidor rechazó (ej: nombre duplicado)
        setError(data.message || 'Error al crear grupo')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setGuardando(false)
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
            <div className="page-title">Grupos</div>
            <div className="page-subtitle">{grupos.length} grupos habilitados</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>
              <i className="bi bi-arrow-left"></i> Volver
            </button>
            {/* Botón "Nuevo Grupo" solo visible para ADMINISTRADOR */}
            {esAdmin && (
              <button className="btn btn-primary" onClick={abrirNuevo}>
                <i className="bi bi-plus"></i> Nuevo Grupo
              </button>
            )}
          </div>
        </div>

        {/* Alertas */}
        {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i> {error}</div>}
        {exito && <div className="alert alert-success"><i className="bi bi-check-circle"></i> {exito}</div>}

        {/* ── Tarjetas de estadística: cuántos grupos hay por turno ── */}
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 18 }}>
          {['MAÑANA', 'TARDE', 'NOCHE'].map(t => (
            <div key={t} className="stat-card stat-card-white">
              <div className="stat-icon"><i className={`bi ${TURNO_ICON[t]}`}></i></div>
              {/* Contamos cuántos grupos de este turno hay en la lista */}
              <div className="stat-value">{grupos.filter(g => g.turno === t).length}</div>
              {/* Primera letra mayúscula, el resto minúscula: "MAÑANA" → "Mañana" */}
              <div className="stat-label">{t.charAt(0) + t.slice(1).toLowerCase()}</div>
            </div>
          ))}
        </div>

        {/* ── Filtros de turno ──
            Cada botón filtra la tabla a los grupos de ese turno.
            'active' agrega la clase CSS que lo resalta como seleccionado. */}
        <div className="filter-tabs">
          {['TODOS', 'MAÑANA', 'TARDE', 'NOCHE'].map(t => (
            <button key={t} className={`filter-tab ${filtro === t ? 'active' : ''}`} onClick={() => setFiltro(t)}>
              {t}
            </button>
          ))}
        </div>

        {/* ── Card con la tabla de grupos ── */}
        <div className="card">
          {loading ? (
            <div className="spinner-box">
              <span className="spinner"></span>
              <span className="spinner-text">Cargando grupos...</span>
            </div>
          ) : filtrados.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><i className="bi bi-inbox"></i></div>
              <div className="empty-state-text">No hay grupos para este turno</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Grupo</th>
                    <th>Turno</th>
                    <th>Aula</th>
                    <th>Horario</th>
                    <th>Ocupación</th>
                    <th></th>{/* columna del botón "Ver" */}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(g => (
                    <tr key={g.idgrupo}>
                      <td className="td-muted">{g.idgrupo}</td>
                      <td className="td-bold">{g.nombregrupo}</td>
                      <td>
                        {/* Badge de color según el turno */}
                        <span className={`badge badge-${TURNO_BADGE[g.turno] || 'neutral'}`}>
                          <i className={`bi ${TURNO_ICON[g.turno] || 'bi-circle'}`}></i>
                          {g.turno}
                        </span>
                      </td>
                      {/* Si no tiene aula asignada, mostramos guión */}
                      <td>{g.aula || '—'}</td>
                      {/* slice(0,5) muestra solo "HH:MM" (sin los segundos) */}
                      <td className="td-muted">
                        {g.horarioinicio?.slice(0, 5)} {g.horariofin ? `– ${g.horariofin.slice(0, 5)}` : ''}
                      </td>
                      {/* Barra de progreso visual de ocupación */}
                      <td style={{ minWidth: 160 }}>
                        <div className="progress-row">
                          <div className="progress-track">
                            <div
                              className={`progress-fill ${pct(g.cantidadestudiante, g.capacidadmaxima) >= 90 ? 'progress-fill-danger' : 'progress-fill-success'}`}
                              style={{ width: `${pct(g.cantidadestudiante, g.capacidadmaxima)}%` }}
                            />
                          </div>
                          {/* Ej: "18/30" */}
                          <span className="progress-label">{g.cantidadestudiante}/{g.capacidadmaxima}</span>
                        </div>
                      </td>
                      {/* Botón para ver el detalle del grupo */}
                      <td>
                        <button className="btn btn-sm btn-primary" onClick={() => navigate(`/grupos/${g.idgrupo}`)}>
                          <i className="bi bi-eye"></i> Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ── Modal: crear nuevo grupo ──
          Fondo oscuro fijo que cubre toda la pantalla (position: fixed, inset: 0) */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>

            {/* Encabezado del modal */}
            <div className="card-header card-header-dark">
              <i className="bi bi-people"></i> Nuevo Grupo
              {/* Botón X para cerrar sin guardar */}
              <button className="btn-nav-logout" style={{ marginLeft: 'auto' }} onClick={() => setModal(false)}>
                <i className="bi bi-x"></i>
              </button>
            </div>

            <div className="card-body">
              {/* Error dentro del modal */}
              {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i> {error}</div>}

              <form onSubmit={onSubmit}>

                {/* ── Sección 1: datos obligatorios del grupo ── */}
                <div className="form-section">
                  <div className="form-section-title"><i className="bi bi-info-circle"></i> Datos del grupo</div>

                  {/* form-row-3 = grid de 3 columnas; span 2 = el campo ocupa 2 de las 3 */}
                  <div className="form-row-3">
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Nombre del grupo <span className="req">*</span></label>
                      <input className="form-input" name="nombregrupo" value={form.nombregrupo} onChange={onChange} required placeholder="Ej: Grupo A" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Turno <span className="req">*</span></label>
                      <select className="form-select" name="turno" value={form.turno} onChange={onChange} required>
                        <option value="MAÑANA">Mañana</option>
                        <option value="TARDE">Tarde</option>
                        <option value="NOCHE">Noche</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Capacidad máxima <span className="req">*</span></label>
                      <input type="number" className="form-input" name="capacidadmaxima" value={form.capacidadmaxima} onChange={onChange} required min={1} max={200} placeholder="Ej: 30" />
                    </div>
                  </div>
                </div>

                {/* ── Sección 2: datos opcionales de aula y horario ── */}
                <div className="form-section">
                  <div className="form-section-title"><i className="bi bi-clock"></i> Aula y horario (opcional)</div>

                  {/* Select de aulas: la lista viene de GET /api/aulas */}
                  <div className="form-group">
                    <label className="form-label">Aula</label>
                    <select className="form-select" name="idaula" value={form.idaula} onChange={onChange}>
                      <option value="">Sin aula asignada</option>
                      {/* a.idaulas (con 's') es el nombre de la PK en la tabla aulas */}
                      {aulas.map(a => <option key={a.idaulas} value={a.idaulas}>{a.nombre}</option>)}
                    </select>
                  </div>

                  {/* Horario y días en una fila de 3 */}
                  <div className="form-row-3">
                    <div className="form-group">
                      <label className="form-label">Horario inicio</label>
                      {/* type="time" muestra selector de hora nativo del navegador */}
                      <input type="time" className="form-input" name="horarioinicio" value={form.horarioinicio} onChange={onChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Horario fin</label>
                      <input type="time" className="form-input" name="horariofin" value={form.horariofin} onChange={onChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Días</label>
                      <input className="form-input" name="dias" value={form.dias} onChange={onChange} placeholder="Ej: Lun-Mié-Vie" />
                    </div>
                  </div>

                  {/* Aviso: el backend solo crea el registro de horario si aula + inicio + fin están completos */}
                  <div className="form-hint">
                    <i className="bi bi-info-circle"></i> El horario solo se guarda si se selecciona aula, inicio y fin.
                  </div>
                </div>

                {/* Botones del modal */}
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
                  {/* disabled mientras guardando para evitar doble envío */}
                  <button type="submit" className="btn btn-primary" disabled={guardando}>
                    {guardando ? 'Guardando...' : <><i className="bi bi-save"></i> Crear Grupo</>}
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

export default Grupos
