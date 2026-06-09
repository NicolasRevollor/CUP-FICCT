# CU08 — Gestionar Docentes

## Descripción
Permite al Administrador registrar, consultar, modificar y eliminar la información del personal docente del CUP, verificando los requisitos académicos obligatorios.

## Actores
- **Actor iniciador:** Administrador

## Requisitos del docente (según reglamento)
- Ser profesional en el área correspondiente
- Contar con Maestría
- Contar con Diplomado en Educación Superior

## Operaciones disponibles
| Operación | Ruta API | Método |
|---|---|---|
| Listar docentes | `/api/docentes` | GET |
| Ver uno | `/api/docentes/{id}` | GET |
| Registrar | `/api/docentes` | POST |
| Actualizar | `/api/docentes/{id}` | PUT |
| Eliminar | `/api/docentes/{id}` | DELETE |

## Flujo Principal
1. El administrador accede al módulo "Docentes"
2. Hace clic en "Nuevo Docente"
3. Completa el formulario con datos personales y académicos
4. Marca si el docente tiene Maestría y/o Diplomado en Educación Superior
5. El sistema valida unicidad de CI y correo
6. El sistema registra al docente con estado ACTIVO

## Implementación
**Backend:** `app/Http/Controllers/DocenteController.php`
**Frontend:** `src/pages/Docentes.jsx`

## Datos almacenados
| Campo | Tipo | Descripción |
|---|---|---|
| ci | string | Cédula de identidad (único) |
| nombres | string | Nombres del docente |
| apellidos | string | Apellidos del docente |
| profesion | string | Profesión/área de especialidad |
| maestria | boolean | Tiene maestría |
| diplomado_ed_sup | boolean | Tiene diplomado en educación superior |
| telefono | string | Teléfono (nullable) |
| correo | string | Correo electrónico (único) |
| estado | string | ACTIVO / INACTIVO |
