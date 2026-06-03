<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Confirmación de inscripción</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

          <!-- Header -->
          <tr>
            <td style="background:#0d2451;padding:32px 40px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:8px 16px;margin-bottom:12px;">
                <span style="color:#ffffff;font-weight:800;font-size:18px;letter-spacing:.05em;">CUP</span>
              </div>
              <div style="color:#ffffff;font-size:20px;font-weight:700;margin-top:8px;">CUP · FICCT</div>
              <div style="color:rgba(255,255,255,.6);font-size:12px;letter-spacing:.08em;">UAGRM</div>
            </td>
          </tr>

          <!-- Ícono de éxito -->
          <tr>
            <td style="padding:40px 40px 0;text-align:center;">
              <div style="width:64px;height:64px;background:#ecfdf5;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;">
                <span style="font-size:32px;">✓</span>
              </div>
              <h1 style="color:#111827;font-size:24px;font-weight:800;margin:0 0 8px;">¡Inscripción confirmada!</h1>
              <p style="color:#6b7280;font-size:15px;margin:0;">Tu pago fue procesado correctamente.</p>
            </td>
          </tr>

          <!-- Datos del postulante -->
          <tr>
            <td style="padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:10px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;">
                    <div style="font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:16px;">Datos del postulante</div>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                          <span style="color:#6b7280;font-size:13px;">Nombre completo</span>
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;">
                          <span style="color:#111827;font-size:13px;font-weight:600;">{{ $nombres }} {{ $apellidos }}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                          <span style="color:#6b7280;font-size:13px;">CI</span>
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;">
                          <span style="color:#111827;font-size:13px;font-weight:600;">{{ $ci }}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                          <span style="color:#6b7280;font-size:13px;">Correo</span>
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;">
                          <span style="color:#111827;font-size:13px;">{{ $correo }}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="color:#6b7280;font-size:13px;">Monto pagado</span>
                        </td>
                        <td style="padding:8px 0;text-align:right;">
                          <span style="color:#059669;font-size:14px;font-weight:800;">Bs. {{ number_format($monto, 2) }}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Estado -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-weight:700;color:#92400e;font-size:13px;margin-bottom:4px;">Estado: PENDIENTE</div>
                    <div style="color:#78350f;font-size:13px;line-height:1.5;">
                      Tu inscripción está registrada. El equipo CUP revisará tu expediente y te asignará un grupo. Guarda tu CI <strong>{{ $ci }}</strong> para hacer seguimiento de tu proceso.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Próximos pasos -->
          <tr>
            <td style="padding:0 40px 32px;">
              <div style="font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;">Próximos pasos</div>
              <table width="100%" cellpadding="0" cellspacing="0">
                @foreach([
                  ['01', 'Espera la asignación de tu grupo de estudio.'],
                  ['02', 'Rinde los exámenes de las 4 materias (Computación, Física, Matemática, Inglés).'],
                  ['03', 'Obtén un promedio ponderado ≥ 60 para aprobar el CUP.'],
                ] as $paso)
                <tr>
                  <td style="padding:8px 0;vertical-align:top;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:top;padding-right:12px;">
                          <div style="width:28px;height:28px;background:#0d2451;color:#fff;border-radius:50%;font-size:11px;font-weight:800;text-align:center;line-height:28px;">{{ $paso[0] }}</div>
                        </td>
                        <td style="vertical-align:middle;">
                          <span style="color:#374151;font-size:13px;line-height:1.5;">{{ $paso[1] }}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                @endforeach
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0d2451;padding:24px 40px;text-align:center;">
              <div style="color:rgba(255,255,255,.5);font-size:12px;">
                © 2026 CUP · FICCT — UAGRM<br/>
                Ciudad universitaria. Módulo 236 · cup.ficct@uagrm.edu.bo
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
