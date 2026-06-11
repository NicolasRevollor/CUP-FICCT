<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * ============================================================
 * DocenteController  —  CU-08: Registro y gestión de docentes
 *                        CU-11: Asignación de docentes a grupos
 * ============================================================
 *
 * CU-08 — Gestión de docentes
 *   CRUD sobre la tabla docente. Al crear un docente, el sistema le asigna
 *   automáticamente el rol DOCENTE en usuario_roles.
 *   Almacena credenciales académicas (profesión, maestría, diplomado) para
 *   referencia, pero la verificación de requisitos es manual.
 *
 * CU-11 — Asignación de docentes a grupos
 *   Un docente puede ser asignado a un grupo+materia.
 *   REGLA: máximo 1 grupo activo por turno (MAÑANA o TARDE) por docente.
 *   La tabla docentegrupomateria (idasignacion, iddocente, idgrupo, idmateria, estado)
 *   es la que controla estas asignaciones.
 *
 * TABLA PRINCIPAL: docente
 *   - iddocente, idusuario (FK→usuario), ci, nombres, apellidos
 *   - profesion, maestria, diplomadoedsup, telefono, correo
 *   - estado: ACTIVO | INACTIVO
 *
 * TABLA RELACIONADA: docentegrupomateria
 *   - idasignacion, iddocente, idgrupo, idmateria, estado (ACTIVO|INACTIVO)
 *   - Usada también por AsistenciaController para control de acceso
 *
 * ENDPOINTS DISPONIBLES:
 *   GET    /api/docentes                            → index()
 *   GET    /api/docentes/usuarios-disponibles       → usuariosDisponibles()
 *   GET    /api/docentes/mi-perfil         [auth]   → miPerfil()
 *   GET    /api/docentes/mis-grupos        [auth]   → misGrupos()
 *   GET    /api/docentes/{id}                       → show()
 *   POST   /api/docentes                            → store()
 *   PUT    /api/docentes/{id}                       → update()
 *   GET    /api/docentes/{id}/grupos                → grupos()
 *   POST   /api/docentes/{id}/asignar-grupo         → asignarGrupo()
 *   DELETE /api/docentes/{id}/grupos/{idAsignacion} → desasignarGrupo()
 *   DELETE /api/docentes/{id}                       → destroy()
 */
class DocenteController extends Controller
{
    // ──────────────────────────────────────────────────────────────
    // GET /api/docentes
    // ──────────────────────────────────────────────────────────────
    /**
     * Lista todos los docentes ordenados por apellido.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /docentes
     *   [1] SELECT * FROM docente ORDER BY apellidos
     *   [2] → 200 con array de docentes
     */
    public function index()
    {
        $docentes = DB::table('docente')
            ->orderBy('apellidos')
            ->get();

        return response()->json($docentes);
    }

    // ──────────────────────────────────────────────────────────────
    // GET /api/docentes/usuarios-disponibles
    // ──────────────────────────────────────────────────────────────
    /**
     * Usuarios del sistema que aún no tienen un registro de docente.
     * Se usa en el formulario de alta de docente para elegir el usuario base.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /docentes/usuarios-disponibles
     *   [1] usuario LEFT JOIN docente ON docente.idusuario = usuario.idusuario
     *   [2] WHERE docente.idusuario IS NULL (sin registro de docente aún)
     *       AND usuario.estado = 'ACTIVO'
     *   [3] → 200 con lista de { idusuario, nombre_usuario, email }
     */
    public function usuariosDisponibles()
    {
        $usuarios = DB::table('usuario as u')
            ->leftJoin('docente as d', 'd.idusuario', '=', 'u.idusuario')
            ->whereNull('d.idusuario')
            ->where('u.estado', 'ACTIVO')
            ->select('u.idusuario', 'u.nombre_usuario', 'u.email')
            ->orderBy('u.nombre_usuario')
            ->get();

        return response()->json($usuarios);
    }

    // ──────────────────────────────────────────────────────────────
    // GET /api/docentes/{id}
    // ──────────────────────────────────────────────────────────────
    /**
     * Devuelve los datos de un docente por su ID.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /docentes/5
     *   [1] SELECT * FROM docente WHERE iddocente = 5
     *   ALT [no existe] → 404
     *   [2] → 200 con el objeto docente
     */
    public function show(int $id)
    {
        $docente = DB::table('docente')->where('iddocente', $id)->first();
        if (!$docente) {
            return response()->json(['message' => 'Docente no encontrado'], 404);
        }
        return response()->json($docente);
    }

    // ──────────────────────────────────────────────────────────────
    // GET /api/docentes/mi-perfil  [requiere auth]
    // ──────────────────────────────────────────────────────────────
    /**
     * Devuelve el perfil del docente actualmente autenticado.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /docentes/mi-perfil [Bearer token]
     *   [1] SELECT * FROM docente WHERE idusuario = usuario_autenticado.idusuario
     *   ALT [no tiene perfil de docente] → 403
     *   [2] → 200 con el objeto docente
     */
    public function miPerfil(Request $request)
    {
        $docente = DB::table('docente')
            ->where('idusuario', $request->user()->idusuario)
            ->first();

        if (!$docente) {
            return response()->json(['message' => 'No tienes perfil de docente'], 403);
        }

        return response()->json($docente);
    }

    // ──────────────────────────────────────────────────────────────
    // GET /api/docentes/mis-grupos  [requiere auth]
    // ──────────────────────────────────────────────────────────────
    /**
     * Lista los grupos activos asignados al docente autenticado,
     * incluyendo materia, aula y horario de cada grupo.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /docentes/mis-grupos [Bearer token]
     *   [1] Buscar el registro de docente por idusuario del token
     *   ALT [no tiene perfil de docente] → 403
     *   [2] docentegrupomateria JOIN grupos JOIN materia
     *       LEFT JOIN horarios LEFT JOIN aulas
     *       WHERE iddocente = docente.iddocente AND dgm.estado = 'ACTIVO'
     *   [3] → 200 con lista de grupos con detalle de materia, aula y horario
     */
    public function misGrupos(Request $request)
    {
        $docente = DB::table('docente')
            ->where('idusuario', $request->user()->idusuario)
            ->first();

        if (!$docente) {
            return response()->json(['message' => 'No tienes perfil de docente'], 403);
        }

        $grupos = DB::table('docentegrupomateria as dgm')
            ->join('grupos as g',  'g.idgrupo',   '=', 'dgm.idgrupo')
            ->join('materia as m', 'm.idmateria', '=', 'dgm.idmateria')
            ->leftJoin('horarios as h', 'h.idgrupo', '=', 'g.idgrupo')
            ->leftJoin('aulas as a',    'a.idaulas', '=', 'h.idaula')
            ->where('dgm.iddocente', $docente->iddocente)
            ->where('dgm.estado', 'ACTIVO')
            ->select(
                'g.idgrupo', 'g.nombregrupo', 'g.turno', 'g.cantidadestudiante', 'g.capacidadmaxima',
                'm.idmateria', 'm.nombre as materia',
                'a.nombre as aula',
                'h.horarioinicio', 'h.horariofin', 'h.dias',
                'dgm.idasignacion'
            )
            ->get();

        return response()->json($grupos);
    }

    // ──────────────────────────────────────────────────────────────
    // POST /api/docentes
    // ──────────────────────────────────────────────────────────────
    /**
     * Crea el perfil de docente para un usuario existente del sistema.
     * El usuario ya debe existir en la tabla usuario antes de ejecutar esto.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → POST /docentes { idusuario, ci, nombres, apellidos, correo, estado, ... }
     *
     *   [1] Validar (idusuario, ci y correo deben ser únicos en tabla docente)
     *   [2] Verificar que el usuario base exista en tabla usuario
     *   ALT [no existe] → 404
     *
     *   DB TRANSACTION:
     *     [3] INSERT en tabla docente
     *     [4] OPT [existe el rol DOCENTE en tabla roles]
     *         → INSERT OR IGNORE en usuario_roles (asignar rol DOCENTE al usuario)
     *
     *   [5] → 201 "Docente registrado y rol DOCENTE asignado correctamente"
     */
    public function store(Request $request)
    {
        $request->validate([
            'idusuario' => 'required|integer|unique:docente,idusuario',
            'ci'        => 'required|unique:docente,ci',
            'nombres'   => 'required',
            'apellidos' => 'required',
            'correo'    => 'required|email|unique:docente,correo',
            'estado'    => 'required|in:ACTIVO,INACTIVO',
        ]);

        $usuario = DB::table('usuario')->where('idusuario', $request->idusuario)->first();
        if (!$usuario) {
            return response()->json(['message' => 'Usuario no encontrado'], 404);
        }

        DB::transaction(function () use ($request) {
            DB::table('docente')->insert([
                'idusuario'      => $request->idusuario,
                'ci'             => $request->ci,
                'nombres'        => $request->nombres,
                'apellidos'      => $request->apellidos,
                'profesion'      => $request->profesion,
                'maestria'       => $request->maestria,
                'diplomadoedsup' => $request->diplomadoEdSup,
                'telefono'       => $request->telefono,
                'correo'         => $request->correo,
                'estado'         => $request->estado,
            ]);

            // Asignar automáticamente el rol DOCENTE al usuario
            $rolDocente = DB::table('roles')->where('nombre', 'DOCENTE')->first();
            if ($rolDocente) {
                DB::table('usuario_roles')->insertOrIgnore([
                    'idusuario' => $request->idusuario,
                    'idrol'     => $rolDocente->idrol,
                ]);
            }
        });

        return response()->json(['message' => 'Docente registrado y rol DOCENTE asignado correctamente'], 201);
    }

    // ──────────────────────────────────────────────────────────────
    // PUT /api/docentes/{id}
    // ──────────────────────────────────────────────────────────────
    /**
     * Actualiza los datos del perfil de un docente.
     * El CI e idusuario no son modificables (identificadores permanentes).
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → PUT /docentes/5 { nombres, apellidos, correo, estado, ... }
     *   [1] Verificar que el docente exista
     *   ALT [no existe] → 404
     *   [2] Validar campos requeridos
     *   [3] UPDATE docente (campos personales y estado)
     *   [4] → 200 "Docente actualizado correctamente"
     */
    public function update(Request $request, int $id)
    {
        $docente = DB::table('docente')->where('iddocente', $id)->first();
        if (!$docente) {
            return response()->json(['message' => 'Docente no encontrado'], 404);
        }

        $request->validate([
            'nombres'   => 'required',
            'apellidos' => 'required',
            'correo'    => 'required|email',
            'estado'    => 'required|in:ACTIVO,INACTIVO',
        ]);

        DB::table('docente')->where('iddocente', $id)->update([
            'nombres'        => $request->nombres,
            'apellidos'      => $request->apellidos,
            'profesion'      => $request->profesion,
            'maestria'       => $request->maestria,
            'diplomadoedsup' => $request->diplomadoEdSup,
            'telefono'       => $request->telefono,
            'correo'         => $request->correo,
            'estado'         => $request->estado,
        ]);

        return response()->json(['message' => 'Docente actualizado correctamente']);
    }

    // ──────────────────────────────────────────────────────────────
    // GET /api/docentes/{id}/grupos  (CU-11)
    // ──────────────────────────────────────────────────────────────
    /**
     * Lista los grupos activos asignados a un docente específico.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /docentes/5/grupos
     *   [1] Verificar que el docente exista
     *   ALT [no existe] → 404
     *   [2] docentegrupomateria JOIN grupos JOIN materia
     *       WHERE iddocente = 5 AND estado = 'ACTIVO'
     *   [3] → 200 con lista de { idasignacion, idgrupo, nombregrupo, turno, idmateria, materia }
     */
    public function grupos(int $id)
    {
        $docente = DB::table('docente')->where('iddocente', $id)->first();
        if (!$docente) return response()->json(['message' => 'Docente no encontrado'], 404);

        $grupos = DB::table('docentegrupomateria as dgm')
            ->join('grupos as g',  'g.idgrupo',   '=', 'dgm.idgrupo')
            ->join('materia as m', 'm.idmateria', '=', 'dgm.idmateria')
            ->where('dgm.iddocente', $id)
            ->where('dgm.estado', 'ACTIVO')
            ->select('dgm.idasignacion', 'g.idgrupo', 'g.nombregrupo', 'g.turno', 'm.idmateria', 'm.nombre as materia')
            ->get();

        return response()->json($grupos);
    }

    // ──────────────────────────────────────────────────────────────
    // POST /api/docentes/{id}/asignar-grupo  (CU-11)
    // ──────────────────────────────────────────────────────────────
    /**
     * Asigna un docente a un grupo/materia.
     * Regla: máximo 1 grupo activo por turno (MAÑANA o TARDE).
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → POST /docentes/5/asignar-grupo { idgrupo, idmateria }
     *
     *   [1] Verificar que el docente exista
     *   ALT [no existe] → 404
     *   [2] Validar campos requeridos
     *   [3] Verificar que el grupo y la materia existan
     *   ALT [grupo no existe] → 404
     *   ALT [materia no existe] → 404
     *
     *   [4] Verificar límite: ¿ya tiene un grupo activo en ese turno?
     *       JOIN docentegrupomateria + grupos para saber el turno del grupo existente
     *   ALT [ya tiene grupo en ese turno]
     *     → 400 "El docente ya tiene un grupo en el turno X"
     *
     *   [5] Verificar que no esté ya asignado al mismo grupo/materia (ACTIVO)
     *   ALT [ya asignado] → 400
     *
     *   [6] INSERT en docentegrupomateria con estado='ACTIVO'
     *   [7] → 201 "Docente asignado al grupo correctamente"
     */
    public function asignarGrupo(Request $request, int $id)
    {
        $docente = DB::table('docente')->where('iddocente', $id)->first();
        if (!$docente) {
            return response()->json(['message' => 'Docente no encontrado'], 404);
        }

        $request->validate([
            'idgrupo'   => 'required|integer',
            'idmateria' => 'required|integer',
        ]);

        // Verificar que el grupo y la materia existan
        $grupo   = DB::table('grupos')->where('idgrupo', $request->idgrupo)->first();
        $materia = DB::table('materia')->where('idmateria', $request->idmateria)->first();
        if (!$grupo)   return response()->json(['message' => 'Grupo no encontrado'], 404);
        if (!$materia) return response()->json(['message' => 'Materia no encontrada'], 404);

        // Validar límite: máximo 1 grupo por turno por docente
        $turnoOcupado = DB::table('docentegrupomateria as dgm')
            ->join('grupos as g', 'g.idgrupo', '=', 'dgm.idgrupo')
            ->where('dgm.iddocente', $id)
            ->where('dgm.estado', 'ACTIVO')
            ->where('g.turno', $grupo->turno)
            ->exists();

        if ($turnoOcupado) {
            return response()->json([
                'message' => "El docente ya tiene un grupo asignado en el turno {$grupo->turno}. Máximo 1 grupo por turno.",
            ], 400);
        }

        // Evitar duplicado activo en mismo grupo/materia
        $existe = DB::table('docentegrupomateria')
            ->where('iddocente',  $id)
            ->where('idgrupo',    $request->idgrupo)
            ->where('idmateria',  $request->idmateria)
            ->where('estado',     'ACTIVO')
            ->exists();

        if ($existe) {
            return response()->json(['message' => 'El docente ya está asignado a ese grupo/materia'], 400);
        }

        DB::table('docentegrupomateria')->insert([
            'iddocente'  => $id,
            'idgrupo'    => $request->idgrupo,
            'idmateria'  => $request->idmateria,
            'estado'     => 'ACTIVO',
        ]);

        return response()->json(['message' => 'Docente asignado al grupo correctamente'], 201);
    }

    // ──────────────────────────────────────────────────────────────
    // DELETE /api/docentes/{id}/grupos/{idAsignacion}  (CU-11)
    // ──────────────────────────────────────────────────────────────
    /**
     * Desasigna un docente de un grupo (soft delete: estado → INACTIVO).
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → DELETE /docentes/5/grupos/12
     *   [1] Buscar la asignación WHERE idasignacion=12 AND iddocente=5
     *   ALT [no existe o no pertenece al docente] → 404
     *   [2] UPDATE docentegrupomateria SET estado='INACTIVO'
     *       (soft delete para preservar historial)
     *   [3] → 200 "Docente desasignado del grupo correctamente"
     */
    public function desasignarGrupo(int $id, int $idAsignacion)
    {
        $asignacion = DB::table('docentegrupomateria')
            ->where('idasignacion', $idAsignacion)
            ->where('iddocente', $id)
            ->first();

        if (!$asignacion) {
            return response()->json(['message' => 'Asignación no encontrada'], 404);
        }

        DB::table('docentegrupomateria')
            ->where('idasignacion', $idAsignacion)
            ->update(['estado' => 'INACTIVO']);

        return response()->json(['message' => 'Docente desasignado del grupo correctamente']);
    }

    // ──────────────────────────────────────────────────────────────
    // DELETE /api/docentes/{id}
    // ──────────────────────────────────────────────────────────────
    /**
     * Elimina permanentemente el perfil de un docente.
     * PRECAUCIÓN: DELETE físico. Usar solo si no tiene asignaciones históricas.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → DELETE /docentes/5
     *   [1] Verificar que el docente exista
     *   ALT [no existe] → 404
     *   [2] DELETE FROM docente WHERE iddocente = 5
     *   [3] → 200 "Docente eliminado correctamente"
     */
    public function destroy(int $id)
    {
        $docente = DB::table('docente')->where('iddocente', $id)->first();
        if (!$docente) {
            return response()->json(['message' => 'Docente no encontrado'], 404);
        }
        DB::table('docente')->where('iddocente', $id)->delete();
        return response()->json(['message' => 'Docente eliminado correctamente']);
    }
}
