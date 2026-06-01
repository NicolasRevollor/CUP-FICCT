<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PostulanteController;
use App\Http\Controllers\GrupoController;
use App\Http\Controllers\ExamenController;
use App\Http\Controllers\MateriaController;
use App\Http\Controllers\ReporteController;
use App\Http\Controllers\DocenteController;
use App\Http\Controllers\PagoController;
use App\Http\Controllers\InscripcionController;
use App\Http\Controllers\RegistroController;

// ── Rutas públicas ───────────────────────────────────────────
Route::post('/login',                    [AuthController::class,    'login']);
Route::post('/registro/intent',          [RegistroController::class,'crearIntent']);
Route::post('/registro',                 [RegistroController::class,'registrar']);

// ── Rutas protegidas ─────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [AuthController::class, 'logout']);

    // Postulantes
    Route::get('/postulantes',         [PostulanteController::class, 'index']);
    Route::get('/postulantes/buscar',  [PostulanteController::class, 'buscar']);
    Route::get('/postulantes/{id}',    [PostulanteController::class, 'show']);
    Route::post('/postulantes',        [PostulanteController::class, 'store']);
    Route::put('/postulantes/{id}',    [PostulanteController::class, 'update']);
    Route::delete('/postulantes/{id}', [PostulanteController::class, 'destroy']);

    // Grupos
    Route::get('/grupos',                  [GrupoController::class, 'index']);
    Route::get('/grupos/{id}/postulantes', [GrupoController::class, 'postulantes']);
    Route::post('/grupos/asignar',         [GrupoController::class, 'asignar']);
    Route::put('/grupos/{id}/retirar',     [GrupoController::class, 'retirar']);

    // Exámenes
    Route::get('/examenes/{idPostulante}',      [ExamenController::class, 'index']);
    Route::post('/examenes',                    [ExamenController::class, 'store']);
    Route::put('/examenes/{id}',                [ExamenController::class, 'update']);
    Route::get('/examenes/materia/{idMateria}', [ExamenController::class, 'reporteMateria']);

    // Materias
    Route::get('/materias', [MateriaController::class, 'index']);

    // Docentes (CU08)
    Route::get('/docentes',                       [DocenteController::class, 'index']);
    Route::get('/docentes/usuarios-disponibles',  [DocenteController::class, 'usuariosDisponibles']);
    Route::get('/docentes/mi-perfil',             [DocenteController::class, 'miPerfil']);
    Route::get('/docentes/mis-grupos',            [DocenteController::class, 'misGrupos']);
    Route::get('/docentes/{id}',                  [DocenteController::class, 'show']);
    Route::post('/docentes',                      [DocenteController::class, 'store']);
    Route::put('/docentes/{id}',                  [DocenteController::class, 'update']);
    Route::delete('/docentes/{id}',               [DocenteController::class, 'destroy']);

    // Pagos (CU05)
    Route::get('/pagos',                 [PagoController::class, 'index']);
    Route::get('/pagos/postulante/{id}', [PagoController::class, 'porPostulante']);
    Route::post('/pagos',                [PagoController::class, 'store']);
    Route::put('/pagos/{id}',            [PagoController::class, 'update']);

    // Inscripciones (CU04)
    Route::get('/inscripciones',                 [InscripcionController::class, 'index']);
    Route::get('/inscripciones/gestiones',       [InscripcionController::class, 'gestiones']);
    Route::get('/inscripciones/postulante/{id}', [InscripcionController::class, 'porPostulante']);
    Route::post('/inscripciones',                [InscripcionController::class, 'store']);
    Route::put('/inscripciones/{id}',            [InscripcionController::class, 'update']);

    // Reportes
    Route::get('/reportes/dashboard',            [ReporteController::class, 'dashboard']);
    Route::get('/reportes/postulantes',          [ReporteController::class, 'postulantes']);
    Route::get('/reportes/aprobados',            [ReporteController::class, 'aprobados']);
    Route::get('/reportes/reprobados',           [ReporteController::class, 'reprobados']);
    Route::get('/reportes/estadisticas-materia', [ReporteController::class, 'estadisticasMateria']);
    Route::get('/reportes/grupos-aprobados',     [ReporteController::class, 'gruposAprobados']);
    Route::post('/reportes/admision',            [ReporteController::class, 'admision']);
    Route::get('/reportes/admision',             [ReporteController::class, 'reporteAdmision']);
});
