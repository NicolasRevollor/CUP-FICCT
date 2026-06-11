<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * ============================================================
 * EstudianteController  —  CU-19: Portal de auto-consulta del estudiante
 * ============================================================
 *
 * ¿QUÉ HACE ESTE CONTROLADOR?
 *   Permite a un estudiante (postulante con cuenta de usuario) consultar
 *   su propia información: perfil, grupo asignado, notas y asistencia.
 *   Todos los métodos son de solo lectura excepto subirFoto().
 *
 * ¿CÓMO SE IDENTIFICA EL ESTUDIANTE?
 *   El usuario autenticado tiene idusuario → se busca en tabla postulante
 *   WHERE idusuario = usuario_autenticado.idusuario.
 *   Si no tiene un registro de postulante vinculado → 404 "Perfil no encontrado".
 *
 * TABLA PRINCIPAL: postulante (vía idusuario del token)
 *
 * ENDPOINTS DISPONIBLES:
 *   GET  /api/estudiante/perfil         [auth]  → perfil()
 *   GET  /api/estudiante/mi-grupo       [auth]  → miGrupo()
 *   GET  /api/estudiante/mis-examenes   [auth]  → misExamenes()
 *   GET  /api/estudiante/mi-asistencia  [auth]  → miAsistencia()
 *   POST /api/estudiante/subir-foto     [auth]  → subirFoto()
 */
class EstudianteController extends Controller
{
    // MÉTODO PRIVADO: obtiene el postulante vinculado al usuario autenticado
    private function postulante(Request $request)
    {
        return DB::table('postulante')
            ->where('idusuario', $request->user()->idusuario)
            ->first();
    }

    // ──────────────────────────────────────────────────────────────
    // GET /api/estudiante/perfil
    // ──────────────────────────────────────────────────────────────
    /**
     * Devuelve los datos del perfil del estudiante autenticado.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /estudiante/perfil [Bearer token]
     *   [1] Buscar postulante WHERE idusuario = token.idusuario
     *   ALT [no vinculado] → 404 "Perfil no encontrado"
     *   [2] → 200 con objeto postulante completo
     */
    public function perfil(Request $request)
    {
        $p = $this->postulante($request);
        if (!$p) return response()->json(['message' => 'Perfil no encontrado'], 404);
        return response()->json($p);
    }

    // ──────────────────────────────────────────────────────────────
    // GET /api/estudiante/mi-grupo
    // ──────────────────────────────────────────────────────────────
    /**
     * Devuelve el grupo activo del estudiante con info de docente y materia.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /estudiante/mi-grupo [Bearer token]
     *   [1] Buscar el postulante vinculado al token
     *   ALT [no vinculado] → 404
     *   [2] grupopostulantes JOIN grupos
     *       LEFT JOIN docentegrupomateria LEFT JOIN docente LEFT JOIN materia
     *       WHERE idpostulante = ? AND gp.estado = 'ACTIVO'
     *   [3] → 200 con datos del grupo (puede ser null si no tiene grupo asignado)
     */
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

    // ──────────────────────────────────────────────────────────────
    // GET /api/estudiante/mis-examenes
    // ──────────────────────────────────────────────────────────────
    /**
     * Devuelve las notas del estudiante en todas las materias que tiene registradas.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /estudiante/mis-examenes [Bearer token]
     *   [1] Buscar el postulante vinculado al token
     *   ALT [no vinculado] → 404
     *   [2] examen LEFT JOIN materia WHERE idpostulante = ? ORDER BY nombre_materia
     *   [3] → 200 con array de { nota1, nota2, nota3, promedio, estado, materia_nombre }
     */
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

    // ──────────────────────────────────────────────────────────────
    // GET /api/estudiante/mi-asistencia
    // ──────────────────────────────────────────────────────────────
    /**
     * Devuelve el historial de asistencia del estudiante ordenado por fecha.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /estudiante/mi-asistencia [Bearer token]
     *   [1] Buscar el postulante vinculado al token
     *   ALT [no vinculado] → 404
     *   [2] asistencia LEFT JOIN grupos WHERE idpostulante = ? ORDER BY fecha DESC
     *   [3] → 200 con array de { fecha, estado (PRESENTE|AUSENTE|JUSTIFICADO), grupo_nombre }
     */
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

    // ──────────────────────────────────────────────────────────────
    // POST /api/estudiante/subir-foto
    // ──────────────────────────────────────────────────────────────
    /**
     * Actualiza la URL de la foto del perfil del estudiante.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → POST /estudiante/subir-foto [Bearer token] { foto: "url_o_base64" }
     *   [1] Validar que venga el campo foto (string)
     *   [2] Buscar el postulante vinculado al token
     *   ALT [no vinculado] → 404
     *   [3] UPDATE postulante SET foto = ? WHERE idpostulante = ?
     *   [4] → 200 "Foto actualizada correctamente"
     */
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
