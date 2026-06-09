# CU02 — Cerrar Sesión

## Descripción
Finaliza de forma segura la sesión activa del usuario, revocando el token de acceso en el servidor y limpiando los datos del navegador.

## Actores
- **Actor iniciador:** Administrador, Coordinador/Secretario Académico, Docente

## Flujo Principal
1. El usuario hace clic en "Cerrar Sesión" en la barra de navegación
2. El sistema envía solicitud POST `/api/logout` con el token actual
3. El servidor revoca el token en la tabla `personal_access_tokens`
4. El sistema elimina `token` y `usuario` del `localStorage`
5. El sistema redirige al usuario a la pantalla de inicio de sesión

## Flujo Alternativo — Error de red
- Si falla la llamada al servidor, el sistema limpia el localStorage de todas formas
- El usuario queda desconectado localmente aunque el token no se haya revocado

## Precondición
- El usuario debe tener una sesión activa (token válido en localStorage)

## Postcondición
- El token queda invalidado en el servidor
- El usuario no puede acceder a rutas protegidas hasta volver a iniciar sesión

## Implementación

**Backend:** `app/Http/Controllers/AuthController.php` → método `logout()`

```php
public function logout(Request $request)
{
    $request->user()->currentAccessToken()->delete();
    return response()->json(['message' => 'Sesión cerrada correctamente'], 200);
}
```

**Ruta:** Protegida con middleware `auth:sanctum`
```php
Route::post('/logout', [AuthController::class, 'logout']);
```

**Frontend:** `src/components/Navbar.jsx`

```js
const handleLogout = async () => {
  try { await apiFetch('/api/logout', { method: 'POST' }) } catch {}
  localStorage.removeItem('token')
  localStorage.removeItem('usuario')
  navigate('/')
}
```

## Excepciones manejadas
| Excepción | Respuesta del sistema |
|---|---|
| Token ya expirado | Elimina datos locales y redirige igualmente |
| Error de red | Ignora el error y cierra sesión localmente |
| Sesión inexistente | Redirige a login directamente |
