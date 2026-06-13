<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * ============================================================
 * ExamenController  —  CU-06: Notas y exámenes por materia
 * ============================================================
 *
 * ¿QUÉ HACE ESTE CONTROLADOR?
 *   Registra, actualiza y consulta las tres notas de cada
 *   postulante por materia (Computación, Matemáticas, Inglés, Física).
 *
 * TABLA PRINCIPAL: examen
 *   - idexamen      → clave primaria (autoincremental)
 *   - idpostulante  → a quién le pertenece la nota
 *   - idmateria     → en qué materia (FK → tabla materia)
 *   - idnota        → configuración de ponderación (FK → tabla nota)
 *   - nota1         → primera evaluación (0-100)
 *   - nota2         → segunda evaluación (0-100)
 *   - nota3         → tercera evaluación (0-100)
 *   - promedio      → COLUMNA GENERADA por la BD: (nota1+nota2+nota3)/3
 *                     ¡NO se puede insertar ni actualizar manualmente!
 *   - estado        → APROBADO | REPROBADO  (lo setea el TRIGGER 1)
 *
 * TABLA RELACIONADA: nota
 *   - Guarda los porcentajes de ponderación: 30% + 30% + 40% = 100%
 *   - Se usa el primer registro (idnota=1) como referencia en el insert.
 *
 * TABLA RELACIONADA: postulante
 *   - El TRIGGER 2 actualiza promedio_final y estadopostulante
 *     en esta tabla después de cada INSERT/UPDATE en examen.
 *
 * ─── TRIGGERS EN LA BD (MUY IMPORTANTE) ──────────────────────
 *
 *   TRIGGER 1 — trg_estado_examen (BEFORE INSERT/UPDATE)
 *     Función: fn_actualizar_estado_examen()
 *     ¿Qué hace?
 *       → Calcula: nota_pond = (nota1*0.30) + (nota2*0.30) + (nota3*0.40)
 *       → Si nota_pond >= 60 → estado = 'APROBADO'
 *       → Si nota_pond <  60 → estado = 'REPROBADO'
 *     ¡OJO! El campo 'promedio' de la tabla es una columna GENERADA
 *     que usa promedio SIMPLE: (nota1+nota2+nota3)/3.
 *     El trigger usa fórmula PONDERADA para decidir el estado.
 *     Son dos cálculos distintos.
 *
 *   TRIGGER 2 — trg_promedio_postulante (AFTER INSERT/UPDATE)
 *     Función: fn_actualizar_promedio_postulante()
 *     ¿Qué hace?
 *       → Calcula el promedio_final del postulante como AVG de las
 *         notas ponderadas de TODAS sus materias.
 *       → Cuenta cuántas materias tiene registradas y cuántas reprobó.
 *       → Regla de negocio:
 *           - Si tiene las 4 materias Y ninguna < 60 → APROBADO
 *           - Si tiene al menos 1 materia < 60       → REPROBADO
 *           - Si le faltan materias por registrar     → PENDIENTE
 *       → Actualiza postulante.promedio_final y postulante.estadopostulante
 *
 * ─────────────────────────────────────────────────────────────
 *
 * ENDPOINTS DISPONIBLES:
 *   GET  /api/examenes/materia/{idMateria}  → reporteMateria()
 *   GET  /api/notas                         → resumen()
 *   GET  /api/examenes/{idPostulante}       → index()
 *   POST /api/examenes                      → store()
 *   PUT  /api/examenes/{id}                 → update()
 *
 * ORDEN DE RUTAS IMPORTANTE:
 *   La ruta /examenes/materia/{id} DEBE estar ANTES de
 *   /examenes/{idPostulante} en api.php, de lo contrario
 *   Laravel interpreta "materia" como un idPostulante.
 */
class ExamenController extends Controller
{
    // ──────────────────────────────────────────────────────────────
    // GET /api/examenes/{idPostulante}
    // ──────────────────────────────────────────────────────────────
    /**
     * Devuelve todas las notas de UN postulante (todas sus materias).
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /examenes/42
     *   [1] JOIN examen + materia para incluir el nombre de la materia
     *   [2] Filtrar por idPostulante
     *   [3] → 200 JSON con array de exámenes
     *
     * RESPUESTA EJEMPLO:
     * [
     *   {
     *     "idexamen": 1,
     *     "idmateria": 1,
     *     "materia": "Computación",
     *     "nota1": 75.00,
     *     "nota2": 80.00,
     *     "nota3": 90.00,
     *     "promedio": 81.67,   ← promedio simple, columna generada por BD
     *     "estado": "APROBADO" ← lo setea el TRIGGER 1 con fórmula ponderada
     *   }, ...
     * ]
     */
    public function index(int $idPostulante)
    {
        // JOIN con materia para mostrar el nombre (ej: "Computación")
        // en lugar de solo el ID numérico
        $examenes = DB::table('examen as e')
            ->join('materia as m', 'm.idmateria', '=', 'e.idmateria')
            ->where('e.idpostulante', $idPostulante)
            ->select(
                'e.idexamen',
                'e.idmateria',
                'm.nombre as materia',  // nombre legible de la materia
                'e.nota1',
                'e.nota2',
                'e.nota3',
                'e.promedio',  // columna GENERADA: (nota1+nota2+nota3)/3  (promedio simple)
                'e.estado'     // APROBADO | REPROBADO  (lo calcula TRIGGER 1 con fórmula ponderada)
            )
            ->get();

        return response()->json($examenes);
    }

    // ──────────────────────────────────────────────────────────────
    // POST /api/examenes
    // ──────────────────────────────────────────────────────────────
    /**
     * Registra las tres notas de un postulante para una materia.
     * Solo se puede registrar UNA vez por postulante/materia.
     * Para corregir notas se usa el método update().
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → POST /examenes  { idpostulante, idmateria, nota1, nota2, nota3 }
     *
     *   [1] Validar que los datos tengan el formato correcto (notas 0-100)
     *
     *   [2] Verificar si ya existe un examen para esa combinación
     *   ALT [ya existe postulante+materia en tabla examen]
     *     → 400 "Ya existe un examen registrado para esta materia"
     *     (usar PUT /examenes/{id} para actualizar)
     *
     *   [3] Obtener configuración de nota (tabla nota, toma el primer registro)
     *   ALT [tabla nota vacía]
     *     → 500 "No hay configuración de notas en el sistema"
     *
     *   [4] INSERT en tabla examen
     *       ↓ dispara TRIGGER 1 (BEFORE INSERT):
     *         calcula nota_pond = (nota1*0.30)+(nota2*0.30)+(nota3*0.40)
     *         si nota_pond >= 60 → estado='APROBADO', si no → 'REPROBADO'
     *       ↓ dispara TRIGGER 2 (AFTER INSERT):
     *         recalcula promedio_final y estadopostulante del postulante
     *
     *   [5] → 201 "Notas registradas correctamente"
     */
    public function store(Request $request)
    {
        // [1] Validar los datos de entrada
        // min:0 max:100 asegura que las notas estén en rango válido
        $request->validate([
            'idpostulante' => 'required|integer',
            'idmateria'    => 'required|integer',
            'nota1'        => 'required|numeric|min:0|max:100',
            'nota2'        => 'required|numeric|min:0|max:100',
            'nota3'        => 'required|numeric|min:0|max:100',
        ]);

        // [2] Verificar duplicado: un postulante solo puede tener
        // UNA fila por materia en la tabla examen
        $existe = DB::table('examen')
            ->where('idpostulante', $request->idpostulante)
            ->where('idmateria', $request->idmateria)
            ->exists(); // devuelve true/false rápidamente sin cargar datos

        // ALT: si ya existe → rechazar con error 400
        if ($existe) {
            return response()->json(['message' => 'Ya existe un examen registrado para esta materia'], 400);
        }

        // [3] Obtener la configuración de ponderación (tabla nota)
        // La tabla nota tiene 3 filas con porcentajes: 30%, 30%, 40%
        // Se toma la primera (idnota=1) como referencia para el campo FK en examen
        $nota = DB::table('nota')->first();
        if (!$nota) {
            // Esto no debería pasar si la BD está correctamente configurada
            return response()->json(['message' => 'No hay configuración de notas en el sistema'], 500);
        }

        // [4] Insertar el registro
        // NO incluir 'promedio' ni 'estado': los calcula el TRIGGER 1 automáticamente.
        // 'promedio' es columna GENERADA → si se intenta insertar, la BD lanza error.
        // TRIGGER 1 (BEFORE INSERT) → calcula estado con fórmula ponderada
        // TRIGGER 2 (AFTER INSERT)  → actualiza postulante.promedio_final y estadopostulante
        DB::table('examen')->insert([
            'idpostulante' => $request->idpostulante,
            'idmateria'    => $request->idmateria,
            'idnota'       => $nota->idnota, // referencia a la configuración de notas
            'nota1'        => $request->nota1,
            'nota2'        => $request->nota2,
            'nota3'        => $request->nota3,
            // 'promedio' → NO incluir: es columna GENERADA (BD lo calcula sola)
            // 'estado'   → NO incluir: lo setea TRIGGER 1 antes del INSERT
        ]);

        // [5] Confirmar el registro exitoso
        return response()->json(['message' => 'Notas registradas correctamente'], 201);
    }

    // ──────────────────────────────────────────────────────────────
    // PUT /api/examenes/{id}
    // ──────────────────────────────────────────────────────────────
    /**
     * Actualiza las tres notas de un examen ya registrado.
     * El TRIGGER 1 recalcula estado; el TRIGGER 2 recalcula el postulante.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → PUT /examenes/15  { nota1, nota2, nota3 }
     *
     *   [1] Validar notas (0-100)
     *
     *   [2] Buscar el examen por ID
     *   ALT [no existe]
     *     → 404 "Examen no encontrado"
     *
     *   [3] UPDATE en tabla examen (solo nota1, nota2, nota3)
     *       ↓ dispara TRIGGER 1 (BEFORE UPDATE):
     *         recalcula nota_pond y estado
     *       ↓ dispara TRIGGER 2 (AFTER UPDATE):
     *         recalcula promedio_final y estadopostulante del postulante
     *
     *   [4] → 200 "Notas actualizadas correctamente"
     */
    public function update(Request $request, int $id)
    {
        // [1] Validar que las tres notas estén dentro del rango permitido
        $request->validate([
            'nota1' => 'required|numeric|min:0|max:100',
            'nota2' => 'required|numeric|min:0|max:100',
            'nota3' => 'required|numeric|min:0|max:100',
        ]);

        // [2] Verificar que el examen exista en la BD
        $examen = DB::table('examen')->where('idexamen', $id)->first();

        // ALT: si no existe ese examen → error 404
        if (!$examen) {
            return response()->json(['message' => 'Examen no encontrado'], 404);
        }

        // [3] Actualizar solo las tres notas.
        // NO actualizar 'promedio' (columna generada) ni 'estado' (lo recalcula TRIGGER 1).
        // TRIGGER 1 (BEFORE UPDATE) → recalcula nota_pond y estado automáticamente
        // TRIGGER 2 (AFTER UPDATE)  → actualiza promedio_final del postulante
        DB::table('examen')->where('idexamen', $id)->update([
            'nota1' => $request->nota1,
            'nota2' => $request->nota2,
            'nota3' => $request->nota3,
        ]);

        // [4] Confirmar la actualización
        return response()->json(['message' => 'Notas actualizadas correctamente']);
    }

    // ──────────────────────────────────────────────────────────────
    // GET /api/examenes/materia/{idMateria}
    // ──────────────────────────────────────────────────────────────
    /**
     * Devuelve las notas de TODOS los postulantes para una materia específica.
     * Ordenadas de mayor a menor promedio (ranking).
     * Usado en la pantalla de reportes por materia.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /examenes/materia/2   (2 = Matemáticas)
     *   [1] JOIN examen + postulante + materia
     *   [2] Filtrar por idMateria
     *   [3] Ordenar por promedio DESC (el mejor alumno primero)
     *   [4] → 200 JSON con lista de notas de todos los postulantes
     */
    public function reporteMateria(int $idMateria)
    {
        // Se unen tres tablas: examen, postulante (para nombre/CI) y materia (para nombre)
        $reporte = DB::table('examen as e')
            ->join('postulante as p', 'p.idpostulante', '=', 'e.idpostulante')
            ->join('materia as m', 'm.idmateria', '=', 'e.idmateria')
            ->where('e.idmateria', $idMateria)    // solo la materia pedida
            ->select(
                'p.ci',         // carnet del postulante
                'p.nombres',
                'p.apellidos',
                'e.nota1',
                'e.nota2',
                'e.nota3',
                'e.promedio',   // promedio simple (columna generada)
                'e.estado'      // APROBADO | REPROBADO (calculado por TRIGGER 1)
            )
            ->orderBy('e.promedio', 'desc') // de mayor a menor (ranking)
            ->get();

        return response()->json($reporte);
    }

    // ──────────────────────────────────────────────────────────────
    // GET /api/notas?page=1&q=busqueda&estado=APROBADO
    // ──────────────────────────────────────────────────────────────
    /**
     * Resumen consolidado de notas: UNA fila por postulante con sus 4 materias.
     * Usa técnica de PIVOT con CASE WHEN para transformar filas en columnas.
     * Paginado de 50 en 50.
     *
     * ¿QUÉ ES EL PIVOT CON CASE WHEN?
     *   En vez de tener 4 filas por postulante (una por materia),
     *   se genera UNA sola fila con columnas: computacion, matematicas, etc.
     *   Técnica SQL:
     *     MAX(CASE WHEN nombre_materia = 'Computación' THEN promedio END) as computacion
     *   Si el postulante no tiene nota en esa materia → NULL.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /notas?page=1&q=Juan&estado=APROBADO
     *
     *   [1] Construir query base:
     *       postulante LEFT JOIN examen LEFT JOIN materia
     *       (LEFT JOIN para incluir postulantes SIN notas registradas aún)
     *       GROUP BY postulante para colapsar múltiples filas en una
     *       Excluir postulantes en estado BORRADOR (registro incompleto)
     *
     *   OPT [si viene ?estado=...]
     *     → filtrar por estadopostulante (APROBADO | REPROBADO | PENDIENTE)
     *
     *   OPT [si viene ?q=...]
     *     → buscar coincidencia en CI, nombres o apellidos (case-insensitive)
     *     → 'ilike' es LIKE insensible a mayúsculas en PostgreSQL
     *
     *   [2] Ordenar por promedio_final DESC (mejores primero)
     *   [3] Paginar: 50 resultados por página
     *   [4] → 200 JSON con estructura de paginación Laravel:
     *         { current_page, data: [...], last_page, total, ... }
     *
     * RESPUESTA POR CADA POSTULANTE EN data[]:
     * {
     *   "idpostulante": 128,
     *   "ci": "00000128",
     *   "nombres": "Juan",
     *   "apellidos": "Pérez",
     *   "estadopostulante": "APROBADO",
     *   "promedio_final": "88.44",
     *   "computacion": "83.81",    ← null si no tiene nota en esa materia
     *   "matematicas": "90.96",
     *   "ingles": "89.28",
     *   "fisica": "89.80",
     *   "materias_registradas": 4  ← cuántas materias tiene (máximo 4)
     * }
     */
    public function resumen(Request $request)
    {
        // [1] Construir la query base con PIVOT (CASE WHEN por materia)
        // LEFT JOIN para incluir postulantes que aún no tienen exámenes
        $query = DB::table('postulante as p')
            ->leftJoin('examen as e', 'e.idpostulante', '=', 'p.idpostulante')
            ->leftJoin('materia as m', 'm.idmateria', '=', 'e.idmateria')
            ->select(
                'p.idpostulante',
                'p.ci',
                'p.nombres',
                'p.apellidos',
                'p.estadopostulante',
                'p.promedio_final',

                // PIVOT: convierte filas de materias en columnas separadas
                // MAX() se usa porque GROUP BY colapsa las filas;
                // solo habrá un valor por materia (o NULL si no existe)
                DB::raw("MAX(CASE WHEN m.nombre = 'Computación'  THEN e.promedio END) as computacion"),
                DB::raw("MAX(CASE WHEN m.nombre = 'Matemáticas'  THEN e.promedio END) as matematicas"),
                DB::raw("MAX(CASE WHEN m.nombre = 'Inglés'       THEN e.promedio END) as ingles"),
                DB::raw("MAX(CASE WHEN m.nombre = 'Física'       THEN e.promedio END) as fisica"),

                // Cuántas materias tiene registradas (máximo 4)
                DB::raw('COUNT(e.idexamen) as materias_registradas')
            )
            // No mostrar postulantes en BORRADOR (registro incompleto, sin pago)
            ->where('p.estadopostulante', '!=', 'BORRADOR')
            // GROUP BY todos los campos del SELECT que NO son agregados
            ->groupBy(
                'p.idpostulante', 'p.ci', 'p.nombres', 'p.apellidos',
                'p.estadopostulante', 'p.promedio_final'
            );

        // OPT: filtro por estado (APROBADO | REPROBADO | PENDIENTE)
        if ($request->filled('estado')) {
            $query->where('p.estadopostulante', $request->estado);
        }

        // OPT: búsqueda por texto en CI, nombres o apellidos
        if ($request->filled('q')) {
            $q = $request->q; // capturar en variable para usar en closure
            $query->where(function ($w) use ($q) {
                // 'ilike' = LIKE insensible a mayúsculas (solo PostgreSQL)
                $w->where('p.ci',        'ilike', "%{$q}%")
                  ->orWhere('p.nombres',  'ilike', "%{$q}%")
                  ->orWhere('p.apellidos','ilike', "%{$q}%");
            });
        }

        // [2] y [3] Ordenar y paginar
        // paginate(50) genera automáticamente: current_page, last_page, total, data[]
        $postulantes = $query
            ->orderByDesc('p.promedio_final') // mejores promedios primero
            ->paginate(50);

        // [4] Devolver respuesta paginada
        return response()->json($postulantes);
    }
}
