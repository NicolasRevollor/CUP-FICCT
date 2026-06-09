# CU10 — Asignación de Grupos

## Descripción
Permite al Administrador asignar postulantes a grupos del curso preuniversitario, respetando el límite máximo de 70 estudiantes por grupo. El sistema controla la capacidad y mantiene el contador actualizado.

## Actores
- **Actor iniciador:** Administrador

## Operaciones disponibles
| Operación | Ruta API | Método |
|---|---|---|
| Listar grupos con ocupación | `/api/grupos` | GET |
| Ver postulantes de un grupo | `/api/grupos/{id}/postulantes` | GET |
| Asignar postulante a grupo | `/api/grupos/asignar` | POST |
| Retirar postulante de grupo | `/api/grupos/{id}/retirar` | PUT |

## Flujo Principal — Asignar postulante
1. El administrador accede al módulo "Grupos"
2. Selecciona un grupo haciendo clic en "Ver"
3. En la pantalla de detalle, ingresa el CI del postulante
4. El sistema busca al postulante por CI exacto
5. El sistema verifica que el postulante no esté ya asignado al grupo
6. El sistema verifica que el grupo no haya alcanzado su capacidad máxima
7. El sistema asigna al postulante dentro de una transacción atómica
8. El sistema incrementa `cantidadestudiante` del grupo
9. El sistema muestra confirmación

## Flujo Principal — Retirar postulante
1. El administrador hace clic en el botón de retirar en la fila del postulante
2. El sistema confirma la acción
3. El sistema marca la asignación como RETIRADO
4. El sistema decrementa `cantidadestudiante` del grupo

## Precondición
- El postulante debe estar registrado en el sistema
- El grupo debe existir y tener lugares disponibles

## Postcondición
- El postulante queda registrado en `grupopostulantes` con estado ACTIVO
- `grupos.cantidadestudiante` se incrementa en 1

## Seguridad contra condiciones de carrera (Race Condition)
El sistema usa transacciones con bloqueo de fila para evitar que dos solicitudes simultáneas superen la capacidad:

```php
DB::transaction(function () use ($request) {
    $grupo = DB::table('grupos')
        ->where('idgrupo', $request->idgrupo)
        ->lockForUpdate()  // bloqueo pesimista
        ->first();

    if ($grupo->cantidadestudiante >= $grupo->capacidadmaxima) {
        throw new \Exception('El grupo ya alcanzó su capacidad máxima');
    }

    DB::table('grupopostulantes')->insert([...]);
    DB::table('grupos')->where('idgrupo', $request->idgrupo)->increment('cantidadestudiante');
});
```

## Implementación

**Backend:** `app/Http/Controllers/GrupoController.php`
**Frontend:** `src/pages/Grupos.jsx`, `src/pages/DetalleGrupo.jsx`

## Visualización de ocupación
La pantalla de grupos muestra una barra de progreso para cada grupo:
- Verde: capacidad < 90% utilizada
- Roja: capacidad >= 90% utilizada (grupo casi lleno)

## Datos de grupopostulantes
| Campo | Tipo | Descripción |
|---|---|---|
| idpostulante | integer | FK al postulante |
| idgrupo | integer | FK al grupo |
| fechaasignacion | timestamp | Fecha de asignación |
| estado | string | ACTIVO / RETIRADO |

## Excepciones manejadas
| Excepción | Respuesta |
|---|---|
| Postulante no encontrado | HTTP 404 — "Postulante no encontrado" |
| Grupo no encontrado | HTTP 404 (lanzado dentro de transacción) |
| Postulante ya asignado | HTTP 400 — "El postulante ya está asignado a este grupo" |
| Grupo lleno | HTTP 400 — "El grupo ya alcanzó su capacidad máxima" |
| Asignación no encontrada al retirar | HTTP 404 |
