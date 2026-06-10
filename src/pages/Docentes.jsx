// ─────────────────────────────────────────────────────────────
// PÁGINA: Docentes
// Muestra la lista de docentes del sistema. El ADMINISTRADOR puede
// crear, editar y eliminar docentes. Cualquier usuario puede ver
// los grupos asignados a cada docente en el panel lateral (CU11).
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { apiFetch } from '../api'

// Valores por defecto del formulario de docente.
// idusuario: usuario del sistema al que se vincula el docente (solo al crear)
const INIT = {
  idusuario:      '',
  ci:             '',
  nombres:        '',
  apellidos:      '',
  profesion:      '',
  maestria:       '',
  diplomadoEdSup: '',
  telefono:       '',
  correo:         '',
  estado:         'ACTIVO',
}

// Mapea turno a color de badge para el panel de asignaciones
const TURNO_BADGE = { 'MAÑANA': 'warning', TARDE: 'info', NOCHE: 'neutral' }

function Docentes() {
  const navigate = useNavigate()
  const usuario  = JSON.parse(localStorage.getItem('usuario'))

  // ── Estados: lista principal ──

  // Lista de todos los docentes
  const [docentes, setDocentes] = useState([])

  // Usuarios del sistema disponibles para asociar a un nuevo docente
  // (los que aún no tienen docente asignado)
  const [usuarios, setUsuarios] = useState([])

  // Lista de grupos (para el modal de asignar grupo)
  const [grupos, setGrupos] = useState([])

  // Lista de materias (para el modal de asignar grupo)
  const [materias, setMaterias] = useState([])

  // true mientras carga la tabla principal
  const [loading, setLoading] = useState(false)

  // Mensaje de error global
  const [error, setError] = useState('')

  // Mensaje de éxito global
  const [exito, setExito] = useState('')

  // ── Estados: modal de crear/editar docente ──

  // true = mostrar el modal de docente
  const [modal, setModal] = useState(false)

  // id del docente que se está editando; null = modo crear
  const [editando, setEditando] = useState(null)

  // Valores del formulario del modal de docente
  const [form, setForm] = useState(INIT)

  // ── Estados: panel lateral de asignaciones (CU11) ──

  // Docente cuyo panel está abierto; null = panel cerrado
  const [panelDocente, setPanelDocente] = useState(null)

  // Lista de grupos asignados al docente del panel
  const [asignaciones, setAsignaciones] = useState([])

  // true mientras carga las asignaciones del docente
  const [loadingAsig, setLoadingAsig] = useState(false)

  // true = mostrar el modal de asignar grupo (dentro del panel)
  const [modalAsignar, setModalAsignar] = useState(false)

  // Valores del formulario de asignación: qué grupo y qué materia
  const [formAsig, setFormAsig] = useState({ idgrupo: '', idmateria: '' })

  // true mientras se guarda la asignación (deshabilita el botón)
  const [guardandoAsig, setGuardandoAsig] = useState(false)

  // Si no hay sesión activa, redirigir al login
  if (!usuario) { navigate('/'); return null }

  // true si el usuario logueado es administrador (para mostrar botones de CRUD)
  const esAdmin = usuario.rol === 'ADMINISTRADOR'

  // ── Función: cargar la lista de docentes ──
  const load = () => {
    setLoading(true)
    apiFetch('/api/docentes')
      .then(r => r.ok ? r.json() : [])
      .then(setDocentes)
      .catch(() => setError('Error al cargar docentes'))
      .finally(() => setLoading(false))
  }

  // ── Función: cargar datos auxiliares (usuarios, grupos, materias) ──
  // Se llama al abrir el modal para tener las listas actualizadas
  const loadAux = () => {
    // Usuarios sin docente asignado (para el select al crear docente)
    apiFetch('/api/docentes/usuarios-disponibles').then(r => r.ok ? r.json() : []).then(setUsuarios).catch(() => {})
    // Grupos para el select del modal de asignación
    apiFetch('/api/grupos').then(r => r.ok ? r.json() : []).then(setGrupos).catch(() => {})
    // Materias para el select del modal de asignación
    apiFetch('/api/materias').then(r => r.ok ? r.json() : []).then(setMaterias).catch(() => {})
  }

  // Cargamos docentes y auxiliares al montar el componente
  useEffect(() => { load(); loadAux() }, [])

  // ── Función: cargar las asignaciones de un docente específico ──
  // Se llama al abrir el panel lateral
  const loadAsignaciones = async (iddocente) => {
    setLoadingAsig(true)
    try {
      const r = await apiFetch(`/api/docentes/${iddocente}/grupos`)
      setAsignaciones(r.ok ? await r.json() : [])
    } catch {
      setAsignaciones([])
    } finally {
      setLoadingAsig(false)
    }
  }

  // ── Función: abrir el panel lateral de un docente ──
  const abrirPanel = (d) => {
    setPanelDocente(d)  // guardamos los datos del docente para mostrar su nombre
    setError(''); setExito('')
    loadAsignaciones(d.iddocente) // cargamos sus grupos asignados
  }

  // ─────────────────────────────────────────────────────────
  // CU03: CRUD de docentes
  // ─────────────────────────────────────────────────────────

  // Actualiza el estado del formulario cuando el usuario escribe o hace check
  const onChange = e => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  // Abre el modal limpio para CREAR un nuevo docente
  const abrirNuevo = () => {
    setForm(INIT)
    setEditando(null)
    setModal(true)
    setError(''); setExito('')
    loadAux() // recarga usuarios disponibles (puede haber cambiado)
  }

  // Abre el modal relleno para EDITAR un docente existente
  const abrirEditar = d => {
    setForm({
      ci:             d.ci,
      nombres:        d.nombres,
      apellidos:      d.apellidos,
      profesion:      d.profesion,
      maestria:       d.maestria       || '',
      diplomadoEdSup: d.diplomadoedsup || '', // campo en BD: diplomadoedsup (sin mayúscula)
      telefono:       d.telefono       || '',
      correo:         d.correo,
      estado:         d.estado
    })
    setEditando(d.iddocente)
    setModal(true)
    setError(''); setExito('')
  }

  // ── Función: guardar el formulario de docente (crear o editar) ──
  const onSubmit = async e => {
    e.preventDefault()
    setError('')
    try {
      const res = editando
        ? await apiFetch(`/api/docentes/${editando}`, { method: 'PUT',  body: JSON.stringify(form) })
        : await apiFetch('/api/docentes',              { method: 'POST', body: JSON.stringify(form) })

      const data = await res.json()

      if (res.ok) {
        setExito(data.message)
        setModal(false)
        load() // recargamos la tabla con el docente nuevo/editado
      } else {
        setError(data.message || 'Error al guardar')
      }
    } catch {
      setError('Error de conexión')
    }
  }

  // ── Función: eliminar un docente ──
  const eliminar = async id => {
    if (!window.confirm('¿Eliminar este docente?')) return
    try {
      const res = await apiFetch(`/api/docentes/${id}`, { method: 'DELETE' })
      if (res.ok) {
        load() // recargamos la tabla sin el docente eliminado
      } else {
        const d = await res.json()
        setError(d.message)
      }
    } catch {
      setError('Error de conexión')
    }
  }

  // ─────────────────────────────────────────────────────────
  // CU11: Asignación de grupos a docentes
  // ─────────────────────────────────────────────────────────

  // ── Función: asignar un docente a un grupo+materia ──
  const asignar = async e => {
    e.preventDefault()
    setError(''); setGuardandoAsig(true)

    try {
      const res = await apiFetch(`/api/docentes/${panelDocente.iddocente}/asignar-grupo`, {
        method: 'POST',
        body: JSON.stringify({
          idgrupo:   Number(formAsig.idgrupo),   // convertimos a número
          idmateria: Number(formAsig.idmateria),
        }),
      })
      const data = await res.json()

      if (res.ok) {
        setExito(data.message)
        setModalAsignar(false)
        setFormAsig({ idgrupo: '', idmateria: '' }) // limpiamos el form
        loadAsignaciones(panelDocente.iddocente)    // actualizamos el panel
        load()                                      // actualizamos el contador en la tabla
      } else {
        setError(data.message || 'Error al asignar')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setGuardandoAsig(false)
    }
  }

  // ── Función: desasignar (quitar) un grupo de un docente ──
  const desasignar = async (idasignacion) => {
    if (!window.confirm('¿Desasignar este grupo?')) return

    try {
      const res  = await apiFetch(`/api/docentes/${panelDocente.iddocente}/asignaciones/${idasignacion}`, { method: 'DELETE' })
      const data = await res.json()

      if (res.ok) {
        setExito(data.message)
        loadAsignaciones(panelDocente.iddocente) // actualizamos la lista en el panel
        load()                                   // actualizamos la tabla principal
      } else {
        setError(data.message)
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
            <div className="page-title">Docentes</div>
            <div className="page-subtitle">{docentes.length} docentes registrados</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>
              <i className="bi bi-arrow-left"></i> Volver
            </button>
            {/* Botón "Nuevo Docente" solo visible para ADMINISTRADOR */}
            {esAdmin && (
              <button className="btn btn-primary" onClick={abrirNuevo}>
                <i className="bi bi-plus"></i> Nuevo Docente
              </button>
            )}
          </div>
        </div>

        {/* Alertas globales */}
        {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i> {error}</div>}
        {exito && <div className="alert alert-success"><i className="bi bi-check-circle"></i> {exito}</div>}

        {/* ── Layout de 2 columnas cuando el panel está abierto ──
            Si panelDocente es null, es solo 1 columna (tabla a todo el ancho).
            Si hay docente seleccionado, se divide: tabla | panel lateral. */}
        <div style={{ display: 'grid', gridTemplateColumns: panelDocente ? '1fr 360px' : '1fr', gap: 16, alignItems: 'start' }}>

          {/* ── Tabla de docentes ── */}
          <div className="card">
            {loading ? (
              <div className="spinner-box"><span className="spinner"></span></div>
            ) : docentes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><i className="bi bi-person-badge"></i></div>
                <div className="empty-state-text">No hay docentes registrados</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>CI</th><th>Nombre</th><th>Profesión</th><th>Correo</th><th>Estado</th>
                      <th>Grupos</th>
                      {/* La columna de acciones solo aparece para ADMINISTRADOR */}
                      {esAdmin && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {docentes.map(d => (
                      // Resaltamos la fila del docente cuyo panel está abierto
                      <tr key={d.iddocente} style={{ background: panelDocente?.iddocente === d.iddocente ? '#f0f4ff' : '' }}>
                        <td className="td-bold">{d.ci}</td>
                        <td>{d.nombres} {d.apellidos}</td>
                        <td className="td-muted">{d.profesion || '—'}</td>
                        <td className="td-muted">{d.correo}</td>
                        <td>
                          <span className={`badge ${d.estado === 'ACTIVO' ? 'badge-success' : 'badge-danger'}`}>
                            {d.estado}
                          </span>
                        </td>
                        {/* Botón que abre el panel lateral de grupos asignados */}
                        <td>
                          <button className="btn btn-sm btn-outline-info" onClick={() => abrirPanel(d)}>
                            <i className="bi bi-diagram-3"></i> Grupos
                          </button>
                        </td>
                        {/* Botones editar/eliminar: solo para ADMINISTRADOR */}
                        {esAdmin && (
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-sm btn-outline-info" onClick={() => abrirEditar(d)}>
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button className="btn btn-sm btn-outline-danger" onClick={() => eliminar(d.iddocente)}>
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Panel lateral: grupos asignados al docente seleccionado ──
              position: sticky lo fija mientras el usuario hace scroll en la tabla */}
          {panelDocente && (
            <div className="card" style={{ position: 'sticky', top: 16 }}>
              <div className="card-header card-header-dark" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><i className="bi bi-diagram-3"></i> Grupos asignados</span>
                {/* Botón X para cerrar el panel */}
                <button className="btn-nav-logout" style={{ marginLeft: 'auto' }} onClick={() => setPanelDocente(null)}>
                  <i className="bi bi-x"></i>
                </button>
              </div>
              <div className="card-body">

                {/* Nombre e identificación del docente del panel */}
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                  {panelDocente.nombres} {panelDocente.apellidos}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>CI: {panelDocente.ci}</div>

                {/* Spinner, mensaje vacío o lista de grupos asignados */}
                {loadingAsig ? (
                  <div className="spinner-box" style={{ padding: 20 }}><span className="spinner"></span></div>
                ) : asignaciones.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '16px 0', marginBottom: 12 }}>
                    <i className="bi bi-inbox" style={{ fontSize: 24, display: 'block', marginBottom: 6 }}></i>
                    Sin grupos asignados
                  </div>
                ) : (
                  /* Lista de tarjetas: una por cada grupo asignado */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {asignaciones.map(a => (
                      <div key={a.idasignacion} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{a.nombregrupo}</div>
                          <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', gap: 8, marginTop: 2 }}>
                            {/* Badge del turno */}
                            <span className={`badge badge-${TURNO_BADGE[a.turno] || 'neutral'}`} style={{ fontSize: 10 }}>
                              {a.turno}
                            </span>
                            {/* Nombre de la materia que dicta en este grupo */}
                            <span>{a.materia}</span>
                          </div>
                        </div>
                        {/* Botón para quitar esta asignación */}
                        <button className="btn btn-sm btn-outline-danger" title="Desasignar" onClick={() => desasignar(a.idasignacion)}>
                          <i className="bi bi-x"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Contador de grupos activos: se pone rojo al llegar al límite */}
                <div style={{ fontSize: 12, color: asignaciones.length >= 4 ? '#dc2626' : '#6b7280', marginBottom: 10, textAlign: 'right' }}>
                  {asignaciones.length}/4 grupos activos {asignaciones.length >= 4 && '(máximo alcanzado)'}
                </div>

                {/* Botón para asignar: deshabilitado si ya tiene 4 grupos (el máximo) */}
                <button
                  className="btn btn-primary btn-full"
                  disabled={asignaciones.length >= 4}
                  onClick={() => { setFormAsig({ idgrupo: '', idmateria: '' }); setModalAsignar(true); setError('') }}
                >
                  <i className="bi bi-plus-circle"></i> Asignar a grupo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────
          Modal: crear o editar docente
          Fondo fijo y semitransparente que cubre toda la pantalla
      ───────────────────────────────────────────────────────── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>

            {/* Encabezado: ícono y título cambian según si editamos o creamos */}
            <div className="card-header card-header-dark">
              <i className={`bi ${editando ? 'bi-pencil' : 'bi-person-plus'}`}></i>
              {editando ? 'Editar Docente' : 'Nuevo Docente'}
              <button className="btn-nav-logout" style={{ marginLeft: 'auto' }} onClick={() => setModal(false)}>
                <i className="bi bi-x"></i>
              </button>
            </div>

            <div className="card-body">
              {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i> {error}</div>}

              <form onSubmit={onSubmit}>

                {/* ── Sección 1: datos personales ── */}
                <div className="form-section">
                  <div className="form-section-title"><i className="bi bi-person"></i> Datos Personales</div>

                  {/* El select de usuario solo aparece al CREAR (al editar ya está vinculado) */}
                  {!editando && (
                    <div className="form-group">
                      <label className="form-label">Usuario del sistema <span className="req">*</span></label>
                      <select className="form-select" name="idusuario" value={form.idusuario} onChange={onChange} required>
                        <option value="">Seleccione un usuario...</option>
                        {/* Solo usuarios que aún no tienen docente asignado */}
                        {usuarios.map(u => (
                          <option key={u.idusuario} value={u.idusuario}>
                            {u.nombre_usuario} ({u.email})
                          </option>
                        ))}
                      </select>
                      {/* Aviso si no quedan usuarios disponibles */}
                      {usuarios.length === 0 && (
                        <div className="form-hint">No hay usuarios disponibles sin docente asignado.</div>
                      )}
                    </div>
                  )}

                  {/* Campos en grilla de 3 columnas */}
                  <div className="form-row-3">
                    <div className="form-group">
                      <label className="form-label">CI <span className="req">*</span></label>
                      {/* disabled al editar: el CI no se puede cambiar */}
                      <input className="form-input" name="ci" value={form.ci} onChange={onChange} required disabled={!!editando} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nombres <span className="req">*</span></label>
                      <input className="form-input" name="nombres" value={form.nombres} onChange={onChange} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Apellidos <span className="req">*</span></label>
                      <input className="form-input" name="apellidos" value={form.apellidos} onChange={onChange} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Profesión</label>
                      <input className="form-input" name="profesion" value={form.profesion} onChange={onChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Teléfono</label>
                      <input className="form-input" name="telefono" value={form.telefono} onChange={onChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Correo <span className="req">*</span></label>
                      <input type="email" className="form-input" name="correo" value={form.correo} onChange={onChange} required />
                    </div>
                  </div>

                  {/* Estado del docente (activo/inactivo) */}
                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select className="form-select" name="estado" value={form.estado} onChange={onChange}>
                      <option value="ACTIVO">Activo</option>
                      <option value="INACTIVO">Inactivo</option>
                    </select>
                  </div>
                </div>

                {/* ── Sección 2: requisitos académicos (opcionales) ── */}
                <div className="form-section">
                  <div className="form-section-title"><i className="bi bi-mortarboard"></i> Requisitos Académicos</div>
                  <div className="form-group">
                    <label className="form-label">Maestría</label>
                    <input className="form-input" name="maestria" value={form.maestria} onChange={onChange} placeholder="Nombre del grado o vacío si no aplica" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Diplomado en Educación Superior</label>
                    <input className="form-input" name="diplomadoEdSup" value={form.diplomadoEdSup} onChange={onChange} placeholder="Nombre del diplomado o vacío si no aplica" />
                  </div>
                </div>

                {/* Botones del modal */}
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-save"></i> {editando ? 'Guardar Cambios' : 'Registrar Docente'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          Modal: asignar docente a un grupo (CU11)
          Se abre desde el panel lateral. zIndex 300 para estar
          encima del panel que tiene zIndex 200.
      ───────────────────────────────────────────────────────── */}
      {modalAsignar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 440 }}>

            {/* Título del modal incluye el nombre del docente para contexto */}
            <div className="card-header card-header-dark">
              <i className="bi bi-plus-circle"></i> Asignar a grupo — {panelDocente?.nombres} {panelDocente?.apellidos}
              <button className="btn-nav-logout" style={{ marginLeft: 'auto' }} onClick={() => setModalAsignar(false)}>
                <i className="bi bi-x"></i>
              </button>
            </div>

            <div className="card-body">
              {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i> {error}</div>}

              <form onSubmit={asignar}>
                {/* Select del grupo */}
                <div className="form-group">
                  <label className="form-label">Grupo <span className="req">*</span></label>
                  <select
                    className="form-select"
                    value={formAsig.idgrupo}
                    onChange={e => setFormAsig(f => ({ ...f, idgrupo: e.target.value }))}
                    required
                  >
                    <option value="">Seleccione un grupo...</option>
                    {/* Mostramos nombre del grupo y su turno para ayudar a identificarlo */}
                    {grupos.map(g => (
                      <option key={g.idgrupo} value={g.idgrupo}>
                        {g.nombregrupo} — {g.turno}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select de la materia que dictará en ese grupo */}
                <div className="form-group">
                  <label className="form-label">Materia <span className="req">*</span></label>
                  <select
                    className="form-select"
                    value={formAsig.idmateria}
                    onChange={e => setFormAsig(f => ({ ...f, idmateria: e.target.value }))}
                    required
                  >
                    <option value="">Seleccione una materia...</option>
                    {materias.map(m => (
                      <option key={m.idmateria} value={m.idmateria}>{m.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Aviso del límite de 4 grupos */}
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
                  <i className="bi bi-info-circle"></i> El docente puede tener máximo 4 grupos activos simultáneos.
                </div>

                {/* Botones del modal */}
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setModalAsignar(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={guardandoAsig}>
                    {guardandoAsig ? 'Asignando...' : <><i className="bi bi-check"></i> Confirmar asignación</>}
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

export default Docentes
