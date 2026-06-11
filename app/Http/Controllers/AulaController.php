<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * ============================================================
 * AulaController  —  CU-12: Gestión de aulas y horarios
 * ============================================================
 *
 * ¿QUÉ HACE ESTE CONTROLADOR?
 *   CRUD de aulas físicas y gestión de horarios asignados a grupos.
 *   Un grupo puede tener exactamente UN horario activo.
 *
 * TABLA: aulas
 *   - idaulas, nombre, capacidad (nullable), ubicacion (nullable)
 *
 * TABLA: horarios
 *   - idhorario, idgrupo (FK→grupos), idaula (FK→aulas)
 *   - horarioinicio, horariofin (TIME: HH:MM), dias (ej: "Lunes, Miércoles")
 *
 * ENDPOINTS DISPONIBLES:
 *   GET    /api/aulas                   → index()
 *   POST   /api/aulas                   → store()
 *   PUT    /api/aulas/{id}              → update()
 *   DELETE /api/aulas/{id}              → destroy()
 *   GET    /api/horarios                → horarios()
 *   POST   /api/horarios                → storeHorario()
 *   PUT    /api/horarios/{id}           → updateHorario()
 */
class AulaController extends Controller
{
    // ── Aulas ──────────────────────────────────────────────────

    // ──────────────────────────────────────────────────────────────
    // GET /api/aulas
    // ──────────────────────────────────────────────────────────────
    /**
     * Lista todas las aulas ordenadas por nombre.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /aulas
     *   [1] SELECT * FROM aulas ORDER BY nombre
     *   [2] → 200 con array de aulas
     */
    public function index()
    {
        $aulas = DB::table('aulas')->orderBy('nombre')->get();
        return response()->json($aulas);
    }

    // ──────────────────────────────────────────────────────────────
    // POST /api/aulas
    // ──────────────────────────────────────────────────────────────
    /**
     * Crea una nueva aula.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → POST /aulas { nombre, capacidad?, ubicacion? }
     *   [1] Validar (nombre único en tabla aulas)
     *   [2] INSERT en aulas → devuelve idaulas
     *   [3] → 201 { message, idaulas }
     */
    public function store(Request $request)
    {
        $request->validate([
            'nombre'    => 'required|string|max:100|unique:aulas,nombre',
            'capacidad' => 'nullable|integer|min:1',
            'ubicacion' => 'nullable|string|max:200',
        ]);

        $id = DB::table('aulas')->insertGetId([
            'nombre'    => $request->nombre,
            'capacidad' => $request->capacidad,
            'ubicacion' => $request->ubicacion,
        ], 'idaulas');

        return response()->json(['message' => 'Aula creada correctamente', 'idaulas' => $id], 201);
    }

    // ──────────────────────────────────────────────────────────────
    // PUT /api/aulas/{id}
    // ──────────────────────────────────────────────────────────────
    /**
     * Actualiza los datos de un aula existente.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → PUT /aulas/3 { nombre, capacidad?, ubicacion? }
     *   [1] Verificar que el aula exista
     *   ALT [no existe] → 404
     *   [2] Validar campos
     *   [3] UPDATE aulas
     *   [4] → 200 "Aula actualizada correctamente"
     */
    public function update(Request $request, int $id)
    {
        $aula = DB::table('aulas')->where('idaulas', $id)->first();
        if (!$aula) {
            return response()->json(['message' => 'Aula no encontrada'], 404);
        }

        $request->validate([
            'nombre'    => 'required|string|max:100',
            'capacidad' => 'nullable|integer|min:1',
            'ubicacion' => 'nullable|string|max:200',
        ]);

        DB::table('aulas')->where('idaulas', $id)->update([
            'nombre'    => $request->nombre,
            'capacidad' => $request->capacidad,
            'ubicacion' => $request->ubicacion,
        ]);

        return response()->json(['message' => 'Aula actualizada correctamente']);
    }

    // ──────────────────────────────────────────────────────────────
    // DELETE /api/aulas/{id}
    // ──────────────────────────────────────────────────────────────
    /**
     * Elimina un aula si no tiene horarios asignados.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → DELETE /aulas/3
     *   [1] Verificar que el aula exista
     *   ALT [no existe] → 404
     *   [2] Verificar que no tenga horarios (FK en tabla horarios)
     *   ALT [tiene horarios asignados]
     *     → 400 "No se puede eliminar: el aula tiene horarios asignados"
     *   [3] DELETE FROM aulas WHERE idaulas = 3
     *   [4] → 200 "Aula eliminada correctamente"
     */
    public function destroy(int $id)
    {
        $aula = DB::table('aulas')->where('idaulas', $id)->first();
        if (!$aula) {
            return response()->json(['message' => 'Aula no encontrada'], 404);
        }

        // Verificar que el aula no tenga horarios asignados
        $enUso = DB::table('horarios')->where('idaula', $id)->exists();
        if ($enUso) {
            return response()->json(['message' => 'No se puede eliminar: el aula tiene horarios asignados'], 400);
        }

        DB::table('aulas')->where('idaulas', $id)->delete();
        return response()->json(['message' => 'Aula eliminada correctamente']);
    }

    // ── Horarios ───────────────────────────────────────────────

    // ──────────────────────────────────────────────────────────────
    // GET /api/horarios
    // ──────────────────────────────────────────────────────────────
    /**
     * Lista todos los horarios con nombre de grupo y aula (via JOIN).
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /horarios
     *   [1] horarios LEFT JOIN aulas LEFT JOIN grupos
     *   [2] ORDER BY idgrupo
     *   [3] → 200 con array de { idhorario, nombregrupo, aula, horarioinicio, horariofin, dias }
     */
    public function horarios()
    {
        $horarios = DB::table('horarios as h')
            ->leftJoin('aulas as a', 'a.idaulas', '=', 'h.idaula')
            ->leftJoin('grupos as g', 'g.idgrupo', '=', 'h.idgrupo')
            ->select(
                'h.idhorario',
                'g.nombregrupo',
                'a.nombre as aula',
                'h.horarioinicio',
                'h.horariofin',
                'h.dias'
            )
            ->orderBy('g.idgrupo')
            ->get();

        return response()->json($horarios);
    }

    // ──────────────────────────────────────────────────────────────
    // POST /api/horarios
    // ──────────────────────────────────────────────────────────────
    /**
     * Asigna un horario a un grupo. Un grupo solo puede tener UN horario activo.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → POST /horarios { idgrupo, idaula, horarioinicio, horariofin, dias }
     *   [1] Validar (horariofin debe ser after horarioinicio)
     *   [2] Verificar que el grupo no tenga ya un horario asignado
     *   ALT [ya tiene horario]
     *     → 400 "El grupo ya tiene un horario. Actualiza el existente."
     *   [3] INSERT en horarios → devuelve idhorario
     *   [4] → 201 { message, idhorario }
     */
    public function storeHorario(Request $request)
    {
        $request->validate([
            'idgrupo'       => 'required|integer|exists:grupos,idgrupo',
            'idaula'        => 'required|integer|exists:aulas,idaulas',
            'horarioinicio' => 'required|date_format:H:i',
            'horariofin'    => 'required|date_format:H:i|after:horarioinicio',
            'dias'          => 'required|string|max:100',
        ]);

        // Un grupo solo puede tener un horario activo
        $existe = DB::table('horarios')->where('idgrupo', $request->idgrupo)->exists();
        if ($existe) {
            return response()->json(['message' => 'El grupo ya tiene un horario asignado. Actualiza el existente.'], 400);
        }

        $id = DB::table('horarios')->insertGetId([
            'idgrupo'       => $request->idgrupo,
            'idaula'        => $request->idaula,
            'horarioinicio' => $request->horarioinicio,
            'horariofin'    => $request->horariofin,
            'dias'          => $request->dias,
        ], 'idhorario');

        return response()->json(['message' => 'Horario asignado correctamente', 'idhorario' => $id], 201);
    }

    // ──────────────────────────────────────────────────────────────
    // PUT /api/horarios/{id}
    // ──────────────────────────────────────────────────────────────
    /**
     * Actualiza el aula o el horario de un grupo ya configurado.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → PUT /horarios/2 { idaula, horarioinicio, horariofin, dias }
     *   [1] Verificar que el horario exista
     *   ALT [no existe] → 404
     *   [2] Validar campos
     *   [3] UPDATE horarios
     *   [4] → 200 "Horario actualizado correctamente"
     */
    public function updateHorario(Request $request, int $id)
    {
        $horario = DB::table('horarios')->where('idhorario', $id)->first();
        if (!$horario) {
            return response()->json(['message' => 'Horario no encontrado'], 404);
        }

        $request->validate([
            'idaula'        => 'required|integer|exists:aulas,idaulas',
            'horarioinicio' => 'required|date_format:H:i',
            'horariofin'    => 'required|date_format:H:i|after:horarioinicio',
            'dias'          => 'required|string|max:100',
        ]);

        DB::table('horarios')->where('idhorario', $id)->update([
            'idaula'        => $request->idaula,
            'horarioinicio' => $request->horarioinicio,
            'horariofin'    => $request->horariofin,
            'dias'          => $request->dias,
        ]);

        return response()->json(['message' => 'Horario actualizado correctamente']);
    }
}
