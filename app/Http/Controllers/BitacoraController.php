<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BitacoraController extends Controller
{
    public function index(Request $request)
    {
        $rol = DB::table('usuario_roles')
            ->join('roles', 'roles.idrol', '=', 'usuario_roles.idrol')
            ->where('usuario_roles.idusuario', $request->user()->idusuario)
            ->value('roles.nombre');

        if ($rol !== 'ADMINISTRADOR') {
            return response()->json(['message' => 'Acceso denegado'], 403);
        }

        $query = DB::table('bitacora')->orderBy('fecha', 'desc');

        if ($request->filled('accion')) {
            $query->where('accion', $request->accion);
        }
        if ($request->filled('usuario')) {
            $query->where('nombre_usuario', 'ilike', '%' . $request->usuario . '%');
        }

        return response()->json($query->limit(200)->get());
    }
}
