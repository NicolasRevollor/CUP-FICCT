import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const CARRERAS = [
  {
    id: 1,
    nombre: 'Ingeniería Informática',
    icono: 'bi-laptop',
    color: '#1565c0',
    descripcion: 'Forma profesionales en desarrollo de software, bases de datos, inteligencia artificial y sistemas de información empresarial.',
    cupo: 120,
    materias: ['Computación', 'Matemática', 'Física', 'Inglés'],
    perfil: 'Analiza, diseña e implementa soluciones tecnológicas para empresas e instituciones. Trabaja en desarrollo web, móvil, IA y ciberseguridad.',
  },
  {
    id: 2,
    nombre: 'Ingeniería de Sistemas',
    icono: 'bi-diagram-3',
    color: '#6a1b9a',
    descripcion: 'Especialización en análisis y diseño de sistemas complejos, gestión de proyectos tecnológicos y arquitectura de software.',
    cupo: 100,
    materias: ['Computación', 'Matemática', 'Física', 'Inglés'],
    perfil: 'Gestiona proyectos tecnológicos, diseña arquitecturas de software y lidera equipos de desarrollo en organizaciones.',
  },
  {
    id: 3,
    nombre: 'Ingeniería en Redes y Telecomunicaciones',
    icono: 'bi-wifi',
    color: '#00695c',
    descripcion: 'Infraestructura de redes, telecomunicaciones, seguridad informática, protocolos de comunicación y redes inalámbricas.',
    cupo: 80,
    materias: ['Computación', 'Matemática', 'Física', 'Inglés'],
    perfil: 'Diseña e implementa infraestructuras de red, sistemas de comunicación y soluciones de ciberseguridad para empresas.',
  },
  {
    id: 4,
    nombre: 'Ingeniería en Robótica',
    icono: 'bi-cpu',
    color: '#b71c1c',
    descripcion: 'Automatización industrial, electrónica, programación de robots, sistemas embebidos e inteligencia artificial aplicada.',
    cupo: 60,
    materias: ['Computación', 'Matemática', 'Física', 'Inglés'],
    perfil: 'Diseña y programa sistemas robóticos y de automatización para la industria, manufactura y servicios.',
  },
]

const MATERIAS = [
  {
    nombre: 'COMPUTACIÓN',
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    icono: 'bi-code-slash',
    desc: 'Algoritmos, programación, estructuras de datos y lógica computacional',
  },
  {
    nombre: 'FÍSICA',
    gradient: 'linear-gradient(135deg, #0d1b2a 0%, #1b2838 50%, #2c3e50 100%)',
    icono: 'bi-lightning-charge',
    desc: 'Mecánica, termodinámica, electricidad y fundamentos físicos de la ingeniería',
  },
  {
    nombre: 'MATEMÁTICA',
    gradient: 'linear-gradient(135deg, #1a0533 0%, #2d1b69 50%, #11998e 100%)',
    icono: 'bi-infinity',
    desc: 'Álgebra, cálculo diferencial e integral, estadística y matemática aplicada',
  },
  {
    nombre: 'INGLÉS',
    gradient: 'linear-gradient(135deg, #003366 0%, #005b99 50%, #0099cc 100%)',
    icono: 'bi-translate',
    desc: 'Inglés técnico, lectura de documentación y comunicación profesional',
  },
]

const PASOS = [
  { num: '01', titulo: 'Regístrate', desc: 'Completa el formulario con tus datos personales y académicos.' },
  { num: '02', titulo: 'Paga tu inscripción', desc: 'Realiza el pago seguro con tarjeta a través de Stripe.' },
  { num: '03', titulo: 'Rinde tus exámenes', desc: '4 materias, 3 exámenes cada una. Promedio ponderado >= 60 para aprobar.' },
  { num: '04', titulo: 'Obtén tu resultado', desc: 'El sistema calcula tu estado automáticamente y asigna grupo.' },
]

export default function Landing() {
  const navigate = useNavigate()
  const [carreraAbierta, setCarreraAbierta] = useState(null)

  const toggle = (id) => setCarreraAbierta(prev => prev === id ? null : id)

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif', overflowX: 'hidden' }}>

      {/* ── NAVBAR ── */}
      <nav style={{ background: '#0d2451', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 14 }}>CUP</div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>CUP · FICCT</div>
            <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 10, letterSpacing: '.06em' }}>UAGRM</div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <a href="#carreras" style={{ color: 'rgba(255,255,255,.75)', textDecoration: 'none', fontSize: 13 }}>Carreras</a>
          <a href="#materias" style={{ color: 'rgba(255,255,255,.75)', textDecoration: 'none', fontSize: 13 }}>Materias</a>
          <a href="#proceso" style={{ color: 'rgba(255,255,255,.75)', textDecoration: 'none', fontSize: 13 }}>Inscripción</a>
          <button onClick={() => navigate('/login')} style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', padding: '7px 18px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
            Acceder
          </button>
          <button onClick={() => navigate('/registro')} style={{ background: '#c62828', border: 'none', color: '#fff', padding: '7px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Inscríbete
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{ background: 'linear-gradient(135deg, #0d2451 0%, #1a3a7a 60%, #0d2451 100%)', padding: '80px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,.03)' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,.03)' }} />
        <div style={{ position: 'relative', maxWidth: 760, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: '#c62828', color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '.12em', padding: '4px 14px', borderRadius: 20, marginBottom: 20 }}>
            [CUP 1-2026] CURSO PREUNIVERSITARIO
          </div>
          <h1 style={{ color: '#fff', fontSize: 44, fontWeight: 800, lineHeight: 1.15, margin: '0 0 20px', letterSpacing: '-.5px' }}>
            Sistema de Admisión<br />Universitaria FICCT
          </h1>
          <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 16, lineHeight: 1.7, marginBottom: 36, maxWidth: 560, margin: '0 auto 36px' }}>
            El Curso Preuniversitario (CUP) es la modalidad de ingreso a la Facultad de Ingeniería en Ciencias de la Computación y Telecomunicaciones de la UAGRM. Mínimo de 192 horas dirigido a bachilleres.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/registro')} style={{ background: '#c62828', border: 'none', color: '#fff', padding: '13px 32px', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="bi bi-person-plus"></i> Inscribirse ahora
            </button>
            <a href="#carreras" style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', padding: '13px 32px', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="bi bi-mortarboard"></i> Ver carreras
            </a>
          </div>
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{ background: '#f8f9fa', padding: '36px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
          {[
            { valor: '4', label: 'Carreras disponibles', icono: 'bi-mortarboard' },
            { valor: '4', label: 'Materias a rendir', icono: 'bi-journal-text' },
            { valor: '70', label: 'Estudiantes por grupo', icono: 'bi-people' },
            { valor: '192h', label: 'Horas mínimas del curso', icono: 'bi-clock' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 16px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
              <i className={`bi ${s.icono}`} style={{ fontSize: 22, color: '#0d2451', marginBottom: 8, display: 'block' }}></i>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#0d2451', lineHeight: 1 }}>{s.valor}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MATERIAS ── */}
      <div id="materias" style={{ background: '#fff', padding: '60px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: '#c62828', marginBottom: 8 }}>
              [CUP 1-2026] CURSO PREUNIVERSITARIO
            </div>
            <h2 style={{ fontSize: 30, fontWeight: 800, color: '#0d2451', margin: 0 }}>Materias del Curso</h2>
            <p style={{ color: '#6b7280', marginTop: 8, fontSize: 14 }}>4 materias · 3 exámenes por materia · Promedio ponderado ≥ 60 para aprobar</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18 }}>
            {MATERIAS.map(m => (
              <div key={m.nombre} style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,.15)', cursor: 'default' }}>
                <div style={{ background: m.gradient, padding: '32px 16px', textAlign: 'center', position: 'relative', minHeight: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`bi ${m.icono}`} style={{ fontSize: 36, color: 'rgba(255,255,255,.6)', marginBottom: 12 }}></i>
                  <div style={{ background: 'rgba(0,0,0,.55)', padding: '6px 16px', borderRadius: 4 }}>
                    <span style={{ color: '#fff', fontWeight: 800, fontSize: 16, letterSpacing: '.05em' }}>{m.nombre}</span>
                  </div>
                </div>
                <div style={{ padding: '14px 16px', background: '#fff', borderTop: '2px solid #e5e7eb' }}>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.5 }}>{m.desc}</p>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>Actualizado: 06 Ene, 2026</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CARRERAS ── */}
      <div id="carreras" style={{ background: '#f3f4f6', padding: '60px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontSize: 30, fontWeight: 800, color: '#0d2451', margin: 0 }}>Carreras FICCT</h2>
            <p style={{ color: '#6b7280', marginTop: 8, fontSize: 14 }}>Selecciona tu carrera y conoce más detalles</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
            {CARRERAS.map(c => (
              <div key={c.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)', cursor: 'pointer' }} onClick={() => toggle(c.id)}>
                <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: `4px solid ${c.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: c.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className={`bi ${c.icono}`} style={{ fontSize: 20, color: c.color }}></i>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#111827', fontSize: 15 }}>{c.nombre}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Cupo máximo: {c.cupo} estudiantes</div>
                    </div>
                  </div>
                  <i className={`bi ${carreraAbierta === c.id ? 'bi-chevron-up' : 'bi-chevron-down'}`} style={{ color: '#9ca3af', fontSize: 16 }}></i>
                </div>
                {carreraAbierta === c.id && (
                  <div style={{ padding: '0 24px 20px', borderTop: '1px solid #f3f4f6' }}>
                    <p style={{ color: '#374151', fontSize: 14, lineHeight: 1.6, marginBottom: 14, marginTop: 14 }}>{c.descripcion}</p>
                    <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '14px 16px', marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Perfil profesional:</div>
                      <p style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.5 }}>{c.perfil}</p>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Materias del CUP:</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {c.materias.map(m => (
                          <span key={m} style={{ background: c.color + '15', color: c.color, border: `1px solid ${c.color}40`, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{m}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PROCESO ── */}
      <div id="proceso" style={{ background: '#fff', padding: '60px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <h2 style={{ fontSize: 30, fontWeight: 800, color: '#0d2451', margin: 0 }}>¿Cómo inscribirse?</h2>
            <p style={{ color: '#6b7280', marginTop: 8, fontSize: 14 }}>Proceso simple en 4 pasos</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24 }}>
            {PASOS.map((p, i) => (
              <div key={p.num} style={{ textAlign: 'center', position: 'relative' }}>
                {i < PASOS.length - 1 && (
                  <div style={{ position: 'absolute', top: 24, left: '60%', right: '-40%', height: 2, background: '#e5e7eb', zIndex: 0 }} />
                )}
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#0d2451', color: '#fff', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', position: 'relative', zIndex: 1 }}>{p.num}</div>
                <div style={{ fontWeight: 700, color: '#111827', marginBottom: 6, fontSize: 14 }}>{p.titulo}</div>
                <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, margin: 0 }}>{p.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <button onClick={() => navigate('/registro')} style={{ background: '#c62828', border: 'none', color: '#fff', padding: '14px 40px', borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <i className="bi bi-person-plus"></i> Comenzar mi inscripción
            </button>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#0d2451', padding: '48px 32px 24px', color: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 36 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>CUP</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>CUP</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', letterSpacing: '.04em' }}>CURSO PRE-UNIVERSITARIO</div>
                </div>
              </div>
              <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, lineHeight: 1.65, maxWidth: 280 }}>
                El <strong>Curso Pre-universitario (CUP)</strong> es una modalidad de ingreso presencial o virtual (mínimo de 192 horas) dirigido a bachilleres que optan por estudiar la carrera de su elección.
              </p>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '.06em', marginBottom: 14 }}>CARRERAS</div>
              {CARRERAS.map(c => (
                <div key={c.id} style={{ color: '#c62828', fontSize: 13, marginBottom: 8, cursor: 'pointer' }} onClick={() => { setCarreraAbierta(c.id); document.getElementById('carreras').scrollIntoView({ behavior: 'smooth' }) }}>
                  {c.nombre}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '.06em', marginBottom: 14 }}>SÍGUENOS</div>
              <div style={{ color: '#c62828', fontSize: 13, marginBottom: 8 }}>Sitio web FICCT</div>
              <div style={{ color: '#c62828', fontSize: 13, marginBottom: 8 }}>FB facultativo</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '.06em', marginBottom: 14 }}>CONTÁCTANOS</div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                <i className="bi bi-geo-alt" style={{ color: '#c62828', marginTop: 2 }}></i>
                <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 13 }}>Ciudad universitaria. Módulo 236</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <i className="bi bi-telephone" style={{ color: '#c62828' }}></i>
                <span style={{ color: '#c62828', fontSize: 13 }}>(+591) – 70988656</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="bi bi-envelope" style={{ color: '#c62828' }}></i>
                <span style={{ color: '#c62828', fontSize: 13 }}>cup.ficct@uagrm.edu.bo</span>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 13 }}>© 2026 CUP · FICCT. Todos los derechos reservados.</span>
            <i className="bi bi-facebook" style={{ color: 'rgba(255,255,255,.5)', fontSize: 18 }}></i>
          </div>
        </div>
      </footer>

    </div>
  )
}
