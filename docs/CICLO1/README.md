# CICLO 1 — Casos de Uso Implementados

**Proyecto:** Sistema Web de Gestión y Optimización del Proceso de Admisión e Inscripción de Postulantes — FICCT  
**Materia:** Sistemas de Información 1  
**Docente:** Ing. Angélica Garzón Cuéllar  
**Integrantes:** Revollo Roman Adalid Nicolas (220002290) · Vallar Valdez Sergio Oscar (221186077)

---

## Casos de Uso del Ciclo 1

| ID | Caso de Uso | Actor | Prioridad | Estado |
|---|---|---|---|---|
| CU01 | [Iniciar Sesión](./CU01-Iniciar-Sesion.md) | Administrador, Docente | Alta | Implementado |
| CU02 | [Cerrar Sesión](./CU02-Cerrar-Sesion.md) | Administrador, Docente | Alta | Implementado |
| CU03 | [Gestionar Postulantes](./CU03-Gestionar-Postulantes.md) | Administrador | Alta | Implementado |
| CU04 | [Gestionar Inscripción](./CU04-Gestionar-Inscripcion.md) | Administrador | Alta | Implementado |
| CU06 | [Gestionar Exámenes](./CU06-Gestionar-Examenes.md) | Docente | Alta | Implementado |
| CU07 | [Calcular Promedio y Estado](./CU07-Calcular-Promedio-Estado.md) | Docente, Administrador | Alta | Implementado |
| CU10 | [Asignación de Grupos](./CU10-Asignacion-Grupos.md) | Administrador | Alta | Implementado |

---

## Arquitectura Técnica

- **Backend:** Laravel 12 (PHP 8.2) — API REST
- **Frontend:** React 19 + Vite
- **Base de datos:** PostgreSQL (Railway)
- **Autenticación:** Laravel Sanctum (tokens Bearer)
- **Despliegue:** Railway (backend) + Vercel (frontend)

## Rutas de la API (Ciclo 1)

```
POST   /api/login                    → CU01
POST   /api/logout                   → CU02
GET    /api/postulantes              → CU03
POST   /api/postulantes              → CU03
PUT    /api/postulantes/{id}         → CU03
DELETE /api/postulantes/{id}         → CU03
GET    /api/inscripciones            → CU04
POST   /api/inscripciones            → CU04
PUT    /api/inscripciones/{id}       → CU04
GET    /api/examenes/{idPostulante}  → CU06
POST   /api/examenes                 → CU06 + CU07
PUT    /api/examenes/{id}            → CU06 + CU07
GET    /api/grupos                   → CU10
POST   /api/grupos/asignar           → CU10
```
