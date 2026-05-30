<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

    DB::table('postulante')->where('idpostulante', $id)->update([
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
    ]);

    return response()->json(['message' => 'Postulante actualizado correctamente']);
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