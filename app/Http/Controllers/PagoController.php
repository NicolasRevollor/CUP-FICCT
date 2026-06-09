<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use App\Mail\CredencialesEstudiante;

class PagoController extends Controller
{
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

    public function porPostulante(int $idPostulante)
    {
        $pagos = DB::table('pagos')
            ->where('idpostulante', $idPostulante)
            ->orderBy('fechapago', 'desc')
            ->get();

        return response()->json($pagos);
    }

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

        if ($request->estadopago === 'CONFIRMADO') {
            $this->generarCredenciales($request->idpostulante);
        }

        return response()->json(['message' => 'Pago registrado correctamente', 'idpagos' => $id], 201);
    }

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

        if ($request->estadopago === 'CONFIRMADO' && $pago->estadopago !== 'CONFIRMADO') {
            $this->generarCredenciales($pago->idpostulante);
        }

        return response()->json(['message' => 'Estado del pago actualizado correctamente']);
    }

    private function generarCredenciales(int $idPostulante): void
    {
        $postulante = DB::table('postulante')->where('idpostulante', $idPostulante)->first();
        if (!$postulante || $postulante->idusuario) return;

        $username = (string) $postulante->ci;
        if (DB::table('usuario')->where('nombre_usuario', $username)->exists()) return;

        $password = 'CUP' . strtoupper(Str::random(5));

        $emailUsuario = DB::table('usuario')->where('email', $postulante->correo)->exists()
            ? $postulante->ci . '@cup.ficct.edu.bo'
            : $postulante->correo;

        try {
            DB::transaction(function () use ($postulante, $username, $password, $idPostulante, $emailUsuario) {
                $idUsuario = DB::table('usuario')->insertGetId([
                    'nombre_usuario'       => $username,
                    'password'             => Hash::make($password),
                    'email'                => $emailUsuario,
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
                    ->where('idpostulante', $idPostulante)
                    ->update(['idusuario' => $idUsuario]);
            });

            Mail::to($postulante->correo)->send(new CredencialesEstudiante(
                nombres:  $postulante->nombres,
                username: $username,
                password: $password,
            ));
        } catch (\Throwable) {
            // No interrumpir el flujo si falla la generación de credenciales
        }
    }
}
