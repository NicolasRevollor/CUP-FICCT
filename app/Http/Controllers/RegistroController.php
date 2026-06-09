<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use App\Mail\RegistroConfirmacion;
use App\Mail\CredencialesEstudiante;
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

        try {
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
                ], 'idpostulante');

                // Registrar pago confirmado
                DB::table('pagos')->insert([
                    'idpostulante'     => $idPostulante,
                    'monto'            => $request->monto,
                    'fechapago'        => now(),
                    'metodopago'       => 'TRANSFERENCIA',
                    'codgotransaccion' => $request->paymentIntentId,
                    'estadopago'       => 'CONFIRMADO',
                ]);
            });
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }

        // Generar credenciales de acceso para el estudiante
        try {
            $postulante = DB::table('postulante')->where('ci', $request->ci)->first();
            if ($postulante && !$postulante->idusuario) {
                $username = (string) $request->ci;
                if (!DB::table('usuario')->where('nombre_usuario', $username)->exists()) {
                    $password = 'CUP' . strtoupper(Str::random(5));
                    DB::transaction(function () use ($postulante, $username, $password) {
                        $idUsuario = DB::table('usuario')->insertGetId([
                            'nombre_usuario'       => $username,
                            'password'             => Hash::make($password),
                            'email'                => $postulante->correo,
                            'estado'               => 'ACTIVO',
                            'debe_cambiar_password' => true,
                        ], 'idusuario');
                        $rol = DB::table('roles')->where('nombre', 'ESTUDIANTE')->first();
                        if ($rol) {
                            DB::table('usuario_roles')->insert([
                                'idusuario' => $idUsuario,
                                'idrol'     => $rol->idrol,
                            ]);
                        }
                        DB::table('postulante')
                            ->where('idpostulante', $postulante->idpostulante)
                            ->update(['idusuario' => $idUsuario]);
                    });
                    Mail::to($request->correo)->send(new CredencialesEstudiante(
                        nombres:  $request->nombres,
                        username: $username,
                        password: $password,
                    ));
                }
            }
        } catch (\Throwable $e) {
            \Log::error('Error generando credenciales estudiante: ' . $e->getMessage());
        }

        // Enviar correo de confirmación
        try {
            Mail::to($request->correo)->send(new RegistroConfirmacion(
                nombres:   $request->nombres,
                apellidos: $request->apellidos,
                ci:        $request->ci,
                correo:    $request->correo,
                monto:     $request->monto,
            ));
        } catch (\Throwable $e) {
            // No fallar el registro si el correo falla
        }

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
