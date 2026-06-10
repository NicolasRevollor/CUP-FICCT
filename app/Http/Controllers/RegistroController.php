<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Stripe\StripeClient;

/**
 * CU-01 Registro público de postulantes.
 * Flujo:
 *   1. crearIntent  → crea un PaymentIntent en Stripe y devuelve el clientSecret al frontend.
 *   2. registrar    → el frontend confirma el pago con Stripe y luego llama a este endpoint;
 *                     verifica que el PaymentIntent haya tenido éxito y crea el postulante
 *                     + pago PENDIENTE (el admin aún debe aprobar la inscripción).
 */
class RegistroController extends Controller
{
    private function stripe(): StripeClient
    {
        return new StripeClient(env('STRIPE_SECRET_KEY'));
    }

    // Paso 1: crear intento de pago (público)
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

    // Paso 2: verificar pago y registrar postulante (público)
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
        ]);

        // Verificar con Stripe que el pago realmente se realizó
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

                // Stripe ya verificó el pago → queda CONFIRMADO directamente
                $idPago = DB::table('pagos')->insertGetId([
                    'idpostulante'     => $idPostulante,
                    'monto'            => $request->monto,
                    'fechapago'        => now(),
                    'metodopago'       => 'STRIPE',
                    'codgotransaccion' => $request->paymentIntentId,
                    'estadopago'       => 'CONFIRMADO',
                ], 'idpagos');

                // Crear inscripción PENDIENTE con la gestión ACTIVO más reciente ya iniciada
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
