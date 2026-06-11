<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Crea el rol COORDINADOR y el usuario por defecto.
 * Las credenciales se entregan fuera del repositorio.
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. Insertar el rol COORDINADOR (ignorar si ya existe)
        $idRol = DB::table('roles')
            ->where('nombre', 'COORDINADOR')
            ->value('idrol');

        if (!$idRol) {
            $idRol = DB::table('roles')->insertGetId(
                ['nombre' => 'COORDINADOR'],
                'idrol'
            );
        }

        // 2. Crear el usuario coordinador (ignorar si ya existe)
        $yaExiste = DB::table('usuario')
            ->where('nombre_usuario', 'coordinador')
            ->exists();

        if (!$yaExiste) {
            $idUsuario = DB::table('usuario')->insertGetId([
                'nombre_usuario'        => 'coordinador',
                'email'                 => 'coordinador@cup.ficct.edu.bo',
                'password'              => Hash::make(env('COORDINADOR_DEFAULT_PASSWORD', 'change_me')),
                'estado'                => 'ACTIVO',
                'debe_cambiar_password' => true,
            ], 'idusuario');

            // 3. Asignar rol COORDINADOR al usuario
            DB::table('usuario_roles')->insert([
                'idusuario' => $idUsuario,
                'idrol'     => $idRol,
            ]);
        }
    }

    public function down(): void
    {
        $usuario = DB::table('usuario')
            ->where('nombre_usuario', 'coordinador')
            ->first();

        if ($usuario) {
            DB::table('usuario_roles')->where('idusuario', $usuario->idusuario)->delete();
            DB::table('usuario')->where('idusuario', $usuario->idusuario)->delete();
        }

        DB::table('roles')->where('nombre', 'COORDINADOR')->delete();
    }
};
