<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * ============================================================
 * BitacoraController  —  CU-18: Auditoría y bitácora de accesos
 * ============================================================
 *
 * ¿QUÉ HACE ESTE CONTROLADOR?
 *   Permite al ADMINISTRADOR consultar el registro de auditoría del sistema.
 *   Solo accesible para el rol ADMINISTRADOR (verificación manual dentro del método).
 *
 * TABLA PRINCIPAL: bitacora
 *   - idbitacora, idusuario (nullable), nombre_usuario, rol
 *   - ip, accion (LOGIN_EXITOSO | LOGIN_FALLIDO | LOGOUT), descripcion, fecha
 *
 * ¿QUIÉN ESCRIBE EN ESTA TABLA?
 *   AuthController::login()         → INSERT en cada intento de login
 *   AuthController::registrarFallo() → INSERT en cada fallo
 *   AuthController::logout()        → INSERT en cada cierre de sesión
 *
 * ENDPOINTS DISPONIBLES:
 *   GET /api/bitacora   [auth=ADMINISTRADOR]  → index()
 */
class BitacoraController extends Controller
{
    // ──────────────────────────────────────────────────────────────
    // GET /api/bitacora?accion=LOGIN_FALLIDO&usuario=juan
    // ──────────────────────────────────────────────────────────────
    /**
     * Lista los registros de auditoría (máx 200 más recientes).
     * Solo accesible para el rol ADMINISTRADOR.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /bitacora?accion=LOGIN_FALLIDO&usuario=juan [Bearer token]
     *
     *   [1] Obtener el rol del usuario autenticado
     *   ALT [rol != ADMINISTRADOR]
     *     → 403 "Acceso denegado"
     *
     *   [2] Construir consulta base: SELECT * FROM bitacora ORDER BY fecha DESC
     *   OPT [si viene ?accion=...]
     *     → WHERE accion = ?accion
     *   OPT [si viene ?usuario=...]
     *     → WHERE nombre_usuario ILIKE %usuario%
     *
     *   [3] LIMIT 200 (evitar respuestas masivas)
     *   [4] → 200 con array de registros de auditoría
     */
    public function index(Request $request)
    {
        $rol = DB::table('usuario_roles')
            ->join('roles', 'roles.idrol', '=', 'usuario_roles.idrol')
            ->where('usuario_roles.idusuario', $request->user()->idusuario)
            ->value('roles.nombre');

        if ($rol !== 'ADMINISTRADOR') {
            return response()->json(['message' => 'Acceso denegado'], 403);
        }

        $query = DB::table('bitacora')->orderBy('fecha', 'desc');

        if ($request->filled('accion')) {
            $query->where('accion', $request->accion);
        }
        if ($request->filled('usuario')) {
            $query->where('nombre_usuario', 'ilike', '%' . $request->usuario . '%');
        }

        return response()->json($query->limit(200)->get());
    }
}
