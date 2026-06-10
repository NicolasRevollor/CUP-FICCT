import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { apiFetch } from '../api'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')
const MONTO_BS  = Number(import.meta.env.VITE_INSCRIPCION_MONTO || 200)
const MONTO_USD = Math.round(MONTO_BS / 6.9 * 100) / 100

const CARD_STYLE = {
  style: {
    base: {
      fontSize: '14px',
      color: '#111827',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      '::placeholder': { color: '#9ca3af' },
    },
    invalid: { color: '#dc2626' },
  },
}

// ── Formulario de pago con Stripe ──────────────────────────
function PagoForm({ datos, onSuccess, onBack }) {
  const stripe   = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handlePagar = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true); setError('')

    try {
      // 1. Crear PaymentIntent en el backend
      const ri = await apiFetch('/api/registro/intent', {
        method: 'POST',
        body: JSON.stringify({ monto: MONTO_USD }),
      })
      if (!ri.ok) throw new Error('Error al iniciar el pago')
      const { clientSecret } = await ri.json()

      // 2. Confirmar pago con Stripe desde el navegador
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      })

      if (stripeError) { setError(stripeError.message); return }
      if (paymentIntent.status !== 'succeeded') { setError('Pago no completado. Intentá de nuevo.'); return }

      // 3. Registrar postulante en el backend con el id del pago confirmado
      const rr = await apiFetch('/api/registro', {
        method: 'POST',
        body: JSON.stringify({
          ...datos,
          paymentIntentId: paymentIntent.id,
          monto: MONTO_BS,
          metodoPago: 'STRIPE',
        }),
      })
      const dr = await rr.json()
      if (!rr.ok) { setError(dr.message || 'Error al completar el registro'); return }

      onSuccess(dr.postulante)
    } catch (err) {
      setError(err.message || 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handlePagar}>

      {/* Resumen del postulante */}
      <div style={{ background: '#f8f9fa', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13 }}>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>{datos.nombres} {datos.apellidos}</div>
        <div style={{ color: '#6b7280' }}>CI: {datos.ci} · {datos.correo}</div>
      </div>

      {/* Monto */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#111827', marginBottom: 4 }}>Monto a pagar</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: '#0d2451' }}>Bs. {MONTO_BS}</div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Inscripción CUP-FICCT 2026 · ~${MONTO_USD} USD</div>
      </div>

      {/* Datos de tarjeta */}
      <div className="form-group">
        <label className="form-label">Datos de tarjeta <span className="req">*</span></label>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 7, padding: '10px 13px', background: '#fff' }}>
          <CardElement options={CARD_STYLE} />
        </div>
        <div className="form-hint">
          Modo de prueba — usá <strong>4242 4242 4242 4242</strong> · fecha futura · CVC cualquiera
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginTop: 14 }}>
          <i className="bi bi-exclamation-circle"></i> {error}
        </div>
      )}

      <div style={{ fontSize: 12, color: '#6b7280', margin: '14px 0', lineHeight: 1.6 }}>
        <i className="bi bi-info-circle"></i> Tu pago será procesado por Stripe. Una vez aprobado por el administrador recibirás tus credenciales en <strong>{datos.correo}</strong>.
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-outline" onClick={onBack} disabled={loading}>
          <i className="bi bi-arrow-left"></i> Volver
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading || !stripe} style={{ background: '#0d2451', borderColor: '#0d2451' }}>
          {loading
            ? <><span className="spinner" style={{ width: 15, height: 15, borderWidth: 2, marginBottom: 0 }}></span> Procesando...</>
            : <><i className="bi bi-lock-fill"></i> Pagar Bs. {MONTO_BS} e inscribirme</>
          }
        </button>
      </div>
    </form>
  )
}

// ── Componente principal ──────────────────────────────────
export default function Registro() {
  const navigate = useNavigate()
  const [step, setStep]       = useState(1)
  const [completado, setComp] = useState(null)
  const [errors, setErrors]   = useState({})
  const [form, setForm]       = useState({
    ci: '', nombres: '', apellidos: '', sexo: 'M',
    direccion: '', telefono: '', correo: '',
    colegioProcedencia: '', ciudad: '',
    tituloBachiller: false, otrosRequisitos: '',
  })

  const onChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
    setErrors(er => ({ ...er, [name]: '' }))
  }

  const validar = () => {
    const e = {}
    if (!form.ci.trim())        e.ci        = 'El CI es requerido'
    if (!form.nombres.trim())   e.nombres   = 'Los nombres son requeridos'
    if (!form.apellidos.trim()) e.apellidos = 'Los apellidos son requeridos'
    if (!form.correo.trim())    e.correo    = 'El correo es requerido'
    if (!/\S+@\S+\.\S+/.test(form.correo)) e.correo = 'Correo no válido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSiguiente = (ev) => {
    ev.preventDefault()
    if (validar()) setStep(2)
  }

  // ── Pantalla de éxito ──
  if (completado) return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div className="card-body">
          <div style={{ width: 64, height: 64, background: '#ecfdf5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <i className="bi bi-check-circle-fill" style={{ fontSize: 32, color: '#059669' }}></i>
          </div>
          <h2 style={{ fontWeight: 800, color: '#111827', marginBottom: 8 }}>¡Pago recibido!</h2>
          <p style={{ color: '#6b7280', marginBottom: 20, fontSize: 14, lineHeight: 1.6 }}>
            Gracias, <strong>{completado.nombres} {completado.apellidos}</strong>.<br />
            Tu pago fue procesado correctamente. El administrador revisará tu solicitud
            y recibirás tus <strong>credenciales de acceso</strong> en:<br />
            <strong>{completado.correo}</strong>
          </p>
          <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '14px 16px', marginBottom: 24, textAlign: 'left' }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Tu CI (será tu nombre de usuario)</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0d2451' }}>{completado.ci}</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Guardá este dato — lo usarás para iniciar sesión</div>
          </div>
          <button className="btn btn-primary btn-full" onClick={() => navigate('/')} style={{ background: '#0d2451', borderColor: '#0d2451' }}>
            <i className="bi bi-house"></i> Volver al inicio
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>

      {/* Navbar mínima */}
      <nav style={{ background: '#0d2451', padding: '0 24px', height: 58, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: 20, padding: 0 }}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>CUP · FICCT — Inscripción 2026</span>
      </nav>

      <div style={{ maxWidth: 620, margin: '0 auto', padding: '36px 24px' }}>

        {/* Indicador de pasos */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32, gap: 8 }}>
          {[{ n: 1, label: 'Datos personales' }, { n: 2, label: 'Pago con Stripe' }].map((s, i) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: step >= s.n ? '#0d2451' : '#e5e7eb', color: step >= s.n ? '#fff' : '#9ca3af', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.n}</div>
                <span style={{ fontSize: 13, fontWeight: step === s.n ? 600 : 400, color: step === s.n ? '#111827' : '#6b7280' }}>{s.label}</span>
              </div>
              {i < 1 && <div style={{ flex: 1, height: 1, background: '#e5e7eb', margin: '0 12px' }} />}
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header card-header-dark">
            <i className={`bi ${step === 1 ? 'bi-person' : 'bi-credit-card'}`}></i>
            {step === 1 ? 'Datos de inscripción' : 'Pago seguro con Stripe'}
          </div>
          <div className="card-body">

            {/* ── Paso 1: datos del postulante ── */}
            {step === 1 && (
              <form onSubmit={handleSiguiente}>
                <div className="form-section">
                  <div className="form-section-title"><i className="bi bi-person"></i> Datos Personales</div>
                  <div className="form-row-3">
                    <div className="form-group">
                      <label className="form-label">CI <span className="req">*</span></label>
                      <input className="form-input" name="ci" value={form.ci} onChange={onChange} placeholder="Ej: 12345678" />
                      {errors.ci && <div className="form-hint" style={{ color: '#dc2626' }}>{errors.ci}</div>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nombres <span className="req">*</span></label>
                      <input className="form-input" name="nombres" value={form.nombres} onChange={onChange} />
                      {errors.nombres && <div className="form-hint" style={{ color: '#dc2626' }}>{errors.nombres}</div>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Apellidos <span className="req">*</span></label>
                      <input className="form-input" name="apellidos" value={form.apellidos} onChange={onChange} />
                      {errors.apellidos && <div className="form-hint" style={{ color: '#dc2626' }}>{errors.apellidos}</div>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Sexo <span className="req">*</span></label>
                      <select className="form-select" name="sexo" value={form.sexo} onChange={onChange}>
                        <option value="M">Masculino</option>
                        <option value="F">Femenino</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Teléfono</label>
                      <input className="form-input" name="telefono" value={form.telefono} onChange={onChange} placeholder="Ej: 70000000" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Correo <span className="req">*</span></label>
                      <input type="email" className="form-input" name="correo" value={form.correo} onChange={onChange} />
                      {errors.correo && <div className="form-hint" style={{ color: '#dc2626' }}>{errors.correo}</div>}
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-title"><i className="bi bi-mortarboard"></i> Datos Académicos</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Colegio de Procedencia</label>
                      <input className="form-input" name="colegioProcedencia" value={form.colegioProcedencia} onChange={onChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Ciudad</label>
                      <input className="form-input" name="ciudad" value={form.ciudad} onChange={onChange} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dirección</label>
                    <input className="form-input" name="direccion" value={form.direccion} onChange={onChange} />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => navigate('/')}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" style={{ background: '#0d2451', borderColor: '#0d2451' }}>
                    Continuar al pago <i className="bi bi-arrow-right"></i>
                  </button>
                </div>
              </form>
            )}

            {/* ── Paso 2: pago con Stripe ── */}
            {step === 2 && (
              <Elements stripe={stripePromise}>
                <PagoForm
                  datos={form}
                  onSuccess={(postulante) => setComp(postulante)}
                  onBack={() => setStep(1)}
                />
              </Elements>
            )}

          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 16 }}>
          <i className="bi bi-lock"></i> Pago procesado de forma segura por Stripe.
          {' '}¿Ya estás registrado?{' '}
          <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: '#0d2451', cursor: 'pointer', fontWeight: 600, fontSize: 12, padding: 0 }}>
            Iniciar sesión
          </button>
        </p>
      </div>
    </div>
  )
}
