<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * CU-12 — Gestión de aulas y horarios
 * Administra las aulas disponibles (tabla aulas) y los horarios asignados a cada grupo
 * (tabla horarios). Los grupos referencian horarios vía JOIN — ya existían en BD pero
 * no tenían endpoints de gestión.
 */
class AulaController extends Controller
{
    // ── Aulas ──────────────────────────────────────────────────

    public function index()
    {
        $aulas = DB::table('aulas')->orderBy('nombre')->get();
        return response()->json($aulas);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombre'    => 'required|string|max:100|unique:aulas,nombre',
            'capacidad' => 'nullable|integer|min:1',
            'ubicacion' => 'nullable|string|max:200',
        ]);

        $id = DB::table('aulas')->insertGetId([
            'nombre'    => $request->nombre,
            'capacidad' => $request->capacidad,
            'ubicacion' => $request->ubicacion,
        ], 'idaulas');

        return response()->json(['message' => 'Aula creada correctamente', 'idaulas' => $id], 201);
    }

    public function update(Request $request, int $id)
    {
        $aula = DB::table('aulas')->where('idaulas', $id)->first();
        if (!$aula) {
            return response()->json(['message' => 'Aula no encontrada'], 404);
        }

        $request->validate([
            'nombre'    => 'required|string|max:100',
            'capacidad' => 'nullable|integer|min:1',
            'ubicacion' => 'nullable|string|max:200',
        ]);

        DB::table('aulas')->where('idaulas', $id)->update([
            'nombre'    => $request->nombre,
            'capacidad' => $request->capacidad,
            'ubicacion' => $request->ubicacion,
        ]);

        return response()->json(['message' => 'Aula actualizada correctamente']);
    }

    public function destroy(int $id)
    {
        $aula = DB::table('aulas')->where('idaulas', $id)->first();
        if (!$aula) {
            return response()->json(['message' => 'Aula no encontrada'], 404);
        }

        // Verificar que el aula no tenga horarios asignados
        $enUso = DB::table('horarios')->where('idaula', $id)->exists();
        if ($enUso) {
            return response()->json(['message' => 'No se puede eliminar: el aula tiene horarios asignados'], 400);
        }

        DB::table('aulas')->where('idaulas', $id)->delete();
        return response()->json(['message' => 'Aula eliminada correctamente']);
    }

    // ── Horarios ───────────────────────────────────────────────

    public function horarios()
    {
        $horarios = DB::table('horarios as h')
            ->leftJoin('aulas as a', 'a.idaulas', '=', 'h.idaula')
            ->leftJoin('grupos as g', 'g.idgrupo', '=', 'h.idgrupo')
            ->select(
                'h.idhorario',
                'g.nombregrupo',
                'a.nombre as aula',
                'h.horarioinicio',
                'h.horariofin',
                'h.dias'
            )
            ->orderBy('g.idgrupo')
            ->get();

        return response()->json($horarios);
    }

    public function storeHorario(Request $request)
    {
        $request->validate([
            'idgrupo'       => 'required|integer|exists:grupos,idgrupo',
            'idaula'        => 'required|integer|exists:aulas,idaulas',
            'horarioinicio' => 'required|date_format:H:i',
            'horariofin'    => 'required|date_format:H:i|after:horarioinicio',
            'dias'          => 'required|string|max:100',
        ]);

        // Un grupo solo puede tener un horario activo
        $existe = DB::table('horarios')->where('idgrupo', $request->idgrupo)->exists();
        if ($existe) {
            return response()->json(['message' => 'El grupo ya tiene un horario asignado. Actualiza el existente.'], 400);
        }

        $id = DB::table('horarios')->insertGetId([
            'idgrupo'       => $request->idgrupo,
            'idaula'        => $request->idaula,
            'horarioinicio' => $request->horarioinicio,
            'horariofin'    => $request->horariofin,
            'dias'          => $request->dias,
        ], 'idhorario');

        return response()->json(['message' => 'Horario asignado correctamente', 'idhorario' => $id], 201);
    }

    public function updateHorario(Request $request, int $id)
    {
        $horario = DB::table('horarios')->where('idhorario', $id)->first();
        if (!$horario) {
            return response()->json(['message' => 'Horario no encontrado'], 404);
        }

        $request->validate([
            'idaula'        => 'required|integer|exists:aulas,idaulas',
            'horarioinicio' => 'required|date_format:H:i',
            'horariofin'    => 'required|date_format:H:i|after:horarioinicio',
            'dias'          => 'required|string|max:100',
        ]);

        DB::table('horarios')->where('idhorario', $id)->update([
            'idaula'        => $request->idaula,
            'horarioinicio' => $request->horarioinicio,
            'horariofin'    => $request->horariofin,
            'dias'          => $request->dias,
        ]);

        return response()->json(['message' => 'Horario actualizado correctamente']);
    }
}
