<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * CU-09 — Gestión de grupos
 * Lista grupos existentes (con aula y horario via JOIN) y permite asignar/retirar postulantes.
 * Los grupos NO se crean desde la app — se insertan directamente en BD.
 * La capacidad máxima se respeta: no se permite asignar si el grupo ya está lleno.
 *
 * CU-10 — Asignación de postulantes a grupos
 * La asignación es manual: el funcionario elige el grupo para cada postulante.
 * NO existe cálculo automático de grupos necesarios.
 * TRIGGER 4 (AFTER INSERT en grupopostulantes) incrementa cantidadestudiante automáticamente.
 *
 * CU-07 — Triggers de PostgreSQL (referencia)
 * T1: BEFORE INSERT/UPDATE en examen → calcula promedio y estado.
 * T2: AFTER INSERT/UPDATE en examen  → actualiza promedio_final y estadopostulante del postulante.
 * T4: AFTER INSERT en grupopostulantes → incrementa cantidadestudiante en grupos.
 */
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

    public function examenesGrupo(int $idGrupo, int $idMateria)
    {
        $examenes = DB::table('examen as e')
            ->join('grupopostulantes as gp', 'gp.idpostulante', '=', 'e.idpostulante')
            ->where('gp.idgrupo', $idGrupo)
            ->where('gp.estado', 'ACTIVO')
            ->where('e.idmateria', $idMateria)
            ->select('e.idpostulante', 'e.idexamen', 'e.nota1', 'e.nota2', 'e.nota3', 'e.promedio', 'e.estado')
            ->get()
            ->keyBy('idpostulante');

        return response()->json($examenes);
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
