<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * CU-14 — Gestión de usuarios del sistema
 * CRUD sobre la tabla usuario. Permite al administrador listar, ver, crear,
 * actualizar estado/email y desactivar usuarios. Los roles se gestionan
 * desde la tabla usuario_roles.
 * Desactivar un usuario cambia su estado a INACTIVO (no elimina el registro).
 */
class UsuarioController extends Controller
{
    public function index()
    {
        $usuarios = DB::table('usuario as u')
            ->leftJoin('usuario_roles as ur', 'ur.idusuario', '=', 'u.idusuario')
            ->leftJoin('roles as r', 'r.idrol', '=', 'ur.idrol')
            ->select(
                'u.idusuario',
                'u.nombre_usuario',
                'u.email',
                'u.estado',
                'u.debe_cambiar_password',
                'r.nombre as rol'
            )
            ->orderBy('u.nombre_usuario')
            ->get();

        return response()->json($usuarios);
    }

    public function show(int $id)
    {
        $usuario = DB::table('usuario as u')
            ->leftJoin('usuario_roles as ur', 'ur.idusuario', '=', 'u.idusuario')
            ->leftJoin('roles as r', 'r.idrol', '=', 'ur.idrol')
            ->where('u.idusuario', $id)
            ->select('u.idusuario', 'u.nombre_usuario', 'u.email', 'u.estado', 'r.nombre as rol')
            ->first();

        if (!$usuario) {
            return response()->json(['message' => 'Usuario no encontrado'], 404);
        }

        return response()->json($usuario);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombre_usuario' => 'required|string|max:100|unique:usuario,nombre_usuario',
            'email'          => 'required|email|unique:usuario,email',
            'password'       => 'required|string|min:6',
            'idrol'          => 'required|integer|exists:roles,idrol',
        ]);

        DB::transaction(function () use ($request) {
            $idUsuario = DB::table('usuario')->insertGetId([
                'nombre_usuario'        => $request->nombre_usuario,
                'email'                 => $request->email,
                'password'              => Hash::make($request->password),
                'estado'                => 'ACTIVO',
                'debe_cambiar_password' => true,
            ], 'idusuario');

            DB::table('usuario_roles')->insert([
                'idusuario' => $idUsuario,
                'idrol'     => $request->idrol,
            ]);
        });

        return response()->json(['message' => 'Usuario creado correctamente'], 201);
    }

    public function update(Request $request, int $id)
    {
        $usuario = DB::table('usuario')->where('idusuario', $id)->first();
        if (!$usuario) {
            return response()->json(['message' => 'Usuario no encontrado'], 404);
        }

        $request->validate([
            'email'  => 'sometimes|email|unique:usuario,email,' . $id . ',idusuario',
            'estado' => 'sometimes|in:ACTIVO,INACTIVO',
        ]);

        $datos = array_filter([
            'email'  => $request->email,
            'estado' => $request->estado,
        ], fn($v) => $v !== null);

        DB::table('usuario')->where('idusuario', $id)->update($datos);

        return response()->json(['message' => 'Usuario actualizado correctamente']);
    }

    // Desactivar usuario (soft delete — cambia estado a INACTIVO)
    public function destroy(int $id)
    {
        $usuario = DB::table('usuario')->where('idusuario', $id)->first();
        if (!$usuario) {
            return response()->json(['message' => 'Usuario no encontrado'], 404);
        }

        DB::table('usuario')->where('idusuario', $id)->update(['estado' => 'INACTIVO']);

        return response()->json(['message' => 'Usuario desactivado correctamente']);
    }

    public function roles()
    {
        return response()->json(DB::table('roles')->orderBy('nombre')->get());
    }
}
