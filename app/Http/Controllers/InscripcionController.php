<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use App\Mail\CredencialesEstudiante;

/**
 * CU-04 — Inscripción de postulantes
 * Registra la inscripción formal de un postulante vinculando idpostulante + idgestion + idpago.
 * Requiere que el postulante tenga un pago en estado CONFIRMADO antes de inscribirse.
 * Al confirmar la inscripción genera credenciales de acceso (rol ESTUDIANTE) y las envía por correo.
 * NOTA: la lógica de selección de carrera (1ra y 2da opción) está en ReporteController::admision,
 * no en este controlador.
 */
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
