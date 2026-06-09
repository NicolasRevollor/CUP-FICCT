# CU06 — Gestionar Exámenes

## Descripción
Permite al Docente registrar y actualizar las calificaciones de los postulantes en las cuatro materias evaluadas: Computación, Matemáticas, Inglés y Física.

## Actores
- **Actor iniciador:** Docente (también accesible por Administrador)

## Operaciones disponibles
| Operación | Ruta API | Método |
|---|---|---|
| Ver exámenes de postulante | `/api/examenes/{idPostulante}` | GET |
| Registrar notas | `/api/examenes` | POST |
| Actualizar notas | `/api/examenes/{id}` | PUT |
| Reporte por materia | `/api/examenes/materia/{idMateria}` | GET |

## Flujo Principal — Registrar notas
1. El docente accede al módulo "Exámenes"
2. Busca al postulante por CI exacto
3. El sistema muestra los datos del postulante y sus exámenes registrados
4. El docente hace clic en "Registrar Notas"
5. Selecciona la materia a registrar
6. Ingresa Examen 1 (30%), Examen 2 (30%), Examen 3 (40%)
7. El sistema muestra la nota ponderada en tiempo real
8. El docente confirma y guarda
9. El sistema calcula y almacena el promedio y estado del examen
10. El sistema recalcula automáticamente el promedio_final del postulante

## Fórmula de cálculo
```
promedio = (nota1 × 0.30) + (nota2 × 0.30) + (nota3 × 0.40)
estado = promedio >= 60 ? "APROBADO" : "REPROBADO"
```

## Precondición
- El docente debe tener sesión activa
- El postulante debe estar registrado
- Las materias deben estar definidas en el sistema (tabla `materia`)
- No puede existir ya un examen registrado para esa materia y postulante

## Postcondición
- Las notas quedan almacenadas con promedio y estado calculados
- El `promedio_final` y `estadopostulante` del postulante se actualizan automáticamente

## Implementación

**Backend:** `app/Http/Controllers/ExamenController.php`

```php
// Cálculo automático en store() y update()
$promedio = round(
    ($request->nota1 * 0.30) + ($request->nota2 * 0.30) + ($request->nota3 * 0.40),
    2
);
$estado = $promedio >= 60 ? 'APROBADO' : 'REPROBADO';

// Recalcular promedio del postulante
private function recalcularPromedioPostulante($idPostulante)
{
    $examenes = DB::table('examen')->where('idpostulante', $idPostulante)->get();
    $promedioFinal = round($examenes->avg('promedio'), 2);
    $totalMaterias = DB::table('materia')->count();
    $estadoPostulante = ($examenes->count() >= $totalMaterias && $promedioFinal >= 60)
        ? 'APROBADO' : ($examenes->count() >= $totalMaterias ? 'REPROBADO' : 'PENDIENTE');
    // ... actualiza tabla postulante
}
```

**Frontend:** `src/pages/Examenes.jsx`

## Datos almacenados
| Campo | Tipo | Descripción |
|---|---|---|
| idpostulante | integer | FK al postulante |
| idmateria | integer | FK a la materia evaluada |
| nota1 | decimal | Examen 1 (peso 30%) |
| nota2 | decimal | Examen 2 (peso 30%) |
| nota3 | decimal | Examen 3 (peso 40%) |
| promedio | decimal | Calculado automáticamente |
| estado | string | APROBADO / REPROBADO |

## Excepciones manejadas
| Excepción | Respuesta |
|---|---|
| Nota fuera de rango [0-100] | HTTP 422 — validación |
| Examen duplicado para esa materia | HTTP 400 — "Ya existe un examen registrado para esta materia" |
| Postulante no encontrado | HTTP 404 |
| Nota config no encontrada | HTTP 500 — "No hay configuración de notas en el sistema" |
