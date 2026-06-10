import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import BASE_URL from '../api'

export default function CargaMasiva() {
  const navigate = useNavigate()
  const usuario  = JSON.parse(localStorage.getItem('usuario'))

  const [archivo, setArchivo]     = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [resultado, setResultado] = useState(null)

  if (!usuario || usuario.rol !== 'ADMINISTRADOR') { navigate('/dashboard'); return null }

  const onFileChange = e => {
    setArchivo(e.target.files[0] || null)
    setResultado(null); setError('')
  }

  const importar = async e => {
    e.preventDefault()
    if (!archivo) { setError('Selecciona un archivo CSV primero'); return }
    setLoading(true); setError(''); setResultado(null)

    try {
      const fd = new FormData()
      fd.append('archivo', archivo)
      const token = localStorage.getItem('token')
      const res = await fetch(`${BASE_URL}/api/carga-masiva/postulantes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || 'Error al importar'); return }
      setResultado(data)
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  const descargarPlantilla = () => {
    const cabecera = 'ci,nombres,apellidos,sexo,correo,telefono,ciudad,colegio_procedencia'
    const ejemplo  = '12345678,Juan,Pérez,M,juan@mail.com,70000000,Santa Cruz,Colegio Nacional'
    const blob = new Blob([cabecera + '\n' + ejemplo], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'plantilla_postulantes.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page">
      <Navbar usuario={usuario} />
      <div className="page-content">

        <div className="page-header">
          <div>
            <div className="page-title">Carga masiva de postulantes</div>
            <div className="page-subtitle">Importar postulantes desde un archivo CSV</div>
          </div>
          <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>
            <i className="bi bi-arrow-left"></i> Volver
          </button>
        </div>

        {error && <div className="alert alert-danger"><i className="bi bi-exclamation-circle"></i> {error}</div>}

        {/* Instrucciones */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header card-header-dark">
            <i className="bi bi-info-circle"></i> Instrucciones
          </div>
          <div className="card-body">
            <p style={{ fontSize: 13, color: '#374151', marginBottom: 12 }}>
              El archivo CSV debe tener las siguientes columnas en orden, separadas por coma:
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {['ci *', 'nombres *', 'apellidos *', 'sexo (M/F) *', 'correo *', 'telefono', 'ciudad', 'colegio_procedencia'].map(col => (
                <span key={col} className="badge badge-neutral" style={{ fontFamily: 'monospace', fontSize: 12 }}>{col}</span>
              ))}
            </div>
            <ul style={{ fontSize: 13, color: '#6b7280', paddingLeft: 20, marginBottom: 14 }}>
              <li>La primera fila es el encabezado y se omite automáticamente.</li>
              <li>Los campos marcados con <strong>*</li> son obligatorios.</strong>
              <li>Registros con CI o correo duplicado se omiten sin detener la importación.</li>
              <li>Formato de fecha no requerido. Máximo 5 MB.</li>
            </ul>
            <button className="btn btn-outline" onClick={descargarPlantilla}>
              <i className="bi bi-download"></i> Descargar plantilla CSV
            </button>
          </div>
        </div>

        {/* Formulario de carga */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header card-header-dark">
            <i className="bi bi-upload"></i> Seleccionar archivo
          </div>
          <div className="card-body">
            <form onSubmit={importar} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ margin: 0, flex: '1 1 300px' }}>
                <label className="form-label">Archivo CSV</label>
                <input
                  type="file" accept=".csv,.txt" onChange={onFileChange}
                  className="form-input" style={{ cursor: 'pointer' }}
                />
                {archivo && (
                  <div className="form-hint">
                    <i className="bi bi-file-earmark-spreadsheet"></i> {archivo.name} ({(archivo.size / 1024).toFixed(0)} KB)
                  </div>
                )}
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading || !archivo}>
                {loading
                  ? <><span className="spinner" style={{ width: 15, height: 15, borderWidth: 2, marginBottom: 0 }}></span> Importando...</>
                  : <><i className="bi bi-cloud-upload"></i> Importar</>}
              </button>
            </form>
          </div>
        </div>

        {/* Resultados */}
        {resultado && (
          <div className="card">
            <div className="card-header card-header-dark">
              <i className="bi bi-clipboard-check"></i> Resultado de la importación
            </div>
            <div className="card-body">
              <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16 }}>
                <div className="stat-card stat-card-success">
                  <div className="stat-icon"><i className="bi bi-check-circle"></i></div>
                  <div className="stat-value">{resultado.insertados}</div>
                  <div className="stat-label">Insertados</div>
                </div>
                <div className="stat-card stat-card-warning">
                  <div className="stat-icon"><i className="bi bi-skip-forward"></i></div>
                  <div className="stat-value">{resultado.omitidos?.length || 0}</div>
                  <div className="stat-label">Omitidos (duplicados)</div>
                </div>
                <div className="stat-card stat-card-danger">
                  <div className="stat-icon"><i className="bi bi-exclamation-triangle"></i></div>
                  <div className="stat-value">{resultado.errores?.length || 0}</div>
                  <div className="stat-label">Con errores</div>
                </div>
              </div>

              {resultado.omitidos?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 8 }}>
                    <i className="bi bi-skip-forward" style={{ marginRight: 6, color: '#d97706' }}></i>
                    Registros omitidos
                  </div>
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', maxHeight: 180, overflowY: 'auto' }}>
                    {resultado.omitidos.map((m, i) => (
                      <div key={i} style={{ fontSize: 13, color: '#92400e', marginBottom: 3 }}>· {m}</div>
                    ))}
                  </div>
                </div>
              )}

              {resultado.errores?.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 8 }}>
                    <i className="bi bi-exclamation-triangle" style={{ marginRight: 6, color: '#dc2626' }}></i>
                    Filas con error
                  </div>
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', maxHeight: 180, overflowY: 'auto' }}>
                    {resultado.errores.map((m, i) => (
                      <div key={i} style={{ fontSize: 13, color: '#991b1b', marginBottom: 3 }}>· {m}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
