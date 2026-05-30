<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    // Login
    public function login(Request $request)
    {
        $request->validate([
            'Nombre_Usuario' => 'required',
            'Password'       => 'required',
        ]);

        // Buscar usuario en la BD
        $usuario = DB::table('usuario')
            ->where('nombre_usuario', $request->Nombre_Usuario)
            ->first();

        // Verificar si existe y la contraseña es correcta
        if (!$usuario || md5($request->Password) !== $usuario->password) {
            return response()->json([
                'message' => 'Usuario o contraseña incorrectos'
            ], 401);
        }

        // Verificar que esté activo
        if ($usuario->estado !== 'ACTIVO') {
            return response()->json([
                'message' => 'Usuario inactivo o bloqueado'
            ], 403);
        }

        // Obtener rol del usuario
        $rol = DB::table('usuario_roles')
            ->join('roles', 'roles.idrol', '=', 'usuario_roles.idrol')
            ->where('usuario_roles.idusuario', $usuario->idusuario)
            ->select('roles.nombre')
            ->first();

        return response()->json([
            'message' => 'Login exitoso',
            'usuario' => [
                'id'       => $usuario->idusuario,
                'nombre'   => $usuario->nombre_usuario,
                'email'    => $usuario->email,
                'rol'      => $rol ? $rol->nombre : 'SIN ROL',
            ]
        ], 200);
    }

    // Logout
    public function logout(Request $request)
    {
        return response()->json([
            'message' => 'Sesión cerrada correctamente'
        ], 200);
    }
}