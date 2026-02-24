from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def build_styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="TitleMain",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=23,
            leading=28,
            textColor=colors.HexColor("#0b1220"),
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Sub",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            textColor=colors.HexColor("#334155"),
            spaceAfter=12,
        )
    )
    styles.add(
        ParagraphStyle(
            name="H1b",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=20,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=9,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="H2b",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=6,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Bodyb",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10.1,
            leading=14,
            textColor=colors.HexColor("#0f172a"),
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Bulletb",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=13.5,
            leftIndent=12,
            bulletIndent=2,
            spaceAfter=2,
        )
    )
    return styles


def P(text, style):
    return Paragraph(text, style)


def section(story, styles, title, items):
    story.append(P(title, styles["H2b"]))
    for i in items:
        story.append(Paragraph(i, styles["Bulletb"], bulletText="-"))


def build(output_path: str):
    styles = build_styles()
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=1.7 * cm,
        rightMargin=1.7 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
        title="Manual Operativo - Agentes Botz",
        author="Botz",
    )

    st = []
    st.append(P("BOTZ - Manual Operativo Completo", styles["TitleMain"]))
    st.append(P("Creacion, entrenamiento, pruebas, canales y operacion diaria", styles["H1b"]))
    st.append(P(f"Version SOP comercial | Fecha: {datetime.now().strftime('%Y-%m-%d')}", styles["Sub"]))
    st.append(
        P(
            "Este documento esta pensado para personas sin perfil tecnico. Sigue estos pasos en orden "
            "y podras crear, entrenar y operar agentes en produccion.",
            styles["Bodyb"],
        )
    )

    st.append(P("1) Flujo rapido en 10 minutos", styles["H1b"]))
    quick = [
        "Ir a Start > Agents > Crear agente.",
        "Completar contexto de empresa (nombre, web, descripcion).",
        "Definir rol e instrucciones del agente.",
        "Subir documentos para entrenamiento.",
        "Probar respuestas (texto o voz).",
        "Guardar y activar canal.",
    ]
    for i in quick:
        st.append(Paragraph(i, styles["Bulletb"], bulletText="-"))

    st.append(Spacer(1, 8))
    st.append(P("2) Crear Agente de Texto - Paso a Paso", styles["H1b"]))
    section(
        st,
        styles,
        "Paso 1: Contexto de empresa",
        [
            "Nombre de la empresa (oficial).",
            "URL del sitio web (sin errores).",
            "Descripcion comercial de la empresa.",
            "Opcional: boton Generar contexto para autocompletar.",
        ],
    )
    section(
        st,
        styles,
        "Paso 2: Contexto del agente",
        [
            "Nombre del agente (ej. Lia, Asesor Botz).",
            "Rol (ej. calificador, soporte, asesor comercial).",
            "Instrucciones exactas: objetivo, preguntas clave, tono y cierre.",
            "Evitar prompts ambiguos; priorizar instrucciones concretas.",
        ],
    )
    section(
        st,
        styles,
        "Paso 3: Entrenamiento",
        [
            "Subir archivos: PDF, TXT, MD, DOCX.",
            "No usar .doc (convertir a .docx).",
            "Si el PDF es escaneado, usar OCR/fallback.",
            "Orden recomendado: producto, precios, politicas, objeciones.",
        ],
    )
    section(
        st,
        styles,
        "Paso 4: Pruebas",
        [
            "Realizar 10 preguntas reales de cliente.",
            "Verificar exactitud, tono y cierre comercial.",
            "Corregir prompt hasta obtener consistencia.",
        ],
    )
    section(
        st,
        styles,
        "Paso 5: Guardar",
        [
            "Guardar el agente en borrador o activo segun estrategia.",
            "Probar una vez mas antes de conectar canales externos.",
        ],
    )

    st.append(PageBreak())
    st.append(P("3) Crear Agente de Voz - Paso a Paso", styles["H1b"]))
    section(
        st,
        styles,
        "Configuracion inicial",
        [
            "Definir saludo inicial.",
            "Definir rol de voz (ventas/soporte/calificacion).",
            "Definir instrucciones de llamada (breves y precisas).",
        ],
    )
    section(
        st,
        styles,
        "Prueba de llamada web",
        [
            "Iniciar llamada web.",
            "Hablar por microfono en frases cortas.",
            "Validar transcripcion y respuesta del agente.",
            "Ajustar acento, voz y velocidad.",
            "Finalizar llamada para cerrar sesion limpia.",
        ],
    )
    section(
        st,
        styles,
        "Checklist de calidad de voz",
        [
            "Misma voz en toda la llamada.",
            "Respuesta rapida al terminar de hablar.",
            "Sincronia entre texto y audio.",
            "Finalizar llamada corta todo audio en curso.",
        ],
    )

    st.append(P("4) Crear Agente por Flujos", styles["H1b"]))
    section(
        st,
        styles,
        "Proceso",
        [
            "Entrar a Flows o crear tipo flow.",
            "Definir trigger (inicio).",
            "Agregar nodos (logica, condicionales, acciones).",
            "Conectar nodos, guardar, testear y ejecutar.",
            "Documentar objetivo del flujo para equipo comercial.",
        ],
    )

    st.append(P("5) Conectar Canales", styles["H1b"]))
    section(
        st,
        styles,
        "Modo asistido",
        [
            "Usar onboarding guiado si el cliente no es tecnico.",
            "Solicitar activacion y programar reunion.",
        ],
    )
    section(
        st,
        styles,
        "Modo avanzado",
        [
            "Cargar credenciales de proveedor.",
            "Probar credenciales.",
            "Verificar webhook.",
            "Enviar mensaje de prueba real.",
        ],
    )

    st.append(PageBreak())
    st.append(P("6) Operacion de Leads y CRM", styles["H1b"]))
    section(
        st,
        styles,
        "Operacion diaria",
        [
            "Revisar leads nuevos y estado del embudo.",
            "Validar canal de origen y prioridad.",
            "Asignar asesor correcto.",
            "Ejecutar siguiente accion (whatsapp, llamada, etc).",
            "Cerrar ciclo con seguimiento y nota.",
        ],
    )
    section(
        st,
        styles,
        "Controles criticos",
        [
            "Usuario debe tener tenant_id correcto.",
            "Usuario debe existir en team_members y auth.",
            "Asesor activo y con rol correcto.",
        ],
    )

    st.append(P("7) Errores comunes y solucion", styles["H1b"]))
    errores = Table(
        [
            ["Error", "Causa probable", "Solucion operativa"],
            ["Invitation not found", "Link viejo o truncado", "Generar invitacion nueva y usar URL completa"],
            ["Email not confirmed", "Auth sin confirmacion", "Auto-confirm en flujo o confirmacion manual en auth"],
            ["No se pudo resolver tenant_id", "Usuario sin tenant vinculado", "Corregir team_members + metadata"],
            ["No se pudo identificar asesor", "Falta enlace auth_user_id/user_id", "Vincular usuario de auth con team_members"],
            ["DOMMatrix is not defined en PDF", "Parser PDF falla en runtime", "Usar fallback OCR y PDF con texto"],
        ],
        colWidths=[4.2 * cm, 5.4 * cm, 7.4 * cm],
    )
    errores.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.9),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#cbd5e1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.white]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    st.append(errores)

    st.append(Spacer(1, 10))
    st.append(P("8) Checklist pre-produccion", styles["H1b"]))
    checks = [
        "Agente probado en escenarios reales.",
        "Conocimiento actualizado y limpio.",
        "Canal conectado y webhook verificado.",
        "Equipo y permisos correctos.",
        "Creditos y limites validados.",
        "Responsable comercial asignado para seguimiento.",
    ]
    for c in checks:
        st.append(Paragraph(c, styles["Bulletb"], bulletText="[]"))

    st.append(Spacer(1, 10))
    st.append(P("9) Mensaje final para equipo", styles["H1b"]))
    st.append(
        P(
            "Botz funciona mejor cuando se trata como un sistema operativo comercial: se entrena, se mide y se mejora "
            "continuamente. La tecnologia ya esta; el impacto depende de la disciplina operativa.",
            styles["Bodyb"],
        )
    )

    doc.build(st)


if __name__ == "__main__":
    out = "docs/GUIA_PASO_A_PASO_AGENTES_BOTZ.pdf"
    build(out)
    print(f"OK: {out}")
