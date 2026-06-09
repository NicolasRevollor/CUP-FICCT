<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;

/**
 * CU-16 — Reportes y estadísticas
 * Implementados: lista general, aprobados, reprobados, estadísticas por materia,
 * grupos con aprobados, admisión por cupos (1ra y 2da opción de carrera), reporte de admitidos.
 * También incluye: docentes por grupo (docentesPorGrupo).
 */
class ReporteController extends Controller
{
    // Dashboard estadísticas reales
    public function dashboard()
    {
        $total_inscritos  = DB::table('postulante')->count();
        $total_aprobados  = DB::table('postulante')->where('estadopostulante', 'APROBADO')->count();
        $total_reprobados = DB::table('postulante')->where('estadopostulante', 'REPROBADO')->count();
        $total_pendientes = DB::table('postulante')->where('estadopostulante', 'PENDIENTE')->count();
        $total_grupos     = DB::table('grupos')->count();

        return response()->json([
            'total_inscritos'  => $total_inscritos,
            'total_aprobados'  => $total_aprobados,
            'total_reprobados' => $total_reprobados,
            'total_pendientes' => $total_pendientes,
            'total_grupos'     => $total_grupos,
        ]);
    }

    // Lista general de postulantes
    public function postulantes()
    {
        $postulantes = DB::table('postulante')
            ->select('ci', 'nombres', 'apellidos', 'ciudad', 'estadopostulante', 'promedio_final')
            ->orderBy('apellidos')
            ->get();

        return response()->json($postulantes);
    }

    // Postulantes aprobados
    public function aprobados()
{
    $aprobados = DB::table('postulante')
        ->where('estadopostulante', 'APROBADO')
        ->select('ci', 'nombres', 'apellidos', 'ciudad', 'promedio_final', 'estadopostulante')
        ->orderBy('promedio_final', 'desc')
        ->get();

    return response()->json($aprobados);
}

    // Postulantes reprobados
    public function reprobados()
{
    $reprobados = DB::table('postulante')
        ->where('estadopostulante', 'REPROBADO')
        ->select('ci', 'nombres', 'apellidos', 'ciudad', 'promedio_final', 'estadopostulante')
        ->orderBy('promedio_final', 'desc')
        ->get();

    return response()->json($reprobados);
}

    // Estadísticas por materia
    public function estadisticasMateria()
    {
        $estadisticas = DB::table('examen as e')
            ->join('materia as m', 'm.idmateria', '=', 'e.idmateria')
            ->select(
                'm.nombre as materia',
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN e.estado = \'APROBADO\' THEN 1 ELSE 0 END) as aprobados'),
                DB::raw('SUM(CASE WHEN e.estado = \'REPROBADO\' THEN 1 ELSE 0 END) as reprobados'),
                DB::raw('ROUND(AVG(e.promedio), 2) as promedio_general')
            )
            ->groupBy('m.nombre', 'm.idmateria')
            ->orderBy('m.idmateria')
            ->get();

        return response()->json($estadisticas);
    }

    // Grupos con cantidad de aprobados
    public function gruposAprobados()
    {
        $grupos = DB::table('grupos as g')
            ->leftJoin('grupopostulantes as gp', 'gp.idgrupo', '=', 'g.idgrupo')
            ->leftJoin('postulante as p', 'p.idpostulante', '=', 'gp.idpostulante')
            ->select(
                'g.nombregrupo',
                'g.turno',
                'g.capacidadmaxima',
                DB::raw('COUNT(gp.idpostulante) as total_estudiantes'),
                DB::raw('SUM(CASE WHEN p.estadopostulante = \'APROBADO\' THEN 1 ELSE 0 END) as aprobados'),
                DB::raw('SUM(CASE WHEN p.estadopostulante = \'REPROBADO\' THEN 1 ELSE 0 END) as reprobados')
            )
            ->groupBy('g.idgrupo', 'g.nombregrupo', 'g.turno', 'g.capacidadmaxima')
            ->orderBy('aprobados', 'desc')
            ->get();

        return response()->json($grupos);
    }
    // Docentes asignados por grupo (CU-16 faltante)
    public function docentesPorGrupo()
    {
        $resultado = DB::table('docentegrupomateria as dgm')
            ->join('docente as d',  'd.iddocente',  '=', 'dgm.iddocente')
            ->join('grupos as g',   'g.idgrupo',    '=', 'dgm.idgrupo')
            ->join('materia as m',  'm.idmateria',  '=', 'dgm.idmateria')
            ->where('dgm.estado', 'ACTIVO')
            ->select(
                'g.idgrupo',
                'g.nombregrupo',
                'g.turno',
                'd.iddocente',
                DB::raw("d.nombres || ' ' || d.apellidos as docente"),
                'm.nombre as materia'
            )
            ->orderBy('g.idgrupo')
            ->orderBy('m.idmateria')
            ->get();

        return response()->json($resultado);
    }

    // Lógica de admisión por cupos y promedio
public function admision()
{
    // Obtener carreras con sus cupos
    $carreras = DB::table('carrera')->get();

    $resultado = [];

    foreach ($carreras as $carrera) {
        // Obtener aprobados que eligieron esta carrera como 1ra opción
        // ordenados por promedio de mayor a menor
        $postulantes1ra = DB::table('postulante as p')
            ->join('carreraadmitida as ca', function($join) use ($carrera) {
                $join->on('ca.idpostulante', '=', 'p.idpostulante')
                     ->where('ca.idcarrera', '=', $carrera->idcarrera)
                     ->where('ca.opcion', '=', 1);
            })
            ->where('p.estadopostulante', 'APROBADO')
            ->select('p.idpostulante', 'p.ci', 'p.nombres', 'p.apellidos', 'p.promedio_final')
            ->orderBy('p.promedio_final', 'desc')
            ->get();

        $admitidos1ra = 0;
        foreach ($postulantes1ra as $p) {
            if ($admitidos1ra < $carrera->cupomaximo) {
                // Admitir en 1ra opción
                DB::table('carreraadmitida')
                    ->where('idpostulante', $p->idpostulante)
                    ->where('idcarrera', $carrera->idcarrera)
                    ->where('opcion', 1)
                    ->update(['estadoadmision' => 'ADMITIDO']);
                $admitidos1ra++;
            } else {
                // Cupo lleno, derivar a 2da opción
                $segunda = DB::table('carreraadmitida')
                    ->where('idpostulante', $p->idpostulante)
                    ->where('opcion', 2)
                    ->first();

                if ($segunda) {
                    // Contar admitidos en la 2da opción
                    $admitidos2da = DB::table('carreraadmitida')
                        ->where('idcarrera', $segunda->idcarrera)
                        ->where('estadoadmision', 'ADMITIDO')
                        ->count();

                    $cupo2da = DB::table('carrera')
                        ->where('idcarrera', $segunda->idcarrera)
                        ->value('cupomaximo');

                    if ($admitidos2da < $cupo2da) {
                        DB::table('carreraadmitida')
                            ->where('idpostulante', $p->idpostulante)
                            ->where('opcion', 2)
                            ->update(['estadoadmision' => 'ADMITIDO']);
                    } else {
                        // Ambas opciones llenas
                        DB::table('carreraadmitida')
                            ->where('idpostulante', $p->idpostulante)
                            ->update(['estadoadmision' => 'NO_ADMITIDO']);
                    }
                }
            }
        }

        $resultado[] = [
            'carrera'    => $carrera->nombre,
            'cupo'       => $carrera->cupomaximo,
            'admitidos'  => $admitidos1ra,
            'disponibles'=> $carrera->cupomaximo - $admitidos1ra,
        ];
    }

    return response()->json($resultado);
}

// Reporte de admisión final
public function reporteAdmision()
{
    $admitidos = DB::table('carreraadmitida as ca')
        ->join('postulante as p', 'p.idpostulante', '=', 'ca.idpostulante')
        ->join('carrera as c', 'c.idcarrera', '=', 'ca.idcarrera')
        ->where('ca.estadoadmision', 'ADMITIDO')
        ->select(
            'p.ci',
            'p.nombres',
            'p.apellidos',
            'p.promedio_final',
            'c.nombre as carrera',
            'ca.opcion',
            'ca.estadoadmision'
        )
        ->orderBy('c.nombre')
        ->orderBy('p.promedio_final', 'desc')
        ->get();

    return response()->json($admitidos);
}
    
}