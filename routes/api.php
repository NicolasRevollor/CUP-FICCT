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
use App\Http\Controllers\PostulacionDocenteController;
use App\Http\Controllers\EstudianteController;
use App\Http\Controllers\BitacoraController;

// ── Rutas públicas ───────────────────────────────────────────
Route::post('/login',                    [AuthController::class,    'login']);
Route::post('/recuperar-password',       [AuthController::class,    'recuperarPassword']);
Route::post('/registro/intent',          [RegistroController::class,'crearIntent']);
Route::post('/registro',                 [RegistroController::class,'registrar']);
Route::post('/postulacion-docente',      [PostulacionDocenteController::class,'store']);

// ── Rutas protegidas ─────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout',           [AuthController::class, 'logout']);
    Route::post('/cambiar-password', [AuthController::class, 'cambiarPassword']);

    // Postulantes
    Route::get('/postulantes',         [PostulanteController::class, 'index']);
    Route::get('/postulantes/buscar',  [PostulanteController::class, 'buscar']);
    Route::get('/postulantes/{id}',    [PostulanteController::class, 'show']);
    Route::post('/postulantes',        [PostulanteController::class, 'store']);
    Route::put('/postulantes/{id}',    [PostulanteController::class, 'update']);
    Route::delete('/postulantes/{id}', [PostulanteController::class, 'destroy']);

    // Grupos
    Route::get('/grupos',                  [GrupoController::class, 'index']);
    Route::get('/grupos/{id}/postulantes',                    [GrupoController::class, 'postulantes']);
    Route::get('/grupos/{idGrupo}/examenes/{idMateria}',      [GrupoController::class, 'examenesGrupo']);
    Route::post('/grupos/asignar',                            [GrupoController::class, 'asignar']);
    Route::put('/grupos/{id}/retirar',                        [GrupoController::class, 'retirar']);

    // Exámenes (ruta específica primero para evitar que {idPostulante} capture "materia")
    Route::get('/examenes/materia/{idMateria}', [ExamenController::class, 'reporteMateria']);
    Route::get('/examenes/{idPostulante}',      [ExamenController::class, 'index']);
    Route::post('/examenes',                    [ExamenController::class, 'store']);
    Route::put('/examenes/{id}',                [ExamenController::class, 'update']);

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

    // Estudiante
    Route::get('/estudiante/perfil',      [EstudianteController::class, 'perfil']);
    Route::get('/estudiante/grupo',       [EstudianteController::class, 'miGrupo']);
    Route::get('/estudiante/examenes',    [EstudianteController::class, 'misExamenes']);
    Route::get('/estudiante/asistencia',  [EstudianteController::class, 'miAsistencia']);
    Route::post('/estudiante/foto',       [EstudianteController::class, 'subirFoto']);

    // Postulaciones docente (admin)
    Route::get('/postulacion-docente',                              [PostulacionDocenteController::class, 'index']);
    Route::get('/postulacion-docente/{id}',                        [PostulacionDocenteController::class, 'show']);
    Route::put('/postulacion-docente/{id}',                        [PostulacionDocenteController::class, 'update']);
    Route::get('/postulacion-docente/{idPostulacion}/documentos/{idDocumento}', [PostulacionDocenteController::class, 'descargarDocumento']);

    // Bitácora (solo ADMINISTRADOR)
    Route::get('/bitacora', [BitacoraController::class, 'index']);

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
