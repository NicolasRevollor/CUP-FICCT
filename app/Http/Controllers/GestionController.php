<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GestionController extends Controller
{
    public function index()
    {
        return response()->json(
            DB::table('gestion')->orderBy('anio', 'desc')->orderBy('idgestion', 'desc')->get()
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'anio'    => 'required|integer|min:2000|max:2100',
            'periodo' => 'required|string|max:20',
        ]);

        $existe = DB::table('gestion')
            ->where('anio', $request->anio)
            ->where('periodo', $request->periodo)
            ->exists();

        if ($existe) {
            return response()->json(['message' => 'Ya existe una gestión con ese año y período'], 400);
        }

        $id = DB::table('gestion')->insertGetId([
            'anio'    => $request->anio,
            'periodo' => $request->periodo,
            'activo'  => $request->boolean('activo', true),
        ], 'idgestion');

        return response()->json(['message' => 'Gestión creada correctamente', 'idgestion' => $id], 201);
    }

    public function update(Request $request, int $id)
    {
        $gestion = DB::table('gestion')->where('idgestion', $id)->first();
        if (!$gestion) {
            return response()->json(['message' => 'Gestión no encontrada'], 404);
        }

        $request->validate([
            'anio'    => 'sometimes|integer|min:2000|max:2100',
            'periodo' => 'sometimes|string|max:20',
            'activo'  => 'sometimes|boolean',
        ]);

        DB::table('gestion')->where('idgestion', $id)->update(array_filter([
            'anio'    => $request->anio,
            'periodo' => $request->periodo,
            'activo'  => $request->has('activo') ? $request->boolean('activo') : null,
        ], fn($v) => $v !== null));

        return response()->json(['message' => 'Gestión actualizada correctamente']);
    }

    public function destroy(int $id)
    {
        $enUso = DB::table('inscripcion')->where('gestion', $id)->exists();
        if ($enUso) {
            return response()->json(['message' => 'No se puede eliminar: hay inscripciones asociadas a esta gestión'], 400);
        }

        DB::table('gestion')->where('idgestion', $id)->delete();
        return response()->json(['message' => 'Gestión eliminada correctamente']);
    }
}
