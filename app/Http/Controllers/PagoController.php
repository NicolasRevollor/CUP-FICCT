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
 * PagoController  —  CU-05: Control de pagos
 * ============================================================
 *
 * ¿QUÉ HACE ESTE CONTROLADOR?
 *   Registra y gestiona los pagos de los postulantes desde el panel admin.
 *   (Los pagos con Stripe desde el portal público los crea RegistroController.)
 *
 * TABLA PRINCIPAL: pagos
 *   - idpagos, idpostulante, monto, fechapago
 *   - metodopago: EFECTIVO | TRANSFERENCIA | QR | DEPOSITO | STRIPE
 *   - codgotransaccion: código único de la transacción (nullable)
 *   - estadopago: PENDIENTE | CONFIRMADO | RECHAZADO
 *
 * REGLA DE NEGOCIO CLAVE:
 *   Cuando el admin confirma un pago (estadopago → CONFIRMADO):
 *     1. El postulante pasa de PENDIENTE → INSCRITO
 *     2. Se crea una cuenta de usuario del sistema (rol ESTUDIANTE)
 *     3. Se envía el correo con las credenciales al postulante
 *   Esto permite el flujo: "pago en efectivo en caja → confirmar manualmente".
 *
 * ENDPOINTS DISPONIBLES:
 *   GET  /api/pagos                         → index()
 *   GET  /api/pagos/postulante/{id}         → porPostulante()
 *   POST /api/pagos                         → store()
 *   PUT  /api/pagos/{id}                    → update()
 */
class PagoController extends Controller
{
    // ──────────────────────────────────────────────────────────────
    // GET /api/pagos
    // ──────────────────────────────────────────────────────────────
    /**
     * Lista todos los pagos con datos del postulante (JOIN).
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /pagos
     *   [1] pagos JOIN postulante (para mostrar CI, nombres, apellidos)
     *   [2] Ordenar por fechapago DESC (más recientes primero)
     *   [3] → 200 con array de pagos
     */
    public function index()
    {
        $pagos = DB::table('pagos as p')
            ->join('postulante as po', 'po.idpostulante', '=', 'p.idpostulante')
            ->select(
                'p.idpagos',
                'po.ci',
                'po.nombres',
                'po.apellidos',
                'p.monto',
                'p.fechapago',
                'p.metodopago',
                'p.codgotransaccion',
                'p.estadopago'
            )
            ->orderBy('p.fechapago', 'desc')
            ->get();

        return response()->json($pagos);
    }

    // ──────────────────────────────────────────────────────────────
    // GET /api/pagos/postulante/{idPostulante}
    // ──────────────────────────────────────────────────────────────
    /**
     * Lista todos los pagos de un postulante específico.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /pagos/postulante/42
     *   [1] SELECT * FROM pagos WHERE idpostulante = 42 ORDER BY fechapago DESC
     *   [2] → 200 con array (puede estar vacío si no tiene pagos)
     */
    public function porPostulante(int $idPostulante)
    {
        $pagos = DB::table('pagos')
            ->where('idpostulante', $idPostulante)
            ->orderBy('fechapago', 'desc')
            ->get();

        return response()->json($pagos);
    }

    // ──────────────────────────────────────────────────────────────
    // POST /api/pagos
    // ──────────────────────────────────────────────────────────────
    /**
     * Registra un pago manual (efectivo, transferencia, QR o depósito).
     * El estado inicial puede ser PENDIENTE (espera verificación) o CONFIRMADO (ya verificado).
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → POST /pagos { idpostulante, monto, metodopago, estadopago, codgotransaccion? }
     *   [1] Validar campos (codgotransaccion debe ser único si se envía)
     *   [2] Verificar que el postulante exista
     *   ALT [no existe] → 404
     *   [3] INSERT en pagos → devuelve idpagos generado
     *   [4] → 201 { message, idpagos }
     *
     * NOTA: Si el pago se crea como CONFIRMADO, el postulante NO pasa automáticamente
     *   a INSCRITO aquí — eso solo ocurre en update() al cambiar estadopago a CONFIRMADO.
     */
    public function store(Request $request)
    {
        $request->validate([
            'idpostulante'     => 'required|integer',
            'monto'            => 'required|numeric|min:0',
            'metodopago'       => 'required|in:EFECTIVO,TRANSFERENCIA,QR,DEPOSITO',
            'codgotransaccion' => 'nullable|string|unique:pagos,codgotransaccion',
            'estadopago'       => 'required|in:PENDIENTE,CONFIRMADO,RECHAZADO',
        ]);

        $postulante = DB::table('postulante')->where('idpostulante', $request->idpostulante)->first();
        if (!$postulante) {
            return response()->json(['message' => 'Postulante no encontrado'], 404);
        }

        $id = DB::table('pagos')->insertGetId([
            'idpostulante'     => $request->idpostulante,
            'monto'            => $request->monto,
            'fechapago'        => now(),
            'metodopago'       => $request->metodopago,
            'codgotransaccion' => $request->codgotransaccion,
            'estadopago'       => $request->estadopago,
        ], 'idpagos');

        return response()->json(['message' => 'Pago registrado correctamente', 'idpagos' => $id], 201);
    }

    // ──────────────────────────────────────────────────────────────
    // PUT /api/pagos/{id}
    // ──────────────────────────────────────────────────────────────
    /**
     * Actualiza el estado de un pago. Si se confirma, activa el acceso del postulante.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → PUT /pagos/15  { estadopago: "CONFIRMADO" }
     *
     *   [1] Buscar el pago por ID
     *   ALT [no existe] → 404
     *
     *   [2] Validar nuevo estadopago (PENDIENTE|CONFIRMADO|RECHAZADO)
     *   [3] UPDATE pagos SET estadopago = ...
     *
     *   OPT [nuevo estado = CONFIRMADO]
     *     [4] Buscar el postulante del pago
     *     OPT [postulante existe y su estado = PENDIENTE]
     *       [5] UPDATE postulante SET estadopostulante = 'INSCRITO'
     *       OPT [postulante NO tiene usuario todavía]
     *         [6] INSERT usuario (username=ci, password aleatorio, estado=ACTIVO)
     *         [7] INSERT usuario_roles (rol ESTUDIANTE)
     *         [8] Enviar email con credenciales (CredencialesEstudiante)
     *         (si falla el envío, no se revierte el INSERT)
     *
     *   [9] → 200 "Estado del pago actualizado correctamente"
     */
    public function update(Request $request, int $id)
    {
        $pago = DB::table('pagos')->where('idpagos', $id)->first();
        if (!$pago) {
            return response()->json(['message' => 'Pago no encontrado'], 404);
        }

        $request->validate([
            'estadopago' => 'required|in:PENDIENTE,CONFIRMADO,RECHAZADO',
        ]);

        DB::table('pagos')->where('idpagos', $id)->update([
            'estadopago' => $request->estadopago,
        ]);

        // Si el pago se confirma: inscribir al postulante y enviar credenciales
        if ($request->estadopago === 'CONFIRMADO') {
            $postulante = DB::table('postulante')->where('idpostulante', $pago->idpostulante)->first();

            if ($postulante && $postulante->estadopostulante === 'PENDIENTE') {
                DB::table('postulante')
                    ->where('idpostulante', $pago->idpostulante)
                    ->update(['estadopostulante' => 'INSCRITO']);

                // Crear usuario del sistema si aún no tiene uno
                $yaExiste = DB::table('usuario')->where('email', $postulante->correo)->exists();

                if (!$yaExiste) {
                    $username  = $postulante->ci;
                    $password  = 'CUP' . strtoupper(Str::random(5));

                    $idUsuario = DB::table('usuario')->insertGetId([
                        'nombre_usuario'       => $username,
                        'email'                => $postulante->correo,
                        'password'             => Hash::make($password),
                        'estado'               => 'ACTIVO',
                        'debe_cambiar_password' => true,
                    ], 'idusuario');

                    // Asignar rol ESTUDIANTE
                    $rolEstudiante = DB::table('roles')->where('nombre', 'ESTUDIANTE')->value('idrol');
                    if ($rolEstudiante) {
                        DB::table('usuario_roles')->insert([
                            'idusuario' => $idUsuario,
                            'idrol'     => $rolEstudiante,
                        ]);
                    }

                    // Enviar email con credenciales
                    try {
                        Mail::to($postulante->correo)->send(new CredencialesEstudiante(
                            nombres:  $postulante->nombres,
                            username: $username,
                            password: $password,
                        ));
                    } catch (\Throwable) {}
                }
            }
        }

        return response()->json(['message' => 'Estado del pago actualizado correctamente']);
    }
}
