<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use App\Mail\CredencialesEstudiante;

/**
 * ============================================================
 * InscripcionController  —  CU-04: Inscripción de postulantes
 * ============================================================
 *
 * ¿QUÉ HACE ESTE CONTROLADOR?
 *   Gestiona la inscripción formal de postulantes: los vincula a una gestión
 *   académica y a un pago CONFIRMADO. El admin confirma la inscripción
 *   y el sistema genera las credenciales de acceso del estudiante.
 *
 * TABLA PRINCIPAL: inscripcion
 *   - idinscripcion, idpostulante, idpago, fechainscripcion
 *   - estadoinscripcion: PENDIENTE | CONFIRMADA | ANULADA
 *   - gestion: FK → tabla gestion (idgestion del período académico activo)
 *
 * FLUJO COMPLETO:
 *   1. Postulante paga (PagoController o RegistroController)
 *   2. Admin registra la inscripción → store() → estado: PENDIENTE
 *   3. Admin confirma la inscripción → update(CONFIRMADA)
 *      → se generan credenciales (usuario + contraseña) y se envían por correo
 *      → postulante pasa a INSCRITO
 *
 * NOTA:
 *   La lógica de asignación de carreras (1ra y 2da opción por cupos)
 *   está en ReporteController::admision(), no aquí.
 *
 * ENDPOINTS DISPONIBLES:
 *   GET  /api/inscripciones                   → index()
 *   GET  /api/inscripciones/gestiones         → gestiones()
 *   GET  /api/inscripciones/postulante/{id}   → porPostulante()
 *   POST /api/inscripciones                   → store()
 *   PUT  /api/inscripciones/{id}              → update()
 */
class InscripcionController extends Controller
{
    // ──────────────────────────────────────────────────────────────
    // GET /api/inscripciones
    // ──────────────────────────────────────────────────────────────
    /**
     * Lista todas las inscripciones con datos del postulante, pago y gestión.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /inscripciones
     *   [1] inscripcion JOIN postulante JOIN pagos JOIN gestion
     *   [2] Ordenar por fechainscripcion DESC
     *   [3] → 200 con array de inscripciones
     */
    public function index()
    {
        $inscripciones = DB::table('inscripcion as i')
            ->join('postulante as p', 'p.idpostulante', '=', 'i.idpostulante')
            ->join('pagos as pa', 'pa.idpagos', '=', 'i.idpago')
            ->join('gestion as g', 'g.idgestion', '=', 'i.gestion')
            ->select(
                'i.idinscripcion',
                'p.ci',
                'p.nombres',
                'p.apellidos',
                'pa.monto',
                'pa.estadopago',
                'i.fechainscripcion',
                'i.estadoinscripcion',
                'g.idgestion',
                'g.anio',
                'g.periodo'
            )
            ->orderBy('i.fechainscripcion', 'desc')
            ->get();

        return response()->json($inscripciones);
    }

    // ──────────────────────────────────────────────────────────────
    // GET /api/inscripciones/gestiones
    // ──────────────────────────────────────────────────────────────
    /**
     * Lista todas las gestiones académicas disponibles para seleccionar al inscribir.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /inscripciones/gestiones
     *   [1] SELECT * FROM gestion ORDER BY idgestion DESC
     *   [2] → 200 con array de gestiones
     */
    public function gestiones()
    {
        $gestiones = DB::table('gestion')->orderBy('idgestion', 'desc')->get();
        return response()->json($gestiones);
    }

    // ──────────────────────────────────────────────────────────────
    // GET /api/inscripciones/postulante/{idPostulante}
    // ──────────────────────────────────────────────────────────────
    /**
     * Devuelve la inscripción de un postulante (máximo una por postulante).
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /inscripciones/postulante/42
     *   [1] SELECT * FROM inscripcion WHERE idpostulante = 42 LIMIT 1
     *   ALT [no tiene inscripción] → 404
     *   [2] → 200 con el objeto inscripcion
     */
    public function porPostulante(int $idPostulante)
    {
        $inscripcion = DB::table('inscripcion')->where('idpostulante', $idPostulante)->first();
        if (!$inscripcion) {
            return response()->json(['message' => 'No se encontró inscripción para este postulante'], 404);
        }
        return response()->json($inscripcion);
    }

    // ──────────────────────────────────────────────────────────────
    // POST /api/inscripciones
    // ──────────────────────────────────────────────────────────────
    /**
     * Registra la inscripción formal vinculando postulante + pago + gestión.
     * El pago más reciente CONFIRMADO se asigna automáticamente.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → POST /inscripciones { idpostulante, idgestion }
     *
     *   [1] Validar campos requeridos
     *   [2] Verificar que el postulante exista
     *   ALT [no existe] → 404
     *
     *   [3] Verificar que no tenga ya una inscripción (UNIQUE en idpostulante)
     *   ALT [ya tiene inscripción] → 400
     *
     *   [4] Buscar el pago más reciente del postulante en estado CONFIRMADO
     *   ALT [no tiene pago CONFIRMADO]
     *     → 400 "Confirme el pago antes de inscribir"
     *
     *   [5] Verificar que la gestión exista
     *   ALT [no existe] → 404
     *
     *   [6] INSERT en inscripcion con estadoinscripcion='PENDIENTE'
     *   [7] → 201 "Inscripción registrada correctamente"
     */
    public function store(Request $request)
    {
        $request->validate([
            'idpostulante' => 'required|integer',
            'idgestion'    => 'required|integer',
        ]);

        // Verificar que el postulante exista
        $postulante = DB::table('postulante')->where('idpostulante', $request->idpostulante)->first();
        if (!$postulante) {
            return response()->json(['message' => 'Postulante no encontrado'], 404);
        }

        // Verificar inscripción duplicada (UNIQUE en idpostulante)
        $existe = DB::table('inscripcion')->where('idpostulante', $request->idpostulante)->exists();
        if ($existe) {
            return response()->json(['message' => 'El postulante ya tiene una inscripción registrada'], 400);
        }

        // Buscar pago CONFIRMADO del postulante
        $pago = DB::table('pagos')
            ->where('idpostulante', $request->idpostulante)
            ->where('estadopago', 'CONFIRMADO')
            ->orderBy('fechapago', 'desc')
            ->first();

        if (!$pago) {
            return response()->json([
                'message' => 'El postulante no tiene un pago CONFIRMADO. Confirme el pago antes de inscribir.'
            ], 400);
        }

        // Verificar que la gestión exista
        $gestion = DB::table('gestion')->where('idgestion', $request->idgestion)->first();
        if (!$gestion) {
            return response()->json(['message' => 'Gestión no encontrada'], 404);
        }

        DB::table('inscripcion')->insert([
            'idpostulante'      => $request->idpostulante,
            'idpago'            => $pago->idpagos,
            'fechainscripcion'  => now(),
            'estadoinscripcion' => 'PENDIENTE',
            'gestion'           => $request->idgestion,
        ]);

        return response()->json(['message' => 'Inscripción registrada correctamente'], 201);
    }

    // ──────────────────────────────────────────────────────────────
    // PUT /api/inscripciones/{id}
    // ──────────────────────────────────────────────────────────────
    /**
     * Actualiza el estado de una inscripción. Confirmar activa el acceso del postulante.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → PUT /inscripciones/7  { estadoinscripcion: "CONFIRMADA" }
     *
     *   [1] Buscar inscripción por ID
     *   ALT [no existe] → 404
     *
     *   [2] Validar nuevo estado (PENDIENTE|CONFIRMADA|ANULADA)
     *   [3] UPDATE inscripcion SET estadoinscripcion = ...
     *
     *   OPT [nuevo estado = CONFIRMADA y antes NO era CONFIRMADA]
     *     [4] generarCredenciales(idpostulante):
     *         → Si el postulante ya tiene idusuario: no hacer nada
     *         → Si ya existe usuario con ese CI o correo: vincular y no crear nuevo
     *         → Si no existe: INSERT usuario + usuario_roles(ESTUDIANTE)
     *                         + enviar email con credenciales
     *     [5] UPDATE postulante SET estadopostulante = 'INSCRITO'
     *
     *   OPT [nuevo estado = ANULADA]
     *     [6] UPDATE postulante SET estadopostulante = 'PENDIENTE' (revertir a pendiente)
     *
     *   [7] → 200 "Inscripción actualizada correctamente"
     */
    public function update(Request $request, int $id)
    {
        $inscripcion = DB::table('inscripcion')->where('idinscripcion', $id)->first();
        if (!$inscripcion) {
            return response()->json(['message' => 'Inscripción no encontrada'], 404);
        }

        $request->validate([
            'estadoinscripcion' => 'required|in:PENDIENTE,CONFIRMADA,ANULADA',
        ]);

        DB::table('inscripcion')->where('idinscripcion', $id)->update([
            'estadoinscripcion' => $request->estadoinscripcion,
        ]);

        if ($request->estadoinscripcion === 'CONFIRMADA' && $inscripcion->estadoinscripcion !== 'CONFIRMADA') {
            $this->generarCredenciales($inscripcion->idpostulante);
            DB::table('postulante')
                ->where('idpostulante', $inscripcion->idpostulante)
                ->update(['estadopostulante' => 'INSCRITO']);
        }

        if ($request->estadoinscripcion === 'ANULADA') {
            DB::table('postulante')
                ->where('idpostulante', $inscripcion->idpostulante)
                ->update(['estadopostulante' => 'PENDIENTE']);
        }

        return response()->json(['message' => 'Inscripción actualizada correctamente']);
    }

    private function generarCredenciales(int $idPostulante): void
    {
        $postulante = DB::table('postulante')->where('idpostulante', $idPostulante)->first();
        if (!$postulante || $postulante->idusuario) return;

        $username = (string) $postulante->ci;

        // Si ya existe un usuario con ese username o ese correo, vincularlo y reenviar credenciales
        $usuarioExistente = DB::table('usuario')
            ->where('nombre_usuario', $username)
            ->orWhere('email', $postulante->correo)
            ->first();

        if ($usuarioExistente) {
            DB::table('postulante')
                ->where('idpostulante', $idPostulante)
                ->update(['idusuario' => $usuarioExistente->idusuario]);
            return;
        }

        $password     = 'CUP' . strtoupper(Str::random(5));
        $emailUsuario = DB::table('usuario')->where('email', $postulante->correo)->exists()
            ? $postulante->ci . '@cup.ficct.edu.bo'
            : $postulante->correo;

        try {
            DB::transaction(function () use ($postulante, $username, $password, $idPostulante, $emailUsuario) {
                $idUsuario = DB::table('usuario')->insertGetId([
                    'nombre_usuario'        => $username,
                    'password'              => Hash::make($password),
                    'email'                 => $emailUsuario,
                    'estado'                => 'ACTIVO',
                    'debe_cambiar_password' => true,
                ], 'idusuario');

                $rol = DB::table('roles')->where('nombre', 'ESTUDIANTE')->first();
                if ($rol) {
                    DB::table('usuario_roles')->insert(['idusuario' => $idUsuario, 'idrol' => $rol->idrol]);
                }

                DB::table('postulante')->where('idpostulante', $idPostulante)->update(['idusuario' => $idUsuario]);
            });

            Mail::to($postulante->correo)->send(new CredencialesEstudiante(
                nombres:  $postulante->nombres,
                username: $username,
                password: $password,
            ));
        } catch (\Throwable) {}
    }
}
