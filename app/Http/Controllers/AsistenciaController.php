<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * ============================================================
 * AsistenciaController  —  CU-13: Registro y consulta de asistencia
 * ============================================================
 *
 * ¿QUÉ HACE ESTE CONTROLADOR?
 *   Maneja el registro y la consulta de asistencia de postulantes
 *   dentro de sus grupos de estudio (mañana/tarde).
 *
 * TABLA PRINCIPAL: asistencia
 *   - idasistencia  → clave primaria (autoincremental)
 *   - idpostulante  → quién asistió
 *   - idgrupo       → en qué grupo
 *   - fecha         → qué día (DATE)
 *   - estado        → PRESENTE | AUSENTE | JUSTIFICADO
 *
 * TABLA RELACIONADA: docentegrupomateria
 *   - Relaciona un docente con un grupo y materia específicos.
 *   - Un docente puede tener varios grupos; se usa para saber
 *     si un docente tiene permiso de ver/editar un grupo.
 *
 * REGLAS DE ACCESO (control por rol):
 *   ┌─────────────────┬────────────────────────────────────────────┐
 *   │ Rol             │ Qué puede hacer                            │
 *   ├─────────────────┼────────────────────────────────────────────┤
 *   │ ADMINISTRADOR   │ Ver y editar asistencia de CUALQUIER grupo │
 *   │ DOCENTE         │ Solo los grupos que tiene asignados        │
 *   │ Otro rol        │ 403 Forbidden (sin permiso)                │
 *   └─────────────────┴────────────────────────────────────────────┘
 *
 * ENDPOINTS DISPONIBLES:
 *   GET  /api/asistencia/grupo/{idGrupo}?fecha=YYYY-MM-DD  → porGrupo()
 *   GET  /api/asistencia/postulante/{idPostulante}          → porPostulante()
 *   POST /api/asistencia                                    → store()
 *   PUT  /api/asistencia/{id}                               → update()
 */
class AsistenciaController extends Controller
{
    // ──────────────────────────────────────────────────────────────
    // MÉTODO PRIVADO: getRol()
    // ──────────────────────────────────────────────────────────────
    /**
     * Obtiene el nombre del rol del usuario autenticado.
     *
     * ¿POR QUÉ?
     *   El usuario autenticado puede ser ADMINISTRADOR, DOCENTE, etc.
     *   Esta función consulta la tabla usuario_roles → roles
     *   para saber qué rol tiene. Si no tiene rol asignado devuelve ''.
     *
     * DIAGRAMA (REF: consulta BD):
     *   Usuario autenticado
     *     → usuario_roles (busca su idusuario)
     *     → roles (obtiene el nombre del rol)
     *     → retorna string: 'ADMINISTRADOR' | 'DOCENTE' | '' etc.
     */
    private function getRol(Request $request): string
    {
        // Une usuario_roles con roles para obtener el nombre del rol.
        // value() devuelve solo el campo pedido (o null si no existe).
        // ?? '' convierte null en cadena vacía para evitar errores de comparación.
        return DB::table('usuario_roles')
            ->join('roles', 'roles.idrol', '=', 'usuario_roles.idrol')
            ->where('usuario_roles.idusuario', $request->user()->idusuario)
            ->value('roles.nombre') ?? '';
    }

    // ──────────────────────────────────────────────────────────────
    // MÉTODO PRIVADO: docentePerteneceAGrupo()
    // ──────────────────────────────────────────────────────────────
    /**
     * Verifica si el docente autenticado tiene asignado el grupo indicado.
     *
     * ¿CÓMO FUNCIONA?
     *   1. Busca el registro del docente en la tabla 'docente'
     *      usando el idusuario del usuario autenticado.
     *   2. Si no existe como docente → retorna false (sin permiso).
     *   3. Si existe, busca en 'docentegrupomateria' si tiene
     *      ese idGrupo asignado con estado ACTIVO.
     *
     * DIAGRAMA ALT (si no hay registro de docente):
     *   ALT [no existe en tabla docente]
     *     → return false
     *   ALT [sí existe]
     *     → buscar en docentegrupomateria
     *     → return true si tiene el grupo, false si no
     *
     * @param int $idGrupo  El grupo que se quiere acceder.
     * @return bool  true = tiene permiso, false = no tiene permiso.
     */
    private function docentePerteneceAGrupo(Request $request, int $idGrupo): bool
    {
        // Paso 1: buscar si este usuario tiene un registro de docente
        $docente = DB::table('docente')
            ->where('idusuario', $request->user()->idusuario)
            ->first();

        // ALT: si el usuario no tiene fila en tabla 'docente', no puede acceder
        if (!$docente) return false;

        // Paso 2: verificar que ese docente esté asignado al grupo con estado ACTIVO
        // (docentegrupomateria relaciona docentes con grupos y materias)
        return DB::table('docentegrupomateria')
            ->where('iddocente', $docente->iddocente)   // el docente encontrado
            ->where('idgrupo', $idGrupo)                // el grupo que se pide
            ->where('estado', 'ACTIVO')                 // solo asignaciones activas
            ->exists();                                 // devuelve true/false
    }

    // ──────────────────────────────────────────────────────────────
    // GET /api/asistencia/grupo/{idGrupo}?fecha=YYYY-MM-DD
    // ──────────────────────────────────────────────────────────────
    /**
     * Lista la asistencia de un grupo.
     * La fecha es OPCIONAL: sin fecha devuelve todos los días registrados.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /asistencia/grupo/15?fecha=2026-06-11
     *
     *   [1] Obtener rol del usuario autenticado
     *
     *   ALT [rol = DOCENTE]
     *     ALT [no tiene ese grupo asignado]
     *       → 403 Sin permiso para ver este grupo
     *     [tiene el grupo] → continuar
     *   ALT [rol = ADMINISTRADOR]
     *     → continuar (puede ver todo)
     *   ALT [otro rol (POSTULANTE, ESTUDIANTE, etc.)]
     *     → 403 Sin permiso
     *
     *   [2] Construir consulta: asistencia JOIN postulante
     *       ordenada por fecha DESC, apellidos ASC
     *
     *   OPT [si se envió ?fecha=...]
     *     → filtrar solo ese día
     *
     *   [3] → 200 JSON con lista de registros de asistencia
     */
    public function porGrupo(Request $request, int $idGrupo)
    {
        // [1] Obtener el rol del usuario que hace la petición
        $rol = $this->getRol($request);

        // ALT: control de acceso según rol
        if ($rol === 'DOCENTE') {
            // Un docente solo puede ver su propio grupo
            if (!$this->docentePerteneceAGrupo($request, $idGrupo)) {
                return response()->json(['message' => 'Sin permiso para ver este grupo'], 403);
            }
        } elseif ($rol !== 'ADMINISTRADOR') {
            // Cualquier otro rol (POSTULANTE, ESTUDIANTE, COORDINADOR, etc.) queda fuera
            return response()->json(['message' => 'Sin permiso'], 403);
        }
        // Si llegó aquí: es ADMINISTRADOR o es DOCENTE con ese grupo asignado

        // [2] Construir la consulta base
        // Se hace JOIN con postulante para incluir CI, nombres y apellidos
        $query = DB::table('asistencia as a')
            ->join('postulante as p', 'p.idpostulante', '=', 'a.idpostulante')
            ->where('a.idgrupo', $idGrupo)          // solo los registros de este grupo
            ->select(
                'a.idasistencia',   // ID del registro (para poder editarlo luego)
                'a.fecha',          // fecha del registro
                'p.idpostulante',   // ID del postulante
                'p.ci',             // carnet de identidad
                'p.nombres',
                'p.apellidos',
                'a.estado'          // PRESENTE | AUSENTE | JUSTIFICADO
            )
            ->orderBy('a.fecha', 'desc')    // los días más recientes primero
            ->orderBy('p.apellidos');       // dentro del mismo día, orden alfabético

        // OPT: si se manda ?fecha=YYYY-MM-DD, filtrar solo ese día
        if ($request->filled('fecha')) {
            $request->validate(['fecha' => 'date']); // validar formato antes de usar
            $query->where('a.fecha', $request->fecha);
        }

        // [3] Ejecutar y devolver la lista
        return response()->json($query->get());
    }

    // ──────────────────────────────────────────────────────────────
    // GET /api/asistencia/postulante/{idPostulante}
    // ──────────────────────────────────────────────────────────────
    /**
     * Devuelve todos los registros de asistencia de UN postulante específico.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /asistencia/postulante/42
     *
     *   [1] Obtener rol del usuario autenticado
     *
     *   ALT [rol = DOCENTE]
     *     [1.1] Buscar registro en tabla 'docente' por idusuario
     *     ALT [no existe como docente]
     *       → 403 Sin permiso
     *     [1.2] Verificar que el postulante esté en alguno de sus grupos
     *       → cruza grupopostulantes y docentegrupomateria
     *     ALT [el postulante NO está en sus grupos]
     *       → 403 Sin permiso para ver este postulante
     *   ALT [rol = ADMINISTRADOR]
     *     → continuar
     *   ALT [otro rol]
     *     → 403 Sin permiso
     *
     *   [2] Consultar tabla asistencia filtrando por idpostulante
     *   [3] → 200 JSON con lista ordenada por fecha DESC
     */
    public function porPostulante(Request $request, int $idPostulante)
    {
        // [1] Verificar rol
        $rol = $this->getRol($request);

        if ($rol === 'DOCENTE') {
            // El docente solo puede ver a los postulantes de SUS grupos.
            // Paso 1.1: encontrar el registro del docente
            $docente = DB::table('docente')
                ->where('idusuario', $request->user()->idusuario)
                ->first();

            // ALT: si no existe el registro del docente → sin permiso
            if (!$docente) {
                return response()->json(['message' => 'Sin permiso'], 403);
            }

            // Paso 1.2: verificar que el postulante esté en al menos uno de sus grupos
            // Se une grupopostulantes con docentegrupomateria para cruzar la info.
            $enSuGrupo = DB::table('grupopostulantes as gp')
                ->join('docentegrupomateria as dgm', 'dgm.idgrupo', '=', 'gp.idgrupo')
                ->where('gp.idpostulante', $idPostulante) // el postulante que se pide
                ->where('gp.estado', 'ACTIVO')            // que esté activo en el grupo
                ->where('dgm.iddocente', $docente->iddocente) // que sea del docente
                ->where('dgm.estado', 'ACTIVO')           // asignación activa del docente
                ->exists();

            // ALT: el postulante no está en ningún grupo del docente
            if (!$enSuGrupo) {
                return response()->json(['message' => 'Sin permiso para ver este postulante'], 403);
            }

        } elseif ($rol !== 'ADMINISTRADOR') {
            // Roles no permitidos (POSTULANTE, ESTUDIANTE, etc.)
            return response()->json(['message' => 'Sin permiso'], 403);
        }

        // [2] Consultar todos los registros de asistencia del postulante
        $asistencia = DB::table('asistencia')
            ->where('idpostulante', $idPostulante)
            ->orderBy('fecha', 'desc') // más recientes primero
            ->get();

        // [3] Devolver la lista
        return response()->json($asistencia);
    }

    // ──────────────────────────────────────────────────────────────
    // POST /api/asistencia
    // ──────────────────────────────────────────────────────────────
    /**
     * Registra (o actualiza) la asistencia de múltiples postulantes en una fecha.
     *
     * ¿POR QUÉ puede actualizar también?
     *   Si se vuelve a llamar el mismo día para el mismo grupo,
     *   en vez de duplicar los registros, los actualiza (upsert manual).
     *
     * CUERPO DEL REQUEST (JSON):
     * {
     *   "idgrupo": 15,
     *   "fecha": "2026-06-11",
     *   "registros": [
     *     { "idpostulante": 42, "estado": "PRESENTE" },
     *     { "idpostulante": 43, "estado": "AUSENTE"  }
     *   ]
     * }
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → POST /asistencia
     *
     *   [1] Validar campos obligatorios
     *   [2] Verificar rol (mismo control que porGrupo)
     *   [3] Verificar que el grupo exista en BD
     *
     *   DB TRANSACTION (para que todo se guarde o nada):
     *     LOOP [por cada registro en el array 'registros']
     *       ALT [ya existe asistencia de ese postulante en ese grupo ese día]
     *         → UPDATE estado
     *         → actualizados++
     *       ALT [no existe]
     *         → INSERT nuevo registro
     *         → insertados++
     *     FIN LOOP
     *   FIN TRANSACTION
     *
     *   [4] → 201 con resumen: cuántos se insertaron y actualizaron
     */
    public function store(Request $request)
    {
        // [1] Validar que vengan todos los campos necesarios
        // registros.*.estado usa in: para limitar los valores permitidos
        $request->validate([
            'idgrupo'                  => 'required|integer',
            'fecha'                    => 'required|date',
            'registros'                => 'required|array|min:1',     // al menos 1 registro
            'registros.*.idpostulante' => 'required|integer',
            'registros.*.estado'       => 'required|in:PRESENTE,AUSENTE,JUSTIFICADO',
        ]);

        // [2] Mismo control de acceso que en los métodos de lectura
        $rol = $this->getRol($request);

        if ($rol === 'DOCENTE') {
            if (!$this->docentePerteneceAGrupo($request, $request->idgrupo)) {
                return response()->json(['message' => 'Sin permiso para registrar en este grupo'], 403);
            }
        } elseif ($rol !== 'ADMINISTRADOR') {
            return response()->json(['message' => 'Sin permiso'], 403);
        }

        // [3] Verificar que el grupo exista en la BD antes de continuar
        $grupo = DB::table('grupos')->where('idgrupo', $request->idgrupo)->first();
        if (!$grupo) {
            return response()->json(['message' => 'Grupo no encontrado'], 404);
        }

        // Contadores para informar el resultado al cliente
        $insertados   = 0;
        $actualizados = 0;

        // [TRANSACTION] Usa una transacción para que si algo falla,
        // no queden datos a medias (o todo se guarda, o nada).
        DB::transaction(function () use ($request, &$insertados, &$actualizados) {

            // LOOP: recorre cada postulante del array 'registros'
            foreach ($request->registros as $r) {

                // Busca si ya existe un registro para este postulante+grupo+fecha
                $existe = DB::table('asistencia')
                    ->where('idpostulante', $r['idpostulante'])
                    ->where('idgrupo', $request->idgrupo)
                    ->where('fecha', $request->fecha)
                    ->first();

                // ALT: si ya existe → actualizar el estado (corregir error del docente)
                if ($existe) {
                    DB::table('asistencia')
                        ->where('idasistencia', $existe->idasistencia)
                        ->update(['estado' => $r['estado']]);
                    $actualizados++;
                } else {
                    // ALT: no existe → insertar nuevo registro de asistencia
                    DB::table('asistencia')->insert([
                        'idpostulante' => $r['idpostulante'],
                        'idgrupo'      => $request->idgrupo,
                        'fecha'        => $request->fecha,
                        'estado'       => $r['estado'],
                    ]);
                    $insertados++;
                }
            }
            // FIN LOOP
        });
        // FIN TRANSACTION

        // [4] Respuesta con resumen de lo que se hizo
        return response()->json([
            'message'      => 'Asistencia registrada correctamente',
            'insertados'   => $insertados,   // registros nuevos creados
            'actualizados' => $actualizados, // registros existentes corregidos
        ], 201);
    }

    // ──────────────────────────────────────────────────────────────
    // PUT /api/asistencia/{id}
    // ──────────────────────────────────────────────────────────────
    /**
     * Actualiza el estado de UN registro de asistencia individual.
     * Útil para corregir un estado puntual (ej: marcar JUSTIFICADO
     * a alguien que estaba AUSENTE).
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → PUT /asistencia/99  { "estado": "JUSTIFICADO" }
     *
     *   [1] Buscar el registro por ID
     *   ALT [no existe]
     *     → 404 Registro no encontrado
     *
     *   [2] Verificar rol del usuario
     *   ALT [DOCENTE]
     *     → verificar que el registro pertenezca a uno de sus grupos
     *     ALT [no pertenece] → 403 Sin permiso
     *   ALT [otro rol que no sea ADMINISTRADOR]
     *     → 403 Sin permiso
     *
     *   [3] Validar el nuevo estado
     *   [4] UPDATE en tabla asistencia
     *   [5] → 200 Registro actualizado
     */
    public function update(Request $request, int $id)
    {
        // [1] Buscar el registro de asistencia por su ID primario
        $registro = DB::table('asistencia')->where('idasistencia', $id)->first();

        // ALT: si no existe ese ID → error 404
        if (!$registro) {
            return response()->json(['message' => 'Registro no encontrado'], 404);
        }

        // [2] Control de acceso: se usa el idgrupo del REGISTRO (no del request)
        // para que el docente no pueda editar grupos que no le pertenecen
        $rol = $this->getRol($request);

        if ($rol === 'DOCENTE') {
            // Verificar con el idgrupo del registro ya encontrado (no del body)
            if (!$this->docentePerteneceAGrupo($request, $registro->idgrupo)) {
                return response()->json(['message' => 'Sin permiso para editar este registro'], 403);
            }
        } elseif ($rol !== 'ADMINISTRADOR') {
            return response()->json(['message' => 'Sin permiso'], 403);
        }

        // [3] Validar que el nuevo estado sea uno de los tres valores permitidos
        $request->validate([
            'estado' => 'required|in:PRESENTE,AUSENTE,JUSTIFICADO',
        ]);

        // [4] Actualizar solo el campo estado del registro
        DB::table('asistencia')
            ->where('idasistencia', $id)
            ->update(['estado' => $request->estado]);

        // [5] Confirmar que se actualizó correctamente
        return response()->json(['message' => 'Registro actualizado correctamente']);
    }
}
