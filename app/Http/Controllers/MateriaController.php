<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;

class MateriaController extends Controller
{
    public function index()
    {
        $materias = DB::table('materia')->orderBy('idmateria')->get();
        return response()->json($materias);
    }
}