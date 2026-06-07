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

class AuthController extends Controller
{
    private function cacheKey(string $username): string
    {
        return 'login_' . md5(Str::lower($username));
    }

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
            return $this->registrarFallo($key);
        }

        // Verificar contraseña: soporta bcrypt (nuevo) y md5 (legado, migra automáticamente)
        $passwordValida = false;
        try {
            if (Hash::check($request->Password, $usuario->password)) {
                $passwordValida = true;
            }
        } catch (\RuntimeException $e) {
            // Hash no es bcrypt — verificar MD5 abajo
        }

        if (!$passwordValida && md5($request->Password) === $usuario->password) {
            DB::table('usuario')
                ->where('idusuario', $usuario->idusuario)
                ->update(['password' => Hash::make($request->Password)]);
            $passwordValida = true;
        }

        if (!$passwordValida) {
            return $this->registrarFallo($key);
        }

        if ($usuario->estado !== 'ACTIVO') {
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

        $usuarioModel = Usuario::find($usuario->idusuario);
        $token = $usuarioModel->createToken('api-token')->plainTextToken;

        return response()->json([
            'message' => 'Login exitoso',
            'token'   => $token,
            'usuario' => [
                'id'     => $usuario->idusuario,
                'nombre' => $usuario->nombre_usuario,
                'email'  => $usuario->email,
                'rol'    => $rol ? $rol->nombre : 'SIN ROL',
            ],
        ], 200);
    }

    private function registrarFallo(string $key): \Illuminate\Http\JsonResponse
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

            return response()->json([
                'message'         => "Demasiados intentos fallidos. Cuenta bloqueada por {$lockMinutes} minuto(s).",
                'blocked_seconds' => $lockMinutes * 60,
            ], 429);
        }

        $restantes = 3 - $fails;
        return response()->json([
            'message' => "Usuario o contraseña incorrectos. Te queda(n) {$restantes} intento(s) antes de bloqueo temporal.",
        ], 401);
    }

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

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Sesión cerrada correctamente'], 200);
    }
}
