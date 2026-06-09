# CU07 — Calcular Promedio y Estado (Aprobado/Reprobado)

## Descripción
El sistema calcula automáticamente el promedio final de cada postulante a partir de las notas de las cuatro materias, y determina su estado académico como APROBADO o REPROBADO.

## Actores
- **Actor iniciador:** Docente, Administrador (el cálculo es automático al registrar notas)

## Criterio de aprobación
```
promedio_final >= 60  →  APROBADO
promedio_final < 60   →  REPROBADO
postulante con < 4 materias registradas  →  PENDIENTE
```

## Flujo (automático al registrar/editar examen)
1. El docente registra o actualiza las notas de un examen (CU06)
2. El sistema calcula el promedio ponderado del examen:
   `promedio = (nota1 × 0.30) + (nota2 × 0.30) + (nota3 × 0.40)`
3. Determina el estado del examen (APROBADO/REPROBADO)
4. Recupera todos los exámenes del postulante
5. Calcula el promedio general entre todos los exámenes registrados
6. Si el postulante tiene todas las materias registradas, determina su estado final
7. Actualiza `promedio_final` y `estadopostulante` en la tabla `postulante`
8. El frontend muestra el estado actualizado en tiempo real

## Precondición
- El postulante debe tener al menos un examen registrado
- Las cuatro materias deben estar definidas en el sistema

## Postcondición
- `postulante.promedio_final` contiene el promedio actualizado
- `postulante.estadopostulante` refleja el estado académico actual

## Implementación

**Backend:** `app/Http/Controllers/ExamenController.php` → método privado `recalcularPromedioPostulante()`

```php
private function recalcularPromedioPostulante($idPostulante)
{
    $examenes = DB::table('examen')
        ->where('idpostulante', $idPostulante)
        ->get();

    if ($examenes->isEmpty()) return;

    $promedioFinal = round($examenes->avg('promedio'), 2);
    $totalMaterias = DB::table('materia')->count();

    $estadoPostulante = ($examenes->count() >= $totalMaterias && $promedioFinal >= 60)
        ? 'APROBADO'
        : ($examenes->count() >= $totalMaterias ? 'REPROBADO' : 'PENDIENTE');

    DB::table('postulante')
        ->where('idpostulante', $idPostulante)
        ->update([
            'promedio_final'   => $promedioFinal,
            'estadopostulante' => $estadoPostulante,
        ]);
}
```

**Frontend — Preview en tiempo real** `src/pages/Examenes.jsx`

```js
const getNotaPonderada = (n1, n2, n3) =>
  ((+n1 * 0.30) + (+n2 * 0.30) + (+n3 * 0.40)).toFixed(2)

// Se muestra mientras el docente escribe las notas
{showPrev && (
  <div className={`nota-preview ${+ponderada >= 60 ? 'nota-preview-ok' : 'nota-preview-bad'}`}>
    Nota ponderada: {ponderada} — {+ponderada >= 60 ? 'APROBADO' : 'REPROBADO'}
  </div>
)}
```

## Relación con otros casos de uso
- Depende de **CU06** (registro de exámenes) — se ejecuta automáticamente al final de cada registro
- Sus resultados alimentan **CU16** (Reportes) — estadísticas de aprobados/reprobados
