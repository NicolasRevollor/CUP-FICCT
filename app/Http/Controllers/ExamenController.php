<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExamenController extends Controller
{
    // Listar examenes de un postulante
    public function index($idPostulante)
    {
        $examenes = DB::table('examen as e')
            ->join('materia as m', 'm.idmateria', '=', 'e.idmateria')
            ->where('e.idpostulante', $idPostulante)
            ->select(
                'e.idexamen',
                'm.nombre as materia',
                'e.nota1',
                'e.nota2',
                'e.nota3',
                'e.promedio',
                'e.estado'
            )
            ->get();

        return response()->json($examenes);
    }

    // Registrar notas de un examen
    public function store(Request $request)
    {
        $request->validate([
            'idpostulante' => 'required',
            'idmateria'    => 'required',
            'nota1'        => 'required|numeric|min:0|max:100',
            'nota2'        => 'required|numeric|min:0|max:100',
            'nota3'        => 'required|numeric|min:0|max:100',
        ]);

        // Verificar si ya existe examen para esta materia
        $existe = DB::table('examen')
            ->where('idpostulante', $request->idpostulante)
            ->where('idmateria', $request->idmateria)
            ->first();

        if ($existe) {
            return response()->json([
                'message' => 'Ya existe un examen registrado para esta materia'
            ], 400);
        }

        // Obtener nota del sistema
        $nota = DB::table('nota')->first();

        DB::table('examen')->insert([
    'idpostulante' => $request->idpostulante,
    'idmateria'    => $request->idmateria,
    'idnota'       => $nota->idnota,
    'nota1'        => $request->nota1,
    'nota2'        => $request->nota2,
    'nota3'        => $request->nota3,
]);

        return response()->json([
            'message' => 'Notas registradas correctamente'
        ], 201);
    }

    // Actualizar notas
    public function update(Request $request, $id)
    {
        $request->validate([
            'nota1' => 'required|numeric|min:0|max:100',
            'nota2' => 'required|numeric|min:0|max:100',
            'nota3' => 'required|numeric|min:0|max:100',
        ]);

        $examen = DB::table('examen')->where('idexamen', $id)->first();

        if (!$examen) {
            return response()->json(['message' => 'Examen no encontrado'], 404);
        }

        DB::table('examen')->where('idexamen', $id)->update([
            'nota1' => $request->nota1,
            'nota2' => $request->nota2,
            'nota3' => $request->nota3,
        ]);

        return response()->json(['message' => 'Notas actualizadas correctamente']);
    }

    // Reporte de examenes por materia
    public function reporteMateria($idMateria)
    {
        $reporte = DB::table('examen as e')
            ->join('postulante as p', 'p.idpostulante', '=', 'e.idpostulante')
            ->join('materia as m', 'm.idmateria', '=', 'e.idmateria')
            ->where('e.idmateria', $idMateria)
            ->select(
                'p.ci',
                'p.nombres',
                'p.apellidos',
                'e.nota1',
                'e.nota2',
                'e.nota3',
                'e.promedio',
                'e.estado'
            )
            ->orderBy('e.promedio', 'desc')
            ->get();

        return response()->json($reporte);
    }
}