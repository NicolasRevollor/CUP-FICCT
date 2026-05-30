<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PostulanteController;
use App\Http\Controllers\GrupoController;
use App\Http\Controllers\ExamenController;
use App\Http\Controllers\MateriaController;
use App\Http\Controllers\ReporteController;

// Rutas de autenticación
Route::post('/login',  [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout']);

// Rutas de postulantes
Route::get('/postulantes',              [PostulanteController::class, 'index']);
Route::get('/postulantes/buscar',       [PostulanteController::class, 'buscar']);
Route::get('/postulantes/{id}',         [PostulanteController::class, 'show']);
Route::post('/postulantes',             [PostulanteController::class, 'store']);
Route::put('/postulantes/{id}',         [PostulanteController::class, 'update']);
Route::delete('/postulantes/{id}',      [PostulanteController::class, 'destroy']);

// Rutas de grupos
Route::get('/grupos',                   [GrupoController::class, 'index']);
Route::get('/grupos/{id}/postulantes',  [GrupoController::class, 'postulantes']);
Route::post('/grupos/asignar',          [GrupoController::class, 'asignar']);
Route::put('/grupos/{id}/retirar',      [GrupoController::class, 'retirar']);

// Rutas de examenes
Route::get('/examenes/{idPostulante}',      [ExamenController::class, 'index']);
Route::post('/examenes',                    [ExamenController::class, 'store']);
Route::put('/examenes/{id}',                [ExamenController::class, 'update']);
Route::get('/examenes/materia/{idMateria}', [ExamenController::class, 'reporteMateria']);

// Rutas de materias
Route::get('/materias', [MateriaController::class, 'index']);

// Rutas de reportes
Route::get('/reportes/dashboard',           [ReporteController::class, 'dashboard']);
Route::get('/reportes/postulantes',         [ReporteController::class, 'postulantes']);
Route::get('/reportes/aprobados',           [ReporteController::class, 'aprobados']);
Route::get('/reportes/reprobados',          [ReporteController::class, 'reprobados']);
Route::get('/reportes/estadisticas-materia',[ReporteController::class, 'estadisticasMateria']);
Route::get('/reportes/grupos-aprobados',    [ReporteController::class, 'gruposAprobados']);
Route::post('/reportes/admision',        [ReporteController::class, 'admision']);
Route::get('/reportes/admision',         [ReporteController::class, 'reporteAdmision']);