import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ── Traducciones ───────────────────────────────────────────────
const T = {
  es: {
    navLinks: [
      { label: 'Carreras',    href: '#carreras' },
      { label: 'Materias',    href: '#materias' },
      { label: 'Inscripción', href: '#proceso'  },
    ],
    navAcceder:    'Acceder',
    navInscribirse:'Inscríbete',
    heroBadge:    '[CUP 1-2026] CURSO PREUNIVERSITARIO',
    heroTitle:    ['Sistema de Admisión', 'Universitaria FICCT'],
    heroDesc:     'El Curso Preuniversitario (CUP) es la modalidad de ingreso a la Facultad de Ingeniería en Ciencias de la Computación y Telecomunicaciones de la UAGRM. Mínimo de 192 horas dirigido a bachilleres.',
    heroCta:      'Inscribirse ahora',
    heroVerCarreras: 'Ver carreras',
    statsLabels:  ['Carreras disponibles', 'Materias a rendir', 'Estudiantes por grupo', 'Horas mínimas del curso'],
    materiasTitle: 'Materias del Curso',
    materiasSub:  '4 materias · 3 exámenes por materia · Promedio ponderado ≥ 60 para aprobar',
    materiasActualizado: 'Actualizado: 06 Ene, 2026',
    carrerasTitle: 'Carreras FICCT',
    carrerasSub:  'Selecciona tu carrera y conoce más detalles',
    cupoLabel:    'Cupo máximo:',
    cupoSuffix:   'estudiantes',
    perfilLabel:  'Perfil profesional:',
    materiasLabel:'Materias del CUP:',
    procesoTitle: '¿Cómo inscribirse?',
    procesoSub:   'Proceso simple en 4 pasos',
    procesoCta:   'Comenzar mi inscripción',
    footerDesc:   'El Curso Pre-universitario (CUP) es una modalidad de ingreso presencial o virtual (mínimo de 192 horas) dirigido a bachilleres que optan por estudiar la carrera de su elección.',
    footerCarreras: 'CARRERAS',
    footerSiguenos: 'SÍGUENOS',
    footerContacto: 'CONTÁCTANOS',
    footerSitio:  'Sitio web FICCT',
    footerFb:     'FB facultativo',
    footerDir:    'Ciudad universitaria. Módulo 236',
    footerCopy:   '© 2026 CUP · FICCT. Todos los derechos reservados.',
  },
  en: {
    navLinks: [
      { label: 'Degrees',    href: '#carreras' },
      { label: 'Subjects',   href: '#materias' },
      { label: 'Enrollment', href: '#proceso'  },
    ],
    navAcceder:    'Login',
    navInscribirse:'Sign Up',
    heroBadge:    '[CUP 1-2026] PRE-UNIVERSITY COURSE',
    heroTitle:    ['University Admission', 'System FICCT'],
    heroDesc:     'The Pre-University Course (CUP) is the admission modality for the Faculty of Computer Science and Telecommunications Engineering at UAGRM. Minimum 192 hours for high school graduates.',
    heroCta:      'Sign up now',
    heroVerCarreras: 'View degrees',
    statsLabels:  ['Available degrees', 'Subjects to take', 'Students per group', 'Min. course hours'],
    materiasTitle: 'Course Subjects',
    materiasSub:  '4 subjects · 3 exams per subject · Weighted average ≥ 60 to pass',
    materiasActualizado: 'Updated: Jan 06, 2026',
    carrerasTitle: 'FICCT Degrees',
    carrerasSub:  'Select your degree and learn more',
    cupoLabel:    'Max capacity:',
    cupoSuffix:   'students',
    perfilLabel:  'Professional profile:',
    materiasLabel:'CUP subjects:',
    procesoTitle: 'How to enroll?',
    procesoSub:   'Simple 4-step process',
    procesoCta:   'Start my enrollment',
    footerDesc:   'The Pre-University Course (CUP) is a face-to-face or virtual admission modality (minimum 192 hours) for high school graduates who want to study their chosen degree.',
    footerCarreras: 'DEGREES',
    footerSiguenos: 'FOLLOW US',
    footerContacto: 'CONTACT US',
    footerSitio:  'FICCT website',
    footerFb:     'Faculty Facebook',
    footerDir:    'University campus. Module 236',
    footerCopy:   '© 2026 CUP · FICCT. All rights reserved.',
  },
}

const CARRERAS = {
  es: [
    { id: 1, nombre: 'Ingeniería Informática',                  icono: 'bi-laptop',    color: '#1565c0', cupo: 120,
      descripcion: 'Forma profesionales en desarrollo de software, bases de datos, inteligencia artificial y sistemas de información empresarial.',
      perfil: 'Analiza, diseña e implementa soluciones tecnológicas para empresas e instituciones. Trabaja en desarrollo web, móvil, IA y ciberseguridad.',
      materias: ['Computación', 'Matemática', 'Física', 'Inglés'] },
    { id: 2, nombre: 'Ingeniería de Sistemas',                   icono: 'bi-diagram-3', color: '#6a1b9a', cupo: 100,
      descripcion: 'Especialización en análisis y diseño de sistemas complejos, gestión de proyectos tecnológicos y arquitectura de software.',
      perfil: 'Gestiona proyectos tecnológicos, diseña arquitecturas de software y lidera equipos de desarrollo en organizaciones.',
      materias: ['Computación', 'Matemática', 'Física', 'Inglés'] },
    { id: 3, nombre: 'Ingeniería en Redes y Telecomunicaciones', icono: 'bi-wifi',      color: '#00695c', cupo: 80,
      descripcion: 'Infraestructura de redes, telecomunicaciones, seguridad informática, protocolos de comunicación y redes inalámbricas.',
      perfil: 'Diseña e implementa infraestructuras de red, sistemas de comunicación y soluciones de ciberseguridad para empresas.',
      materias: ['Computación', 'Matemática', 'Física', 'Inglés'] },
    { id: 4, nombre: 'Ingeniería en Robótica',                   icono: 'bi-cpu',      color: '#b71c1c', cupo: 60,
      descripcion: 'Automatización industrial, electrónica, programación de robots, sistemas embebidos e inteligencia artificial aplicada.',
      perfil: 'Diseña y programa sistemas robóticos y de automatización para la industria, manufactura y servicios.',
      materias: ['Computación', 'Matemática', 'Física', 'Inglés'] },
  ],
  en: [
    { id: 1, nombre: 'Computer Engineering',                     icono: 'bi-laptop',    color: '#1565c0', cupo: 120,
      descripcion: 'Trains professionals in software development, databases, artificial intelligence and enterprise information systems.',
      perfil: 'Analyzes, designs and implements technological solutions for companies and institutions. Works in web, mobile, AI and cybersecurity.',
      materias: ['Computing', 'Mathematics', 'Physics', 'English'] },
    { id: 2, nombre: 'Systems Engineering',                       icono: 'bi-diagram-3', color: '#6a1b9a', cupo: 100,
      descripcion: 'Specialization in analysis and design of complex systems, technology project management and software architecture.',
      perfil: 'Manages technology projects, designs software architectures and leads development teams in organizations.',
      materias: ['Computing', 'Mathematics', 'Physics', 'English'] },
    { id: 3, nombre: 'Network & Telecommunications Engineering',  icono: 'bi-wifi',      color: '#00695c', cupo: 80,
      descripcion: 'Network infrastructure, telecommunications, information security, communication protocols and wireless networks.',
      perfil: 'Designs and implements network infrastructure, communication systems and cybersecurity solutions for companies.',
      materias: ['Computing', 'Mathematics', 'Physics', 'English'] },
    { id: 4, nombre: 'Robotics Engineering',                     icono: 'bi-cpu',      color: '#b71c1c', cupo: 60,
      descripcion: 'Industrial automation, electronics, robot programming, embedded systems and applied artificial intelligence.',
      perfil: 'Designs and programs robotic and automation systems for industry, manufacturing and services.',
      materias: ['Computing', 'Mathematics', 'Physics', 'English'] },
  ],
}

const MATERIAS = {
  es: [
    { nombre: 'COMPUTACIÓN', gradient: 'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)', icono: 'bi-code-slash',       desc: 'Algoritmos, programación, estructuras de datos y lógica computacional' },
    { nombre: 'FÍSICA',      gradient: 'linear-gradient(135deg,#0d1b2a,#1b2838,#2c3e50)', icono: 'bi-lightning-charge', desc: 'Mecánica, termodinámica, electricidad y fundamentos físicos de la ingeniería' },
    { nombre: 'MATEMÁTICA',  gradient: 'linear-gradient(135deg,#1a0533,#2d1b69,#11998e)', icono: 'bi-infinity',         desc: 'Álgebra, cálculo diferencial e integral, estadística y matemática aplicada' },
    { nombre: 'INGLÉS',      gradient: 'linear-gradient(135deg,#003366,#005b99,#0099cc)', icono: 'bi-translate',        desc: 'Inglés técnico, lectura de documentación y comunicación profesional' },
  ],
  en: [
    { nombre: 'COMPUTING',   gradient: 'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)', icono: 'bi-code-slash',       desc: 'Algorithms, programming, data structures and computational logic' },
    { nombre: 'PHYSICS',     gradient: 'linear-gradient(135deg,#0d1b2a,#1b2838,#2c3e50)', icono: 'bi-lightning-charge', desc: 'Mechanics, thermodynamics, electricity and physical fundamentals of engineering' },
    { nombre: 'MATHEMATICS', gradient: 'linear-gradient(135deg,#1a0533,#2d1b69,#11998e)', icono: 'bi-infinity',         desc: 'Algebra, differential and integral calculus, statistics and applied mathematics' },
    { nombre: 'ENGLISH',     gradient: 'linear-gradient(135deg,#003366,#005b99,#0099cc)', icono: 'bi-translate',        desc: 'Technical English, documentation reading and professional communication' },
  ],
}

const PASOS = {
  es: [
    { num: '01', titulo: 'Regístrate',          desc: 'Completa el formulario con tus datos personales y académicos.' },
    { num: '02', titulo: 'Paga tu inscripción', desc: 'Realiza el pago seguro con tarjeta a través de Stripe.' },
    { num: '03', titulo: 'Rinde tus exámenes',  desc: '4 materias, 3 exámenes cada una. Promedio ponderado ≥ 60 para aprobar.' },
    { num: '04', titulo: 'Obtén tu resultado',  desc: 'El sistema calcula tu estado automáticamente y asigna grupo.' },
  ],
  en: [
    { num: '01', titulo: 'Register',        desc: 'Fill out the form with your personal and academic details.' },
    { num: '02', titulo: 'Pay enrollment',  desc: 'Make a secure card payment through Stripe.' },
    { num: '03', titulo: 'Take your exams', desc: '4 subjects, 3 exams each. Weighted average ≥ 60 to pass.' },
    { num: '04', titulo: 'Get your result', desc: 'The system automatically calculates your status and assigns a group.' },
  ],
}

export default function Landing() {
  const navigate = useNavigate()
  const [carreraAbierta, setCarreraAbierta] = useState(null)
  const [lang, setLang] = useState('es')
  const [dark, setDark] = useState(false)

  const t  = T[lang]
  const th = dark ? {
    sectionBg:    '#111827',
    sectionAltBg: '#1f2937',
    cardBg:       '#1f2937',
    text:         '#f9fafb',
    textMuted:    '#9ca3af',
    textSub:      '#d1d5db',
    border:       '#374151',
    statBg:       '#1f2937',
    inputBg:      '#374151',
  } : {
    sectionBg:    '#fff',
    sectionAltBg: '#f3f4f6',
    cardBg:       '#fff',
    text:         '#111827',
    textMuted:    '#6b7280',
    textSub:      '#374151',
    border:       '#e5e7eb',
    statBg:       '#fff',
    inputBg:      '#f8f9fa',
  }

  const toggle = (id) => setCarreraAbierta(prev => prev === id ? null : id)

  const STATS = [
    { valor: '4',    label: t.statsLabels[0], icono: 'bi-mortarboard' },
    { valor: '4',    label: t.statsLabels[1], icono: 'bi-journal-text' },
    { valor: '70',   label: t.statsLabels[2], icono: 'bi-people' },
    { valor: '192h', label: t.statsLabels[3], icono: 'bi-clock' },
  ]

  return (
    <div style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif', overflowX: 'clip', background: th.sectionBg, transition: 'background .2s' }}>

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
          {t.navLinks.map(l => (
            <a key={l.href} href={l.href} style={{ color: 'rgba(255,255,255,.75)', textDecoration: 'none', fontSize: 13 }}>{l.label}</a>
          ))}

          {/* Toggle idioma */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,.1)', borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(255,255,255,.15)' }}>
            {['es','en'].map(l => (
              <button key={l} onClick={() => setLang(l)}
                style={{ padding: '5px 10px', background: lang === l ? 'rgba(255,255,255,.25)' : 'transparent', border: 'none', color: '#fff', fontSize: 12, fontWeight: lang === l ? 700 : 400, cursor: 'pointer', letterSpacing: '.05em' }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Toggle tema */}
          <button onClick={() => setDark(d => !d)}
            style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', color: '#fff', width: 34, height: 34, borderRadius: 6, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className={`bi ${dark ? 'bi-sun' : 'bi-moon-stars'}`}></i>
          </button>

          <button onClick={() => navigate('/login')} style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', padding: '7px 18px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
            {t.navAcceder}
          </button>
          <button onClick={() => navigate('/registro')} style={{ background: '#c62828', border: 'none', color: '#fff', padding: '7px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {t.navInscribirse}
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{ background: 'linear-gradient(135deg,#0d2451 0%,#1a3a7a 60%,#0d2451 100%)', padding: '80px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,.03)' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,.03)' }} />
        <div style={{ position: 'relative', maxWidth: 760, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: '#c62828', color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '.12em', padding: '4px 14px', borderRadius: 20, marginBottom: 20 }}>
            {t.heroBadge}
          </div>
          <h1 style={{ color: '#fff', fontSize: 44, fontWeight: 800, lineHeight: 1.15, margin: '0 0 20px', letterSpacing: '-.5px' }}>
            {t.heroTitle[0]}<br />{t.heroTitle[1]}
          </h1>
          <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 16, lineHeight: 1.7, marginBottom: 36, maxWidth: 560, margin: '0 auto 36px' }}>
            {t.heroDesc}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/registro')} style={{ background: '#c62828', border: 'none', color: '#fff', padding: '13px 32px', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="bi bi-person-plus"></i> {t.heroCta}
            </button>
            <a href="#carreras" style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', padding: '13px 32px', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="bi bi-mortarboard"></i> {t.heroVerCarreras}
            </a>
          </div>
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{ background: th.sectionAltBg, padding: '36px 32px', transition: 'background .2s' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
          {STATS.map(s => (
            <div key={s.label} style={{ background: th.statBg, border: `1px solid ${th.border}`, borderRadius: 10, padding: '20px 16px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.06)', transition: 'background .2s' }}>
              <i className={`bi ${s.icono}`} style={{ fontSize: 22, color: '#0d2451', marginBottom: 8, display: 'block' }}></i>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#0d2451', lineHeight: 1 }}>{s.valor}</div>
              <div style={{ fontSize: 12, color: th.textMuted, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MATERIAS ── */}
      <div id="materias" style={{ background: th.sectionBg, padding: '60px 32px', transition: 'background .2s' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: '#c62828', marginBottom: 8 }}>{t.heroBadge}</div>
            <h2 style={{ fontSize: 30, fontWeight: 800, color: th.text, margin: 0, transition: 'color .2s' }}>{t.materiasTitle}</h2>
            <p style={{ color: th.textMuted, marginTop: 8, fontSize: 14 }}>{t.materiasSub}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18 }}>
            {MATERIAS[lang].map(m => (
              <div key={m.nombre} style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,.15)' }}>
                <div style={{ background: m.gradient, padding: '32px 16px', textAlign: 'center', minHeight: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`bi ${m.icono}`} style={{ fontSize: 36, color: 'rgba(255,255,255,.6)', marginBottom: 12 }}></i>
                  <div style={{ background: 'rgba(0,0,0,.55)', padding: '6px 16px', borderRadius: 4 }}>
                    <span style={{ color: '#fff', fontWeight: 800, fontSize: 16, letterSpacing: '.05em' }}>{m.nombre}</span>
                  </div>
                </div>
                <div style={{ padding: '14px 16px', background: th.cardBg, borderTop: `2px solid ${th.border}`, transition: 'background .2s' }}>
                  <p style={{ fontSize: 12, color: th.textMuted, margin: 0, lineHeight: 1.5 }}>{m.desc}</p>
                  <div style={{ fontSize: 11, color: th.textMuted, marginTop: 8, opacity: .7 }}>{t.materiasActualizado}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CARRERAS ── */}
      <div id="carreras" style={{ background: th.sectionAltBg, padding: '60px 32px', transition: 'background .2s' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontSize: 30, fontWeight: 800, color: th.text, margin: 0, transition: 'color .2s' }}>{t.carrerasTitle}</h2>
            <p style={{ color: th.textMuted, marginTop: 8, fontSize: 14 }}>{t.carrerasSub}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16, alignItems: 'start' }}>
            {CARRERAS[lang].map(c => (
              <div key={c.id} style={{ background: th.cardBg, borderRadius: 12, border: `1px solid ${th.border}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)', cursor: 'pointer', transition: 'background .2s' }} onClick={() => toggle(c.id)}>
                <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: `4px solid ${c.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: c.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className={`bi ${c.icono}`} style={{ fontSize: 20, color: c.color }}></i>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: th.text, fontSize: 15 }}>{c.nombre}</div>
                      <div style={{ fontSize: 12, color: th.textMuted, marginTop: 2 }}>{t.cupoLabel} {c.cupo} {t.cupoSuffix}</div>
                    </div>
                  </div>
                  <i className={`bi ${carreraAbierta === c.id ? 'bi-chevron-up' : 'bi-chevron-down'}`} style={{ color: th.textMuted, fontSize: 16 }}></i>
                </div>
                {carreraAbierta === c.id && (
                  <div style={{ padding: '0 24px 20px', borderTop: `1px solid ${th.border}` }}>
                    <p style={{ color: th.textSub, fontSize: 14, lineHeight: 1.6, marginBottom: 14, marginTop: 14 }}>{c.descripcion}</p>
                    <div style={{ background: th.inputBg, borderRadius: 8, padding: '14px 16px', marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: th.text, marginBottom: 6 }}>{t.perfilLabel}</div>
                      <p style={{ fontSize: 13, color: th.textMuted, margin: 0, lineHeight: 1.5 }}>{c.perfil}</p>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: th.text, marginBottom: 6 }}>{t.materiasLabel}</div>
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
      <div id="proceso" style={{ background: th.sectionBg, padding: '60px 32px', transition: 'background .2s' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <h2 style={{ fontSize: 30, fontWeight: 800, color: th.text, margin: 0, transition: 'color .2s' }}>{t.procesoTitle}</h2>
            <p style={{ color: th.textMuted, marginTop: 8, fontSize: 14 }}>{t.procesoSub}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24 }}>
            {PASOS[lang].map((p, i) => (
              <div key={p.num} style={{ textAlign: 'center', position: 'relative' }}>
                {i < PASOS[lang].length - 1 && (
                  <div style={{ position: 'absolute', top: 24, left: '60%', right: '-40%', height: 2, background: th.border, zIndex: 0 }} />
                )}
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#0d2451', color: '#fff', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', position: 'relative', zIndex: 1 }}>{p.num}</div>
                <div style={{ fontWeight: 700, color: th.text, marginBottom: 6, fontSize: 14, transition: 'color .2s' }}>{p.titulo}</div>
                <p style={{ fontSize: 13, color: th.textMuted, lineHeight: 1.5, margin: 0 }}>{p.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <button onClick={() => navigate('/registro')} style={{ background: '#c62828', border: 'none', color: '#fff', padding: '14px 40px', borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <i className="bi bi-person-plus"></i> {t.procesoCta}
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
              <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, lineHeight: 1.65, maxWidth: 280 }}>{t.footerDesc}</p>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '.06em', marginBottom: 14 }}>{t.footerCarreras}</div>
              {CARRERAS[lang].map(c => (
                <div key={c.id} style={{ color: '#c62828', fontSize: 13, marginBottom: 8, cursor: 'pointer' }}
                  onClick={() => { setCarreraAbierta(c.id); document.getElementById('carreras').scrollIntoView({ behavior: 'smooth' }) }}>
                  {c.nombre}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '.06em', marginBottom: 14 }}>{t.footerSiguenos}</div>
              <div style={{ color: '#c62828', fontSize: 13, marginBottom: 8 }}>{t.footerSitio}</div>
              <div style={{ color: '#c62828', fontSize: 13, marginBottom: 8 }}>{t.footerFb}</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '.06em', marginBottom: 14 }}>{t.footerContacto}</div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                <i className="bi bi-geo-alt" style={{ color: '#c62828', marginTop: 2 }}></i>
                <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 13 }}>{t.footerDir}</span>
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
            <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 13 }}>{t.footerCopy}</span>
            <i className="bi bi-facebook" style={{ color: 'rgba(255,255,255,.5)', fontSize: 18 }}></i>
          </div>
        </div>
      </footer>

    </div>
  )
}
