<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * CU-13 — Registro de asistencia
 * Permite registrar y consultar la asistencia de postulantes por grupo y fecha.
 * Estados posibles: PRESENTE, AUSENTE, JUSTIFICADO.
 * El docente o funcionario autenticado queda como registrado_por.
 */
class AsistenciaController extends Controller
{
    // Listar asistencia de un grupo en una fecha
    public function porGrupo(Request $request, int $idGrupo)
    {
        $request->validate([
            'fecha' => 'required|date',
        ]);

        $asistencia = DB::table('asistencia as a')
            ->join('postulante as p', 'p.idpostulante', '=', 'a.idpostulante')
            ->where('a.idgrupo', $idGrupo)
            ->where('a.fecha', $request->fecha)
            ->select(
                'a.idasistencia',
                'p.ci',
                'p.nombres',
                'p.apellidos',
                'a.estado',
                'a.observacion'
            )
            ->orderBy('p.apellidos')
            ->get();

        return response()->json($asistencia);
    }

    // Resumen de asistencia de un postulante
    public function porPostulante(int $idPostulante)
    {
        $asistencia = DB::table('asistencia')
            ->where('idpostulante', $idPostulante)
            ->orderBy('fecha', 'desc')
            ->get();

        return response()->json($asistencia);
    }

    // Registrar asistencia de múltiples postulantes en una fecha
    public function store(Request $request)
    {
        $request->validate([
            'idgrupo'     => 'required|integer',
            'fecha'       => 'required|date',
            // array de { idpostulante, estado, observacion? }
            'registros'   => 'required|array|min:1',
            'registros.*.idpostulante' => 'required|integer',
            'registros.*.estado'       => 'required|in:PRESENTE,AUSENTE,JUSTIFICADO',
            'registros.*.observacion'  => 'nullable|string',
        ]);

        $grupo = DB::table('grupos')->where('idgrupo', $request->idgrupo)->first();
        if (!$grupo) {
            return response()->json(['message' => 'Grupo no encontrado'], 404);
        }

        $registradoPor = $request->user()->idusuario;
        $insertados    = 0;
        $actualizados  = 0;

        DB::transaction(function () use ($request, $registradoPor, &$insertados, &$actualizados) {
            foreach ($request->registros as $r) {
                $existe = DB::table('asistencia')
                    ->where('idpostulante', $r['idpostulante'])
                    ->where('idgrupo', $request->idgrupo)
                    ->where('fecha', $request->fecha)
                    ->first();

                if ($existe) {
                    // Actualizar si ya fue registrado ese día
                    DB::table('asistencia')
                        ->where('idasistencia', $existe->idasistencia)
                        ->update([
                            'estado'        => $r['estado'],
                            'observacion'   => $r['observacion'] ?? null,
                            'registrado_por' => $registradoPor,
                        ]);
                    $actualizados++;
                } else {
                    DB::table('asistencia')->insert([
                        'idpostulante'   => $r['idpostulante'],
                        'idgrupo'        => $request->idgrupo,
                        'fecha'          => $request->fecha,
                        'estado'         => $r['estado'],
                        'observacion'    => $r['observacion'] ?? null,
                        'registrado_por' => $registradoPor,
                    ]);
                    $insertados++;
                }
            }
        });

        return response()->json([
            'message'      => 'Asistencia registrada correctamente',
            'insertados'   => $insertados,
            'actualizados' => $actualizados,
        ], 201);
    }

    // Actualizar un registro individual
    public function update(Request $request, int $id)
    {
        $registro = DB::table('asistencia')->where('idasistencia', $id)->first();
        if (!$registro) {
            return response()->json(['message' => 'Registro no encontrado'], 404);
        }

        $request->validate([
            'estado'      => 'required|in:PRESENTE,AUSENTE,JUSTIFICADO',
            'observacion' => 'nullable|string',
        ]);

        DB::table('asistencia')->where('idasistencia', $id)->update([
            'estado'         => $request->estado,
            'observacion'    => $request->observacion,
            'registrado_por' => $request->user()->idusuario,
        ]);

        return response()->json(['message' => 'Registro actualizado correctamente']);
    }
}
