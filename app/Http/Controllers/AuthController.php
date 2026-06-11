<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use App\Models\Usuario;
use App\Mail\RecuperarPassword;

/**
 * ============================================================
 * AuthController  —  CU-01: Inicio de sesión
 *                    CU-02: Cambio y recuperación de contraseña
 * ============================================================
 *
 * CU-01 — Inicio de sesión
 *   Autentica usuarios con nombre_usuario + password.
 *   Soporta hashes bcrypt (nuevo) y MD5 (legado: migra automáticamente).
 *   Bloquea la cuenta temporalmente tras múltiples intentos fallidos:
 *     - 3 intentos → bloqueo 3 min
 *     - siguiente bloqueo → 5 min
 *     - sucesivos → 10 min
 *   Emite tokens Sanctum (Bearer token para todas las rutas protegidas).
 *   Registra cada intento (exitoso o fallido) en la bitácora.
 *
 * CU-02 — Cambio y recuperación de contraseña
 *   - cambiarPassword: el usuario autenticado cambia su propia contraseña.
 *   - recuperarPassword: genera contraseña temporal y la envía por correo.
 *     La respuesta es genérica para no revelar si el correo existe.
 *
 * TABLA PRINCIPAL: usuario
 *   - idusuario, nombre_usuario, password (bcrypt), email, estado, debe_cambiar_password
 *
 * CACHÉ (Laravel Cache):
 *   - login_{hash}_fails     → contador de intentos fallidos (15 min TTL)
 *   - login_{hash}_lockcount → cuántas veces se bloqueó (1 hr TTL)
 *   - login_{hash}_locked    → timestamp hasta cuándo está bloqueado
 *
 * ENDPOINTS DISPONIBLES:
 *   POST /api/login                      → login()
 *   POST /api/logout             [auth]  → logout()
 *   POST /api/recuperar-password         → recuperarPassword()
 *   POST /api/cambiar-password   [auth]  → cambiarPassword()
 */
class AuthController extends Controller
{
    private function cacheKey(string $username): string
    {
        return 'login_' . md5(Str::lower($username));
    }

    // ──────────────────────────────────────────────────────────────
    // POST /api/login
    // ──────────────────────────────────────────────────────────────
    /**
     * Autentica al usuario y devuelve un token Sanctum.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → POST /login  { Nombre_Usuario, Password }
     *
     *   [1] Validar que vengan nombre_usuario y password
     *
     *   [2] Verificar si la cuenta está bloqueada (cache)
     *   ALT [bloqueada y tiempo no expiró]
     *     → 429 { message, blocked_seconds }
     *
     *   [3] Buscar el usuario en BD por nombre_usuario
     *   ALT [no existe]
     *     → registrarFallo() → 401 o 429
     *
     *   [4] Verificar contraseña
     *   ALT [es bcrypt] → Hash::check()
     *   ALT [es MD5 (legado)]
     *     → comparar md5(password) == stored
     *     → migrar automáticamente a bcrypt en BD
     *   ALT [contraseña inválida]
     *     → registrarFallo() → 401 o 429
     *
     *   [5] Verificar que el usuario esté ACTIVO
     *   ALT [estado != ACTIVO]
     *     → INSERT bitácora (LOGIN_FALLIDO)
     *     → 403 "Usuario inactivo o bloqueado"
     *
     *   [6] Limpiar contadores de bloqueo en caché
     *   [7] Obtener el rol del usuario (JOIN usuario_roles → roles)
     *   [8] INSERT en bitácora (LOGIN_EXITOSO)
     *   [9] Crear token Sanctum → plainTextToken
     *   [10] → 200 { message, token, usuario: { id, nombre, email, rol, debe_cambiar_password } }
     */
    public function login(Request $request)
    {
        $request->validate([
            'Nombre_Usuario' => 'required',
            'Password'       => 'required',
        ]);

        $key = $this->cacheKey($request->Nombre_Usuario);

        // Verificar bloqueo activo
        $lockedUntil = Cache::get($key . '_locked');
        if ($lockedUntil && $lockedUntil > now()->timestamp) {
            $remaining = $lockedUntil - now()->timestamp;
            return response()->json([
                'message'         => 'Cuenta bloqueada temporalmente. Demasiados intentos fallidos.',
                'blocked_seconds' => $remaining,
            ], 429);
        }

        $usuario = DB::table('usuario')
            ->where('nombre_usuario', $request->Nombre_Usuario)
            ->first();

        if (!$usuario) {
            return $this->registrarFallo($key, $request->Nombre_Usuario, $request);
        }

        // Verificar contraseña: soporta bcrypt (nuevo) y md5 (legado, migra automáticamente)
        $passwordValida = false;
        try {
            if (Hash::check($request->Password, $usuario->password)) {
                $passwordValida = true;
            }
        } catch (\RuntimeException) {
            // Hash no es bcrypt — verificar MD5 abajo
        }

        if (!$passwordValida && md5($request->Password) === $usuario->password) {
            DB::table('usuario')
                ->where('idusuario', $usuario->idusuario)
                ->update(['password' => Hash::make($request->Password)]);
            $passwordValida = true;
        }

        if (!$passwordValida) {
            return $this->registrarFallo($key, $request->Nombre_Usuario, $request);
        }

        if ($usuario->estado !== 'ACTIVO') {
            try {
                DB::table('bitacora')->insert([
                    'idusuario'      => $usuario->idusuario,
                    'nombre_usuario' => $usuario->nombre_usuario,
                    'rol'            => null,
                    'ip'             => $request->ip(),
                    'accion'         => 'LOGIN_FALLIDO',
                    'descripcion'    => 'Intento de acceso con cuenta inactiva',
                    'fecha'          => now(),
                ]);
            } catch (\Throwable) {}

            return response()->json(['message' => 'Usuario inactivo o bloqueado'], 403);
        }

        // Login exitoso — limpiar contadores
        Cache::forget($key . '_fails');
        Cache::forget($key . '_lockcount');
        Cache::forget($key . '_locked');

        $rol = DB::table('usuario_roles')
            ->join('roles', 'roles.idrol', '=', 'usuario_roles.idrol')
            ->where('usuario_roles.idusuario', $usuario->idusuario)
            ->select('roles.nombre')
            ->first();

        try {
            DB::table('bitacora')->insert([
                'idusuario'      => $usuario->idusuario,
                'nombre_usuario' => $usuario->nombre_usuario,
                'rol'            => $rol ? $rol->nombre : 'SIN ROL',
                'ip'             => $request->ip(),
                'accion'         => 'LOGIN_EXITOSO',
                'descripcion'    => 'Inicio de sesión exitoso',
                'fecha'          => now(),
            ]);
        } catch (\Throwable) {}

        $usuarioModel = Usuario::find($usuario->idusuario);
        $token = $usuarioModel->createToken('api-token')->plainTextToken;

        return response()->json([
            'message' => 'Login exitoso',
            'token'   => $token,
            'usuario' => [
                'id'                   => $usuario->idusuario,
                'nombre'               => $usuario->nombre_usuario,
                'email'                => $usuario->email,
                'rol'                  => $rol ? $rol->nombre : 'SIN ROL',
                'debe_cambiar_password' => (bool) ($usuario->debe_cambiar_password ?? false),
            ],
        ], 200);
    }

    private function registrarFallo(string $key, string $username = '', ?\Illuminate\Http\Request $request = null): \Illuminate\Http\JsonResponse
    {
        $fails = Cache::get($key . '_fails', 0) + 1;
        Cache::put($key . '_fails', $fails, now()->addMinutes(15));

        if ($fails >= 3) {
            $lockCount = Cache::get($key . '_lockcount', 0) + 1;
            Cache::put($key . '_lockcount', $lockCount, now()->addHour());

            $lockMinutes = match(true) {
                $lockCount === 1 => 3,
                $lockCount === 2 => 5,
                default          => 10,
            };

            Cache::put($key . '_locked', now()->addMinutes($lockMinutes)->timestamp, now()->addMinutes($lockMinutes));
            Cache::forget($key . '_fails');

            // Bug fix: grabar el intento que disparó el bloqueo antes de retornar
            try {
                DB::table('bitacora')->insert([
                    'idusuario'      => null,
                    'nombre_usuario' => $username ?: 'desconocido',
                    'rol'            => null,
                    'ip'             => $request?->ip(),
                    'accion'         => 'LOGIN_FALLIDO',
                    'descripcion'    => "Intento fallido (intento {$fails}) — cuenta bloqueada por {$lockMinutes} min",
                    'fecha'          => now(),
                ]);
            } catch (\Throwable) {}

            return response()->json([
                'message'         => "Demasiados intentos fallidos. Cuenta bloqueada por {$lockMinutes} minuto(s).",
                'blocked_seconds' => $lockMinutes * 60,
            ], 429);
        }

        try {
            DB::table('bitacora')->insert([
                'idusuario'      => null,
                'nombre_usuario' => $username ?: 'desconocido',
                'rol'            => null,
                'ip'             => $request?->ip(),
                'accion'         => 'LOGIN_FALLIDO',
                'descripcion'    => "Intento fallido (intento {$fails})",
                'fecha'          => now(),
            ]);
        } catch (\Throwable) {}

        $restantes = 3 - $fails;
        return response()->json([
            'message' => "Usuario o contraseña incorrectos. Te queda(n) {$restantes} intento(s) antes de bloqueo temporal.",
        ], 401);
    }

    // ──────────────────────────────────────────────────────────────
    // POST /api/recuperar-password
    // ──────────────────────────────────────────────────────────────
    /**
     * Genera una contraseña temporal y la envía al correo del usuario.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → POST /recuperar-password  { email }
     *
     *   [1] Validar formato de email
     *
     *   [2] Buscar usuario por email en BD
     *   ALT [no existe]
     *     → 200 con mensaje genérico (no revelar si el correo existe)
     *     (respuesta idéntica para no permitir enumerar cuentas)
     *
     *   [3] Generar contraseña temporal: "CUP" + 5 chars aleatorios mayúsculas
     *   [4] UPDATE usuario: guardar nueva contraseña (bcrypt) en BD
     *   [5] Enviar email con la contraseña temporal
     *       (si falla el envío, se swallowea el error — la contraseña ya está guardada)
     *   [6] → 200 con mensaje genérico (mismo texto que si no existe)
     *
     * SEGURIDAD:
     *   La respuesta es idéntica tanto si el correo existe como si no
     *   para evitar user enumeration attacks.
     */
    public function recuperarPassword(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $usuario = DB::table('usuario')->where('email', $request->email)->first();

        // Respuesta genérica para no revelar si el correo existe
        if (!$usuario) {
            return response()->json(['message' => 'Si el correo está registrado recibirás una contraseña temporal en breve.'], 200);
        }

        $tempPassword = 'CUP' . strtoupper(Str::random(5));

        DB::table('usuario')->where('idusuario', $usuario->idusuario)->update([
            'password' => Hash::make($tempPassword),
        ]);

        try {
            Mail::to($usuario->email)->send(new RecuperarPassword($usuario->nombre_usuario, $tempPassword));
        } catch (\Throwable) {
            // No exponer error de email al cliente
        }

        return response()->json(['message' => 'Si el correo está registrado recibirás una contraseña temporal en breve.'], 200);
    }

    // ──────────────────────────────────────────────────────────────
    // POST /api/cambiar-password  [requiere auth]
    // ──────────────────────────────────────────────────────────────
    /**
     * El usuario autenticado cambia su propia contraseña.
     * También limpia el flag debe_cambiar_password.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → POST /cambiar-password [Bearer token]
     *     { password_actual, password_nuevo, password_confirm }
     *
     *   [1] Validar campos:
     *       - password_nuevo: min 8 chars, una mayúscula, un número, un especial
     *       - password_confirm: debe ser igual a password_nuevo
     *
     *   [2] Buscar el usuario autenticado en BD
     *
     *   [3] Verificar password_actual contra el hash almacenado
     *   ALT [es bcrypt] → Hash::check()
     *   ALT [es MD5 legado] → md5($request->password_actual) == stored
     *   ALT [no coincide]
     *     → 400 "La contraseña actual es incorrecta"
     *
     *   [4] UPDATE: guardar nuevo hash bcrypt y poner debe_cambiar_password=false
     *   [5] → 200 "Contraseña actualizada correctamente"
     */
    public function cambiarPassword(Request $request)
    {
        $request->validate([
            'password_actual'  => 'required',
            'password_nuevo'   => ['required', 'min:8', 'regex:/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/'],
            'password_confirm' => 'required|same:password_nuevo',
        ], [
            'password_nuevo.min'   => 'La nueva contraseña debe tener al menos 8 caracteres.',
            'password_nuevo.regex' => 'La nueva contraseña debe contener al menos una mayúscula, un número y un carácter especial (ej: !, @, #, $).',
        ]);

        $usuario = DB::table('usuario')->where('idusuario', $request->user()->idusuario)->first();

        $valida = false;
        try {
            if (Hash::check($request->password_actual, $usuario->password)) $valida = true;
        } catch (\RuntimeException) {}

        if (!$valida && md5($request->password_actual) === $usuario->password) $valida = true;

        if (!$valida) {
            return response()->json(['message' => 'La contraseña actual es incorrecta'], 400);
        }

        DB::table('usuario')->where('idusuario', $usuario->idusuario)->update([
            'password'             => Hash::make($request->password_nuevo),
            'debe_cambiar_password' => false,
        ]);

        return response()->json(['message' => 'Contraseña actualizada correctamente']);
    }

    // ──────────────────────────────────────────────────────────────
    // POST /api/logout  [requiere auth]
    // ──────────────────────────────────────────────────────────────
    /**
     * Cierra la sesión del usuario eliminando el token actual de Sanctum.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → POST /logout [Bearer token]
     *
     *   [1] Obtener el rol del usuario (para registrar en bitácora)
     *   [2] INSERT bitácora (accion='LOGOUT')
     *   [3] Eliminar el token actual: currentAccessToken()->delete()
     *       (solo este token, no todos los del usuario)
     *   [4] → 200 "Sesión cerrada correctamente"
     */
    public function logout(Request $request)
    {
        $user = $request->user();

        $rol = DB::table('usuario_roles')
            ->join('roles', 'roles.idrol', '=', 'usuario_roles.idrol')
            ->where('usuario_roles.idusuario', $user->idusuario)
            ->value('roles.nombre');

        try {
            DB::table('bitacora')->insert([
                'idusuario'      => $user->idusuario,
                'nombre_usuario' => $user->nombre_usuario,
                'rol'            => $rol ?? 'SIN ROL',
                'ip'             => $request->ip(),
                'accion'         => 'LOGOUT',
                'descripcion'    => 'Cierre de sesión',
                'fecha'          => now(),
            ]);
        } catch (\Throwable) {}

        $user->currentAccessToken()->delete();
        return response()->json(['message' => 'Sesión cerrada correctamente'], 200);
    }
}
