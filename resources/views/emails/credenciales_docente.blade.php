<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:32px;background:#f7f9fb;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e0e3e5;overflow:hidden;">

    <div style="background:#003366;padding:24px 32px;">
      <p style="color:#fff;margin:0;font-size:20px;font-weight:700;">FICCT Portal</p>
      <p style="color:rgba(255,255,255,.6);margin:4px 0 0;font-size:13px;">Sistema de Admisión Universitaria</p>
    </div>

    <div style="padding:32px;">
      <h2 style="color:#191c1e;font-size:18px;margin:0 0 10px;">¡Felicitaciones, {{ $nombres }}!</h2>
      <p style="color:#43474f;font-size:14px;line-height:1.65;margin:0 0 24px;">
        Tu postulación como docente del CUP-FICCT ha sido <strong>aprobada</strong>.
        Estas son tus credenciales para acceder al portal docente.
      </p>

      <div style="background:#f2f4f6;border-radius:6px;padding:20px 24px;margin-bottom:24px;">
        <div style="margin-bottom:14px;">
          <p style="font-size:11px;font-weight:700;letter-spacing:.06em;color:#737780;text-transform:uppercase;margin:0 0 4px;">Usuario</p>
          <p style="font-size:17px;font-weight:700;color:#003366;margin:0;font-family:monospace;">{{ $username }}</p>
        </div>
        <div>
          <p style="font-size:11px;font-weight:700;letter-spacing:.06em;color:#737780;text-transform:uppercase;margin:0 0 4px;">Contraseña temporal</p>
          <p style="font-size:17px;font-weight:700;color:#003366;margin:0;font-family:monospace;">{{ $password }}</p>
        </div>
      </div>

      <p style="color:#737780;font-size:12px;line-height:1.65;margin:0 0 8px;">
        Por seguridad, cambia tu contraseña al ingresar por primera vez desde
        <strong>Perfil → Cambiar contraseña</strong>.
      </p>
      <p style="color:#737780;font-size:12px;margin:0;">
        Ingresa en:
        <a href="https://cup-ficct.vercel.app/login" style="color:#003366;font-weight:600;">cup-ficct.vercel.app/login</a>
      </p>
    </div>

    <div style="background:#f7f9fb;padding:14px 32px;border-top:1px solid #e0e3e5;">
      <p style="color:#9ca3af;font-size:11px;margin:0;text-align:center;">
        © 2024 Facultad de Ingeniería en Ciencias de la Computación y Telecomunicaciones
      </p>
    </div>
  </div>
</body>
</html>
