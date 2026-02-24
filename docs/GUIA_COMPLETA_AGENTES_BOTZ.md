# Guia Completa de Agentes Botz (No Tecnico + Operativo)

Version: 2026-02-23

---

## 1) Que es Botz Agentes

Botz Agentes es una plataforma para crear asistentes de IA que atienden clientes por texto, voz y canales como WhatsApp, con control de uso, entrenamiento y seguimiento.

En la practica, Botz te permite:

- Atender consultas de clientes automaticamente.
- Calificar leads y pasarlos al equipo comercial.
- Ejecutar procesos por flujo (reglas, condiciones y acciones).
- Usar conocimiento de tu empresa (web + documentos).
- Monitorear consumo (creditos), uso y rendimiento.

---

## 2) Tipos de agente que existen

En Botz puedes trabajar con:

1. **Agente de Texto**
   - Responde por chat (web/widget/canales compatibles).
   - Ideal para FAQ, soporte inicial, captacion y pre-calificacion.

2. **Agente de Voz**
   - Simula/atiende llamadas con voz IA.
   - Ideal para venta consultiva inicial, seguimiento y atencion telefonica.

3. **Agente por Flujos**
   - Automatiza secuencias por nodos, reglas y condiciones.
   - Ideal para operaciones repetitivas y procesos internos.

4. **Notetaker (si esta habilitado en tu entorno)**
   - Captura y resume interacciones/reuniones.

---

## 3) Ruta rapida para una persona sin experiencia

Si nunca has usado la plataforma, este es el orden recomendado:

1. Crear agente (texto o voz).
2. Cargar contexto de empresa (web + descripcion).
3. Entrenar con archivos (PDF/TXT/MD/DOCX).
4. Probar respuestas (chat o llamada de prueba).
5. Activar canal (ej. WhatsApp) o widget.
6. Medir uso y ajustar prompt/instrucciones.

---

## 4) Crear un Agente de Texto (paso a paso)

Ruta: `Start > Agents > Crear agente`

### Paso 1: Contexto de empresa

- Nombre de la empresa.
- URL del sitio web.
- Descripcion de la empresa.
- Boton **Generar contexto** (opcional): trae informacion del dominio ingresado.

Recomendacion:
- Siempre validar que el contexto generado si corresponda a tu marca.

### Paso 2: Contexto del agente

Configura:

- Nombre del agente.
- Rol del agente (ej. asesor comercial, soporte, calificador).
- Instrucciones importantes (como debe responder, que debe preguntar, que no debe hacer).
- Tono (formal, cercano, consultivo, etc).

Buenas practicas:

- Dar instrucciones concretas y medibles.
- Definir objetivo de cada conversacion (ej. agendar cita, calificar, resolver).

### Paso 3: Entrena tu agente

Puedes entrenar con:

- Sitio web.
- Archivos: PDF, TXT, MD, DOCX.

Notas:

- `.doc` no es compatible (convertir a `.docx`).
- Si un PDF es escaneado, Botz intenta OCR automatico.

### Paso 4: Prueba tu agente

- Haz preguntas reales de clientes.
- Verifica precision, tono y cierre comercial.
- Ajusta instrucciones hasta lograr respuestas consistentes.

Guardar:
- El agente se crea como borrador y puedes iterarlo.

---

## 5) Crear un Agente de Voz (paso a paso)

Ruta: `Start > Agents > Crear agente > tipo voz`

### Configuracion clave

- Nombre y rol.
- Instrucciones del agente.
- Saludo inicial.
- Direccion de llamada (segun caso).
- Voz/acento/velocidad (en prueba).

### Prueba de llamada web

- Boton **Iniciar llamada web**.
- Habla por el microfono.
- Revisa transcripcion y respuesta.
- Finaliza llamada para cerrar sesion limpia.

Checklist de calidad de voz:

- Misma identidad de voz durante toda la llamada.
- Respuesta en tiempo corto tras terminar de hablar.
- Tono natural y claro.

---

## 6) Crear un Agente por Flujo

Ruta: `Start > Agents > Crear agente > tipo flow` o `Start > Flows`

Que hace:

- Define nodos y conexiones para automatizar procesos.
- Permite condicionales, bucles y salidas por reglas.

Importante:

- El flujo se guarda en configuracion del agente.
- Algunas integraciones pueden estar en modo base/simulacion segun el nodo y entorno.

---

## 7) Entrenamiento con archivos (todo lo importante)

Panel: Archivos / Importar documentos

Formatos soportados:

- PDF
- TXT
- MD
- DOCX

Errores comunes y solucion:

1. **"Formato no soportado"**
   - Verificar extension.
   - Convertir `.doc` a `.docx`.

2. **PDF no se procesa**
   - Probar PDF con texto seleccionable.
   - Si es imagen, dejar que OCR procese o convertir previamente.

3. **Archivo pesa mucho**
   - Dividir documento en partes.

Buena practica:
- Subir documentos por temas (producto, precios, politicas, objeciones).

---

## 8) Canales: como se conectan

Ruta: `Start > Agents > Channels`

Hay dos modos:

1. **Asistido (cliente no tecnico)**
   - Solicitud de onboarding.
   - Programar reunion y activacion guiada.

2. **Avanzado (interno/admin)**
   - Carga de credenciales.
   - Prueba de conexion.
   - Verificacion webhook.

### WhatsApp (Meta)

Flujo general:

1. Crear/seleccionar canal.
2. Asociar numero / phone id.
3. Configurar token/credenciales.
4. Verificar webhook.
5. Validar mensaje entrante y respuesta automatica.

---

## 9) Numeros y asignaciones

Ruta: `Start > Agents > Numbers`

Que se gestiona:

- Alta de numero.
- Edicion de estado/proveedor.
- Asignacion al agente correcto.

Regla operativa:
- Un numero debe estar claramente asociado a un canal y a un agente para evitar respuestas cruzadas.

---

## 10) Widget embebible (chat web)

Componentes disponibles en plataforma:

- Script loader (`agent.js`).
- Pagina widget.
- API publica de configuracion y chat.

Uso basico:

1. Obtener identificador del agente.
2. Insertar script en sitio.
3. Verificar apertura, mensajes y creditos.

---

## 11) Creditos, planes y uso

Botz controla consumo por creditos para mantener estabilidad y costos.

Incluye:

- Bloqueo cuando no hay creditos.
- Eventos de uso por endpoint.
- Vista de consumo por agente/funcion.

Recomendaciones:

- Monitorear consumo semanal.
- Ajustar prompts para respuestas mas eficientes.
- Usar pruebas controladas antes de activar campañas grandes.

---

## 12) Usuarios, roles y equipo

La operacion depende de rol + tenant + relacion con team members.

Roles tipicos:

- Admin / super admin.
- Asesor.
- Invitado de equipo.

Puntos criticos:

- Usuario debe existir en auth y team_members.
- Debe tener tenant_id correcto.
- Debe estar activo.

Si no, pueden aparecer errores de crear lead o permisos.

---

## 13) Invitaciones de usuarios (flujo correcto)

Flujo ideal:

1. Admin crea invitacion.
2. Usuario abre link de invitacion.
3. Crea cuenta y completa activacion.
4. Queda asociado al tenant/equipo.

Buenas practicas:

- Usar siempre el ultimo link (evitar enlaces antiguos).
- Probar en modo incognito si hay cache rara.

---

## 14) Troubleshooting rapido (errores comunes)

1. **"Invitation not found"**
   - Link incorrecto/truncado o invitacion antigua.

2. **"Email not confirmed"**
   - Flujo de confirmacion pendiente en auth.

3. **"No se pudo resolver tenant_id"**
   - team_members sin tenant_id o mal vinculado.

4. **"No se pudo identificar asesor actual"**
   - falta relacion auth user con team_members.

5. **PDF no procesa / DOMMatrix**
   - parser de PDF puede fallar en algunos archivos; usar fallback OCR.

---

## 15) Checklist antes de salir a produccion

### Agente

- [ ] Nombre, rol e instrucciones finalizadas.
- [ ] Respuestas consistentes en 10 preguntas reales.
- [ ] Tono y cierre comercial correctos.

### Conocimiento

- [ ] Web validada.
- [ ] Archivos cargados y procesados.
- [ ] No hay informacion desactualizada.

### Canal

- [ ] Credenciales probadas.
- [ ] Webhook verificado.
- [ ] Mensajes entrantes y salientes funcionando.

### Operacion

- [ ] Roles/usuarios correctos.
- [ ] tenant_id y equipo validados.
- [ ] Creditos suficientes para operacion.

---

## 16) Guia operativa diaria (equipo comercial)

Inicio de dia:

1. Revisar leads nuevos.
2. Revisar canales activos.
3. Revisar consumo y alertas.

Durante el dia:

1. Monitorear calidad de conversaciones.
2. Ajustar instrucciones si cambia oferta/campana.
3. Escalar casos complejos a humano.

Cierre de dia:

1. Ver conversion por estado/canal.
2. Revisar objeciones nuevas.
3. Actualizar conocimiento del agente.

---

## 17) Recomendaciones comerciales para vender Botz

Mensajes de valor:

- "No es un chatbot aislado; es una capa operativa de IA conectada a tus procesos."
- "Botz combina atencion, automatizacion y decision comercial en una sola plataforma."
- "Tu equipo vende mas porque pierde menos tiempo en tareas repetitivas."

Prueba de impacto (30 dias):

1. Definir canal principal.
2. Activar agente con entrenamiento minimo viable.
3. Medir:
   - tiempo de respuesta,
   - leads calificados,
   - conversion por estado,
   - carga operativa reducida.

---

## 18) Glosario simple

- **Agente**: asistente IA con instrucciones y conocimiento.
- **Tenant**: cuenta/empresa dentro de Botz.
- **Lead**: contacto comercial potencial.
- **Webhook**: enlace tecnico para recibir eventos/mensajes.
- **OCR**: lectura de texto desde imagen/PDF escaneado.
- **Entitlement/Creditos**: control de consumo de la plataforma.

---

## 19) Cierre

Esta guia cubre los procesos principales de todo el modulo de Agentes en Botz, desde creacion y entrenamiento hasta canales, operacion y soporte.

Si quieres, el siguiente paso es generar una version 100% comercial para clientes finales en formato "Manual de activacion en 1 hora" + "Playbook de ventas con IA".
