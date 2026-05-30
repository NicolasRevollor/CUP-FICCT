<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GrupoController extends Controller
{
    // Listar todos los grupos con sus horarios
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

    // Listar postulantes de un grupo
    public function postulantes($id)
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

    // Asignar postulante a grupo
    public function asignar(Request $request)
    {
        $request->validate([
            'idpostulante' => 'required',
            'idgrupo'      => 'required',
        ]);

        // Verificar que el postulante existe
        $postulante = DB::table('postulante')
            ->where('idpostulante', $request->idpostulante)
            ->first();

        if (!$postulante) {
            return response()->json(['message' => 'Postulante no encontrado'], 404);
        }

        // Verificar que no esté ya asignado a este grupo
        $existe = DB::table('grupopostulantes')
            ->where('idpostulante', $request->idpostulante)
            ->where('idgrupo', $request->idgrupo)
            ->first();

        if ($existe) {
            return response()->json(['message' => 'El postulante ya está asignado a este grupo'], 400);
        }

        // Verificar capacidad del grupo
        $grupo = DB::table('grupos')
            ->where('idgrupo', $request->idgrupo)
            ->first();

        if ($grupo->cantidadestudiante >= $grupo->capacidadmaxima) {
            return response()->json(['message' => 'El grupo ya alcanzó su capacidad máxima'], 400);
        }

        // Asignar postulante al grupo
        DB::table('grupopostulantes')->insert([
            'idpostulante'   => $request->idpostulante,
            'idgrupo'        => $request->idgrupo,
            'fechaasignacion'=> now(),
            'estado'         => 'ACTIVO',
        ]);

        return response()->json(['message' => 'Postulante asignado correctamente'], 201);
    }

    // Retirar postulante de un grupo
    public function retirar(Request $request, $id)
    {
        DB::table('grupopostulantes')
            ->where('idpostulante', $request->idpostulante)
            ->where('idgrupo', $id)
            ->update(['estado' => 'RETIRADO']);

        return response()->json(['message' => 'Postulante retirado del grupo']);
    }
}