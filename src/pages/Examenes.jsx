// ─────────────────────────────────────────────────────────────
// PÁGINA: Registro de Exámenes
// Permite a un DOCENTE buscar un postulante por su CI y registrar
// o editar las notas de hasta 4 materias.
// ─────────────────────────────────────────────────────────────

// Importamos hooks de React:
//   useState → para guardar valores que cambian (notas, errores, etc.)
//   useEffect → para ejecutar código cuando la página carga por primera vez
import { useState, useEffect } from 'react'

// useNavigate nos deja redirigir al usuario a otra página (ej: /dashboard)
import { useNavigate } from 'react-router-dom'

// Barra de navegación superior común a todas las páginas
import Navbar from '../components/Navbar'

// apiFetch es nuestra función para hacer llamadas al servidor (API).
// Automáticamente agrega el token de sesión en cada petición.
import { apiFetch } from '../api'

// Diccionario que convierte el estado de un examen a un color de badge.
// Ej: 'APROBADO' → 'success' (verde), 'REPROBADO' → 'danger' (rojo)
const BADGE = { APROBADO: 'success', REPROBADO: 'danger', PENDIENTE: 'warning' }

// Función que calcula la nota ponderada igual que el TRIGGER en la base de datos:
//   Examen 1 vale 30%, Examen 2 vale 30%, Examen 3 vale 40%
//   El + delante de n1 convierte el string a número
//   toFixed(2) redondea a 2 decimales (ej: 72.50)
const pond = (n1, n2, n3) => ((+n1 * 0.30) + (+n2 * 0.30) + (+n3 * 0.40)).toFixed(2)

function Examenes() {
  // hook para redirigir a otra ruta
  const navigate = useNavigate()

  // Leemos el usuario logueado desde localStorage (lo guardó el login)
  const usuario = JSON.parse(localStorage.getItem('usuario'))

  // ── Estados (variables que React "recuerda" entre renders) ──

  // Lo que el usuario escribe en el campo CI para buscar
  const [busci, setBusci] = useState('')

  // Datos del postulante encontrado (null si aún no se buscó)
  const [postulante, setPost] = useState(null)

  // Lista de exámenes/notas ya registradas para ese postulante
  const [examenes, setExamenes] = useState([])

  // Lista de materias disponibles (viene del servidor al cargar la página)
  const [materias, setMaterias] = useState([])

  // true mientras se espera respuesta del servidor (muestra spinner)
  const [loading, setLoading] = useState(false)

  // Mensaje de error (string vacío = sin error)
  const [error, setError] = useState('')

  // Mensaje de éxito (string vacío = sin mensaje)
  const [exito, setExito] = useState('')

  // Valores del formulario de registro de notas
  // idmateria: cuál materia seleccionó; nota1/2/3: los tres exámenes
  const [form, setForm] = useState({ idmateria: '', nota1: '', nota2: '', nota3: '' })

  // Si estamos editando, guardamos el id del examen que se edita.
  // null = modo "crear nuevo"
  const [editando, setEditando] = useState(null)

  // true = mostrar el formulario de notas; false = ocultarlo
  const [showForm, setShowForm] = useState(false)

  // ── useEffect: se ejecuta UNA sola vez cuando la página carga ──
  useEffect(() => {
    // Si no hay usuario logueado, mandarlo al login
    if (!usuario) { navigate('/'); return }

    // Pedimos al servidor la lista de materias para llenar el <select>
    apiFetch('/api/materias')
      .then(r => r.ok ? r.json() : [])
      .then(setMaterias)
      .catch(() => {}) // si falla, la lista queda vacía pero no explota la app
  }, []) // [] significa "solo al montar el componente, no repetir"

  // Si no hay usuario, no renderizamos nada (el useEffect ya redirigió)
  if (!usuario) return null

  // ── Función: buscar postulante por CI ──
  const buscarPostulante = async (e) => {
    e.preventDefault() // evita que el navegador recargue la página al enviar el form

    // Limpiamos mensajes y resultados anteriores antes de buscar
    setError(''); setPost(null); setExamenes([]); setLoading(true)

    try {
      // Llamamos al endpoint de búsqueda con el CI que escribió el usuario
      const r = await apiFetch(`/api/postulantes/buscar?q=${encodeURIComponent(busci)}`)
      if (!r.ok) throw new Error()

      const d = await r.json()

      // La API puede devolver varios resultados; buscamos el que tenga CI exacto
      const p = d.data?.find(x => x.ci === busci)

      if (!p) {
        // No encontramos ninguno con ese CI exacto
        setError('No se encontró postulante con ese CI')
        return
      }

      // Guardamos el postulante encontrado para mostrarlo en pantalla
      setPost(p)

      // Con el id del postulante, pedimos sus exámenes registrados
      apiFetch(`/api/examenes/${p.idpostulante}`)
        .then(r => r.ok ? r.json() : [])
        .then(setExamenes)

    } catch {
      setError('Error de conexión con el servidor')
    } finally {
      // Siempre quitamos el spinner, haya error o no
      setLoading(false)
    }
  }

  // ── Función: guardar o actualizar notas ──
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setExito('')

    try {
      // Si estamos editando, solo mandamos las notas (no la materia, ya está fija)
      // Si es nuevo registro, también mandamos el id del postulante y la materia
      const body = editando
        ? JSON.stringify({ nota1: form.nota1, nota2: form.nota2, nota3: form.nota3 })
        : JSON.stringify({
            idpostulante: postulante.idpostulante,
            idmateria: form.idmateria,
            nota1: form.nota1,
            nota2: form.nota2,
            nota3: form.nota3
          })

      // PUT = actualizar existente, POST = crear nuevo
      const res = await apiFetch(
        editando ? `/api/examenes/${editando}` : '/api/examenes',
        { method: editando ? 'PUT' : 'POST', body }
      )

      const data = await res.json()

      if (res.ok) {
        // Guardado exitoso: mostramos mensaje, cerramos form y recargamos datos
        setExito(editando ? 'Notas actualizadas' : 'Notas registradas correctamente')
        setShowForm(false)
        setEditando(null)
        setForm({ idmateria: '', nota1: '', nota2: '', nota3: '' })

        // Recargamos los exámenes del postulante para ver el cambio en la tabla
        apiFetch(`/api/examenes/${postulante.idpostulante}`)
          .then(r => r.ok ? r.json() : [])
          .then(setExamenes)

        // También recargamos los datos del postulante porque el promedio puede haber cambiado
        apiFetch(`/api/postulantes/${postulante.idpostulante}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d) setPost(d) })

      } else {
        // El servidor rechazó la petición (ej: materia ya registrada)
        setError(data.message)
      }
    } catch {
      setError('Error de conexión con el servidor')
    }
  }

  // ── Función: cuando el usuario clickea "editar" en una fila ──
  const handleEditar = (ex) => {
    // Guardamos el id del examen que se va a editar
    setEditando(ex.idexamen)

    // Llenamos el formulario con los valores actuales del examen
    setForm({
      idmateria: String(ex.idmateria), // convertimos a string porque el <select> usa strings
      nota1: ex.nota1,
      nota2: ex.nota2,
      nota3: ex.nota3
    })

    // Mostramos el formulario
    setShowForm(true)
  }

  // Calculamos la nota ponderada en tiempo real mientras el usuario escribe
  const ponderada = pond(form.nota1, form.nota2, form.nota3)

  // Solo mostramos la previsualización si los 3 campos tienen algo escrito
  const showPrev = form.nota1 !== '' && form.nota2 !== '' && form.nota3 !== ''

  // ── RENDER: lo que se muestra en pantalla ──
  return (
    <div className="page">
      {/* Barra de navegación superior */}
      <Navbar usuario={usuario} />

      <div className="page-content">

        {/* ── Encabezado de la página ── */}
        <div className="page-header">
          <div>
            <div className="page-title">Registro de Exámenes</div>
            <div className="page-subtitle">Registre las notas de las materias por postulante</div>
          </div>
          {/* Botón para volver al dashboard */}
          <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>
            <i className="bi bi-arrow-left"></i> Volver
          </button>
        </div>

        {/* ── Card de búsqueda por CI ── */}
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-header card-header-dark">
            <i className="bi bi-search"></i> Buscar Postulante por CI
          </div>
          <div className="card-body">
            {/* Formulario con un solo campo: el CI */}
            <form onSubmit={buscarPostulante}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  placeholder="Ingrese CI exacto del postulante..."
                  value={busci}
                  onChange={e => setBusci(e.target.value)}
                  required
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary" type="submit">
                  <i className="bi bi-search"></i> Buscar
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Spinner mientras carga (solo visible cuando loading === true) */}
        {loading && <div className="spinner-box"><span className="spinner"></span></div>}

        {/* Mensajes de error y éxito (solo se renderizan si tienen contenido) */}
        {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i>{error}</div>}
        {exito && <div className="alert alert-success"><i className="bi bi-check-circle"></i>{exito}</div>}

        {/* Todo lo siguiente solo se muestra si encontramos un postulante */}
        {postulante && (
          <>
            {/* ── Card con datos del postulante encontrado ── */}
            <div className="card" style={{ marginBottom: 18 }}>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  {/* Nombre completo */}
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                    {postulante.nombres} {postulante.apellidos}
                  </div>
                  {/* CI, promedio y estado del postulante */}
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 14 }}>
                    <span>CI: <strong>{postulante.ci}</strong></span>
                    <span>Promedio: <strong>{postulante.promedio_final ?? '—'}</strong></span>
                    <span>
                      <span className={`badge badge-${BADGE[postulante.estadopostulante] || 'neutral'}`}>
                        {postulante.estadopostulante}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Botón "Registrar Notas" solo aparece si tiene menos de 4 materias (máximo permitido) */}
                {examenes.length < 4 && (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setShowForm(true)
                      setEditando(null) // modo crear, no editar
                      setForm({ idmateria: '', nota1: '', nota2: '', nota3: '' })
                    }}
                  >
                    <i className="bi bi-plus"></i> Registrar Notas
                  </button>
                )}
              </div>
            </div>

            {/* ── Formulario de registro/edición de notas (se muestra/oculta) ── */}
            {showForm && (
              <div className="card" style={{ marginBottom: 18 }}>
                <div className="card-header card-header-dark">
                  <i className="bi bi-pencil"></i> {editando ? 'Editar Notas' : 'Registrar Notas'}
                </div>
                <div className="card-body">
                  <form onSubmit={handleSubmit}>

                    {/* El selector de materia solo aparece al CREAR (no al editar, ya está fija) */}
                    {!editando && (
                      <div className="form-group">
                        <label className="form-label">Materia <span className="req">*</span></label>
                        <select
                          className="form-select"
                          value={form.idmateria}
                          onChange={e => setForm(f => ({ ...f, idmateria: e.target.value }))}
                          required
                        >
                          <option value="">Seleccione una materia</option>
                          {/* Solo mostramos materias que el postulante NO tiene registradas todavía */}
                          {materias
                            .filter(m => !examenes.find(e => e.materia === m.nombre))
                            .map(m => (
                              <option key={m.idmateria} value={m.idmateria}>{m.nombre}</option>
                            ))
                          }
                        </select>

                        {/* Si ya se seleccionó una materia, mostramos su nombre confirmado */}
                        {form.idmateria && (() => {
                          // Buscamos el objeto materia que coincide con el id seleccionado
                          const mat = materias.find(m => String(m.idmateria) === String(form.idmateria))
                          return mat ? (
                            <div style={{ marginTop: 6, padding: '6px 10px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, fontSize: 13, color: '#0369a1' }}>
                              <i className="bi bi-check-circle-fill" style={{ marginRight: 6 }}></i>
                              Materia confirmada: <strong>{mat.nombre}</strong>
                            </div>
                          ) : null
                        })()}
                      </div>
                    )}

                    {/* Tres campos de notas en una grilla de 3 columnas */}
                    <div className="form-row-3">
                      {[
                        ['nota1', 'Examen 1', '30%'],
                        ['nota2', 'Examen 2', '30%'],
                        ['nota3', 'Examen 3', '40%']
                      ].map(([k, lbl, p]) => (
                        <div className="form-group" key={k}>
                          <label className="form-label">
                            {lbl} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({p})</span>
                          </label>
                          <input
                            type="number"
                            className="form-input"
                            min="0" max="100" step="0.01"
                            value={form[k]}
                            onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                            required
                          />
                        </div>
                      ))}
                    </div>

                    {/* Vista previa del resultado: nota ponderada y veredicto APROBADO/REPROBADO */}
                    {showPrev && (
                      <div
                        className={`nota-preview ${+ponderada >= 60 ? 'nota-preview-ok' : 'nota-preview-bad'}`}
                        style={{ marginBottom: 16 }}
                      >
                        <strong>Nota ponderada: {ponderada}</strong>
                        {' '} — {+ponderada >= 60 ? 'APROBADO' : 'REPROBADO'}
                      </div>
                    )}

                    {/* Botones del formulario */}
                    <div className="form-actions">
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => { setShowForm(false); setEditando(null) }}
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="btn btn-primary">
                        <i className="bi bi-save"></i> {editando ? 'Actualizar Notas' : 'Guardar Notas'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ── Tabla con las notas ya registradas del postulante ── */}
            <div className="card">
              <div className="card-header card-header-dark">
                <i className="bi bi-list-check"></i> Notas por Materia
                {/* Contador: cuántas materias tiene / cuántas puede tener (máx 4) */}
                <span style={{ marginLeft: 6, background: 'rgba(255,255,255,.15)', borderRadius: 20, padding: '1px 9px', fontSize: 11 }}>
                  {examenes.length}/4
                </span>
              </div>

              {/* Si no hay notas, mostramos mensaje vacío */}
              {examenes.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><i className="bi bi-inbox"></i></div>
                  <div className="empty-state-text">No hay notas registradas aún</div>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Materia</th>
                        <th>Examen 1 (30%)</th>
                        <th>Examen 2 (30%)</th>
                        <th>Examen 3 (40%)</th>
                        <th>Nota Final</th>
                        <th>Estado</th>
                        <th></th>{/* columna para el botón editar */}
                      </tr>
                    </thead>
                    <tbody>
                      {examenes.map(ex => (
                        <tr key={ex.idexamen}>
                          <td className="td-bold">{ex.materia}</td>
                          <td>{ex.nota1}</td>
                          <td>{ex.nota2}</td>
                          <td>{ex.nota3}</td>
                          <td><strong>{ex.promedio}</strong></td>
                          <td>
                            {/* Badge de color según APROBADO/REPROBADO/PENDIENTE */}
                            <span className={`badge badge-${BADGE[ex.estado] || 'neutral'}`}>
                              {ex.estado}
                            </span>
                          </td>
                          <td>
                            {/* Botón para editar las notas de esta fila */}
                            <button className="btn btn-sm btn-outline-info" onClick={() => handleEditar(ex)}>
                              <i className="bi bi-pencil"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Examenes
