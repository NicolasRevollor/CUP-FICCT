<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GrupoController extends Controller
{
    public function index()
    {
        $grupos = DB::table('grupos as g')
            ->leftJoin('horarios as h', 'h.idgrupo', '=', 'g.idgrupo')
            ->leftJoin('aulas as a', 'a.idaulas', '=', 'h.idaula')
            ->select(
                'g.idgrupo',
                'g.nombregrupo',
                'g.capacidadmaxima',
                'g.cantidadestudiante',
                'g.turno',
                'a.nombre as aula',
                'h.horarioinicio',
                'h.horariofin',
                'h.dias'
            )
            ->orderBy('g.turno')
            ->orderBy('g.idgrupo')
            ->get();

        return response()->json($grupos);
    }

    public function postulantes(int $id)
    {
        $postulantes = DB::table('grupopostulantes as gp')
            ->join('postulante as p', 'p.idpostulante', '=', 'gp.idpostulante')
            ->where('gp.idgrupo', $id)
            ->where('gp.estado', 'ACTIVO')
            ->select(
                'p.idpostulante',
                'p.ci',
                'p.nombres',
                'p.apellidos',
                'p.estadopostulante',
                'p.promedio_final',
                'gp.fechaasignacion'
            )
            ->orderBy('p.apellidos')
            ->get();

        return response()->json($postulantes);
    }

    public function asignar(Request $request)
    {
        $request->validate([
            'idpostulante' => 'required|integer',
            'idgrupo'      => 'required|integer',
        ]);

        $postulante = DB::table('postulante')
            ->where('idpostulante', $request->idpostulante)
            ->first();

        if (!$postulante) {
            return response()->json(['message' => 'Postulante no encontrado'], 404);
        }

        $existe = DB::table('grupopostulantes')
            ->where('idpostulante', $request->idpostulante)
            ->where('idgrupo', $request->idgrupo)
            ->where('estado', 'ACTIVO')
            ->exists();

        if ($existe) {
            return response()->json(['message' => 'El postulante ya está asignado a este grupo'], 400);
        }

        DB::transaction(function () use ($request) {
            $grupo = DB::table('grupos')
                ->where('idgrupo', $request->idgrupo)
                ->lockForUpdate()
                ->first();

            if (!$grupo) {
                throw new \Exception('Grupo no encontrado');
            }

            if ($grupo->cantidadestudiante >= $grupo->capacidadmaxima) {
                throw new \Exception('El grupo ya alcanzó su capacidad máxima');
            }

            DB::table('grupopostulantes')->insert([
                'idpostulante'    => $request->idpostulante,
                'idgrupo'         => $request->idgrupo,
                'fechaasignacion' => now(),
                'estado'          => 'ACTIVO',
            ]);
            // TRIGGER 4 (AFTER INSERT en grupopostulantes) incrementa cantidadestudiante automáticamente
        });

        return response()->json(['message' => 'Postulante asignado correctamente'], 201);
    }

    public function retirar(Request $request, int $id)
    {
        $asignacion = DB::table('grupopostulantes')
            ->where('idpostulante', $request->idpostulante)
            ->where('idgrupo', $id)
            ->where('estado', 'ACTIVO')
            ->first();

        if (!$asignacion) {
            return response()->json(['message' => 'El postulante no está asignado a este grupo'], 404);
        }

        DB::transaction(function () use ($request, $id) {
            // Soft delete: UPDATE en lugar de DELETE → trigger 4 no se activa (escucha DELETE)
            // Por eso decrementamos manualmente
            DB::table('grupopostulantes')
                ->where('idpostulante', $request->idpostulante)
                ->where('idgrupo', $id)
                ->update(['estado' => 'RETIRADO']);

            DB::table('grupos')
                ->where('idgrupo', $id)
                ->decrement('cantidadestudiante');
        });

        return response()->json(['message' => 'Postulante retirado del grupo']);
    }
}
