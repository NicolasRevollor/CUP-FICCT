<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InscripcionController extends Controller
{
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

    public function gestiones()
    {
        $gestiones = DB::table('gestion')->orderBy('idgestion', 'desc')->get();
        return response()->json($gestiones);
    }

    public function porPostulante(int $idPostulante)
    {
        $inscripcion = DB::table('inscripcion')->where('idpostulante', $idPostulante)->first();
        if (!$inscripcion) {
            return response()->json(['message' => 'No se encontró inscripción para este postulante'], 404);
        }
        return response()->json($inscripcion);
    }

    // Registrar inscripción (CU04)
    // Requiere que el postulante tenga un pago CONFIRMADO
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

        // Actualizar estado del postulante a INSCRITO
        DB::table('postulante')
            ->where('idpostulante', $request->idpostulante)
            ->update(['estadopostulante' => 'INSCRITO']);

        return response()->json(['message' => 'Inscripción registrada correctamente'], 201);
    }

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

        return response()->json(['message' => 'Inscripción actualizada correctamente']);
    }
}
