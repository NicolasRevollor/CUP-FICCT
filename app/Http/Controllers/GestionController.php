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
            'anio'        => 'required|integer|min:2000|max:2100',
            'periodo'     => 'required|string|max:20',
            'fechainicio' => 'required|date',
            'fechafin'    => 'nullable|date|after_or_equal:fechainicio',
            'estado'      => 'sometimes|string|max:20',
        ]);

        $existe = DB::table('gestion')
            ->where('anio', $request->anio)
            ->where('periodo', $request->periodo)
            ->exists();

        if ($existe) {
            return response()->json(['message' => 'Ya existe una gestión con ese año y período'], 400);
        }

        $id = DB::table('gestion')->insertGetId([
            'anio'        => $request->anio,
            'periodo'     => $request->periodo,
            'fechainicio' => $request->fechainicio,
            'fechafin'    => $request->fechafin,
            'estado'      => $request->estado ?? 'ACTIVO',
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
            'anio'        => 'sometimes|integer|min:2000|max:2100',
            'periodo'     => 'sometimes|string|max:20',
            'fechainicio' => 'sometimes|date',
            'fechafin'    => 'nullable|date',
            'estado'      => 'sometimes|string|max:20',
        ]);

        $datos = [];
        if ($request->has('anio'))        $datos['anio']        = $request->anio;
        if ($request->has('periodo'))     $datos['periodo']     = $request->periodo;
        if ($request->has('fechainicio')) $datos['fechainicio'] = $request->fechainicio;
        if ($request->has('fechafin'))    $datos['fechafin']    = $request->fechafin;
        if ($request->has('estado'))      $datos['estado']      = $request->estado;

        if (!empty($datos)) {
            DB::table('gestion')->where('idgestion', $id)->update($datos);
        }

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
