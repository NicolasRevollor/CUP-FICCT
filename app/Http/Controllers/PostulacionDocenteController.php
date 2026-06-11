<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Mail\CredencialesDocente;

/**
 * ============================================================
 * PostulacionDocenteController  —  CU-20: Postulación pública de docentes
 * ============================================================
 *
 * ¿QUÉ HACE ESTE CONTROLADOR?
 *   Permite a candidatos externos postularse para ser docentes del CUP.
 *   Es un formulario público (sin autenticación) donde el candidato envía
 *   sus datos personales y documentos de respaldo.
 *   El administrador luego revisa, aprueba o rechaza cada postulación.
 *   Al aprobar, el sistema crea automáticamente el usuario y el perfil de docente.
 *
 * FLUJO:
 *   1. Candidato → POST /postulaciones-docente (público, sin token)
 *      → crea postulacion_docente (estado=PENDIENTE) + sube documentos
 *   2. Admin → GET /postulaciones-docente → ve la lista con total de docs
 *   3. Admin → GET /postulaciones-docente/{id} → ve detalle + lista de docs
 *   4. Admin → GET /postulaciones-docente/{id}/documentos/{idDoc} → descarga doc
 *   5. Admin → PUT /postulaciones-docente/{id} { estado: "APROBADO" }
 *      → aprobarDocente() crea usuario + docente + envía credenciales por email
 *
 * TABLAS:
 *   postulacion_docente: idpostulacion, ci, nombres, apellidos, correo,
 *                        profesion, maestria, diplomadoedsup, estado, fecha_postulacion
 *   postulacion_docente_documentos: iddocumento, idpostulacion, nombre_original,
 *                                   nombre_archivo, tipo_mime, fecha_subida
 *
 * ENDPOINTS DISPONIBLES:
 *   GET    /api/postulaciones-docente                            → index()
 *   GET    /api/postulaciones-docente/{id}                       → show()
 *   POST   /api/postulaciones-docente                            → store()
 *   PUT    /api/postulaciones-docente/{id}                       → update()
 *   GET    /api/postulaciones-docente/{id}/documentos/{idDoc}    → descargarDocumento()
 */
class PostulacionDocenteController extends Controller
{
    // ──────────────────────────────────────────────────────────────
    // GET /api/postulaciones-docente  [requiere auth=ADMIN]
    // ──────────────────────────────────────────────────────────────
    /**
     * Lista todas las postulaciones con cantidad de documentos subidos.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /postulaciones-docente
     *   [1] SELECT postulacion_docente + subquery COUNT(documentos) as total_documentos
     *   [2] ORDER BY fecha_postulacion DESC
     *   [3] → 200 con array de postulaciones
     */
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

    // ──────────────────────────────────────────────────────────────
    // GET /api/postulaciones-docente/{id}  [requiere auth=ADMIN]
    // ──────────────────────────────────────────────────────────────
    /**
     * Devuelve una postulación con sus documentos asociados.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /postulaciones-docente/5
     *   [1] SELECT postulacion_docente WHERE idpostulacion = 5
     *   ALT [no existe] → 404
     *   [2] SELECT postulacion_docente_documentos WHERE idpostulacion = 5
     *   [3] → 200 { postulacion: {...}, documentos: [...] }
     */
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

    // ──────────────────────────────────────────────────────────────
    // POST /api/postulaciones-docente  [PÚBLICO, sin auth]
    // ──────────────────────────────────────────────────────────────
    /**
     * Recibe la postulación de un candidato a docente con sus documentos.
     * Es un endpoint público: el candidato no necesita cuenta en el sistema.
     *
     * DOCUMENTOS OPCIONALES (campos multipart):
     *   titulo_profesional → "Título Profesional"
     *   maestria_doc       → "Maestría"
     *   diplomado_doc      → "Diplomado en Ed. Superior"
     *   cv                 → "CV / Hoja de Vida"
     *
     * ALMACENAMIENTO:
     *   storage/app/private/postulaciones-docente/{idPostulacion}/{uuid}.{ext}
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → POST /postulaciones-docente (multipart/form-data)
     *     { ci, nombres, apellidos, sexo, correo, profesion?, maestria?,
     *       titulo_profesional?, maestria_doc?, diplomado_doc?, cv? }
     *
     *   [1] Validar campos obligatorios y opcionales (archivos max 10 MB)
     *   [2] INSERT en postulacion_docente (estado='PENDIENTE')
     *       → obtener idPostulacion
     *
     *   LOOP [por cada campo de documento en $camposDoc]
     *     OPT [si el campo viene en el request]
     *       [3] Guardar archivo en disco: postulaciones-docente/{id}/{uuid}.ext
     *       [4] INSERT en postulacion_docente_documentos
     *   FIN LOOP
     *
     *   [5] → 201 "Postulación enviada correctamente. Recibirás respuesta por correo."
     */
    public function store(Request $request)
    {
        $mimes = 'pdf,jpg,jpeg,png,gif,webp,doc,docx';
        $request->validate([
            'ci'                 => 'required|string|max:20',
            'nombres'            => 'required|string|max:150',
            'apellidos'          => 'required|string|max:150',
            'sexo'               => 'required|in:M,F',
            'correo'             => 'required|email|max:150',
            'telefono'           => 'nullable|string|max:20',
            'profesion'          => 'nullable|string|max:150',
            'maestria'           => 'nullable|string|max:200',
            'titulo_profesional' => "nullable|file|max:10240|mimes:{$mimes}",
            'maestria_doc'       => "nullable|file|max:10240|mimes:{$mimes}",
            'diplomado_doc'      => "nullable|file|max:10240|mimes:{$mimes}",
            'cv'                 => "nullable|file|max:10240|mimes:{$mimes}",
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
            'diplomadoedsup'=> false,
            'estado'        => 'PENDIENTE',
            'fecha_postulacion' => now(),
        ], 'idpostulacion');

        $camposDoc = [
            'titulo_profesional' => 'Título Profesional',
            'maestria_doc'       => 'Maestría',
            'diplomado_doc'      => 'Diplomado en Ed. Superior',
            'cv'                 => 'CV / Hoja de Vida',
        ];
        foreach ($camposDoc as $campo => $etiqueta) {
            if ($request->hasFile($campo)) {
                $file          = $request->file($campo);
                $nombreArchivo = Str::uuid() . '.' . $file->getClientOriginalExtension();
                $file->storeAs("postulaciones-docente/{$idPostulacion}", $nombreArchivo);

                DB::table('postulacion_docente_documentos')->insert([
                    'idpostulacion'  => $idPostulacion,
                    'nombre_original'=> "[{$etiqueta}] " . $file->getClientOriginalName(),
                    'nombre_archivo' => $nombreArchivo,
                    'tipo_mime'      => $file->getMimeType(),
                    'fecha_subida'   => now(),
                ]);
            }
        }

        return response()->json(['message' => 'Postulación enviada correctamente. Recibirás una respuesta por correo.'], 201);
    }

    // ──────────────────────────────────────────────────────────────
    // PUT /api/postulaciones-docente/{id}  [requiere auth=ADMIN]
    // ──────────────────────────────────────────────────────────────
    /**
     * Aprueba o rechaza una postulación de docente.
     * Al aprobar, se ejecuta aprobarDocente() que crea el usuario y el perfil.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → PUT /postulaciones-docente/5  { estado: "APROBADO", observacion? }
     *
     *   [1] Buscar la postulación por ID
     *   ALT [no existe] → 404
     *   [2] Validar nuevo estado (PENDIENTE|APROBADO|RECHAZADO)
     *   [3] UPDATE postulacion_docente SET estado = ?, observacion = ?
     *
     *   OPT [nuevo estado = APROBADO y antes NO era APROBADO]
     *     [4] aprobarDocente(postulacion):
     *         → Verificar que el CI/correo no estén duplicados en docente/usuario
     *         → Si ya existen → no hacer nada (idempotente)
     *         → Si son nuevos:
     *           DB TRANSACTION:
     *             → INSERT usuario (username=ci, password aleatorio "DOC"+5chars)
     *             → INSERT usuario_roles (rol DOCENTE)
     *             → INSERT docente (vinculando idusuario)
     *           → Enviar email CredencialesDocente con usuario + contraseña
     *         → Si falla → Log::error() (no aborta la respuesta)
     *
     *   [5] → 200 "Postulación actualizada correctamente"
     */
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

    // ──────────────────────────────────────────────────────────────
    // GET /api/postulaciones-docente/{idPostulacion}/documentos/{idDocumento}
    // ──────────────────────────────────────────────────────────────
    /**
     * Descarga un documento adjunto de una postulación.
     * Usa Storage::download() para servir el archivo con su nombre original.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Cliente → GET /postulaciones-docente/5/documentos/12
     *   [1] Buscar el documento WHERE iddocumento=12 AND idpostulacion=5
     *   ALT [no existe] → 404
     *   [2] Verificar que el archivo físico exista en Storage
     *   ALT [no existe en disco] → 404 "Archivo no disponible en el servidor"
     *   [3] → Storage::download() → respuesta con Content-Disposition: attachment
     */
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

    // ──────────────────────────────────────────────────────────────
    // MÉTODO PRIVADO: aprobarDocente()
    // ──────────────────────────────────────────────────────────────
    /**
     * Crea el usuario y el perfil de docente cuando se aprueba una postulación.
     * Es idempotente: si el CI, correo o username ya existen, no duplica nada.
     *
     * LÓGICA:
     *   Si ya existe usuario con ese CI como nombre_usuario → skip (ya está creado)
     *   Si ya existe docente con ese correo → skip (ya tiene perfil)
     *   Si ya existe docente con ese CI → skip
     *
     *   Si pasa todos los checks:
     *     → Si el correo ya está en tabla usuario → usar CI@cup.ficct.edu.bo como email
     *     → Crear usuario con password "DOC"+5chars
     *     → Crear docente vinculado al usuario
     *     → Enviar email con credenciales (CredencialesDocente)
     *     → Si falla: Log::error() (no lanza excepción al cliente)
     */
    private function aprobarDocente(object $postulacion): void
    {
        $username = $postulacion->ci;
        if (DB::table('usuario')->where('nombre_usuario', $username)->exists()) return;
        if (DB::table('docente')->where('correo', $postulacion->correo)->exists()) return;
        if (DB::table('docente')->where('ci', $postulacion->ci)->exists()) return;

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
        } catch (\Throwable $e) {
            Log::error('Error al aprobar docente: ' . $e->getMessage(), [
                'ci'     => $postulacion->ci,
                'correo' => $postulacion->correo,
                'trace'  => $e->getTraceAsString(),
            ]);
        }
    }
}
