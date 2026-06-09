<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;

/**
 * CU-06 (apoyo) — Listado de materias
 * Devuelve las materias disponibles para el registro de notas.
 * Las materias se insertan directamente en BD; no existe CRUD desde la app.
 */
class MateriaController extends Controller
{
    public function index()
    {
        $materias = DB::table('materia')->orderBy('idmateria')->get();
        return response()->json($materias);
    }
}