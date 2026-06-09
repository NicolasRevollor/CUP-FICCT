<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * CU-06 — Registro de notas por materia
 * Registra y actualiza las tres notas (nota1, nota2, nota3) de un postulante por materia.
 * El promedio y estado (APROBADO/REPROBADO) son calculados automáticamente por TRIGGER 1.
 * El promedio_final del postulante y su estadopostulante son actualizados por TRIGGER 2.
 * Las materias disponibles se gestionan en MateriaController.
 * IMPORTANTE: verificar que los nombres en la tabla materia coincidan con los definidos
 * en el plan de estudios del programa (generalmente: Matemáticas, Física, Inglés, Computación).
 */
class ExamenController extends Controller
{
    public function index(int $idPostulante)
    {
        $examenes = DB::table('examen as e')
            ->join('materia as m', 'm.idmateria', '=', 'e.idmateria')
            ->where('e.idpostulante', $idPostulante)
            ->select(
                'e.idexamen',
                'e.idmateria',
                'm.nombre as materia',
                'e.nota1',
                'e.nota2',
                'e.nota3',
                'e.promedio',   // calculado por TRIGGER 1: (n1*0.30)+(n2*0.30)+(n3*0.40)
                'e.estado'      // seteado por TRIGGER 1: APROBADO/REPROBADO
            )
            ->get();

        return response()->json($examenes);
    }

    public function store(Request $request)
    {
        $request->validate([
            'idpostulante' => 'required|integer',
            'idmateria'    => 'required|integer',
            'nota1'        => 'required|numeric|min:0|max:100',
            'nota2'        => 'required|numeric|min:0|max:100',
            'nota3'        => 'required|numeric|min:0|max:100',
        ]);

        $existe = DB::table('examen')
            ->where('idpostulante', $request->idpostulante)
            ->where('idmateria', $request->idmateria)
            ->exists();

        if ($existe) {
            return response()->json(['message' => 'Ya existe un examen registrado para esta materia'], 400);
        }

        $nota = DB::table('nota')->first();
        if (!$nota) {
            return response()->json(['message' => 'No hay configuración de notas en el sistema'], 500);
        }

        // TRIGGER 1 (BEFORE INSERT) setea promedio y estado automáticamente
        // TRIGGER 2 (AFTER INSERT) actualiza promedio_final y estadopostulante del postulante
        DB::table('examen')->insert([
            'idpostulante' => $request->idpostulante,
            'idmateria'    => $request->idmateria,
            'idnota'       => $nota->idnota,
            'nota1'        => $request->nota1,
            'nota2'        => $request->nota2,
            'nota3'        => $request->nota3,
        ]);

        return response()->json(['message' => 'Notas registradas correctamente'], 201);
    }

    public function update(Request $request, int $id)
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

        // TRIGGER 1 (BEFORE UPDATE) recalcula promedio y estado automáticamente
        // TRIGGER 2 (AFTER UPDATE) actualiza el postulante automáticamente
        DB::table('examen')->where('idexamen', $id)->update([
            'nota1' => $request->nota1,
            'nota2' => $request->nota2,
            'nota3' => $request->nota3,
        ]);

        return response()->json(['message' => 'Notas actualizadas correctamente']);
    }

    public function reporteMateria(int $idMateria)
    {
        $reporte = DB::table('examen as e')
            ->join('postulante as p', 'p.idpostulante', '=', 'e.idpostulante')
            ->join('materia as m', 'm.idmateria', '=', 'e.idmateria')
            ->where('e.idmateria', $idMateria)
            ->select(
                'p.ci', 'p.nombres', 'p.apellidos',
                'e.nota1', 'e.nota2', 'e.nota3',
                'e.promedio', 'e.estado'
            )
            ->orderBy('e.promedio', 'desc')
            ->get();

        return response()->json($reporte);
    }
}
