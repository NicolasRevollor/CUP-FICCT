<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * ============================================================
 * GrupoController  —  CU-09: Gestión de grupos
 *                      CU-10: Asignación de postulantes a grupos
 * ============================================================
 *
 * CU-09 — Gestión de grupos
 *   Los grupos representan las divisiones de turno (MAÑANA/TARDE/NOCHE)
 *   donde los postulantes toman el curso de ingreso.
 *   Se pueden crear desde la app (store) o desde la BD directamente.
 *
 * CU-10 — Asignación de postulantes a grupos
 *   La asignación es manual (admin elige grupo) o automática (distribuirInscritos).
 *   Se verifica la capacidad máxima antes de cada asignación.
 *
 * TABLA PRINCIPAL: grupos
 *   - idgrupo, nombregrupo, turno (MAÑANA|TARDE|NOCHE)
 *   - capacidadmaxima, cantidadestudiante (actualizado por TRIGGER 4)
 *
 * TABLA RELACIONADA: grupopostulantes
 *   - idpostulante, idgrupo, fechaasignacion, estado (ACTIVO|RETIRADO)
 *   - TRIGGER 4: AFTER INSERT → incrementa grupos.cantidadestudiante
 *   (No hay trigger para DELETE: el retiro es soft delete → decremento manual)
 *
 * TRIGGER 4 — trg_incrementar_estudiantes (AFTER INSERT en grupopostulantes)
 *   Función: fn_incrementar_estudiantes()
 *   ¿Qué hace? → grupos.cantidadestudiante++ automáticamente
 *   ¡OJO! Solo escucha INSERT, no DELETE.
 *   Por eso retirar() hace UPDATE (estado='RETIRADO') + decrement() manual.
 *
 * ENDPOINTS DISPONIBLES:
 *   GET  /api/grupos                               → index()
 *   POST /api/grupos                               → store()
 *   GET  /api/grupos/{id}/postulantes              → postulantes()
 *   POST /api/grupos/asignar                       → asignar()
 *   GET  /api/grupos/{idGrupo}/examenes/{idMateria} → examenesGrupo()
 *   POST /api/grupos/distribuir                    → distribuirInscritos()
 *   PUT  /api/grupos/{id}/retirar                  → retirar()
 */
class GrupoController extends Controller
{
    // ──────────────────────────────────────────────────────────────
    // GET /api/grupos
    // ──────────────────────────────────────────────────────────────
    /**
     * Lista todos los grupos con datos de aula y horario (via LEFT JOIN).
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /grupos
     *   [1] grupos LEFT JOIN horarios LEFT JOIN aulas
     *   [2] ORDER BY turno, idgrupo
     *   [3] → 200 con array de grupos (aula y horario pueden ser null si no asignados)
     */
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

    // ──────────────────────────────────────────────────────────────
    // POST /api/grupos  (CU-09)
    // ──────────────────────────────────────────────────────────────
    /**
     * Crea un nuevo grupo y opcionalmente su horario en una transacción.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → POST /grupos { nombregrupo, turno, capacidadmaxima, idaula?, horarioinicio?, horariofin?, dias? }
     *
     *   [1] Validar campos (nombregrupo único en tabla grupos)
     *
     *   DB TRANSACTION:
     *     [2] INSERT en grupos → obtener idGrupo
     *     OPT [si vienen idaula, horarioinicio y horariofin]
     *       [3] INSERT en horarios (vinculando idGrupo + idaula)
     *
     *   [4] → 201 "Grupo creado correctamente"
     */
    public function store(Request $request)
    {
        $request->validate([
            'nombregrupo'     => 'required|string|max:100|unique:grupos,nombregrupo',
            'turno'           => 'required|in:MAÑANA,TARDE,NOCHE',
            'capacidadmaxima' => 'required|integer|min:1|max:200',
            'idaula'          => 'nullable|integer|exists:aulas,idaulas',
            'horarioinicio'   => 'nullable|date_format:H:i',
            'horariofin'      => 'nullable|date_format:H:i',
            'dias'            => 'nullable|string|max:100',
        ]);

        DB::transaction(function () use ($request) {
            $idGrupo = DB::table('grupos')->insertGetId([
                'nombregrupo'        => $request->nombregrupo,
                'capacidadmaxima'    => $request->capacidadmaxima,
                'cantidadestudiante' => 0,
                'turno'              => $request->turno,
            ], 'idgrupo');

            if ($request->idaula && $request->horarioinicio && $request->horariofin) {
                DB::table('horarios')->insert([
                    'idgrupo'       => $idGrupo,
                    'idaula'        => $request->idaula,
                    'horarioinicio' => $request->horarioinicio,
                    'horariofin'    => $request->horariofin,
                    'dias'          => $request->dias,
                ]);
            }
        });

        return response()->json(['message' => 'Grupo creado correctamente'], 201);
    }

    // ──────────────────────────────────────────────────────────────
    // GET /api/grupos/{id}/postulantes
    // ──────────────────────────────────────────────────────────────
    /**
     * Lista los postulantes activos asignados a un grupo.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /grupos/3/postulantes
     *   [1] grupopostulantes JOIN postulante
     *       WHERE idgrupo = 3 AND gp.estado = 'ACTIVO'
     *   [2] ORDER BY apellidos
     *   [3] → 200 con lista de postulantes (ci, nombres, apellidos, estadopostulante, promedio_final)
     */
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

    // ──────────────────────────────────────────────────────────────
    // POST /api/grupos/asignar  (CU-10)
    // ──────────────────────────────────────────────────────────────
    /**
     * Asigna manualmente un postulante a un grupo.
     * Usa lockForUpdate() para evitar condición de carrera en el conteo de capacidad.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → POST /grupos/asignar { idpostulante, idgrupo }
     *
     *   [1] Validar campos requeridos
     *   [2] Verificar que el postulante exista
     *   ALT [no existe] → 404
     *   [3] Verificar que no esté ya asignado (ACTIVO) al mismo grupo
     *   ALT [ya está] → 400
     *
     *   DB TRANSACTION:
     *     [4] SELECT grupos WHERE idgrupo = ? FOR UPDATE (bloquea la fila)
     *     ALT [grupo no existe] → Exception → rollback → 500
     *     ALT [cantidadestudiante >= capacidadmaxima]
     *       → Exception "capacidad máxima" → rollback → 500
     *     [5] INSERT en grupopostulantes (estado='ACTIVO', fechaasignacion=now())
     *         → TRIGGER 4 (AFTER INSERT) incrementa grupos.cantidadestudiante
     *
     *   [6] → 201 "Postulante asignado correctamente"
     */
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

    // ──────────────────────────────────────────────────────────────
    // GET /api/grupos/{idGrupo}/examenes/{idMateria}
    // ──────────────────────────────────────────────────────────────
    /**
     * Devuelve las notas de los postulantes de un grupo en una materia específica.
     * El resultado viene indexado por idpostulante (keyBy) para acceso O(1) en el frontend.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /grupos/3/examenes/1   (grupo 3, materia 1=Computación)
     *   [1] examen JOIN grupopostulantes
     *       WHERE gp.idgrupo = 3 AND gp.estado = 'ACTIVO' AND e.idmateria = 1
     *   [2] Resultado indexado por idpostulante (keyBy)
     *   [3] → 200 JSON objeto: { "42": { notas... }, "43": { notas... } }
     */
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

    // ──────────────────────────────────────────────────────────────
    // POST /api/grupos/distribuir  (CU-10)
    // ──────────────────────────────────────────────────────────────
    /**
     * Distribuye automáticamente todos los postulantes sin grupo asignado.
     * Usa algoritmo round-robin para balancear la carga entre grupos.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → POST /grupos/distribuir
     *
     *   [1] Obtener postulantes sin grupo activo:
     *       postulante LEFT JOIN grupopostulantes (estado=ACTIVO)
     *       WHERE gp.idpostulante IS NULL
     *   ALT [todos ya tienen grupo]
     *     → 200 { message: "Todos ya tienen grupo", asignados: 0 }
     *
     *   [2] Obtener grupos con espacio disponible (cantidadestudiante < capacidadmaxima)
     *       ordenados por ocupación ascendente (los más vacíos primero)
     *   ALT [no hay grupos con capacidad]
     *     → 400 "No hay grupos con capacidad disponible"
     *
     *   [3] LOOP round-robin sobre los postulantes:
     *       → Asignar cada postulante al siguiente grupo con espacio disponible
     *       → Si el grupo se llenó, avanzar al siguiente
     *       → Si no hay ningún grupo con espacio, contar como no_asignado
     *
     *   DB TRANSACTION:
     *     [4] INSERT masivo en grupopostulantes (lotes de 100)
     *         → TRIGGER 4 incrementa cantidadestudiante por cada INSERT
     *
     *   [5] → 201 { message, asignados, no_asignados }
     */
    public function distribuirInscritos()
    {
        // Todos los postulantes que aún no tienen grupo activo
        $postulantes = DB::table('postulante as p')
            ->leftJoin('grupopostulantes as gp', function ($j) {
                $j->on('gp.idpostulante', '=', 'p.idpostulante')
                  ->where('gp.estado', 'ACTIVO');
            })
            ->whereNull('gp.idpostulante')
            ->pluck('p.idpostulante')
            ->toArray();

        if (empty($postulantes)) {
            return response()->json(['message' => 'Todos los inscritos ya tienen grupo asignado.', 'asignados' => 0]);
        }

        // Grupos con espacio disponible, ordenados por ocupación ascendente
        $grupos = DB::table('grupos')
            ->whereRaw('cantidadestudiante < capacidadmaxima')
            ->orderBy('cantidadestudiante')
            ->get(['idgrupo', 'capacidadmaxima', 'cantidadestudiante'])
            ->map(fn($g) => [
                'idgrupo' => $g->idgrupo,
                'libre'   => $g->capacidadmaxima - $g->cantidadestudiante,
            ])
            ->toArray();

        if (empty($grupos)) {
            return response()->json(['message' => 'No hay grupos con capacidad disponible.'], 400);
        }

        $asignaciones  = [];
        $noAsignados   = 0;
        $gi            = 0;
        $totalGrupos   = count($grupos);

        foreach ($postulantes as $idPostulante) {
            // Buscar siguiente grupo con espacio (round-robin)
            $intentos = 0;
            while ($grupos[$gi]['libre'] <= 0) {
                $gi = ($gi + 1) % $totalGrupos;
                if (++$intentos > $totalGrupos) { $noAsignados++; continue 2; }
            }

            $asignaciones[] = [
                'idpostulante'    => $idPostulante,
                'idgrupo'         => $grupos[$gi]['idgrupo'],
                'fechaasignacion' => now(),
                'estado'          => 'ACTIVO',
            ];

            $grupos[$gi]['libre']--;
            $gi = ($gi + 1) % $totalGrupos; // avanzar round-robin
        }

        $asignados = count($asignaciones);

        if ($asignados > 0) {
            DB::transaction(function () use ($asignaciones) {
                // TRIGGER 4 (AFTER INSERT) incrementa cantidadestudiante por cada fila
                foreach (array_chunk($asignaciones, 100) as $chunk) {
                    DB::table('grupopostulantes')->insert($chunk);
                }
            });
        }

        return response()->json([
            'message'      => "{$asignados} inscrito(s) distribuido(s) correctamente en los grupos.",
            'asignados'    => $asignados,
            'no_asignados' => $noAsignados,
        ], 201);
    }

    // ──────────────────────────────────────────────────────────────
    // PUT /api/grupos/{id}/retirar  (CU-10)
    // ──────────────────────────────────────────────────────────────
    /**
     * Retira un postulante de un grupo (soft delete + decremento manual).
     *
     * ¿POR QUÉ decrement() manual?
     *   El TRIGGER 4 solo escucha INSERT, no DELETE.
     *   Como usamos soft delete (UPDATE estado='RETIRADO'), el trigger no se activa.
     *   Por eso decrementamos cantidadestudiante manualmente dentro de la transacción.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → PUT /grupos/3/retirar { idpostulante: 42 }
     *
     *   [1] Buscar la asignación activa (idpostulante + idgrupo + estado=ACTIVO)
     *   ALT [no está asignado activamente] → 404
     *
     *   DB TRANSACTION:
     *     [2] UPDATE grupopostulantes SET estado='RETIRADO'
     *         (soft delete — preserva historial)
     *     [3] UPDATE grupos SET cantidadestudiante = cantidadestudiante - 1
     *         (decremento manual porque el TRIGGER 4 no escucha UPDATE)
     *
     *   [4] → 200 "Postulante retirado del grupo"
     */
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
