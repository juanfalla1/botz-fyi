![Botz Logo](../../public/botz-logo.png)

# Botz - Producto

## Enfoque
Botz esta enfocada en equipos comerciales (admin + asesores) que gestionan leads multicanal y necesitan:

- Un CRM operativo (rapido, accionable)
- Asignacion y control de carga por asesor
- Tablero Kanban por etapas
- Centro de control SLA (priorizacion por tiempo)
- Dashboard ejecutivo (ranking, pipeline, conversion, comisiones)
- Integraciones (WhatsApp, email, Google, pagos)

## Para quien es
- Administradores / Lideres: control global, configuracion, equipo, metricas.
- Asesores: ejecutar seguimiento diario, responder, agendar, mover etapas, cerrar.

## Problemas que resuelve
- Leads dispersos y seguimiento inconsistente
- Falta de prioridad (que atender primero)
- Falta de visibilidad (conversion, pipeline, performance por asesor)
- Poca trazabilidad (bitacora)

## Modulos principales
- CRM en vivo: lista, filtros, edicion rapida, detalle, bitacora.
- Kanban: arrastrar y soltar entre etapas, vista por asesor.
- SLA Control Center: criticas / por vencer / observacion, acciones sugeridas.
- Centro de Control Botz: canales, estrategia, cuenta, equipo.
- Dashboard Ejecutivo: KPIs, ranking asesores, DTI/mortgage (si aplica).

## Roles
### Admin
- Ve todos los leads del tenant
- Gestiona equipo (alta/edicion)
- Ve cuenta/plan y facturacion

### Asesor
- Ve solo sus leads asignados (`asesor_id` / `assigned_to`)
- No ve facturacion sensible

## Alcance / No alcance
Alcance:
- Gestion comercial y automatizacion operativa
- Integraciones de mensajeria/correos
- Reporteria ejecutiva

No alcance (por defecto):
- Contabilidad completa
- Data warehouse / BI corporativo (se puede integrar)
- Telefonia full (solo enlaces/acciones)

## Glosario rapido
- Lead: prospecto.
- Etapa/Estado: estado operativo del lead.
- SLA: tiempo maximo objetivo por etapa para accionar.
- Pipeline: suma de valor estimado de oportunidades en curso.
