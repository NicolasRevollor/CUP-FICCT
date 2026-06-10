<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * CU-03 — Registro y gestión de postulantes
 * CRUD completo sobre la tabla postulante.
 * Permite registrar, buscar (por CI o nombre), ver, actualizar y eliminar postulantes.
 * El estado inicial es PENDIENTE; los triggers de PostgreSQL lo actualizan a
 * APROBADO o REPROBADO al registrar notas.
 */
class PostulanteController extends Controller
{
    // Listar todos los postulantes
    public function index()
    {
        $postulantes = DB::table('postulante')
            ->orderBy('idpostulante')
            ->paginate(20);

        return response()->json($postulantes);
    }

    // Buscar postulante por CI o nombre
    public function buscar(Request $request)
    {
        $query = $request->query('q');

        $postulantes = DB::table('postulante')
            ->where('ci', 'ilike', "%$query%")
            ->orWhere('nombres', 'ilike', "%$query%")
            ->orWhere('apellidos', 'ilike', "%$query%")
            ->orderBy('idpostulante')
            ->paginate(20);

        return response()->json($postulantes);
    }

    // Ver un postulante
    public function show($id)
    {
        $postulante = DB::table('postulante')
            ->where('idpostulante', $id)
            ->first();

        if (!$postulante) {
            return response()->json(['message' => 'Postulante no encontrado'], 404);
        }

        return response()->json($postulante);
    }

    // Registrar postulante
    public function store(Request $request)
{
    $request->validate([
    'ci'          => 'required|unique:postulante,ci',
    'nombres'     => 'required',
    'apellidos'   => 'required',
    'sexo'        => 'required|in:M,F',
    'correo'      => 'required|email|unique:postulante,correo',
    'tituloBachiller' => 'required|boolean|accepted',
]);

    DB::table('postulante')->insert([
        'ci'                 => $request->ci,
        'nombres'            => $request->nombres,
        'apellidos'          => $request->apellidos,
        'sexo'               => $request->sexo,
        'direccion'          => $request->direccion,
        'telefono'           => $request->telefono,
        'correo'             => $request->correo,
        'colegioprocedencia' => $request->colegioProcedencia,
        'ciudad'             => $request->ciudad,
        'titulobachiller'    => $request->tituloBachiller ?? false,
        'otrosrequisitos'    => $request->otrosRequisitos,
        'estadopostulante'   => 'PENDIENTE',
        'promedio_final'     => 0,
    ]);

    return response()->json([
        'message' => 'Postulante registrado correctamente'
    ], 201);
}

    // Actualizar postulante
   public function update(Request $request, $id)
{
    $postulante = DB::table('postulante')->where('idpostulante', $id)->first();

    if (!$postulante) {
        return response()->json(['message' => 'Postulante no encontrado'], 404);
    }

    $datos = [
        'nombres'            => $request->nombres,
        'apellidos'          => $request->apellidos,
        'sexo'               => $request->sexo,
        'direccion'          => $request->direccion,
        'telefono'           => $request->telefono,
        'correo'             => $request->correo,
        'colegioprocedencia' => $request->colegioProcedencia,
        'ciudad'             => $request->ciudad,
        'titulobachiller'    => $request->tituloBachiller ?? false,
        'otrosrequisitos'    => $request->otrosRequisitos,
    ];

    if ($request->has('idusuario')) {
        $datos['idusuario'] = $request->idusuario ?: null;
    }

    DB::table('postulante')->where('idpostulante', $id)->update($datos);

    return response()->json(['message' => 'Postulante actualizado correctamente']);
}

    // Vincular postulante a su usuario por correo coincidente
    public function vincularUsuario($id)
    {
        $postulante = DB::table('postulante')->where('idpostulante', $id)->first();
        if (!$postulante) return response()->json(['message' => 'Postulante no encontrado'], 404);

        $usuario = DB::table('usuario')->where('email', $postulante->correo)->first();
        if (!$usuario) {
            return response()->json(['message' => 'No existe ningún usuario con el correo ' . $postulante->correo], 404);
        }

        DB::table('postulante')
            ->where('idpostulante', $id)
            ->update(['idusuario' => $usuario->idusuario]);

        return response()->json(['message' => 'Usuario vinculado correctamente', 'idusuario' => $usuario->idusuario]);
    }

    // Eliminar postulante
    public function destroy($id)
    {
        $postulante = DB::table('postulante')->where('idpostulante', $id)->first();

        if (!$postulante) {
            return response()->json(['message' => 'Postulante no encontrado'], 404);
        }

        DB::table('postulante')->where('idpostulante', $id)->delete();

        return response()->json(['message' => 'Postulante eliminado correctamente']);
    }
}