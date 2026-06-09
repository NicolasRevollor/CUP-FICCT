# CU04 — Gestionar Inscripción

## Descripción
Formaliza la inscripción de un postulante al proceso de admisión, registrando sus opciones de carrera y asociándolo a la gestión académica correspondiente.

## Actores
- **Actor iniciador:** Administrador, Coordinador/Secretario Académico

## Operaciones disponibles
| Operación | Ruta API | Método |
|---|---|---|
| Listar inscripciones | `/api/inscripciones` | GET |
| Ver por postulante | `/api/inscripciones/postulante/{id}` | GET |
| Registrar | `/api/inscripciones` | POST |
| Actualizar estado | `/api/inscripciones/{id}` | PUT |

## Flujo Principal
1. El administrador accede al módulo "Inscripciones"
2. Hace clic en "Nueva Inscripción"
3. Busca al postulante por CI exacto
4. Selecciona la carrera de primera opción
5. Selecciona la carrera de segunda opción (opcional)
6. Ingresa la gestión académica (ej: 2026)
7. El sistema verifica que el postulante exista y no tenga inscripción duplicada para esa gestión
8. El sistema registra la inscripción con estado ACTIVO y fecha actual
9. El sistema muestra confirmación

## Acciones sobre estado
| Estado actual | Acción disponible | Estado resultante |
|---|---|---|
| ACTIVO | Completar | COMPLETADO |
| ACTIVO | Anular | ANULADO |

## Precondición
- El postulante debe estar registrado en el sistema
- El usuario debe tener sesión activa con permisos de administrador
- Las carreras deben estar disponibles en el sistema

## Postcondición
- La inscripción queda registrada con `estado_inscripcion = ACTIVO`
- El postulante queda asociado a la gestión académica y sus opciones de carrera

## Implementación

**Backend:** `app/Http/Controllers/InscripcionController.php`

```php
// Prevención de duplicados
$existe = DB::table('inscripcion')
    ->where('idpostulante', $request->idpostulante)
    ->where('gestion', $request->gestion)
    ->exists();

if ($existe) {
    return response()->json([
        'message' => 'El postulante ya tiene una inscripción activa para esta gestión'
    ], 400);
}
```

**Frontend:** `src/pages/Inscripciones.jsx`

## Datos almacenados
| Campo | Tipo | Descripción |
|---|---|---|
| idpostulante | integer | FK a tabla postulante |
| primera_opcion | string | Carrera de primera preferencia |
| segunda_opcion | string | Carrera de segunda preferencia (nullable) |
| fecha_inscripcion | timestamp | Fecha y hora del registro |
| estado_inscripcion | string | ACTIVO / COMPLETADO / ANULADO |
| gestion | string | Período académico (ej: 2026) |

## Excepciones manejadas
| Excepción | Respuesta |
|---|---|
| Postulante no encontrado | HTTP 404 — "Postulante no encontrado" |
| Inscripción duplicada | HTTP 400 — "El postulante ya tiene una inscripción activa para esta gestión" |
| Campos obligatorios vacíos | Validación de formulario frontend |
| Inscripción no encontrada | HTTP 404 — "Inscripción no encontrada" |
