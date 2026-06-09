<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

        return response()->json(['message' => 'Estado del pago actualizado correctamente']);
    }
}
