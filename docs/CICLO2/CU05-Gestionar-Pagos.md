# CU05 — Gestionar Pagos

## Descripción
Registra y controla los pagos realizados por los postulantes durante el proceso de inscripción al CUP.

## Actores
- **Actor iniciador:** Administrador

## Operaciones disponibles
| Operación | Ruta API | Método |
|---|---|---|
| Listar todos los pagos | `/api/pagos` | GET |
| Pagos de un postulante | `/api/pagos/postulante/{id}` | GET |
| Registrar pago | `/api/pagos` | POST |
| Actualizar estado | `/api/pagos/{id}` | PUT |

## Métodos de pago soportados
- EFECTIVO
- TRANSFERENCIA
- QR
- DEPOSITO

## Estados de pago
| Estado | Descripción |
|---|---|
| PENDIENTE | Pago registrado, pendiente de confirmación |
| PAGADO | Pago confirmado |
| ANULADO | Pago anulado |

## Flujo Principal
1. El administrador accede al módulo "Pagos"
2. Hace clic en "Registrar Pago"
3. Busca al postulante por CI
4. Ingresa monto, método de pago y código de transacción (opcional)
5. Selecciona el estado (PAGADO o PENDIENTE)
6. El sistema registra el pago con la fecha actual
7. El dashboard muestra el total recaudado actualizado

## Implementación
**Backend:** `app/Http/Controllers/PagoController.php`
**Frontend:** `src/pages/Pagos.jsx`

## Datos almacenados
| Campo | Tipo | Descripción |
|---|---|---|
| idpostulante | integer | FK al postulante |
| monto | decimal | Monto del pago en Bs. |
| fecha_pago | timestamp | Fecha y hora del registro |
| metodo_pago | string | EFECTIVO/TRANSFERENCIA/QR/DEPOSITO |
| codigo_transaccion | string | Código único (nullable) |
| estado_pago | string | PENDIENTE/PAGADO/ANULADO |
