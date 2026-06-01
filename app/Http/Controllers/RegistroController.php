<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Stripe\StripeClient;

class RegistroController extends Controller
{
    private function stripe(): StripeClient
    {
        return new StripeClient(env('STRIPE_SECRET_KEY'));
    }

    // Crear intento de pago (público)
    public function crearIntent(Request $request)
    {
        $request->validate(['monto' => 'required|numeric|min:1']);

        $intent = $this->stripe()->paymentIntents->create([
            'amount'                     => (int) ($request->monto * 100),
            'currency'                   => 'usd',
            'automatic_payment_methods'  => ['enabled' => true],
        ]);

        return response()->json(['clientSecret' => $intent->client_secret]);
    }

    // Registrar postulante + confirmar pago (público)
    public function registrar(Request $request)
    {
        $request->validate([
            'ci'               => 'required|unique:postulante,ci',
            'nombres'          => 'required',
            'apellidos'        => 'required',
            'sexo'             => 'required|in:M,F',
            'correo'           => 'required|email|unique:postulante,correo',
            'tituloBachiller'  => 'required|boolean',
            'paymentIntentId'  => 'required|string',
            'monto'            => 'required|numeric|min:0',
            'metodoPago'       => 'required|string',
        ]);

        // Verificar pago con Stripe
        try {
            $intent = $this->stripe()->paymentIntents->retrieve($request->paymentIntentId);
            if ($intent->status !== 'succeeded') {
                return response()->json(['message' => 'El pago no fue confirmado. Intente de nuevo.'], 400);
            }
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error al verificar el pago: ' . $e->getMessage()], 400);
        }

        DB::transaction(function () use ($request) {
            // Crear postulante
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
            ]);

            // Registrar pago confirmado
            DB::table('pagos')->insert([
                'idpostulante'     => $idPostulante,
                'monto'            => $request->monto,
                'fechapago'        => now(),
                'metodopago'       => $request->metodoPago,
                'codgotransaccion' => $request->paymentIntentId,
                'estadopago'       => 'CONFIRMADO',
            ]);
        });

        return response()->json([
            'message'  => 'Registro completado correctamente',
            'postulante' => [
                'ci'       => $request->ci,
                'nombres'  => $request->nombres,
                'apellidos'=> $request->apellidos,
                'correo'   => $request->correo,
            ],
        ], 201);
    }
}
