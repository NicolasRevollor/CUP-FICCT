<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * CU-08 — Registro y gestión de docentes
 * CRUD sobre la tabla docente. Al crear un docente le asigna automáticamente el rol DOCENTE.
 * Almacena profesión, maestría y diplomado en Ed. Superior para referencia, pero
 * NO valida automáticamente que cumplan los requisitos — la verificación es manual.
 *
 * CU-11 — Asignación de docentes a grupos (máx. 4 grupos activos por docente)
 * asignarGrupo / desasignarGrupo gestionan la tabla docentegrupomateria.
 * Se valida que el docente no supere 4 grupos activos simultáneos.
 */
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

        $grupos = DB::table('docentegrupomateria as dgm')
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

    // CU-11: asignar docente a un grupo/materia — máximo 4 grupos activos
    public function asignarGrupo(Request $request, int $id)
    {
        $docente = DB::table('docente')->where('iddocente', $id)->first();
        if (!$docente) {
            return response()->json(['message' => 'Docente no encontrado'], 404);
        }

        $request->validate([
            'idgrupo'   => 'required|integer',
            'idmateria' => 'required|integer',
        ]);

        // Validar límite de 4 grupos activos por docente
        $gruposActivos = DB::table('docentegrupomateria')
            ->where('iddocente', $id)
            ->where('estado', 'ACTIVO')
            ->count();

        if ($gruposActivos >= 4) {
            return response()->json([
                'message' => 'El docente ya tiene 4 grupos activos asignados (máximo permitido)',
            ], 400);
        }

        // Verificar que el grupo y la materia existan
        $grupo   = DB::table('grupos')->where('idgrupo', $request->idgrupo)->first();
        $materia = DB::table('materia')->where('idmateria', $request->idmateria)->first();
        if (!$grupo)   return response()->json(['message' => 'Grupo no encontrado'], 404);
        if (!$materia) return response()->json(['message' => 'Materia no encontrada'], 404);

        // Evitar duplicado activo
        $existe = DB::table('docentegrupomateria')
            ->where('iddocente',  $id)
            ->where('idgrupo',    $request->idgrupo)
            ->where('idmateria',  $request->idmateria)
            ->where('estado',     'ACTIVO')
            ->exists();

        if ($existe) {
            return response()->json(['message' => 'El docente ya está asignado a ese grupo/materia'], 400);
        }

        DB::table('docentegrupomateria')->insert([
            'iddocente'  => $id,
            'idgrupo'    => $request->idgrupo,
            'idmateria'  => $request->idmateria,
            'estado'     => 'ACTIVO',
        ]);

        return response()->json(['message' => 'Docente asignado al grupo correctamente'], 201);
    }

    // CU-11: desasignar docente de un grupo/materia
    public function desasignarGrupo(int $id, int $idAsignacion)
    {
        $asignacion = DB::table('docentegrupomateria')
            ->where('idasignacion', $idAsignacion)
            ->where('iddocente', $id)
            ->first();

        if (!$asignacion) {
            return response()->json(['message' => 'Asignación no encontrada'], 404);
        }

        DB::table('docentegrupomateria')
            ->where('idasignacion', $idAsignacion)
            ->update(['estado' => 'INACTIVO']);

        return response()->json(['message' => 'Docente desasignado del grupo correctamente']);
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
