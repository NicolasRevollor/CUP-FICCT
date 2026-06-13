<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;

/**
 * ============================================================
 * ReporteController  —  CU-16: Reportes y estadísticas
 * ============================================================
 *
 * ¿QUÉ HACE ESTE CONTROLADOR?
 *   Centraliza todos los reportes de consulta del sistema.
 *   Todos los métodos son de solo lectura (SELECT).
 *   No modifica datos — excepto admision() que actualiza estadoadmision en carreraadmitida.
 *
 * MÉTODO ESPECIAL: admision()
 *   Es el algoritmo central de admisión: asigna a cada postulante APROBADO
 *   a la carrera que le corresponde según cupos y promedio.
 *   Se puede ejecutar múltiples veces (idempotente: reescribe estadoadmision).
 *
 * ENDPOINTS DISPONIBLES:
 *   GET  /api/reportes/dashboard             → dashboard()
 *   GET  /api/reportes/postulantes           → postulantes()
 *   GET  /api/reportes/aprobados             → aprobados()
 *   GET  /api/reportes/reprobados            → reprobados()
 *   GET  /api/reportes/estadisticas-materia  → estadisticasMateria()
 *   GET  /api/reportes/grupos-aprobados      → gruposAprobados()
 *   GET  /api/reportes/docentes-por-grupo    → docentesPorGrupo()
 *   POST /api/reportes/admision              → admision()
 *   GET  /api/reportes/admision              → reporteAdmision()
 */
class ReporteController extends Controller
{
    // ──────────────────────────────────────────────────────────────
    // GET /api/reportes/dashboard
    // ──────────────────────────────────────────────────────────────
    /**
     * Contadores globales para el panel principal del administrador.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /reportes/dashboard
     *   [1] COUNT postulantes (total, aprobados, reprobados, pendientes)
     *   [2] COUNT grupos
     *   [3] → 200 { total_inscritos, total_aprobados, total_reprobados, total_pendientes, total_grupos }
     */
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

    // ──────────────────────────────────────────────────────────────
    // GET /api/reportes/postulantes
    // ──────────────────────────────────────────────────────────────
    /**
     * Lista general de todos los postulantes con estado y promedio.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /reportes/postulantes
     *   [1] SELECT ci, nombres, apellidos, ciudad, estadopostulante, promedio_final
     *       FROM postulante ORDER BY apellidos
     *   [2] → 200 con array completo (sin paginación)
     */
    public function postulantes()
    {
        $postulantes = DB::table('postulante')
            ->select('ci', 'nombres', 'apellidos', 'ciudad', 'estadopostulante', 'promedio_final')
            ->orderBy('apellidos')
            ->get();

        return response()->json($postulantes);
    }

    // ──────────────────────────────────────────────────────────────
    // GET /api/reportes/aprobados
    // ──────────────────────────────────────────────────────────────
    /**
     * Lista de postulantes APROBADOS ordenados por promedio descendente.
     * El estado APROBADO lo asigna TRIGGER 2 automáticamente cuando
     * el promedio ponderado de las 4 materias supera el mínimo.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /reportes/aprobados
     *   [1] SELECT ... FROM postulante WHERE estadopostulante='APROBADO'
     *       ORDER BY promedio_final DESC
     *   [2] → 200 con lista ordenada (el mejor alumno primero)
     */
    public function aprobados()
{
    $aprobados = DB::table('postulante')
        ->where('estadopostulante', 'APROBADO')
        ->select('ci', 'nombres', 'apellidos', 'ciudad', 'promedio_final', 'estadopostulante')
        ->orderBy('promedio_final', 'desc')
        ->get();

    return response()->json($aprobados);
}

    // ──────────────────────────────────────────────────────────────
    // GET /api/reportes/reprobados
    // ──────────────────────────────────────────────────────────────
    /**
     * Lista de postulantes REPROBADOS ordenados por promedio descendente.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /reportes/reprobados
     *   [1] SELECT ... FROM postulante WHERE estadopostulante='REPROBADO'
     *       ORDER BY promedio_final DESC
     *   [2] → 200 con lista
     */
    public function reprobados()
{
    $reprobados = DB::table('postulante')
        ->where('estadopostulante', 'REPROBADO')
        ->select('ci', 'nombres', 'apellidos', 'ciudad', 'promedio_final', 'estadopostulante')
        ->orderBy('promedio_final', 'desc')
        ->get();

    return response()->json($reprobados);
}

    // ──────────────────────────────────────────────────────────────
    // GET /api/reportes/estadisticas-materia
    // ──────────────────────────────────────────────────────────────
    /**
     * Estadísticas agregadas por materia: total examinados, aprobados, reprobados y promedio.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /reportes/estadisticas-materia
     *   [1] examen JOIN materia GROUP BY materia
     *   [2] Calcular: COUNT(*), SUM(APROBADO), SUM(REPROBADO), ROUND(AVG(promedio), 2)
     *   [3] ORDER BY idmateria
     *   [4] → 200 con array de { materia, total, aprobados, reprobados, promedio_general }
     */
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

    // ──────────────────────────────────────────────────────────────
    // GET /api/reportes/grupos-aprobados
    // ──────────────────────────────────────────────────────────────
    /**
     * Reporte de grupos con conteo de aprobados y reprobados.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /reportes/grupos-aprobados
     *   [1] grupos LEFT JOIN grupopostulantes LEFT JOIN postulante
     *       GROUP BY grupo
     *   [2] Calcular: COUNT(postulantes), SUM(APROBADO), SUM(REPROBADO)
     *   [3] ORDER BY aprobados DESC
     *   [4] → 200 con array de { nombregrupo, turno, capacidadmaxima, total_estudiantes, aprobados, reprobados }
     */
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
    // ──────────────────────────────────────────────────────────────
    // GET /api/reportes/docentes-por-grupo
    // ──────────────────────────────────────────────────────────────
    /**
     * Lista qué docente enseña qué materia en cada grupo (asignaciones activas).
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /reportes/docentes-por-grupo
     *   [1] docentegrupomateria JOIN docente JOIN grupos JOIN materia
     *       WHERE dgm.estado = 'ACTIVO'
     *   [2] ORDER BY idgrupo, idmateria
     *   [3] → 200 con array de { idgrupo, nombregrupo, turno, iddocente, docente, materia }
     */
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

    // ──────────────────────────────────────────────────────────────
    // POST /api/reportes/admision
    // ──────────────────────────────────────────────────────────────
    /**
     * Ejecuta el algoritmo de admisión: asigna a cada postulante APROBADO
     * a la carrera que le corresponde según cupo y promedio final.
     *
     * ALGORITMO (por cada carrera):
     *   1. Obtener postulantes APROBADOS que eligieron esta carrera como 1ra opción
     *      ordenados por promedio DESC (el mejor primero)
     *   2. Asignar a los primeros N que quepan en el cupo → estadoadmision='ADMITIDO'
     *   3. Para los que no caben en 1ra opción → intentar su 2da opción:
     *      a. Si hay cupo en la 2da → estadoadmision='ADMITIDO' en opción 2
     *      b. Si tampoco hay cupo → estadoadmision='NO_ADMITIDO' en ambas opciones
     *
     * ¡IMPORTANTE!: Este método ESCRIBE en carreraadmitida.estadoadmision.
     * Se puede ejecutar múltiples veces (sobreescribe el resultado anterior).
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → POST /reportes/admision
     *
     *   LOOP [por cada carrera en tabla carrera]
     *     [1] Obtener aprobados con 1ra opción = esta carrera (ORDER BY promedio DESC)
     *     LOOP [por cada postulante en orden de mérito]
     *       ALT [hay cupo en 1ra opción]
     *         → UPDATE carreraadmitida SET estadoadmision='ADMITIDO' (opción 1)
     *         → admitidos1ra++
     *       ALT [cupo lleno]
     *         [2] Buscar su 2da opción
     *         OPT [tiene 2da opción]
     *           [3] Contar admitidos ya en esa 2da carrera
     *           ALT [hay cupo en 2da opción]
     *             → UPDATE estadoadmision='ADMITIDO' (opción 2)
     *           ALT [2da también llena]
     *             → UPDATE estadoadmision='NO_ADMITIDO' (ambas opciones)
     *     FIN LOOP
     *   FIN LOOP
     *
     *   [4] → 200 con resumen por carrera: { carrera, cupo, admitidos, disponibles }
     */
    public function admision()
    {
        // Resetear todo a PENDIENTE para que el proceso sea idempotente
        // (se puede correr varias veces sin acumular resultados anteriores)
        DB::table('carreraadmitida')->update(['estadoadmision' => 'PENDIENTE']);

        $carreras  = DB::table('carrera')->get();
        $resultado = [];

        foreach ($carreras as $carrera) {
            // Postulantes APROBADOS que eligieron esta carrera como 1ra opción,
            // ordenados de mayor a menor promedio (meritocracia)
            $postulantes1ra = DB::table('postulante as p')
                ->join('carreraadmitida as ca', function ($join) use ($carrera) {
                    $join->on('ca.idpostulante', '=', 'p.idpostulante')
                         ->where('ca.idcarrera', '=', $carrera->idcarrera)
                         ->where('ca.opcion', '=', 1);
                })
                ->where('p.estadopostulante', 'APROBADO')
                ->select('p.idpostulante', 'p.promedio_final')
                ->orderBy('p.promedio_final', 'desc')
                ->get();

            // Leer desde la BD cuántos ya fueron admitidos a esta carrera
            // (pueden venir de 2da opción de carreras procesadas antes en el loop)
            $admitidos = DB::table('carreraadmitida')
                ->where('idcarrera', $carrera->idcarrera)
                ->where('estadoadmision', 'ADMITIDO')
                ->count();

            foreach ($postulantes1ra as $p) {
                if ($admitidos < $carrera->cupomaximo) {
                    DB::table('carreraadmitida')
                        ->where('idpostulante', $p->idpostulante)
                        ->where('idcarrera', $carrera->idcarrera)
                        ->where('opcion', 1)
                        ->update(['estadoadmision' => 'ADMITIDO']);
                    $admitidos++;
                } else {
                    // Cupo lleno: intentar 2da opción del postulante
                    $segunda = DB::table('carreraadmitida')
                        ->where('idpostulante', $p->idpostulante)
                        ->where('opcion', 2)
                        ->first();

                    if ($segunda) {
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
                            DB::table('carreraadmitida')
                                ->where('idpostulante', $p->idpostulante)
                                ->update(['estadoadmision' => 'NO_ADMITIDO']);
                        }
                    } else {
                        // No tiene 2da opción registrada
                        DB::table('carreraadmitida')
                            ->where('idpostulante', $p->idpostulante)
                            ->where('opcion', 1)
                            ->update(['estadoadmision' => 'NO_ADMITIDO']);
                    }
                }
            }

            // Releer el total real de admitidos para el resumen
            $totalAdmitidos = DB::table('carreraadmitida')
                ->where('idcarrera', $carrera->idcarrera)
                ->where('estadoadmision', 'ADMITIDO')
                ->count();

            $resultado[] = [
                'carrera'     => $carrera->nombre,
                'cupo'        => $carrera->cupomaximo,
                'admitidos'   => $totalAdmitidos,
                'disponibles' => max(0, $carrera->cupomaximo - $totalAdmitidos),
            ];
        }

        return response()->json($resultado);
    }

    // ──────────────────────────────────────────────────────────────
    // GET /api/reportes/admision
    // ──────────────────────────────────────────────────────────────
    /**
     * Lista a todos los postulantes admitidos en alguna carrera (resultado de admision()).
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /reportes/admision
     *   [1] carreraadmitida JOIN postulante JOIN carrera
     *       WHERE estadoadmision = 'ADMITIDO'
     *   [2] ORDER BY nombre_carrera, promedio_final DESC
     *   [3] → 200 con array de { ci, nombres, apellidos, promedio_final, carrera, opcion }
     */
    // ──────────────────────────────────────────────────────────────
    // GET /api/reportes/no-admitidos
    // ──────────────────────────────────────────────────────────────
    /**
     * Lista los postulantes APROBADOS que no ingresaron por cupo lleno.
     * Son aquellos cuyas dos opciones quedaron en NO_ADMITIDO.
     * Ordenados por promedio_final DESC (los que "casi entraron" primero).
     */
    public function noAdmitidos()
    {
        $rechazados = DB::table('postulante as p')
            ->join('carreraadmitida as ca1', function ($join) {
                $join->on('ca1.idpostulante', '=', 'p.idpostulante')
                     ->where('ca1.opcion', '=', 1);
            })
            ->join('carrera as c1', 'c1.idcarrera', '=', 'ca1.idcarrera')
            ->leftJoin('carreraadmitida as ca2', function ($join) {
                $join->on('ca2.idpostulante', '=', 'p.idpostulante')
                     ->where('ca2.opcion', '=', 2);
            })
            ->leftJoin('carrera as c2', 'c2.idcarrera', '=', 'ca2.idcarrera')
            ->where('p.estadopostulante', 'APROBADO')
            ->where('ca1.estadoadmision', 'NO_ADMITIDO')
            ->whereNotExists(function ($q) {
                $q->select(DB::raw(1))
                  ->from('carreraadmitida')
                  ->whereColumn('idpostulante', 'p.idpostulante')
                  ->where('estadoadmision', 'ADMITIDO');
            })
            ->select(
                'p.ci',
                'p.nombres',
                'p.apellidos',
                'p.promedio_final',
                'c1.nombre as carrera1',
                DB::raw("COALESCE(c2.nombre, '—') as carrera2")
            )
            ->orderBy('p.promedio_final', 'desc')
            ->get();

        return response()->json($rechazados);
    }

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

    // ──────────────────────────────────────────────────────────────
    // GET /api/carreras/{id}/admitidos  (ruta pública)
    // ──────────────────────────────────────────────────────────────
    /**
     * Lista los admitidos en una carrera específica, ordenados por promedio DESC.
     * Ruta pública: no requiere autenticación (se muestra en el landing).
     *
     * RESPUESTA:
     * {
     *   "carrera": { "idcarrera": 2, "nombre": "Ingeniería de Sistemas", "cupomaximo": 200 },
     *   "admitidos": [
     *     { "rank": 1, "ci": "...", "nombres": "...", "apellidos": "...", "promedio_final": 95.5, "opcion": 1 },
     *     ...
     *   ],
     *   "total_admitidos": 185
     * }
     */
    public function admitidosPorCarrera(int $id)
    {
        $carrera = DB::table('carrera')
            ->where('idcarrera', $id)
            ->first(['idcarrera', 'nombre', 'cupomaximo']);

        if (!$carrera) {
            return response()->json(['message' => 'Carrera no encontrada'], 404);
        }

        $admitidos = DB::table('carreraadmitida as ca')
            ->join('postulante as p', 'p.idpostulante', '=', 'ca.idpostulante')
            ->where('ca.idcarrera', $id)
            ->where('ca.estadoadmision', 'ADMITIDO')
            ->select('p.ci', 'p.nombres', 'p.apellidos', 'p.promedio_final', 'ca.opcion')
            ->orderBy('p.promedio_final', 'desc')
            ->get();

        return response()->json([
            'carrera'        => $carrera,
            'admitidos'      => $admitidos,
            'total_admitidos'=> $admitidos->count(),
        ]);
    }
}