<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Mail\CredencialesDocente;

class PostulacionDocenteController extends Controller
{
    public function index()
    {
        $postulaciones = DB::table('postulacion_docente as p')
            ->select(
                'p.idpostulacion', 'p.ci', 'p.nombres', 'p.apellidos', 'p.correo',
                'p.profesion', 'p.estado', 'p.fecha_postulacion',
                DB::raw('(SELECT COUNT(*) FROM postulacion_docente_documentos d WHERE d.idpostulacion = p.idpostulacion) as total_documentos')
            )
            ->orderBy('p.fecha_postulacion', 'desc')
            ->get();

        return response()->json($postulaciones);
    }

    public function show(int $id)
    {
        $postulacion = DB::table('postulacion_docente')->where('idpostulacion', $id)->first();
        if (!$postulacion) {
            return response()->json(['message' => 'Postulación no encontrada'], 404);
        }

        $documentos = DB::table('postulacion_docente_documentos')
            ->where('idpostulacion', $id)
            ->get();

        return response()->json(['postulacion' => $postulacion, 'documentos' => $documentos]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'ci'            => 'required|string|max:20',
            'nombres'       => 'required|string|max:150',
            'apellidos'     => 'required|string|max:150',
            'sexo'          => 'required|in:M,F',
            'correo'        => 'required|email|max:150',
            'telefono'      => 'nullable|string|max:20',
            'profesion'     => 'nullable|string|max:150',
            'maestria'      => 'nullable|string|max:200',
            'diplomadoedsup'=> 'nullable|boolean',
            'documentos'    => 'nullable|array|max:10',
            'documentos.*'  => 'file|max:10240|mimes:pdf,jpg,jpeg,png,gif,webp,doc,docx',
        ]);

        $idPostulacion = DB::table('postulacion_docente')->insertGetId([
            'ci'            => $request->ci,
            'nombres'       => $request->nombres,
            'apellidos'     => $request->apellidos,
            'sexo'          => $request->sexo,
            'correo'        => $request->correo,
            'telefono'      => $request->telefono,
            'profesion'     => $request->profesion,
            'maestria'      => $request->maestria,
            'diplomadoedsup'=> $request->boolean('diplomadoedsup'),
            'estado'        => 'PENDIENTE',
            'fecha_postulacion' => now(),
        ], 'idpostulacion');

        if ($request->hasFile('documentos')) {
            foreach ($request->file('documentos') as $file) {
                $nombreArchivo = Str::uuid() . '.' . $file->getClientOriginalExtension();
                $file->storeAs("postulaciones-docente/{$idPostulacion}", $nombreArchivo);

                DB::table('postulacion_docente_documentos')->insert([
                    'idpostulacion'  => $idPostulacion,
                    'nombre_original'=> $file->getClientOriginalName(),
                    'nombre_archivo' => $nombreArchivo,
                    'tipo_mime'      => $file->getMimeType(),
                    'fecha_subida'   => now(),
                ]);
            }
        }

        return response()->json(['message' => 'Postulación enviada correctamente. Recibirás una respuesta por correo.'], 201);
    }

    public function update(Request $request, int $id)
    {
        $postulacion = DB::table('postulacion_docente')->where('idpostulacion', $id)->first();
        if (!$postulacion) {
            return response()->json(['message' => 'Postulación no encontrada'], 404);
        }

        $request->validate([
            'estado'      => 'required|in:PENDIENTE,APROBADO,RECHAZADO',
            'observacion' => 'nullable|string',
        ]);

        DB::table('postulacion_docente')->where('idpostulacion', $id)->update([
            'estado'      => $request->estado,
            'observacion' => $request->observacion,
        ]);

        if ($request->estado === 'APROBADO' && $postulacion->estado !== 'APROBADO') {
            $this->aprobarDocente($postulacion);
        }

        return response()->json(['message' => 'Postulación actualizada correctamente']);
    }

    public function descargarDocumento(int $idPostulacion, int $idDocumento)
    {
        $doc = DB::table('postulacion_docente_documentos')
            ->where('iddocumento', $idDocumento)
            ->where('idpostulacion', $idPostulacion)
            ->first();

        if (!$doc) {
            return response()->json(['message' => 'Documento no encontrado'], 404);
        }

        $ruta = "postulaciones-docente/{$idPostulacion}/{$doc->nombre_archivo}";

        if (!Storage::exists($ruta)) {
            return response()->json(['message' => 'Archivo no disponible en el servidor'], 404);
        }

        return Storage::download($ruta, $doc->nombre_original);
    }

    private function aprobarDocente(object $postulacion): void
    {
        $username = $postulacion->ci;
        if (DB::table('usuario')->where('nombre_usuario', $username)->exists()) return;

        $password     = 'DOC' . strtoupper(Str::random(5));
        $emailUsuario = DB::table('usuario')->where('email', $postulacion->correo)->exists()
            ? $postulacion->ci . '@cup.ficct.edu.bo'
            : $postulacion->correo;

        try {
            DB::transaction(function () use ($postulacion, $username, $password, $emailUsuario) {
                $idUsuario = DB::table('usuario')->insertGetId([
                    'nombre_usuario'        => $username,
                    'password'              => Hash::make($password),
                    'email'                 => $emailUsuario,
                    'estado'                => 'ACTIVO',
                    'debe_cambiar_password' => true,
                ], 'idusuario');

                $rolDocente = DB::table('roles')->where('nombre', 'DOCENTE')->first();
                if ($rolDocente) {
                    DB::table('usuario_roles')->insert(['idusuario' => $idUsuario, 'idrol' => $rolDocente->idrol]);
                }

                DB::table('docente')->insert([
                    'idusuario'      => $idUsuario,
                    'ci'             => $postulacion->ci,
                    'nombres'        => $postulacion->nombres,
                    'apellidos'      => $postulacion->apellidos,
                    'profesion'      => $postulacion->profesion,
                    'maestria'       => $postulacion->maestria,
                    'diplomadoedsup' => $postulacion->diplomadoedsup,
                    'telefono'       => $postulacion->telefono,
                    'correo'         => $postulacion->correo,
                    'estado'         => 'ACTIVO',
                ]);
            });

            Mail::to($postulacion->correo)->send(new CredencialesDocente(
                nombres:  $postulacion->nombres,
                username: $username,
                password: $password,
            ));
        } catch (\Throwable) {}
    }
}
