<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\Usuario;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'Nombre_Usuario' => 'required',
            'Password'       => 'required',
        ]);

        $usuario = DB::table('usuario')
            ->where('nombre_usuario', $request->Nombre_Usuario)
            ->first();

        if (!$usuario) {
            return response()->json(['message' => 'Usuario o contraseña incorrectos'], 401);
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
            // Migrar contraseña MD5 → bcrypt
            DB::table('usuario')
                ->where('idusuario', $usuario->idusuario)
                ->update(['password' => Hash::make($request->Password)]);
            $passwordValida = true;
        }

        if (!$passwordValida) {
            return response()->json(['message' => 'Usuario o contraseña incorrectos'], 401);
        }

        if ($usuario->estado !== 'ACTIVO') {
            return response()->json(['message' => 'Usuario inactivo o bloqueado'], 403);
        }

        $rol = DB::table('usuario_roles')
            ->join('roles', 'roles.idrol', '=', 'usuario_roles.idrol')
            ->where('usuario_roles.idusuario', $usuario->idusuario)
            ->select('roles.nombre')
            ->first();

        // Crear token Sanctum
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

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Sesión cerrada correctamente'], 200);
    }
}
