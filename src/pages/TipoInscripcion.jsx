import { useNavigate } from 'react-router-dom'

export default function TipoInscripcion() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      <nav style={{ background: '#0d2451', padding: '0 24px', height: 58, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: 20, padding: 0, display: 'flex', alignItems: 'center' }}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>CUP · FICCT — Inscripción</span>
      </nav>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 10px' }}>¿Cómo deseas inscribirte?</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>Selecciona el tipo de inscripción que corresponde a tu caso</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Estudiante */}
          <button onClick={() => navigate('/registro')}
            style={{ background: '#fff', border: '2px solid #e5e7eb', borderRadius: 14, padding: '32px 20px', cursor: 'pointer', textAlign: 'center', transition: 'border-color .15s, box-shadow .15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#0d2451'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(13,36,81,.12)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#e8edf7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <i className="bi bi-mortarboard-fill" style={{ fontSize: 26, color: '#0d2451' }}></i>
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#111827', marginBottom: 8 }}>Estudiante</div>
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
              Quiero inscribirme al Curso Pre-Universitario (CUP)
            </div>
            <div style={{ marginTop: 16, background: '#0d2451', color: '#fff', borderRadius: 8, padding: '8px 0', fontSize: 13, fontWeight: 600 }}>
              Inscribirme
            </div>
          </button>

          {/* Docente */}
          <button onClick={() => navigate('/postulacion-docente')}
            style={{ background: '#fff', border: '2px solid #e5e7eb', borderRadius: 14, padding: '32px 20px', cursor: 'pointer', textAlign: 'center', transition: 'border-color .15s, box-shadow .15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#c62828'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(198,40,40,.12)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fce8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <i className="bi bi-person-badge-fill" style={{ fontSize: 26, color: '#c62828' }}></i>
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#111827', marginBottom: 8 }}>Docente</div>
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
              Quiero postularme como docente del CUP-FICCT
            </div>
            <div style={{ marginTop: 16, background: '#c62828', color: '#fff', borderRadius: 8, padding: '8px 0', fontSize: 13, fontWeight: 600 }}>
              Postularme
            </div>
          </button>

        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 24 }}>
          ¿Ya tienes cuenta? <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: '#0d2451', cursor: 'pointer', fontWeight: 600, fontSize: 12, padding: 0 }}>Iniciar sesión</button>
        </p>
      </div>
    </div>
  )
}
