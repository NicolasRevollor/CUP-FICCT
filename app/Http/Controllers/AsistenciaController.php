<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AsistenciaController extends Controller
{
    private function getRol(Request $request): string
    {
        return DB::table('usuario_roles')
            ->join('roles', 'roles.idrol', '=', 'usuario_roles.idrol')
            ->where('usuario_roles.idusuario', $request->user()->idusuario)
            ->value('roles.nombre') ?? '';
    }

    // Verifica que el docente autenticado esté asignado al grupo indicado
    private function docentePerteneceAGrupo(Request $request, int $idGrupo): bool
    {
        $docente = DB::table('docente')
            ->where('idusuario', $request->user()->idusuario)
            ->first();

        if (!$docente) return false;

        return DB::table('docentegrupomateria')
            ->where('iddocente', $docente->iddocente)
            ->where('idgrupo', $idGrupo)
            ->where('estado', 'ACTIVO')
            ->exists();
    }

    // GET /asistencia/grupo/{idGrupo}?fecha=YYYY-MM-DD (fecha opcional)
    public function porGrupo(Request $request, int $idGrupo)
    {
        $rol = $this->getRol($request);

        if ($rol === 'DOCENTE') {
            if (!$this->docentePerteneceAGrupo($request, $idGrupo)) {
                return response()->json(['message' => 'Sin permiso para ver este grupo'], 403);
            }
        } elseif ($rol !== 'ADMINISTRADOR') {
            return response()->json(['message' => 'Sin permiso'], 403);
        }

        $query = DB::table('asistencia as a')
            ->join('postulante as p', 'p.idpostulante', '=', 'a.idpostulante')
            ->where('a.idgrupo', $idGrupo)
            ->select(
                'a.idasistencia',
                'a.fecha',
                'p.idpostulante',
                'p.ci',
                'p.nombres',
                'p.apellidos',
                'a.estado'
            )
            ->orderBy('a.fecha', 'desc')
            ->orderBy('p.apellidos');

        if ($request->filled('fecha')) {
            $request->validate(['fecha' => 'date']);
            $query->where('a.fecha', $request->fecha);
        }

        return response()->json($query->get());
    }

    // GET /asistencia/postulante/{idPostulante}
    public function porPostulante(Request $request, int $idPostulante)
    {
        $rol = $this->getRol($request);

        if ($rol === 'DOCENTE') {
            // El docente solo puede ver si el postulante está en alguno de sus grupos
            $docente = DB::table('docente')
                ->where('idusuario', $request->user()->idusuario)
                ->first();

            if (!$docente) {
                return response()->json(['message' => 'Sin permiso'], 403);
            }

            $enSuGrupo = DB::table('grupopostulantes as gp')
                ->join('docentegrupomateria as dgm', 'dgm.idgrupo', '=', 'gp.idgrupo')
                ->where('gp.idpostulante', $idPostulante)
                ->where('gp.estado', 'ACTIVO')
                ->where('dgm.iddocente', $docente->iddocente)
                ->where('dgm.estado', 'ACTIVO')
                ->exists();

            if (!$enSuGrupo) {
                return response()->json(['message' => 'Sin permiso para ver este postulante'], 403);
            }
        } elseif ($rol !== 'ADMINISTRADOR') {
            return response()->json(['message' => 'Sin permiso'], 403);
        }

        $asistencia = DB::table('asistencia')
            ->where('idpostulante', $idPostulante)
            ->orderBy('fecha', 'desc')
            ->get();

        return response()->json($asistencia);
    }

    // POST /asistencia
    public function store(Request $request)
    {
        $request->validate([
            'idgrupo'                  => 'required|integer',
            'fecha'                    => 'required|date',
            'registros'                => 'required|array|min:1',
            'registros.*.idpostulante' => 'required|integer',
            'registros.*.estado'       => 'required|in:PRESENTE,AUSENTE,JUSTIFICADO',
        ]);

        $rol = $this->getRol($request);

        if ($rol === 'DOCENTE') {
            if (!$this->docentePerteneceAGrupo($request, $request->idgrupo)) {
                return response()->json(['message' => 'Sin permiso para registrar en este grupo'], 403);
            }
        } elseif ($rol !== 'ADMINISTRADOR') {
            return response()->json(['message' => 'Sin permiso'], 403);
        }

        $grupo = DB::table('grupos')->where('idgrupo', $request->idgrupo)->first();
        if (!$grupo) {
            return response()->json(['message' => 'Grupo no encontrado'], 404);
        }

        $insertados   = 0;
        $actualizados = 0;

        DB::transaction(function () use ($request, &$insertados, &$actualizados) {
            foreach ($request->registros as $r) {
                $existe = DB::table('asistencia')
                    ->where('idpostulante', $r['idpostulante'])
                    ->where('idgrupo', $request->idgrupo)
                    ->where('fecha', $request->fecha)
                    ->first();

                if ($existe) {
                    DB::table('asistencia')
                        ->where('idasistencia', $existe->idasistencia)
                        ->update(['estado' => $r['estado']]);
                    $actualizados++;
                } else {
                    DB::table('asistencia')->insert([
                        'idpostulante' => $r['idpostulante'],
                        'idgrupo'      => $request->idgrupo,
                        'fecha'        => $request->fecha,
                        'estado'       => $r['estado'],
                    ]);
                    $insertados++;
                }
            }
        });

        return response()->json([
            'message'      => 'Asistencia registrada correctamente',
            'insertados'   => $insertados,
            'actualizados' => $actualizados,
        ], 201);
    }

    // PUT /asistencia/{id}
    public function update(Request $request, int $id)
    {
        $registro = DB::table('asistencia')->where('idasistencia', $id)->first();
        if (!$registro) {
            return response()->json(['message' => 'Registro no encontrado'], 404);
        }

        $rol = $this->getRol($request);

        if ($rol === 'DOCENTE') {
            if (!$this->docentePerteneceAGrupo($request, $registro->idgrupo)) {
                return response()->json(['message' => 'Sin permiso para editar este registro'], 403);
            }
        } elseif ($rol !== 'ADMINISTRADOR') {
            return response()->json(['message' => 'Sin permiso'], 403);
        }

        $request->validate([
            'estado' => 'required|in:PRESENTE,AUSENTE,JUSTIFICADO',
        ]);

        DB::table('asistencia')
            ->where('idasistencia', $id)
            ->update(['estado' => $request->estado]);

        return response()->json(['message' => 'Registro actualizado correctamente']);
    }
}
