<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * ============================================================
 * GestionController  —  CU-17: Gestión de períodos académicos
 * ============================================================
 *
 * ¿QUÉ HACE ESTE CONTROLADOR?
 *   CRUD sobre la tabla gestion (períodos/semestres académicos).
 *   Cada gestión tiene un año, un período (ej: "I/2026"), fechas de inicio/fin y estado.
 *   La gestión ACTIVA con fechainicio <= hoy es la que usan RegistroController y
 *   InscripcionController para vincular inscripciones y carreras admitidas.
 *
 * TABLA PRINCIPAL: gestion
 *   - idgestion, anio (ej: 2026), periodo (ej: "I/2026")
 *   - fechainicio, fechafin
 *   - estado: ACTIVO | INACTIVO
 *
 * REGLA DE NEGOCIO:
 *   RegistroController::confirmarPago() busca:
 *     WHERE estado='ACTIVO' AND fechainicio <= now() ORDER BY fechainicio DESC
 *   → la gestión más reciente que ya haya comenzado.
 *   Si no hay gestión activa iniciada, la inscripción queda sin gestión asignada.
 *
 * ENDPOINTS DISPONIBLES:
 *   GET    /api/gestiones         → index()
 *   POST   /api/gestiones         → store()
 *   PUT    /api/gestiones/{id}    → update()
 *   DELETE /api/gestiones/{id}    → destroy()
 */
class GestionController extends Controller
{
    // ──────────────────────────────────────────────────────────────
    // GET /api/gestiones
    // ──────────────────────────────────────────────────────────────
    /**
     * Lista todas las gestiones académicas ordenadas de más reciente a más antigua.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /gestiones
     *   [1] SELECT * FROM gestion ORDER BY anio DESC, idgestion DESC
     *   [2] → 200 con array de gestiones
     */
    public function index()
    {
        return response()->json(
            DB::table('gestion')->orderBy('anio', 'desc')->orderBy('idgestion', 'desc')->get()
        );
    }

    // ──────────────────────────────────────────────────────────────
    // POST /api/gestiones
    // ──────────────────────────────────────────────────────────────
    /**
     * Crea una nueva gestión académica.
     * El par (anio, periodo) debe ser único para evitar duplicados del mismo semestre.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → POST /gestiones { anio, periodo, fechainicio, fechafin?, estado? }
     *   [1] Validar campos (anio entre 2000-2100)
     *   [2] Verificar que no exista ya esa combinación anio+periodo
     *   ALT [ya existe] → 400
     *   [3] INSERT en gestion (estado por defecto: 'ACTIVO')
     *   [4] → 201 { message, idgestion }
     */
    public function store(Request $request)
    {
        $request->validate([
            'anio'        => 'required|integer|min:2000|max:2100',
            'periodo'     => 'required|string|max:20',
            'fechainicio' => 'required|date',
            'fechafin'    => 'nullable|date|after_or_equal:fechainicio',
            'estado'      => 'sometimes|string|max:20',
        ]);

        $existe = DB::table('gestion')
            ->where('anio', $request->anio)
            ->where('periodo', $request->periodo)
            ->exists();

        if ($existe) {
            return response()->json(['message' => 'Ya existe una gestión con ese año y período'], 400);
        }

        $id = DB::table('gestion')->insertGetId([
            'anio'        => $request->anio,
            'periodo'     => $request->periodo,
            'fechainicio' => $request->fechainicio,
            'fechafin'    => $request->fechafin,
            'estado'      => $request->estado ?? 'ACTIVO',
        ], 'idgestion');

        return response()->json(['message' => 'Gestión creada correctamente', 'idgestion' => $id], 201);
    }

    // ──────────────────────────────────────────────────────────────
    // PUT /api/gestiones/{id}
    // ──────────────────────────────────────────────────────────────
    /**
     * Actualiza los datos de una gestión académica (parcial: solo los campos enviados).
     * Útil para cambiar el estado de ACTIVO a INACTIVO al cerrar un período.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → PUT /gestiones/3 { estado: "INACTIVO" }
     *   [1] Verificar que la gestión exista
     *   ALT [no existe] → 404
     *   [2] Validar campos opcionales
     *   [3] UPDATE solo los campos que vengan en el body
     *   [4] → 200 "Gestión actualizada correctamente"
     */
    public function update(Request $request, int $id)
    {
        $gestion = DB::table('gestion')->where('idgestion', $id)->first();
        if (!$gestion) {
            return response()->json(['message' => 'Gestión no encontrada'], 404);
        }

        $request->validate([
            'anio'        => 'sometimes|integer|min:2000|max:2100',
            'periodo'     => 'sometimes|string|max:20',
            'fechainicio' => 'sometimes|date',
            'fechafin'    => 'nullable|date',
            'estado'      => 'sometimes|string|max:20',
        ]);

        $datos = [];
        if ($request->has('anio'))        $datos['anio']        = $request->anio;
        if ($request->has('periodo'))     $datos['periodo']     = $request->periodo;
        if ($request->has('fechainicio')) $datos['fechainicio'] = $request->fechainicio;
        if ($request->has('fechafin'))    $datos['fechafin']    = $request->fechafin;
        if ($request->has('estado'))      $datos['estado']      = $request->estado;

        if (!empty($datos)) {
            DB::table('gestion')->where('idgestion', $id)->update($datos);
        }

        return response()->json(['message' => 'Gestión actualizada correctamente']);
    }

    // ──────────────────────────────────────────────────────────────
    // DELETE /api/gestiones/{id}
    // ──────────────────────────────────────────────────────────────
    /**
     * Elimina una gestión académica si no tiene inscripciones asociadas.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → DELETE /gestiones/3
     *   [1] Verificar que no haya inscripciones que referencien esta gestión
     *   ALT [tiene inscripciones]
     *     → 400 "No se puede eliminar: hay inscripciones asociadas"
     *   [2] DELETE FROM gestion WHERE idgestion = 3
     *   [3] → 200 "Gestión eliminada correctamente"
     */
    public function destroy(int $id)
    {
        $enUso = DB::table('inscripcion')->where('gestion', $id)->exists();
        if ($enUso) {
            return response()->json(['message' => 'No se puede eliminar: hay inscripciones asociadas a esta gestión'], 400);
        }

        DB::table('gestion')->where('idgestion', $id)->delete();
        return response()->json(['message' => 'Gestión eliminada correctamente']);
    }
}
