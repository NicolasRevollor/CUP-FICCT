<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Stripe\StripeClient;

/**
 * ============================================================
 * RegistroController  —  CU-21: Inscripción pública de postulantes (portal web)
 * ============================================================
 *
 * ¿QUÉ HACE ESTE CONTROLADOR?
 *   Maneja el proceso completo de inscripción de un nuevo postulante
 *   al Curso de Ingreso Universitario (CUP-FICCT).
 *   Es público: NO requiere autenticación (el postulante no tiene cuenta aún).
 *
 * FLUJO NUEVO (4 pasos obligatorios):
 * ┌────────┬─────────────────────────────┬────────────────────────────────┐
 * │ Paso   │ Endpoint                    │ Qué hace                       │
 * ├────────┼─────────────────────────────┼────────────────────────────────┤
 * │   1    │ POST /registro/pre          │ Guarda datos personales        │
 * │        │                             │ Crea postulante en BORRADOR    │
 * │        │                             │ Devuelve idpostulante          │
 * ├────────┼─────────────────────────────┼────────────────────────────────┤
 * │   2a   │ POST /registro/{id}/docs    │ Sube los 4 documentos          │
 * │   2b   │ GET  /registro/{id}/docs    │ Consulta qué docs subió        │
 * ├────────┼─────────────────────────────┼────────────────────────────────┤
 * │   3    │ POST /registro/intent       │ Crea PaymentIntent en Stripe   │
 * │        │                             │ Devuelve clientSecret          │
 * ├────────┼─────────────────────────────┼────────────────────────────────┤
 * │   4    │ POST /registro/confirmar    │ Verifica que tenga los 4 docs  │
 * │        │                             │ Verifica pago con Stripe       │
 * │        │                             │ Cambia estado: BORRADOR→PEND   │
 * │        │                             │ Crea pago, inscripción         │
 * └────────┴─────────────────────────────┴────────────────────────────────┘
 *
 * FLUJO LEGACY (1 solo paso, se conserva para compatibilidad):
 *   POST /registro  → registrar()   (datos + pago en una sola llamada)
 *
 * ─── ESTADOS DEL POSTULANTE ─────────────────────────────────
 *   BORRADOR  → el postulante llenó el formulario pero aún no pagó
 *               (puede re-intentar si algo falla antes del pago)
 *   PENDIENTE → pagó correctamente, espera aprobación del admin
 *   INSCRITO  → admin aprobó la inscripción
 *   APROBADO  → pasó el curso de ingreso (notas >= 60 en las 4 materias)
 *   REPROBADO → no pasó (al menos 1 materia con nota < 60)
 *
 * ─── DOCUMENTOS REQUERIDOS ──────────────────────────────────
 *   Los 4 documentos se guardan en:
 *   storage/app/private/documentos-postulante/{idPostulante}/
 *   Tabla: doc_postulantes (iddoc, idpostulante, tipo, url, fechasubida)
 *
 * ─── STRIPE ─────────────────────────────────────────────────
 *   Se usa la API de Stripe para procesar el pago de inscripción.
 *   El flujo es:
 *     1. Backend crea un PaymentIntent → devuelve clientSecret
 *     2. Frontend usa Stripe.js para confirmar el pago con la tarjeta
 *     3. Backend recupera el PaymentIntent y verifica que status=succeeded
 *   La variable de entorno STRIPE_SECRET_KEY debe estar en .env
 */
class RegistroController extends Controller
{
    /**
     * Mapa de nombres de campo (formulario) → tipo en la BD.
     * Se usa en subirDocumentos() y confirmarPago() para
     * saber qué campos de archivo se esperan y cómo guardarlos.
     *
     * Clave   = nombre del campo en el formulario multipart
     * Valor   = valor que se guarda en doc_postulantes.tipo
     */
    const TIPOS_DOC = [
        'libreta_colegio'        => 'LIBRETA_COLEGIO',
        'certificado_nacimiento' => 'CERTIFICADO_NACIMIENTO',
        'titulo_bachiller'       => 'TITULO_BACHILLER',
        'foto_carnet'            => 'FOTO_CARNET',
    ];

    /**
     * Retorna una instancia de StripeClient usando la clave secreta del .env.
     * Se llama como método privado para no repetir la instanciación.
     */
    private function stripe(): StripeClient
    {
        return new StripeClient(env('STRIPE_SECRET_KEY'));
    }

    // ══════════════════════════════════════════════════════════════
    // PASO 1 — POST /registro/pre
    // ══════════════════════════════════════════════════════════════
    /**
     * Guarda los datos personales del postulante y devuelve su ID.
     * Crea el postulante con estado BORRADOR (registro incompleto).
     *
     * ¿POR QUÉ estado BORRADOR?
     *   Porque aún no pagó. Si el postulante cierra el navegador
     *   antes de pagar, el registro queda como BORRADOR y puede
     *   volver a intentarlo con el mismo CI (se actualiza, no duplica).
     *
     * ¿POR QUÉ las carreras no se guardan aquí?
     *   La tabla carreraadmitida tiene carrera.gestion como NOT NULL,
     *   y la gestión activa recién se vincula en el paso 4 (al pagar).
     *   Por eso el frontend debe guardar idcarrera1 e idcarrera2
     *   temporalmente y reenviarlos en confirmarPago().
     *
     * DIAGRAMA DE SECUENCIA:
     *   Frontend → POST /registro/pre  { ci, nombres, apellidos, sexo,
     *                                    correo, idcarrera1, idcarrera2, ... }
     *
     *   [1] Validar todos los campos requeridos
     *
     *   [2] Buscar si ya existe un postulante con ese CI
     *   ALT [existe y su estado NO es BORRADOR]
     *     → 422 "Ya existe un postulante registrado con ese CI"
     *     (no se puede inscribir dos veces)
     *   ALT [existe y su estado ES BORRADOR]
     *     → permitir continuar (es un reintento del mismo postulante)
     *
     *   [3] Verificar que el correo no esté en uso por otro postulante
     *       (se ignoran los BORRADOR para no bloquear reintentos)
     *   ALT [correo ya ocupado por postulante no-BORRADOR]
     *     → 422 "El correo ya está registrado"
     *
     *   [4] Preparar los datos a guardar
     *
     *   ALT [postulante existe como BORRADOR]
     *     → UPDATE (actualizar datos, podría haber corregido el correo)
     *   ALT [postulante no existe]
     *     → INSERT → obtener el nuevo idpostulante
     *
     *   [5] → 201 { message, idpostulante }
     */
    public function preRegistro(Request $request)
    {
        // [1] Validar campos del formulario de datos personales
        // 'exists:carrera,idcarrera' → verifica que la carrera exista en BD
        // 'different:idcarrera1'     → las dos opciones deben ser distintas
        $request->validate([
            'ci'                 => 'required|string',
            'nombres'            => 'required|string',
            'apellidos'          => 'required|string',
            'sexo'               => 'required|in:M,F',
            'correo'             => 'required|email',
            'telefono'           => 'nullable|string',
            'direccion'          => 'nullable|string',
            'colegioProcedencia' => 'nullable|string',
            'ciudad'             => 'nullable|string',
            'otrosRequisitos'    => 'nullable|string',
            // Las carreras se validan aquí pero NO se insertan todavía
            // (ver explicación de ¿POR QUÉ? en el docblock)
            'idcarrera1' => 'required|integer|exists:carrera,idcarrera',
            'idcarrera2' => 'required|integer|exists:carrera,idcarrera|different:idcarrera1',
        ]);

        // [2] Buscar si ya existe un postulante con ese CI en la BD
        $existente = DB::table('postulante')->where('ci', $request->ci)->first();

        // ALT: si existe y NO es BORRADOR → ya está registrado definitivamente
        if ($existente && $existente->estadopostulante !== 'BORRADOR') {
            return response()->json(['message' => 'Ya existe un postulante registrado con ese CI.'], 422);
        }

        // [3] Verificar que el correo no esté en uso por otro postulante activo
        // Se excluyen los BORRADOR para no bloquear reintentos del mismo postulante
        $correoOcupado = DB::table('postulante')
            ->where('correo', $request->correo)
            ->where('estadopostulante', '!=', 'BORRADOR') // ignorar borradores
            ->exists();
        if ($correoOcupado) {
            return response()->json(['message' => 'El correo ya está registrado.'], 422);
        }

        // [4] Armar el array con los datos a guardar/actualizar
        $datos = [
            'ci'                 => $request->ci,
            'nombres'            => $request->nombres,
            'apellidos'          => $request->apellidos,
            'sexo'               => $request->sexo,
            'correo'             => $request->correo,
            'telefono'           => $request->telefono,
            'direccion'          => $request->direccion,
            'colegioprocedencia' => $request->colegioProcedencia, // minúsculas en BD
            'ciudad'             => $request->ciudad,
            'titulobachiller'    => false,          // se pone true cuando suba el doc
            'otrosrequisitos'    => $request->otrosRequisitos,
            'estadopostulante'   => 'BORRADOR',     // registro incompleto hasta pagar
            'promedio_final'     => 0,              // no tiene notas todavía
        ];

        // ALT: si ya existe como BORRADOR → actualizar (reintento)
        if ($existente) {
            DB::table('postulante')
                ->where('idpostulante', $existente->idpostulante)
                ->update($datos);
            $idPostulante = $existente->idpostulante; // reusar el mismo ID
        } else {
            // ALT: no existe → crear nuevo postulante
            // insertGetId() inserta y devuelve el ID generado por la BD
            // El segundo parámetro 'idpostulante' indica el nombre de la PK
            $idPostulante = DB::table('postulante')->insertGetId($datos, 'idpostulante');
        }

        // [5] Devolver el ID para que el frontend lo use en los siguientes pasos
        return response()->json([
            'message'      => 'Datos guardados. Ahora sube tus documentos.',
            'idpostulante' => $idPostulante,
        ], 201);
    }

    // ══════════════════════════════════════════════════════════════
    // PASO 2a — POST /registro/{idPostulante}/documentos
    // ══════════════════════════════════════════════════════════════
    /**
     * Recibe y guarda los archivos de documentos del postulante.
     * Se puede llamar varias veces: cada llamada reemplaza el doc
     * del mismo tipo si ya existía (el postulante puede corregir).
     *
     * DOCUMENTOS REQUERIDOS (campos del formulario multipart):
     *   libreta_colegio        → última libreta del colegio
     *   certificado_nacimiento → certificado de nacimiento
     *   titulo_bachiller       → título de bachiller
     *   foto_carnet            → foto del carnet de identidad
     *
     * ALMACENAMIENTO:
     *   Los archivos se guardan en:
     *   storage/app/private/documentos-postulante/{idPostulante}/{uuid}.{ext}
     *   El nombre uuid evita conflictos de nombres y rutas predecibles.
     *   La 'url' guardada en BD es la ruta relativa dentro del disco local.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Frontend → POST /registro/42/documentos  (multipart/form-data)
     *
     *   [1] Verificar que el postulante exista y esté en BORRADOR
     *   ALT [no existe o ya completó inscripción]
     *     → 404
     *
     *   [2] Validar archivos: cualquier formato, máx 20 MB (20480 KB)
     *
     *   LOOP [por cada tipo de documento en TIPOS_DOC]
     *     OPT [si el campo NO viene en el request] → skip (pasar al siguiente)
     *
     *     [3] Generar nombre único con UUID para evitar colisiones
     *
     *     ALT [ya existe un doc del mismo tipo en BD]
     *       → borrar el archivo físico del storage
     *       → borrar el registro en doc_postulantes
     *     (así se reemplaza el anterior en vez de duplicar)
     *
     *     [4] Guardar el nuevo archivo en disco
     *     [5] Insertar registro en doc_postulantes
     *     [6] Agregar el tipo a la lista de 'subidos'
     *   FIN LOOP
     *
     *   ALT [ningún archivo vino en el request]
     *     → 422 "No se recibió ningún archivo"
     *
     *   [7] Consultar qué documentos tiene ahora en BD
     *   [8] Calcular cuáles todavía faltan (diferencia entre TIPOS_DOC y subidos)
     *   [9] → 200 { subidos, documentos, faltantes, completo: bool }
     */
    public function subirDocumentos(Request $request, int $idPostulante)
    {
        // [1] Verificar que el postulante exista y esté en estado BORRADOR
        // Si ya está PENDIENTE/INSCRITO/etc. significa que ya pagó → no se modifica
        $postulante = DB::table('postulante')
            ->where('idpostulante', $idPostulante)
            ->where('estadopostulante', 'BORRADOR') // solo se acepta si es BORRADOR
            ->first();

        if (!$postulante) {
            return response()->json(['message' => 'Postulante no encontrado o inscripción ya completada.'], 404);
        }

        // [2] Validar archivos: nullable porque no todos son obligatorios en cada llamada
        // (el postulante puede subir 1 a la vez o todos juntos)
        // max:20480 = 20 MB en kilobytes
        // array_fill_keys() genera el array de reglas dinámicamente desde TIPOS_DOC
        $request->validate(
            array_fill_keys(array_keys(self::TIPOS_DOC), 'nullable|file|max:20480')
        );

        $subidos = []; // lista de tipos que se subieron en esta llamada

        // LOOP: recorre cada tipo de documento esperado
        foreach (self::TIPOS_DOC as $campo => $tipoDb) {
            // OPT: si este campo no vino en el request → saltar al siguiente
            if (!$request->hasFile($campo)) continue;

            $file    = $request->file($campo);
            // [3] Nombre único: UUID + extensión original (ej: a1b2c3.pdf)
            // UUID evita adivinar la URL del archivo
            $nombre  = Str::uuid() . '.' . $file->getClientOriginalExtension();
            $carpeta = "documentos-postulante/{$idPostulante}"; // carpeta por postulante
            $ruta    = "{$carpeta}/{$nombre}";                  // ruta completa relativa

            // ALT: si ya existe un doc del mismo tipo → reemplazar
            $anterior = DB::table('doc_postulantes')
                ->where('idpostulante', $idPostulante)
                ->where('tipo', $tipoDb) // mismo tipo de documento
                ->first();
            if ($anterior) {
                Storage::delete($anterior->url); // borrar archivo físico del disco
                DB::table('doc_postulantes')->where('iddoc', $anterior->iddoc)->delete();
            }

            // [4] Guardar el archivo en el disco local (storage/app/private/...)
            $file->storeAs($carpeta, $nombre); // guarda en la carpeta indicada

            // [5] Registrar el documento en la BD
            DB::table('doc_postulantes')->insert([
                'idpostulante' => $idPostulante,
                'tipo'         => $tipoDb,  // ej: 'TITULO_BACHILLER'
                'url'          => $ruta,    // ruta relativa para recuperar el archivo
                'fechasubida'  => now(),
            ]);

            // [6] Agregar a la lista de éxitos
            $subidos[] = $tipoDb;
        }
        // FIN LOOP

        // ALT: si no se recibió ningún archivo en todo el request → error
        if (empty($subidos)) {
            return response()->json(['message' => 'No se recibió ningún archivo.'], 422);
        }

        // [7] Consultar el estado actual de documentos del postulante
        $documentos = DB::table('doc_postulantes')
            ->where('idpostulante', $idPostulante)
            ->get(['iddoc', 'tipo', 'fechasubida']); // no devolver la URL por seguridad

        // [8] Calcular los tipos que aún faltan
        // array_values(TIPOS_DOC) = ['LIBRETA_COLEGIO', 'CERTIFICADO_NACIMIENTO', ...]
        // $documentos->pluck('tipo') = tipos ya subidos
        // array_diff() = los que faltan
        $faltantes = array_values(array_diff(
            array_values(self::TIPOS_DOC),
            $documentos->pluck('tipo')->toArray()
        ));

        // [9] Responder con el resumen completo
        return response()->json([
            'message'    => 'Documentos subidos correctamente.',
            'subidos'    => $subidos,              // subidos en ESTA llamada
            'documentos' => $documentos,           // todos los docs que tiene hasta ahora
            'faltantes'  => $faltantes,            // los que aún le faltan
            'completo'   => empty($faltantes),     // true si los 4 están subidos
        ]);
    }

    // ══════════════════════════════════════════════════════════════
    // PASO 2b — GET /registro/{idPostulante}/documentos
    // ══════════════════════════════════════════════════════════════
    /**
     * Consulta qué documentos tiene subidos el postulante hasta ahora.
     * Útil para que el frontend muestre qué documentos ya tiene y cuáles faltan.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Frontend → GET /registro/42/documentos
     *
     *   [1] Verificar que el postulante exista en BORRADOR
     *   ALT [no existe o ya completó] → 404
     *
     *   [2] Obtener lista de docs de la BD
     *   [3] Calcular faltantes
     *   [4] → 200 { documentos, faltantes, completo }
     */
    public function listarDocumentos(int $idPostulante)
    {
        // [1] Verificar que sea un postulante en BORRADOR
        $postulante = DB::table('postulante')
            ->where('idpostulante', $idPostulante)
            ->where('estadopostulante', 'BORRADOR')
            ->first();

        if (!$postulante) {
            return response()->json(['message' => 'Postulante no encontrado.'], 404);
        }

        // [2] Obtener los documentos sin devolver la URL (dato sensible)
        $documentos = DB::table('doc_postulantes')
            ->where('idpostulante', $idPostulante)
            ->get(['iddoc', 'tipo', 'fechasubida']);

        // [3] Calcular los tipos que todavía faltan
        $faltantes = array_values(array_diff(
            array_values(self::TIPOS_DOC),
            $documentos->pluck('tipo')->toArray()
        ));

        // [4] Devolver el estado actual de documentos
        return response()->json([
            'documentos' => $documentos,
            'faltantes'  => $faltantes,
            'completo'   => empty($faltantes), // true = puede proceder al pago
        ]);
    }

    // ══════════════════════════════════════════════════════════════
    // PASO 3 — POST /registro/intent
    // ══════════════════════════════════════════════════════════════
    /**
     * Crea un PaymentIntent en Stripe y devuelve el clientSecret al frontend.
     *
     * ¿QUÉ ES UN PAYMENTINTENT?
     *   Es un objeto de Stripe que representa la intención de cobrar dinero.
     *   El backend lo crea con el monto, y Stripe devuelve un 'clientSecret'.
     *   El frontend usa ese clientSecret con Stripe.js para pedirle
     *   la tarjeta al usuario y confirmar el pago directamente con Stripe.
     *   Así la tarjeta NUNCA pasa por nuestro servidor (más seguro).
     *
     * DIAGRAMA DE SECUENCIA:
     *   Frontend → POST /registro/intent  { monto: 28.99 }
     *   Backend  → Stripe API: crear PaymentIntent
     *   Stripe   → devuelve { id, clientSecret, ... }
     *   Backend  → Frontend: { clientSecret }
     *
     *   El frontend usa clientSecret para confirmar el pago con la tarjeta.
     *   Luego llama a confirmarPago() con el paymentIntentId.
     *
     * NOTA SOBRE EL MONTO:
     *   Stripe maneja centavos, no dólares. $28.99 → se envía 2899.
     *   (int)($request->monto * 100) convierte dólares a centavos.
     */
    public function crearIntent(Request $request)
    {
        // Validar que el monto sea un número positivo
        $request->validate(['monto' => 'required|numeric|min:1']);

        // Crear el PaymentIntent en Stripe
        $intent = $this->stripe()->paymentIntents->create([
            'amount'   => (int) ($request->monto * 100), // convertir a centavos
            'currency' => 'usd',                          // moneda: dólares
            'automatic_payment_methods' => ['enabled' => true], // acepta tarjetas, etc.
        ]);

        // Devolver SOLO el clientSecret (el frontend lo necesita para confirmar el pago)
        // No devolver el PaymentIntent completo: contiene datos sensibles
        return response()->json(['clientSecret' => $intent->client_secret]);
    }

    // ══════════════════════════════════════════════════════════════
    // PASO 4 — POST /registro/confirmar
    // ══════════════════════════════════════════════════════════════
    /**
     * Finaliza la inscripción: verifica documentos + pago Stripe,
     * cambia el estado del postulante de BORRADOR a PENDIENTE,
     * y crea los registros de pago, inscripción y carreras admitidas.
     *
     * ¿POR QUÉ verificar los documentos ANTES del pago?
     *   Para no cobrarle al postulante si olvidó subir algún documento.
     *   Es mejor fallar aquí (antes de llamar a Stripe) que después.
     *
     * DIAGRAMA DE SECUENCIA:
     *   Frontend → POST /registro/confirmar
     *     { idpostulante, paymentIntentId, monto, idcarrera1, idcarrera2 }
     *
     *   [1] Validar campos requeridos
     *
     *   [2] Buscar el postulante y verificar que esté en BORRADOR
     *   ALT [no existe o ya completó] → 422
     *
     *   [3] Verificar que tenga los 4 documentos subidos
     *   ALT [faltan documentos]
     *     → 422 { message, faltantes: [...] }
     *     (NO se cobra, se informa qué falta)
     *
     *   [4] Verificar el pago con Stripe
     *   ALT [error al conectar con Stripe] → 400
     *   ALT [pago no completado (status != succeeded)] → 400
     *
     *   DB TRANSACTION (todo o nada):
     *     [5] UPDATE postulante: BORRADOR → PENDIENTE, titulobachiller = true
     *     [6] INSERT en pagos (monto, fecha, PaymentIntentId)
     *
     *     OPT [si existe una gestión ACTIVA con fechainicio <= hoy]
     *       [7] INSERT en inscripcion (vincula pago + postulante + gestión)
     *       [8] INSERT en carreraadmitida (dos filas: opcion 1 y opcion 2)
     *     (si no hay gestión activa, no se crea inscripción por ahora)
     *   FIN TRANSACTION
     *
     *   ALT [error en la transacción] → 500
     *
     *   [9] → 201 { message, postulante: { ci, nombres, apellidos, correo } }
     */
    public function confirmarPago(Request $request)
    {
        // [1] Validar todos los campos del request
        // 'exists:postulante,idpostulante' → verifica que el ID exista en BD
        // 'different:idcarrera1' → las dos carreras deben ser distintas
        $request->validate([
            'idpostulante'    => 'required|integer|exists:postulante,idpostulante',
            'paymentIntentId' => 'required|string',
            'monto'           => 'required|numeric|min:0',
            'idcarrera1'      => 'required|integer|exists:carrera,idcarrera',
            'idcarrera2'      => 'required|integer|exists:carrera,idcarrera|different:idcarrera1',
        ]);

        // [2] Buscar el postulante y confirmar que siga en BORRADOR
        // (podría haberse completado en otra sesión o pestaña)
        $postulante = DB::table('postulante')
            ->where('idpostulante', $request->idpostulante)
            ->where('estadopostulante', 'BORRADOR')
            ->first();

        if (!$postulante) {
            return response()->json(['message' => 'Postulante no encontrado o la inscripción ya fue completada.'], 422);
        }

        // [3] Verificar que tenga los 4 documentos requeridos en la BD
        $tiposSubidos = DB::table('doc_postulantes')
            ->where('idpostulante', $request->idpostulante)
            ->pluck('tipo')     // obtener solo la columna 'tipo' como array
            ->toArray();

        // Diferencia entre los requeridos y los subidos = los que faltan
        $faltantes = array_diff(array_values(self::TIPOS_DOC), $tiposSubidos);

        // ALT: si hay documentos faltantes → rechazar ANTES de cobrar
        if (!empty($faltantes)) {
            return response()->json([
                'message'   => 'Faltan documentos requeridos antes de pagar.',
                'faltantes' => array_values($faltantes), // reset de índices para JSON correcto
            ], 422);
        }

        // [4] Verificar el estado del pago con Stripe usando el PaymentIntentId
        // retrieve() consulta el PaymentIntent en la API de Stripe
        try {
            $intent = $this->stripe()->paymentIntents->retrieve($request->paymentIntentId);

            // ALT: el pago no fue completado (podría estar en 'requires_payment_method', etc.)
            if ($intent->status !== 'succeeded') {
                return response()->json(['message' => 'El pago no fue confirmado por Stripe. Intentá de nuevo.'], 400);
            }
        } catch (\Exception $e) {
            // ALT: error de red o credenciales → devolver el mensaje de Stripe
            return response()->json(['message' => 'Error al verificar el pago: ' . $e->getMessage()], 400);
        }

        // [TRANSACTION] Guardar todo de forma atómica (si algo falla, no queda a medias)
        try {
            DB::transaction(function () use ($request, $postulante) {
                $idPostulante = $postulante->idpostulante;

                // [5] Cambiar estado del postulante de BORRADOR a PENDIENTE
                // titulobachiller = true porque subió el doc del título
                DB::table('postulante')
                    ->where('idpostulante', $idPostulante)
                    ->update([
                        'estadopostulante' => 'PENDIENTE', // espera aprobación del admin
                        'titulobachiller'  => true,        // confirmado al subir el doc
                    ]);

                // [6] Registrar el pago en la tabla pagos
                // insertGetId() devuelve el ID del pago recién creado
                $idPago = DB::table('pagos')->insertGetId([
                    'idpostulante'     => $idPostulante,
                    'monto'            => $request->monto,
                    'fechapago'        => now(),
                    'metodopago'       => 'STRIPE',
                    'codgotransaccion' => $request->paymentIntentId, // ID de Stripe para rastreo
                    'estadopago'       => 'CONFIRMADO', // ya verificado con Stripe
                ], 'idpagos'); // nombre de la PK en PostgreSQL

                // Buscar la gestión académica activa que ya haya empezado
                // (estado=ACTIVO y fechainicio <= hoy)
                $gestion = DB::table('gestion')
                    ->where('estado', 'ACTIVO')
                    ->where('fechainicio', '<=', now()) // que ya haya comenzado
                    ->orderBy('fechainicio', 'desc')    // la más reciente si hay varias
                    ->first();

                // OPT: solo crear inscripción y carreras si hay gestión activa
                if ($gestion) {
                    // [7] Crear la inscripción que vincula postulante + pago + gestión
                    DB::table('inscripcion')->insert([
                        'idpostulante'      => $idPostulante,
                        'idpago'            => $idPago,
                        'fechainscripcion'  => now(),
                        'estadoinscripcion' => 'PENDIENTE', // admin debe aprobarla
                        'gestion'           => $gestion->idgestion,
                    ]);

                    // [8] Registrar las dos opciones de carrera del postulante
                    // Opción 1 = primera preferencia, Opción 2 = segunda preferencia
                    DB::table('carreraadmitida')->insert([
                        [
                            'idpostulante'  => $idPostulante,
                            'idcarrera'     => $request->idcarrera1,
                            'opcion'        => 1,              // primera preferencia
                            'estadoadmision'=> 'PENDIENTE',
                            'gestion'       => $gestion->idgestion,
                        ],
                        [
                            'idpostulante'  => $idPostulante,
                            'idcarrera'     => $request->idcarrera2,
                            'opcion'        => 2,              // segunda preferencia
                            'estadoadmision'=> 'PENDIENTE',
                            'gestion'       => $gestion->idgestion,
                        ],
                    ]);
                }
                // Si no hay gestión activa: el postulante queda PENDIENTE sin inscripción
                // El admin podrá asignarlo manualmente a una gestión luego
            });
        } catch (\Throwable $e) {
            // Cualquier error en la transacción → rollback automático + error 500
            return response()->json(['message' => $e->getMessage()], 500);
        }

        // [9] Respuesta exitosa con datos básicos del postulante para mostrar en pantalla
        return response()->json([
            'message'    => 'Pago recibido. Tu solicitud está pendiente de aprobación por el administrador.',
            'postulante' => [
                'ci'       => $postulante->ci,
                'nombres'  => $postulante->nombres,
                'apellidos'=> $postulante->apellidos,
                'correo'   => $postulante->correo,
            ],
        ], 201);
    }

    // ══════════════════════════════════════════════════════════════
    // LEGACY — POST /registro  (flujo anterior en un solo paso)
    // ══════════════════════════════════════════════════════════════
    /**
     * Flujo anterior: recibe datos + pago en una sola llamada.
     * Se conserva para no romper integraciones existentes.
     * El flujo nuevo y recomendado usa pre → documentos → confirmar.
     *
     * DIFERENCIA CON EL FLUJO NUEVO:
     *   - No pide documentos
     *   - Crea el postulante directamente en PENDIENTE (sin BORRADOR)
     *   - Todo en una sola llamada HTTP
     *
     * DIAGRAMA DE SECUENCIA:
     *   Frontend → POST /registro { todos los datos + paymentIntentId }
     *   [1] Validar datos (ci y correo deben ser únicos en postulante)
     *   [2] Verificar pago con Stripe
     *   DB TRANSACTION:
     *     [3] INSERT postulante (estado PENDIENTE directo)
     *     [4] INSERT pago
     *     OPT [gestión activa]
     *       [5] INSERT inscripcion
     *       [6] INSERT carreraadmitida (x2)
     *   [7] → 201 con datos del postulante
     */
    public function registrar(Request $request)
    {
        // [1] Validar datos + unicidad de CI y correo
        // unique:postulante,ci → el CI no puede repetirse en la tabla postulante
        $request->validate([
            'ci'                => 'required|unique:postulante,ci',
            'nombres'           => 'required',
            'apellidos'         => 'required',
            'sexo'              => 'required|in:M,F',
            'correo'            => 'required|email|unique:postulante,correo',
            'paymentIntentId'   => 'required|string',
            'monto'             => 'required|numeric|min:0',
            'metodoPago'        => 'nullable|string',
            'telefono'          => 'nullable|string',
            'direccion'         => 'nullable|string',
            'colegioProcedencia'=> 'nullable|string',
            'ciudad'            => 'nullable|string',
            'tituloBachiller'   => 'nullable|boolean',
            'otrosRequisitos'   => 'nullable|string',
            'idcarrera1'        => 'required|integer|exists:carrera,idcarrera',
            'idcarrera2'        => 'required|integer|exists:carrera,idcarrera|different:idcarrera1',
        ]);

        // [2] Verificar con Stripe que el pago haya sido exitoso
        try {
            $intent = $this->stripe()->paymentIntents->retrieve($request->paymentIntentId);
            if ($intent->status !== 'succeeded') {
                return response()->json(['message' => 'El pago no fue confirmado por Stripe. Intentá de nuevo.'], 400);
            }
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error al verificar el pago: ' . $e->getMessage()], 400);
        }

        // DB TRANSACTION: si algo falla, ningún dato queda guardado a medias
        try {
            DB::transaction(function () use ($request) {
                // [3] Crear el postulante directamente en estado PENDIENTE
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
                    'estadopostulante'   => 'PENDIENTE', // directo a pendiente, sin BORRADOR
                    'promedio_final'     => 0,
                ], 'idpostulante');

                // [4] Registrar el pago (ya confirmado por Stripe)
                $idPago = DB::table('pagos')->insertGetId([
                    'idpostulante'     => $idPostulante,
                    'monto'            => $request->monto,
                    'fechapago'        => now(),
                    'metodopago'       => 'STRIPE',
                    'codgotransaccion' => $request->paymentIntentId,
                    'estadopago'       => 'CONFIRMADO',
                ], 'idpagos');

                // Buscar gestión activa
                $gestion = DB::table('gestion')
                    ->where('estado', 'ACTIVO')
                    ->where('fechainicio', '<=', now())
                    ->orderBy('fechainicio', 'desc')
                    ->first();

                // OPT: crear inscripción y carreras si hay gestión activa
                if ($gestion) {
                    // [5] Crear la inscripción
                    DB::table('inscripcion')->insert([
                        'idpostulante'      => $idPostulante,
                        'idpago'            => $idPago,
                        'fechainscripcion'  => now(),
                        'estadoinscripcion' => 'PENDIENTE',
                        'gestion'           => $gestion->idgestion,
                    ]);
                    // [6] Registrar las dos opciones de carrera
                    DB::table('carreraadmitida')->insert([
                        ['idpostulante' => $idPostulante, 'idcarrera' => $request->idcarrera1, 'opcion' => 1, 'estadoadmision' => 'PENDIENTE', 'gestion' => $gestion->idgestion],
                        ['idpostulante' => $idPostulante, 'idcarrera' => $request->idcarrera2, 'opcion' => 2, 'estadoadmision' => 'PENDIENTE', 'gestion' => $gestion->idgestion],
                    ]);
                }
            });
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }

        // [7] Respuesta exitosa
        return response()->json([
            'message'    => 'Pago recibido. Tu solicitud está pendiente de aprobación por el administrador.',
            'postulante' => [
                'ci'       => $request->ci,
                'nombres'  => $request->nombres,
                'apellidos'=> $request->apellidos,
                'correo'   => $request->correo,
            ],
        ], 201);
    }
}
