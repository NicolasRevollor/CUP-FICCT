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
use App\Http\Controllers\UsuarioController;
use App\Http\Controllers\AsistenciaController;
use App\Http\Controllers\AulaController;
use App\Http\Controllers\CargaMasivaController;
use App\Http\Controllers\GestionController;

// ── Rutas públicas ───────────────────────────────────────────
Route::post('/login',                    [AuthController::class,    'login']);
Route::post('/recuperar-password',       [AuthController::class,    'recuperarPassword']);
Route::post('/registro/intent',                              [RegistroController::class, 'crearIntent']);
Route::post('/registro/pre',                                 [RegistroController::class, 'preRegistro']);
Route::post('/registro/{idPostulante}/documentos',           [RegistroController::class, 'subirDocumentos']);
Route::get('/registro/{idPostulante}/documentos',            [RegistroController::class, 'listarDocumentos']);
Route::post('/registro/confirmar',                           [RegistroController::class, 'confirmarPago']);
Route::post('/registro',                                     [RegistroController::class, 'registrar']);
Route::post('/postulacion-docente',      [PostulacionDocenteController::class,'store']);
Route::get('/carreras',                  fn() => response()->json(
    \Illuminate\Support\Facades\DB::table('carrera')
        ->where('estado', 'ACTIVO')
        ->orderBy('nombre')
        ->get(['idcarrera', 'nombre', 'cupomaximo'])
));

// ── Rutas protegidas ─────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout',           [AuthController::class, 'logout']);
    Route::post('/cambiar-password', [AuthController::class, 'cambiarPassword']);

    // Postulantes
    Route::get('/postulantes',         [PostulanteController::class, 'index']);
    Route::get('/postulantes/buscar',  [PostulanteController::class, 'buscar']);
    Route::get('/postulantes/{id}',    [PostulanteController::class, 'show']);
    Route::post('/postulantes',                      [PostulanteController::class, 'store']);
    Route::put('/postulantes/{id}',                  [PostulanteController::class, 'update']);
    Route::post('/postulantes/{id}/vincular-usuario',[PostulanteController::class, 'vincularUsuario']);
    Route::delete('/postulantes/{id}',               [PostulanteController::class, 'destroy']);

    // Grupos
    Route::get('/grupos',                  [GrupoController::class, 'index']);
    Route::post('/grupos',                 [GrupoController::class, 'store']);
    Route::post('/grupos/distribuir',                         [GrupoController::class, 'distribuirInscritos']);
    Route::post('/grupos/asignar',                            [GrupoController::class, 'asignar']);
    Route::get('/grupos/{id}/postulantes',                    [GrupoController::class, 'postulantes']);
    Route::get('/grupos/{idGrupo}/examenes/{idMateria}',      [GrupoController::class, 'examenesGrupo']);
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

    // Bitácora — CU acceso al sistema (solo ADMINISTRADOR)
    Route::get('/bitacora', [BitacoraController::class, 'index']);

    // Usuarios — CU-14
    Route::get('/usuarios',          [UsuarioController::class, 'index']);
    Route::get('/usuarios/roles',    [UsuarioController::class, 'roles']);
    Route::get('/usuarios/{id}',     [UsuarioController::class, 'show']);
    Route::post('/usuarios',         [UsuarioController::class, 'store']);
    Route::put('/usuarios/{id}',     [UsuarioController::class, 'update']);
    Route::delete('/usuarios/{id}',  [UsuarioController::class, 'destroy']);

    // Asistencia — CU-13
    Route::get('/asistencia/grupo/{idGrupo}',        [AsistenciaController::class, 'porGrupo']);
    Route::get('/asistencia/postulante/{idPostulante}', [AsistenciaController::class, 'porPostulante']);
    Route::post('/asistencia',                        [AsistenciaController::class, 'store']);
    Route::put('/asistencia/{id}',                    [AsistenciaController::class, 'update']);

    // Aulas y horarios — CU-12
    Route::get('/aulas',               [AulaController::class, 'index']);
    Route::post('/aulas',              [AulaController::class, 'store']);
    Route::put('/aulas/{id}',          [AulaController::class, 'update']);
    Route::delete('/aulas/{id}',       [AulaController::class, 'destroy']);
    Route::get('/horarios',            [AulaController::class, 'horarios']);
    Route::post('/horarios',           [AulaController::class, 'storeHorario']);
    Route::put('/horarios/{id}',       [AulaController::class, 'updateHorario']);

    // Docentes — asignación a grupos (CU-11)
    Route::get('/docentes/{id}/grupos',                         [DocenteController::class, 'grupos']);
    Route::post('/docentes/{id}/asignar-grupo',                 [DocenteController::class, 'asignarGrupo']);
    Route::delete('/docentes/{id}/asignaciones/{idAsignacion}', [DocenteController::class, 'desasignarGrupo']);

    // Gestiones académicas
    Route::get('/gestiones',       [GestionController::class, 'index']);
    Route::post('/gestiones',      [GestionController::class, 'store']);
    Route::put('/gestiones/{id}',  [GestionController::class, 'update']);
    Route::delete('/gestiones/{id}', [GestionController::class, 'destroy']);

    // Carga masiva — CU-15
    Route::post('/carga-masiva/postulantes', [CargaMasivaController::class, 'importarPostulantes']);

    // Reportes
    Route::get('/reportes/dashboard',            [ReporteController::class, 'dashboard']);
    Route::get('/reportes/postulantes',          [ReporteController::class, 'postulantes']);
    Route::get('/reportes/aprobados',            [ReporteController::class, 'aprobados']);
    Route::get('/reportes/reprobados',           [ReporteController::class, 'reprobados']);
    Route::get('/reportes/estadisticas-materia', [ReporteController::class, 'estadisticasMateria']);
    Route::get('/reportes/grupos-aprobados',     [ReporteController::class, 'gruposAprobados']);
    Route::get('/reportes/docentes-por-grupo',  [ReporteController::class, 'docentesPorGrupo']);
    Route::post('/reportes/admision',            [ReporteController::class, 'admision']);
    Route::get('/reportes/admision',             [ReporteController::class, 'reporteAdmision']);
});
