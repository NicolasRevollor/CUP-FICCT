<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Stripe\StripeClient;

/**
 * CU-01 Registro público de postulantes.
 * Flujo de 4 pasos:
 *   1. preRegistro      → guarda datos personales, devuelve idpostulante (estado BORRADOR)
 *   2. subirDocumentos  → sube libreta, cert. nacimiento, título bachiller, foto carnet
 *   3. crearIntent      → crea PaymentIntent en Stripe y devuelve clientSecret
 *   4. confirmarPago    → verifica pago Stripe y finaliza la inscripción
 *
 * El método `registrar` se conserva por compatibilidad con el flujo anterior.
 */
class RegistroController extends Controller
{
    const TIPOS_DOC = [
        'libreta_colegio'        => 'LIBRETA_COLEGIO',
        'certificado_nacimiento' => 'CERTIFICADO_NACIMIENTO',
        'titulo_bachiller'       => 'TITULO_BACHILLER',
        'foto_carnet'            => 'FOTO_CARNET',
    ];

    private function stripe(): StripeClient
    {
        return new StripeClient(env('STRIPE_SECRET_KEY'));
    }

    // ── Paso 1: guardar datos personales ─────────────────────────────────────
    public function preRegistro(Request $request)
    {
        $request->validate([
            'ci'                 => 'required|string',
            'nombres'            => 'required|string',
            'apellidos'          => 'required|string',
            'sexo'               => 'required|in:M,F',
            'correo'             => 'required|email',
            'telefono'           => 'nullable|string',
            'direccion'          => 'nullable|string',
            'colegioProcedencia' => 'nullable|string',
            'ciudad'             => 'nullable|string',
            'otrosRequisitos'    => 'nullable|string',
            // Las carreras se envían aquí para que el frontend las guarde
            // y las reenvíe en confirmarPago; no se persisten todavía
            'idcarrera1'         => 'required|integer|exists:carrera,idcarrera',
            'idcarrera2'         => 'required|integer|exists:carrera,idcarrera|different:idcarrera1',
        ]);

        // Si ya existe como BORRADOR, permitir actualizar (reintento)
        $existente = DB::table('postulante')->where('ci', $request->ci)->first();

        if ($existente && $existente->estadopostulante !== 'BORRADOR') {
            return response()->json(['message' => 'Ya existe un postulante registrado con ese CI.'], 422);
        }

        // Verificar correo único entre postulantes no-BORRADOR
        $correoOcupado = DB::table('postulante')
            ->where('correo', $request->correo)
            ->where('estadopostulante', '!=', 'BORRADOR')
            ->exists();
        if ($correoOcupado) {
            return response()->json(['message' => 'El correo ya está registrado.'], 422);
        }

        $datos = [
            'ci'                 => $request->ci,
            'nombres'            => $request->nombres,
            'apellidos'          => $request->apellidos,
            'sexo'               => $request->sexo,
            'correo'             => $request->correo,
            'telefono'           => $request->telefono,
            'direccion'          => $request->direccion,
            'colegioprocedencia' => $request->colegioProcedencia,
            'ciudad'             => $request->ciudad,
            'titulobachiller'    => false,
            'otrosrequisitos'    => $request->otrosRequisitos,
            'estadopostulante'   => 'BORRADOR',
            'promedio_final'     => 0,
        ];

        if ($existente) {
            DB::table('postulante')
                ->where('idpostulante', $existente->idpostulante)
                ->update($datos);
            $idPostulante = $existente->idpostulante;
        } else {
            $idPostulante = DB::table('postulante')->insertGetId($datos, 'idpostulante');
        }

        return response()->json([
            'message'      => 'Datos guardados. Ahora sube tus documentos.',
            'idpostulante' => $idPostulante,
        ], 201);
    }

    // ── Paso 2a: subir documentos ─────────────────────────────────────────────
    public function subirDocumentos(Request $request, int $idPostulante)
    {
        $postulante = DB::table('postulante')
            ->where('idpostulante', $idPostulante)
            ->where('estadopostulante', 'BORRADOR')
            ->first();

        if (!$postulante) {
            return response()->json(['message' => 'Postulante no encontrado o inscripción ya completada.'], 404);
        }

        $request->validate(
            array_fill_keys(array_keys(self::TIPOS_DOC), 'nullable|file|max:20480')
        );

        $subidos = [];

        foreach (self::TIPOS_DOC as $campo => $tipoDb) {
            if (!$request->hasFile($campo)) continue;

            $file     = $request->file($campo);
            $nombre   = Str::uuid() . '.' . $file->getClientOriginalExtension();
            $carpeta  = "documentos-postulante/{$idPostulante}";
            $ruta     = "{$carpeta}/{$nombre}";

            // Eliminar el documento anterior del mismo tipo si existe
            $anterior = DB::table('doc_postulantes')
                ->where('idpostulante', $idPostulante)
                ->where('tipo', $tipoDb)
                ->first();
            if ($anterior) {
                Storage::delete($anterior->url);
                DB::table('doc_postulantes')->where('iddoc', $anterior->iddoc)->delete();
            }

            $file->storeAs($carpeta, $nombre);

            DB::table('doc_postulantes')->insert([
                'idpostulante' => $idPostulante,
                'tipo'         => $tipoDb,
                'url'          => $ruta,
                'fechasubida'  => now(),
            ]);

            $subidos[] = $tipoDb;
        }

        if (empty($subidos)) {
            return response()->json(['message' => 'No se recibió ningún archivo.'], 422);
        }

        $documentos = DB::table('doc_postulantes')
            ->where('idpostulante', $idPostulante)
            ->get(['iddoc', 'tipo', 'fechasubida']);

        $faltantes = array_values(array_diff(
            array_values(self::TIPOS_DOC),
            $documentos->pluck('tipo')->toArray()
        ));

        return response()->json([
            'message'    => 'Documentos subidos correctamente.',
            'subidos'    => $subidos,
            'documentos' => $documentos,
            'faltantes'  => $faltantes,
            'completo'   => empty($faltantes),
        ]);
    }

    // ── Paso 2b: consultar documentos subidos ────────────────────────────────
    public function listarDocumentos(int $idPostulante)
    {
        $postulante = DB::table('postulante')
            ->where('idpostulante', $idPostulante)
            ->where('estadopostulante', 'BORRADOR')
            ->first();

        if (!$postulante) {
            return response()->json(['message' => 'Postulante no encontrado.'], 404);
        }

        $documentos = DB::table('doc_postulantes')
            ->where('idpostulante', $idPostulante)
            ->get(['iddoc', 'tipo', 'fechasubida']);

        $faltantes = array_values(array_diff(
            array_values(self::TIPOS_DOC),
            $documentos->pluck('tipo')->toArray()
        ));

        return response()->json([
            'documentos' => $documentos,
            'faltantes'  => $faltantes,
            'completo'   => empty($faltantes),
        ]);
    }

    // ── Paso 3: crear intent de pago ─────────────────────────────────────────
    public function crearIntent(Request $request)
    {
        $request->validate(['monto' => 'required|numeric|min:1']);

        $intent = $this->stripe()->paymentIntents->create([
            'amount'                    => (int) ($request->monto * 100),
            'currency'                  => 'usd',
            'automatic_payment_methods' => ['enabled' => true],
        ]);

        return response()->json(['clientSecret' => $intent->client_secret]);
    }

    // ── Paso 4: confirmar pago y finalizar inscripción ───────────────────────
    public function confirmarPago(Request $request)
    {
        $request->validate([
            'idpostulante'   => 'required|integer|exists:postulante,idpostulante',
            'paymentIntentId'=> 'required|string',
            'monto'          => 'required|numeric|min:0',
            'idcarrera1'     => 'required|integer|exists:carrera,idcarrera',
            'idcarrera2'     => 'required|integer|exists:carrera,idcarrera|different:idcarrera1',
        ]);

        $postulante = DB::table('postulante')
            ->where('idpostulante', $request->idpostulante)
            ->where('estadopostulante', 'BORRADOR')
            ->first();

        if (!$postulante) {
            return response()->json(['message' => 'Postulante no encontrado o la inscripción ya fue completada.'], 422);
        }

        // Verificar que subió los 4 documentos requeridos
        $tiposSubidos = DB::table('doc_postulantes')
            ->where('idpostulante', $request->idpostulante)
            ->pluck('tipo')
            ->toArray();

        $faltantes = array_diff(array_values(self::TIPOS_DOC), $tiposSubidos);
        if (!empty($faltantes)) {
            return response()->json([
                'message'   => 'Faltan documentos requeridos antes de pagar.',
                'faltantes' => array_values($faltantes),
            ], 422);
        }

        // Verificar pago con Stripe
        try {
            $intent = $this->stripe()->paymentIntents->retrieve($request->paymentIntentId);
            if ($intent->status !== 'succeeded') {
                return response()->json(['message' => 'El pago no fue confirmado por Stripe. Intentá de nuevo.'], 400);
            }
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error al verificar el pago: ' . $e->getMessage()], 400);
        }

        try {
            DB::transaction(function () use ($request, $postulante) {
                $idPostulante = $postulante->idpostulante;

                // Pasar de BORRADOR a PENDIENTE
                DB::table('postulante')
                    ->where('idpostulante', $idPostulante)
                    ->update([
                        'estadopostulante' => 'PENDIENTE',
                        'titulobachiller'  => true,
                    ]);

                $idPago = DB::table('pagos')->insertGetId([
                    'idpostulante'     => $idPostulante,
                    'monto'            => $request->monto,
                    'fechapago'        => now(),
                    'metodopago'       => 'STRIPE',
                    'codgotransaccion' => $request->paymentIntentId,
                    'estadopago'       => 'CONFIRMADO',
                ], 'idpagos');

                $gestion = DB::table('gestion')
                    ->where('estado', 'ACTIVO')
                    ->where('fechainicio', '<=', now())
                    ->orderBy('fechainicio', 'desc')
                    ->first();

                if ($gestion) {
                    DB::table('inscripcion')->insert([
                        'idpostulante'      => $idPostulante,
                        'idpago'            => $idPago,
                        'fechainscripcion'  => now(),
                        'estadoinscripcion' => 'PENDIENTE',
                        'gestion'           => $gestion->idgestion,
                    ]);

                    DB::table('carreraadmitida')->insert([
                        ['idpostulante' => $idPostulante, 'idcarrera' => $request->idcarrera1, 'opcion' => 1, 'estadoadmision' => 'PENDIENTE', 'gestion' => $gestion->idgestion],
                        ['idpostulante' => $idPostulante, 'idcarrera' => $request->idcarrera2, 'opcion' => 2, 'estadoadmision' => 'PENDIENTE', 'gestion' => $gestion->idgestion],
                    ]);
                }
            });
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }

        return response()->json([
            'message'    => 'Pago recibido. Tu solicitud está pendiente de aprobación por el administrador.',
            'postulante' => [
                'ci'       => $postulante->ci,
                'nombres'  => $postulante->nombres,
                'apellidos'=> $postulante->apellidos,
                'correo'   => $postulante->correo,
            ],
        ], 201);
    }

    // ── Legacy: flujo anterior en un solo paso ────────────────────────────────
    public function registrar(Request $request)
    {
        $request->validate([
            'ci'                => 'required|unique:postulante,ci',
            'nombres'           => 'required',
            'apellidos'         => 'required',
            'sexo'              => 'required|in:M,F',
            'correo'            => 'required|email|unique:postulante,correo',
            'paymentIntentId'   => 'required|string',
            'monto'             => 'required|numeric|min:0',
            'metodoPago'        => 'nullable|string',
            'telefono'          => 'nullable|string',
            'direccion'         => 'nullable|string',
            'colegioProcedencia'=> 'nullable|string',
            'ciudad'            => 'nullable|string',
            'tituloBachiller'   => 'nullable|boolean',
            'otrosRequisitos'   => 'nullable|string',
            'idcarrera1'        => 'required|integer|exists:carrera,idcarrera',
            'idcarrera2'        => 'required|integer|exists:carrera,idcarrera|different:idcarrera1',
        ]);

        try {
            $intent = $this->stripe()->paymentIntents->retrieve($request->paymentIntentId);
            if ($intent->status !== 'succeeded') {
                return response()->json(['message' => 'El pago no fue confirmado por Stripe. Intentá de nuevo.'], 400);
            }
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error al verificar el pago: ' . $e->getMessage()], 400);
        }

        try {
            DB::transaction(function () use ($request) {
                $idPostulante = DB::table('postulante')->insertGetId([
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
                ], 'idpostulante');

                $idPago = DB::table('pagos')->insertGetId([
                    'idpostulante'     => $idPostulante,
                    'monto'            => $request->monto,
                    'fechapago'        => now(),
                    'metodopago'       => 'STRIPE',
                    'codgotransaccion' => $request->paymentIntentId,
                    'estadopago'       => 'CONFIRMADO',
                ], 'idpagos');

                $gestion = DB::table('gestion')
                    ->where('estado', 'ACTIVO')
                    ->where('fechainicio', '<=', now())
                    ->orderBy('fechainicio', 'desc')
                    ->first();

                if ($gestion) {
                    DB::table('inscripcion')->insert([
                        'idpostulante'      => $idPostulante,
                        'idpago'            => $idPago,
                        'fechainscripcion'  => now(),
                        'estadoinscripcion' => 'PENDIENTE',
                        'gestion'           => $gestion->idgestion,
                    ]);
                    DB::table('carreraadmitida')->insert([
                        ['idpostulante' => $idPostulante, 'idcarrera' => $request->idcarrera1, 'opcion' => 1, 'estadoadmision' => 'PENDIENTE', 'gestion' => $gestion->idgestion],
                        ['idpostulante' => $idPostulante, 'idcarrera' => $request->idcarrera2, 'opcion' => 2, 'estadoadmision' => 'PENDIENTE', 'gestion' => $gestion->idgestion],
                    ]);
                }
            });
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }

        return response()->json([
            'message'    => 'Pago recibido. Tu solicitud está pendiente de aprobación por el administrador.',
            'postulante' => [
                'ci'       => $request->ci,
                'nombres'  => $request->nombres,
                'apellidos'=> $request->apellidos,
                'correo'   => $request->correo,
            ],
        ], 201);
    }
}
