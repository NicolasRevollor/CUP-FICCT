# CU03 — Gestionar Postulantes

## Descripción
Permite al Administrador registrar, consultar, buscar, modificar y eliminar la información de los postulantes que participan en el proceso de admisión.

## Actores
- **Actor iniciador:** Administrador

## Operaciones disponibles
| Operación | Ruta API | Método |
|---|---|---|
| Listar todos | `/api/postulantes?page=N` | GET |
| Buscar por CI/nombre | `/api/postulantes/buscar?q=TEXTO` | GET |
| Ver uno | `/api/postulantes/{id}` | GET |
| Registrar | `/api/postulantes` | POST |
| Modificar | `/api/postulantes/{id}` | PUT |
| Eliminar | `/api/postulantes/{id}` | DELETE |

## Flujo Principal — Registrar
1. El administrador accede al módulo "Postulantes"
2. Hace clic en "Nuevo Postulante"
3. Completa el formulario: CI, Nombres, Apellidos, Sexo, Correo, Colegio, Ciudad, etc.
4. Marca "Tiene Título de Bachiller" (requisito obligatorio)
5. El sistema valida unicidad de CI y correo
6. El sistema registra el postulante con estado PENDIENTE y promedio_final = 0
7. El sistema muestra confirmación y redirige al listado

## Flujo Principal — Buscar
1. El administrador escribe CI, nombre o apellido en el buscador
2. El sistema filtra con ILIKE (búsqueda parcial, sin distinguir mayúsculas)
3. Los resultados se muestran paginados (20 por página)

## Precondición
- El usuario debe tener sesión activa con rol Administrador

## Postcondición
- El postulante queda registrado con `estadopostulante = PENDIENTE`
- Disponible para inscripción, asignación de grupos y exámenes

## Implementación

**Backend:** `app/Http/Controllers/PostulanteController.php`

```php
// Validaciones en store()
$request->validate([
    'ci'              => 'required|unique:postulante,ci',
    'nombres'         => 'required',
    'apellidos'       => 'required',
    'sexo'            => 'required|in:M,F',
    'correo'          => 'required|email|unique:postulante,correo',
    'tituloBachiller' => 'required|boolean|accepted',
]);
```

**Frontend:** `src/pages/Postulantes.jsx`, `src/pages/NuevoPostulante.jsx`, `src/pages/EditarPostulante.jsx`

## Datos almacenados
| Campo | Tipo | Descripción |
|---|---|---|
| ci | string | Cédula de identidad (único) |
| nombres | string | Nombres del postulante |
| apellidos | string | Apellidos del postulante |
| sexo | char(1) | M / F |
| correo | string | Correo electrónico (único) |
| colegioprocedencia | string | Colegio de origen |
| ciudad | string | Ciudad |
| titulobachiller | boolean | Requisito obligatorio |
| estadopostulante | string | PENDIENTE / APROBADO / REPROBADO |
| promedio_final | decimal | Calculado automáticamente |

## Excepciones manejadas
| Excepción | Respuesta |
|---|---|
| CI duplicado | HTTP 422 — "The ci has already been taken" |
| Correo duplicado | HTTP 422 — "The correo has already been taken" |
| Sin título de bachiller | Validación frontend y backend |
| Postulante no encontrado | HTTP 404 — "Postulante no encontrado" |
