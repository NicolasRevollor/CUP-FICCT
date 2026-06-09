<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EstudianteController extends Controller
{
    private function postulante(Request $request)
    {
        return DB::table('postulante')
            ->where('idusuario', $request->user()->idusuario)
            ->first();
    }

    public function perfil(Request $request)
    {
        $p = $this->postulante($request);
        if (!$p) return response()->json(['message' => 'Perfil no encontrado'], 404);
        return response()->json($p);
    }

    public function miGrupo(Request $request)
    {
        $p = $this->postulante($request);
        if (!$p) return response()->json(['message' => 'Perfil no encontrado'], 404);

        $grupo = DB::table('grupopostulantes as gp')
            ->join('grupos as g', 'g.idgrupo', '=', 'gp.idgrupo')
            ->leftJoin('docentegrupomateria as dgm', 'dgm.idgrupo', '=', 'gp.idgrupo')
            ->leftJoin('docente as d', 'd.iddocente', '=', 'dgm.iddocente')
            ->leftJoin('materia as m', 'm.idmateria', '=', 'dgm.idmateria')
            ->where('gp.idpostulante', $p->idpostulante)
            ->where('gp.estado', 'ACTIVO')
            ->select(
                'g.idgrupo',
                'g.nombre as grupo_nombre',
                'g.cantidadestudiante',
                'd.nombres as docente_nombres',
                'd.apellidos as docente_apellidos',
                'm.nombre as materia_nombre'
            )
            ->first();

        return response()->json($grupo);
    }

    public function misExamenes(Request $request)
    {
        $p = $this->postulante($request);
        if (!$p) return response()->json(['message' => 'Perfil no encontrado'], 404);

        $examenes = DB::table('examen as e')
            ->leftJoin('materia as m', 'm.idmateria', '=', 'e.idmateria')
            ->where('e.idpostulante', $p->idpostulante)
            ->select('e.*', 'm.nombre as materia_nombre')
            ->orderBy('m.nombre')
            ->get();

        return response()->json($examenes);
    }

    public function miAsistencia(Request $request)
    {
        $p = $this->postulante($request);
        if (!$p) return response()->json(['message' => 'Perfil no encontrado'], 404);

        $asistencia = DB::table('asistencia as a')
            ->leftJoin('grupos as g', 'g.idgrupo', '=', 'a.idgrupo')
            ->where('a.idpostulante', $p->idpostulante)
            ->select('a.*', 'g.nombre as grupo_nombre')
            ->orderBy('a.fecha', 'desc')
            ->get();

        return response()->json($asistencia);
    }

    public function subirFoto(Request $request)
    {
        $request->validate(['foto' => 'required|string']);

        $p = $this->postulante($request);
        if (!$p) return response()->json(['message' => 'Perfil no encontrado'], 404);

        DB::table('postulante')
            ->where('idpostulante', $p->idpostulante)
            ->update(['foto' => $request->foto]);

        return response()->json(['message' => 'Foto actualizada correctamente']);
    }
}
