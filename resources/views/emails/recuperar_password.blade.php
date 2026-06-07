<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Recuperación de contraseña</title>
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

          <!-- Contenido -->
          <tr>
            <td style="padding:40px 40px 0;text-align:center;">
              <div style="width:64px;height:64px;background:#eff6ff;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;">
                <span style="font-size:32px;">🔑</span>
              </div>
              <h1 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 8px;">Recuperación de contraseña</h1>
              <p style="color:#6b7280;font-size:15px;margin:0 0 32px;">
                Hola <strong>{{ $nombreUsuario }}</strong>, recibimos una solicitud para restablecer tu contraseña.
              </p>
            </td>
          </tr>

          <!-- Contraseña temporal -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;">
                <tr>
                  <td style="padding:24px;text-align:center;">
                    <div style="font-size:12px;color:#0369a1;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;">Tu contraseña temporal</div>
                    <div style="font-size:28px;font-weight:800;color:#0d2451;letter-spacing:.12em;font-family:monospace;">{{ $tempPassword }}</div>
                    <div style="font-size:12px;color:#6b7280;margin-top:12px;">Ingresa con esta contraseña y cámbiala inmediatamente.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Advertencia -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-weight:700;color:#92400e;font-size:13px;margin-bottom:4px;">⚠ Importante</div>
                    <div style="color:#78350f;font-size:13px;line-height:1.5;">
                      Si no solicitaste este cambio, ignora este correo. Tu contraseña anterior seguirá siendo válida hasta que uses esta contraseña temporal.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0d2451;padding:24px 40px;text-align:center;">
              <div style="color:rgba(255,255,255,.5);font-size:12px;">
                © 2026 CUP · FICCT — UAGRM<br/>
                cup.ficct@uagrm.edu.bo
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
