<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DocenteController extends Controller
{
    public function index()
    {
        $docentes = DB::table('docente')
            ->orderBy('apellidos')
            ->get();

        return response()->json($docentes);
    }

    // Usuarios disponibles para asignar como docente (sin registro previo en tabla docente)
    public function usuariosDisponibles()
    {
        $usuarios = DB::table('usuario as u')
            ->leftJoin('docente as d', 'd.idusuario', '=', 'u.idusuario')
            ->whereNull('d.idusuario')
            ->where('u.estado', 'ACTIVO')
            ->select('u.idusuario', 'u.nombre_usuario', 'u.email')
            ->orderBy('u.nombre_usuario')
            ->get();

        return response()->json($usuarios);
    }

    public function show(int $id)
    {
        $docente = DB::table('docente')->where('iddocente', $id)->first();
        if (!$docente) {
            return response()->json(['message' => 'Docente no encontrado'], 404);
        }
        return response()->json($docente);
    }

    // Perfil del docente logueado actualmente
    public function miPerfil(Request $request)
    {
        $docente = DB::table('docente')
            ->where('idusuario', $request->user()->idusuario)
            ->first();

        if (!$docente) {
            return response()->json(['message' => 'No tienes perfil de docente'], 403);
        }

        return response()->json($docente);
    }

    // Grupos asignados al docente logueado
    public function misGrupos(Request $request)
    {
        $docente = DB::table('docente')
            ->where('idusuario', $request->user()->idusuario)
            ->first();

        if (!$docente) {
            return response()->json(['message' => 'No tienes perfil de docente'], 403);
        }

        $grupos = DB::table('docentegruposmateria as dgm')
            ->join('grupos as g',  'g.idgrupo',   '=', 'dgm.idgrupo')
            ->join('materia as m', 'm.idmateria', '=', 'dgm.idmateria')
            ->leftJoin('horarios as h', 'h.idgrupo', '=', 'g.idgrupo')
            ->leftJoin('aulas as a',    'a.idaulas', '=', 'h.idaula')
            ->where('dgm.iddocente', $docente->iddocente)
            ->where('dgm.estado', 'ACTIVO')
            ->select(
                'g.idgrupo', 'g.nombregrupo', 'g.turno', 'g.cantidadestudiante', 'g.capacidadmaxima',
                'm.idmateria', 'm.nombre as materia',
                'a.nombre as aula',
                'h.horarioinicio', 'h.horariofin', 'h.dias',
                'dgm.idasignacion'
            )
            ->get();

        return response()->json($grupos);
    }

    public function store(Request $request)
    {
        $request->validate([
            'idusuario' => 'required|integer|unique:docente,idusuario',
            'ci'        => 'required|unique:docente,ci',
            'nombres'   => 'required',
            'apellidos' => 'required',
            'correo'    => 'required|email|unique:docente,correo',
            'estado'    => 'required|in:ACTIVO,INACTIVO',
        ]);

        $usuario = DB::table('usuario')->where('idusuario', $request->idusuario)->first();
        if (!$usuario) {
            return response()->json(['message' => 'Usuario no encontrado'], 404);
        }

        DB::transaction(function () use ($request) {
            DB::table('docente')->insert([
                'idusuario'      => $request->idusuario,
                'ci'             => $request->ci,
                'nombres'        => $request->nombres,
                'apellidos'      => $request->apellidos,
                'profesion'      => $request->profesion,
                'maestria'       => $request->maestria,
                'diplomadoedsup' => $request->diplomadoEdSup,
                'telefono'       => $request->telefono,
                'correo'         => $request->correo,
                'estado'         => $request->estado,
            ]);

            // Asignar automáticamente el rol DOCENTE al usuario
            $rolDocente = DB::table('roles')->where('nombre', 'DOCENTE')->first();
            if ($rolDocente) {
                DB::table('usuario_roles')->insertOrIgnore([
                    'idusuario' => $request->idusuario,
                    'idrol'     => $rolDocente->idrol,
                ]);
            }
        });

        return response()->json(['message' => 'Docente registrado y rol DOCENTE asignado correctamente'], 201);
    }

    public function update(Request $request, int $id)
    {
        $docente = DB::table('docente')->where('iddocente', $id)->first();
        if (!$docente) {
            return response()->json(['message' => 'Docente no encontrado'], 404);
        }

        $request->validate([
            'nombres'   => 'required',
            'apellidos' => 'required',
            'correo'    => 'required|email',
            'estado'    => 'required|in:ACTIVO,INACTIVO',
        ]);

        DB::table('docente')->where('iddocente', $id)->update([
            'nombres'        => $request->nombres,
            'apellidos'      => $request->apellidos,
            'profesion'      => $request->profesion,
            'maestria'       => $request->maestria,
            'diplomadoedsup' => $request->diplomadoEdSup,
            'telefono'       => $request->telefono,
            'correo'         => $request->correo,
            'estado'         => $request->estado,
        ]);

        return response()->json(['message' => 'Docente actualizado correctamente']);
    }

    public function destroy(int $id)
    {
        $docente = DB::table('docente')->where('iddocente', $id)->first();
        if (!$docente) {
            return response()->json(['message' => 'Docente no encontrado'], 404);
        }
        DB::table('docente')->where('iddocente', $id)->delete();
        return response()->json(['message' => 'Docente eliminado correctamente']);
    }
}
