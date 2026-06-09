# CU01 — Iniciar Sesión

## Descripción
Permite a los usuarios autorizados (Administrador, Docente) acceder al sistema mediante credenciales validadas.

## Actores
- **Actor iniciador:** Administrador, Coordinador/Secretario Académico, Docente

## Flujo Principal
1. El usuario ingresa a la pantalla de inicio de sesión
2. El usuario escribe su nombre de usuario y contraseña
3. El sistema valida las credenciales contra la base de datos
4. El sistema verifica que el usuario esté ACTIVO
5. El sistema obtiene el rol del usuario
6. El sistema genera un token de acceso (Sanctum)
7. El sistema redirige al panel correspondiente según el rol

## Flujo Alternativo — Contraseña Incorrecta
- El sistema muestra "Usuario o contraseña incorrectos"
- El usuario puede intentar de nuevo

## Precondición
- El usuario debe estar registrado en la tabla `usuario` con estado ACTIVO

## Postcondición
- El token queda almacenado en `localStorage` del navegador
- El usuario accede al dashboard

## Implementación

**Backend:** `app/Http/Controllers/AuthController.php` → método `login()`

```php
// Soporta migración automática de MD5 → bcrypt
$passwordValida = false;
try {
    if (Hash::check($request->Password, $usuario->password)) {
        $passwordValida = true;
    }
} catch (\RuntimeException $e) { /* hash MD5 legado */ }

if (!$passwordValida && md5($request->Password) === $usuario->password) {
    DB::table('usuario')->where('idusuario', $usuario->idusuario)
        ->update(['password' => Hash::make($request->Password)]);
    $passwordValida = true;
}

$token = Usuario::find($usuario->idusuario)->createToken('api-token')->plainTextToken;
```

**Frontend:** `src/pages/Login.jsx`

```js
const res = await apiFetch('/api/login', {
  method: 'POST',
  body: JSON.stringify({ Nombre_Usuario: usuario, Password: password }),
})
if (res.ok) {
  localStorage.setItem('token',   data.token)
  localStorage.setItem('usuario', JSON.stringify(data.usuario))
  navigate('/dashboard')
}
```

## Excepciones manejadas
| Excepción | Respuesta del sistema |
|---|---|
| Usuario no existe | HTTP 401 — "Usuario o contraseña incorrectos" |
| Contraseña incorrecta | HTTP 401 — "Usuario o contraseña incorrectos" |
| Usuario INACTIVO | HTTP 403 — "Usuario inactivo o bloqueado" |
| Error de red | Muestra "Error de conexión con el servidor" |
