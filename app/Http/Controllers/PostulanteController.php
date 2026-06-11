<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * ============================================================
 * PostulanteController  —  CU-03: Registro y gestión de postulantes
 * ============================================================
 *
 * ¿QUÉ HACE ESTE CONTROLADOR?
 *   CRUD completo sobre la tabla postulante para uso del administrador.
 *   Permite listar, buscar, ver, crear, actualizar y eliminar postulantes.
 *
 * TABLA PRINCIPAL: postulante
 *   - idpostulante, ci, nombres, apellidos, sexo, correo, telefono
 *   - estadopostulante: BORRADOR | PENDIENTE | INSCRITO | APROBADO | REPROBADO
 *   - promedio_final: actualizado automáticamente por TRIGGER 2 al registrar notas
 *   - idusuario: FK → tabla usuario (se vincula cuando se crean credenciales)
 *
 * DIFERENCIA CON RegistroController:
 *   - PostulanteController: uso INTERNO del administrador, requiere autenticación
 *   - RegistroController: uso PÚBLICO, no requiere auth (el postulante se inscribe solo)
 *
 * ENDPOINTS DISPONIBLES:
 *   GET    /api/postulantes            → index()
 *   GET    /api/postulantes/buscar     → buscar()
 *   GET    /api/postulantes/{id}       → show()
 *   POST   /api/postulantes            → store()
 *   PUT    /api/postulantes/{id}       → update()
 *   POST   /api/postulantes/{id}/vincular-usuario → vincularUsuario()
 *   DELETE /api/postulantes/{id}       → destroy()
 */
class PostulanteController extends Controller
{
    // ──────────────────────────────────────────────────────────────
    // GET /api/postulantes?page=1
    // ──────────────────────────────────────────────────────────────
    /**
     * Lista todos los postulantes paginados (20 por página).
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /postulantes?page=1
     *   [1] SELECT * FROM postulante ORDER BY idpostulante
     *   [2] → 200 { data: [...], current_page, last_page, total }
     */
    public function index()
    {
        $postulantes = DB::table('postulante')
            ->orderBy('idpostulante')
            ->paginate(20);

        return response()->json($postulantes);
    }

    // ──────────────────────────────────────────────────────────────
    // GET /api/postulantes/buscar?q=texto
    // ──────────────────────────────────────────────────────────────
    /**
     * Busca postulantes por CI, nombre o apellido (case-insensitive).
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /postulantes/buscar?q=Juan
     *   [1] WHERE ci ILIKE %q% OR nombres ILIKE %q% OR apellidos ILIKE %q%
     *   [2] Paginar 20 por página
     *   [3] → 200 con paginación
     */
    public function buscar(Request $request)
    {
        $query = $request->query('q');

        $postulantes = DB::table('postulante')
            ->where('ci', 'ilike', "%$query%")
            ->orWhere('nombres', 'ilike', "%$query%")
            ->orWhere('apellidos', 'ilike', "%$query%")
            ->orderBy('idpostulante')
            ->paginate(20);

        return response()->json($postulantes);
    }

    // ──────────────────────────────────────────────────────────────
    // GET /api/postulantes/{id}
    // ──────────────────────────────────────────────────────────────
    /**
     * Devuelve los datos completos de un postulante por su ID.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /postulantes/42
     *   [1] SELECT * FROM postulante WHERE idpostulante = 42
     *   ALT [no existe] → 404
     *   [2] → 200 con el objeto postulante
     */
    public function show($id)
    {
        $postulante = DB::table('postulante')
            ->where('idpostulante', $id)
            ->first();

        if (!$postulante) {
            return response()->json(['message' => 'Postulante no encontrado'], 404);
        }

        return response()->json($postulante);
    }

    // ──────────────────────────────────────────────────────────────
    // POST /api/postulantes
    // ──────────────────────────────────────────────────────────────
    /**
     * Crea un nuevo postulante desde el panel del administrador.
     * A diferencia del flujo público (RegistroController), aquí el admin
     * lo crea directamente en estado PENDIENTE, sin pasar por BORRADOR ni pago.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → POST /postulantes { ci, nombres, apellidos, sexo, correo, tituloBachiller, ... }
     *   [1] Validar: ci y correo únicos en tabla postulante, tituloBachiller requerido=true
     *   [2] INSERT en postulante con estadopostulante='PENDIENTE'
     *   [3] → 201 "Postulante registrado correctamente"
     */
    public function store(Request $request)
{
    $request->validate([
    'ci'          => 'required|unique:postulante,ci',
    'nombres'     => 'required',
    'apellidos'   => 'required',
    'sexo'        => 'required|in:M,F',
    'correo'      => 'required|email|unique:postulante,correo',
    'tituloBachiller' => 'required|boolean|accepted',
]);

    DB::table('postulante')->insert([
        'ci'                 => $request->ci,
        'nombres'            => $request->nombres,
        'apellidos'          => $request->apellidos,
        'sexo'               => $request->sexo,
        'direccion'          => $request->direccion,
        'telefono'           => $request->telefono,
        'correo'             => $request->correo,
        'colegioprocedencia' => $request->colegioProcedencia,
        'ciudad'             => $request->ciudad,
        'titulobachiller'    => $request->tituloBachiller ?? false,
        'otrosrequisitos'    => $request->otrosRequisitos,
        'estadopostulante'   => 'PENDIENTE',
        'promedio_final'     => 0,
    ]);

    return response()->json([
        'message' => 'Postulante registrado correctamente'
    ], 201);
}

    // ──────────────────────────────────────────────────────────────
    // PUT /api/postulantes/{id}
    // ──────────────────────────────────────────────────────────────
    /**
     * Actualiza los datos personales de un postulante.
     * El CI no se puede cambiar (no está en los campos actualizables).
     * Opcionalmente puede actualizarse el idusuario para vincularlo manualmente.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → PUT /postulantes/42 { nombres, apellidos, correo, ... }
     *   [1] Verificar que el postulante exista
     *   ALT [no existe] → 404
     *   [2] OPT [si viene idusuario en el body] → incluir en el UPDATE
     *   [3] UPDATE postulante (campos personales)
     *   [4] → 200 "Postulante actualizado correctamente"
     */
   public function update(Request $request, $id)
{
    $postulante = DB::table('postulante')->where('idpostulante', $id)->first();

    if (!$postulante) {
        return response()->json(['message' => 'Postulante no encontrado'], 404);
    }

    $datos = [
        'nombres'            => $request->nombres,
        'apellidos'          => $request->apellidos,
        'sexo'               => $request->sexo,
        'direccion'          => $request->direccion,
        'telefono'           => $request->telefono,
        'correo'             => $request->correo,
        'colegioprocedencia' => $request->colegioProcedencia,
        'ciudad'             => $request->ciudad,
        'titulobachiller'    => $request->tituloBachiller ?? false,
        'otrosrequisitos'    => $request->otrosRequisitos,
    ];

    if ($request->has('idusuario')) {
        $datos['idusuario'] = $request->idusuario ?: null;
    }

    DB::table('postulante')->where('idpostulante', $id)->update($datos);

    return response()->json(['message' => 'Postulante actualizado correctamente']);
}

    // ──────────────────────────────────────────────────────────────
    // POST /api/postulantes/{id}/vincular-usuario
    // ──────────────────────────────────────────────────────────────
    /**
     * Vincula el postulante con su cuenta de usuario buscando coincidencia de correo.
     * Útil cuando el usuario ya existía en la tabla usuario antes de que
     * se creara el postulante (ej: importación manual o inscripción antigua).
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → POST /postulantes/42/vincular-usuario
     *   [1] Buscar postulante por ID
     *   ALT [no existe] → 404
     *   [2] Buscar en tabla usuario WHERE email = postulante.correo
     *   ALT [no existe usuario con ese correo] → 404
     *   [3] UPDATE postulante SET idusuario = usuario.idusuario
     *   [4] → 200 { message, idusuario }
     */
    public function vincularUsuario($id)
    {
        $postulante = DB::table('postulante')->where('idpostulante', $id)->first();
        if (!$postulante) return response()->json(['message' => 'Postulante no encontrado'], 404);

        $usuario = DB::table('usuario')->where('email', $postulante->correo)->first();
        if (!$usuario) {
            return response()->json(['message' => 'No existe ningún usuario con el correo ' . $postulante->correo], 404);
        }

        DB::table('postulante')
            ->where('idpostulante', $id)
            ->update(['idusuario' => $usuario->idusuario]);

        return response()->json(['message' => 'Usuario vinculado correctamente', 'idusuario' => $usuario->idusuario]);
    }

    // ──────────────────────────────────────────────────────────────
    // DELETE /api/postulantes/{id}
    // ──────────────────────────────────────────────────────────────
    /**
     * Elimina permanentemente un postulante de la BD.
     * PRECAUCIÓN: es un DELETE físico, no soft delete. Usar solo en datos de prueba.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → DELETE /postulantes/42
     *   [1] Verificar que el postulante exista
     *   ALT [no existe] → 404
     *   [2] DELETE FROM postulante WHERE idpostulante = 42
     *   [3] → 200 "Postulante eliminado correctamente"
     */
    public function destroy($id)
    {
        $postulante = DB::table('postulante')->where('idpostulante', $id)->first();

        if (!$postulante) {
            return response()->json(['message' => 'Postulante no encontrado'], 404);
        }

        DB::table('postulante')->where('idpostulante', $id)->delete();

        return response()->json(['message' => 'Postulante eliminado correctamente']);
    }
}