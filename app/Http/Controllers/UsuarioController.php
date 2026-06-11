<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * ============================================================
 * UsuarioController  —  CU-14: Gestión de usuarios del sistema
 * ============================================================
 *
 * ¿QUÉ HACE ESTE CONTROLADOR?
 *   CRUD de usuarios para el administrador del sistema.
 *   Cada usuario tiene exactamente un rol (tabla usuario_roles).
 *   Desactivar usuario es soft delete (estado=INACTIVO).
 *
 * TABLA PRINCIPAL: usuario
 *   - idusuario, nombre_usuario, email, password (bcrypt)
 *   - estado: ACTIVO | INACTIVO
 *   - debe_cambiar_password: true cuando se crea la cuenta (el usuario debe cambiarla al primer login)
 *
 * TABLA RELACIONADA: usuario_roles
 *   - idusuario, idrol  (FK a roles)
 *   Roles posibles: ADMINISTRADOR | DOCENTE | ESTUDIANTE | COORDINADOR
 *
 * ENDPOINTS DISPONIBLES:
 *   GET    /api/usuarios           → index()
 *   GET    /api/usuarios/{id}      → show()
 *   GET    /api/usuarios/roles     → roles()
 *   POST   /api/usuarios           → store()
 *   PUT    /api/usuarios/{id}      → update()
 *   DELETE /api/usuarios/{id}      → destroy()
 */
class UsuarioController extends Controller
{
    // ──────────────────────────────────────────────────────────────
    // GET /api/usuarios?q=busqueda
    // ──────────────────────────────────────────────────────────────
    /**
     * Lista todos los usuarios con su rol. Soporta búsqueda por nombre_usuario o email.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /usuarios?q=juan
     *   [1] usuario LEFT JOIN usuario_roles LEFT JOIN roles
     *   OPT [si viene ?q=...]
     *     → WHERE nombre_usuario ILIKE %q% OR email ILIKE %q%
     *   [2] Paginar 20 por página
     *   [3] → 200 con paginación y campo 'rol' por cada usuario
     */
    public function index(Request $request)
    {
        $query = DB::table('usuario as u')
            ->leftJoin('usuario_roles as ur', 'ur.idusuario', '=', 'u.idusuario')
            ->leftJoin('roles as r', 'r.idrol', '=', 'ur.idrol')
            ->select('u.idusuario', 'u.nombre_usuario', 'u.email', 'u.estado', 'u.debe_cambiar_password', 'r.nombre as rol')
            ->orderBy('u.nombre_usuario');

        if ($request->filled('q')) {
            $q = $request->q;
            $query->where(function ($qb) use ($q) {
                $qb->where('u.nombre_usuario', 'ilike', "%{$q}%")
                   ->orWhere('u.email', 'ilike', "%{$q}%");
            });
        }

        return response()->json($query->paginate(20));
    }

    // ──────────────────────────────────────────────────────────────
    // GET /api/usuarios/{id}
    // ──────────────────────────────────────────────────────────────
    /**
     * Devuelve los datos de un usuario con su rol.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /usuarios/10
     *   [1] usuario LEFT JOIN usuario_roles LEFT JOIN roles WHERE idusuario = 10
     *   ALT [no existe] → 404
     *   [2] → 200 con { idusuario, nombre_usuario, email, estado, rol }
     */
    public function show(int $id)
    {
        $usuario = DB::table('usuario as u')
            ->leftJoin('usuario_roles as ur', 'ur.idusuario', '=', 'u.idusuario')
            ->leftJoin('roles as r', 'r.idrol', '=', 'ur.idrol')
            ->where('u.idusuario', $id)
            ->select('u.idusuario', 'u.nombre_usuario', 'u.email', 'u.estado', 'r.nombre as rol')
            ->first();

        if (!$usuario) {
            return response()->json(['message' => 'Usuario no encontrado'], 404);
        }

        return response()->json($usuario);
    }

    // ──────────────────────────────────────────────────────────────
    // POST /api/usuarios
    // ──────────────────────────────────────────────────────────────
    /**
     * Crea un nuevo usuario del sistema y le asigna un rol.
     * Si el rol es ESTUDIANTE, vincula automáticamente al postulante con ese correo.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → POST /usuarios { nombre_usuario, email, password, idrol }
     *   [1] Validar (nombre_usuario y email únicos)
     *
     *   DB TRANSACTION:
     *     [2] INSERT usuario (password=bcrypt, estado=ACTIVO, debe_cambiar_password=true)
     *     [3] INSERT usuario_roles (idusuario, idrol)
     *     OPT [rol = ESTUDIANTE]
     *       [4] UPDATE postulante SET idusuario = nuevo idusuario
     *           WHERE correo = email AND idusuario IS NULL
     *           (vinculación automática si el postulante tiene ese correo)
     *
     *   [5] → 201 "Usuario creado correctamente"
     */
    public function store(Request $request)
    {
        $request->validate([
            'nombre_usuario' => 'required|string|max:100|unique:usuario,nombre_usuario',
            'email'          => 'required|email|unique:usuario,email',
            'password'       => 'required|string|min:6',
            'idrol'          => 'required|integer|exists:roles,idrol',
        ]);

        DB::transaction(function () use ($request) {
            $idUsuario = DB::table('usuario')->insertGetId([
                'nombre_usuario'        => $request->nombre_usuario,
                'email'                 => $request->email,
                'password'              => Hash::make($request->password),
                'estado'                => 'ACTIVO',
                'debe_cambiar_password' => true,
            ], 'idusuario');

            DB::table('usuario_roles')->insert([
                'idusuario' => $idUsuario,
                'idrol'     => $request->idrol,
            ]);

            // Si el rol es ESTUDIANTE, vincular al postulante que tenga el mismo correo
            $rol = DB::table('roles')->where('idrol', $request->idrol)->first();
            if ($rol && $rol->nombre === 'ESTUDIANTE') {
                DB::table('postulante')
                    ->where('correo', $request->email)
                    ->whereNull('idusuario')
                    ->update(['idusuario' => $idUsuario]);
            }
        });

        return response()->json(['message' => 'Usuario creado correctamente'], 201);
    }

    // ──────────────────────────────────────────────────────────────
    // PUT /api/usuarios/{id}
    // ──────────────────────────────────────────────────────────────
    /**
     * Actualiza email y/o estado de un usuario.
     * El nombre_usuario y el rol NO son modificables desde aquí.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → PUT /usuarios/10  { email?, estado? }
     *   [1] Verificar que el usuario exista
     *   ALT [no existe] → 404
     *   [2] Validar: email único (excepto el propio), estado válido
     *   [3] UPDATE usuario con solo los campos que vengan en el body
     *   [4] → 200 "Usuario actualizado correctamente"
     */
    public function update(Request $request, int $id)
    {
        $usuario = DB::table('usuario')->where('idusuario', $id)->first();
        if (!$usuario) {
            return response()->json(['message' => 'Usuario no encontrado'], 404);
        }

        $request->validate([
            'email'  => 'sometimes|email|unique:usuario,email,' . $id . ',idusuario',
            'estado' => 'sometimes|in:ACTIVO,INACTIVO',
        ]);

        $datos = array_filter([
            'email'  => $request->email,
            'estado' => $request->estado,
        ], fn($v) => $v !== null);

        DB::table('usuario')->where('idusuario', $id)->update($datos);

        return response()->json(['message' => 'Usuario actualizado correctamente']);
    }

    // ──────────────────────────────────────────────────────────────
    // DELETE /api/usuarios/{id}
    // ──────────────────────────────────────────────────────────────
    /**
     * Desactiva un usuario (soft delete: estado → INACTIVO).
     * El usuario no puede hacer login mientras esté INACTIVO.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → DELETE /usuarios/10
     *   [1] Verificar que el usuario exista
     *   ALT [no existe] → 404
     *   [2] UPDATE usuario SET estado = 'INACTIVO'
     *       (soft delete: preserva historial, no elimina el registro)
     *   [3] → 200 "Usuario desactivado correctamente"
     */
    public function destroy(int $id)
    {
        $usuario = DB::table('usuario')->where('idusuario', $id)->first();
        if (!$usuario) {
            return response()->json(['message' => 'Usuario no encontrado'], 404);
        }

        DB::table('usuario')->where('idusuario', $id)->update(['estado' => 'INACTIVO']);

        return response()->json(['message' => 'Usuario desactivado correctamente']);
    }

    // ──────────────────────────────────────────────────────────────
    // GET /api/usuarios/roles
    // ──────────────────────────────────────────────────────────────
    /**
     * Lista todos los roles disponibles para asignar a usuarios.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /usuarios/roles
     *   [1] SELECT * FROM roles ORDER BY nombre
     *   [2] → 200 con array de { idrol, nombre }
     */
    public function roles()
    {
        return response()->json(DB::table('roles')->orderBy('nombre')->get());
    }
}
