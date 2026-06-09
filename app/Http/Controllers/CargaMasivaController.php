<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * CU-15 — Carga masiva de postulantes
 * Acepta un archivo CSV con datos de postulantes y los inserta en lote.
 * Columnas esperadas (en orden): ci, nombres, apellidos, sexo, correo,
 * telefono, ciudad, colegio_procedencia.
 * Registros con CI o correo duplicados se omiten y se reportan.
 * El separador debe ser coma (,) y la primera fila es encabezado.
 */
class CargaMasivaController extends Controller
{
    public function importarPostulantes(Request $request)
    {
        $request->validate([
            'archivo' => 'required|file|mimes:csv,txt|max:5120',
        ]);

        $archivo  = $request->file('archivo');
        $handle   = fopen($archivo->getRealPath(), 'r');
        $cabecera = true;

        $insertados = 0;
        $omitidos   = [];
        $errores    = [];

        DB::transaction(function () use ($handle, &$cabecera, &$insertados, &$omitidos, &$errores) {
            $fila = 0;
            while (($linea = fgetcsv($handle, 1000, ',')) !== false) {
                $fila++;

                // Saltar encabezado
                if ($cabecera) { $cabecera = false; continue; }

                // Validar columnas mínimas
                if (count($linea) < 5) {
                    $errores[] = "Fila {$fila}: columnas insuficientes (" . count($linea) . ")";
                    continue;
                }

                [$ci, $nombres, $apellidos, $sexo, $correo] = $linea;
                $telefono          = $linea[5] ?? null;
                $ciudad            = $linea[6] ?? null;
                $colegioProcedencia = $linea[7] ?? null;

                $ci      = trim($ci);
                $correo  = trim($correo);
                $nombres = trim($nombres);
                $apellidos = trim($apellidos);
                $sexo    = strtoupper(trim($sexo));

                // Validar campos obligatorios
                if (!$ci || !$nombres || !$apellidos || !$correo) {
                    $errores[] = "Fila {$fila}: ci, nombres, apellidos y correo son obligatorios";
                    continue;
                }

                if (!in_array($sexo, ['M', 'F'])) {
                    $errores[] = "Fila {$fila} (CI {$ci}): sexo debe ser M o F";
                    continue;
                }

                // Verificar duplicados
                if (DB::table('postulante')->where('ci', $ci)->exists()) {
                    $omitidos[] = "CI {$ci}: ya existe en el sistema";
                    continue;
                }

                if (DB::table('postulante')->where('correo', $correo)->exists()) {
                    $omitidos[] = "Correo {$correo}: ya existe en el sistema";
                    continue;
                }

                DB::table('postulante')->insert([
                    'ci'                 => $ci,
                    'nombres'            => $nombres,
                    'apellidos'          => $apellidos,
                    'sexo'               => $sexo,
                    'correo'             => $correo,
                    'telefono'           => $telefono ? trim($telefono) : null,
                    'ciudad'             => $ciudad ? trim($ciudad) : null,
                    'colegioprocedencia' => $colegioProcedencia ? trim($colegioProcedencia) : null,
                    'estadopostulante'   => 'PENDIENTE',
                    'promedio_final'     => 0,
                ]);

                $insertados++;
            }
        });

        fclose($handle);

        return response()->json([
            'message'    => "Carga completada: {$insertados} postulante(s) insertado(s).",
            'insertados' => $insertados,
            'omitidos'   => $omitidos,
            'errores'    => $errores,
        ], 201);
    }
}
