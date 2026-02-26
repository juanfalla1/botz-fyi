from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def styles_pack():
    s = getSampleStyleSheet()
    s.add(
        ParagraphStyle(
            name="TitleMain",
            parent=s["Title"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=28,
            textColor=colors.HexColor("#0f172a"),
            spaceAfter=8,
        )
    )
    s.add(
        ParagraphStyle(
            name="Sub",
            parent=s["Normal"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            textColor=colors.HexColor("#334155"),
            spaceAfter=10,
        )
    )
    s.add(
        ParagraphStyle(
            name="H1",
            parent=s["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=8,
            spaceAfter=6,
        )
    )
    s.add(
        ParagraphStyle(
            name="Body",
            parent=s["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#0f172a"),
            spaceAfter=4,
        )
    )
    s.add(
        ParagraphStyle(
            name="BulletSop",
            parent=s["Normal"],
            fontName="Helvetica",
            fontSize=9.8,
            leading=13.4,
            leftIndent=12,
            bulletIndent=2,
            spaceAfter=2,
        )
    )
    return s


def add_bullets(story, style, lines):
    for line in lines:
        story.append(Paragraph(line, style, bulletText="-"))


def add_troubleshooting_table(story):
    rows = [
        ["Fallo", "Causa probable", "Que hacer"],
        [
            "Connected en Evolution pero el bot no responde",
            "Webhook no configurado o evento no marcado",
            "Activar Webhook, poner URL de Botz y marcar messages.upsert",
        ],
        [
            "Responde en tenant equivocado",
            "instanceName / tenant_id mal mapeado",
            "Validar tenant_id en Botz y nombre de instancia en Evolution",
        ],
        [
            "TypeError: Failed to fetch en Dashboard",
            "Sesion/token vencido o endpoint sin respuesta",
            "Cerrar/abrir sesion, revisar health del API y logs del navegador",
        ],
        [
            "Mensajes duplicados o bucle",
            "El bot responde sus propios mensajes",
            "Filtrar fromMe y eventos no necesarios",
        ],
        [
            "No llega media (audio/imagen)",
            "Webhook Base64 desactivado o parser no listo",
            "Activar Base64 solo si se procesa media; si no, dejar apagado",
        ],
    ]
    tb = Table(rows, colWidths=[4.7 * cm, 5.2 * cm, 7.2 * cm])
    tb.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.8),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#cbd5e1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.white]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(tb)


def build_agentes_pdf(path):
    s = styles_pack()
    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=1.7 * cm, rightMargin=1.7 * cm, topMargin=1.5 * cm, bottomMargin=1.5 * cm)
    st = []

    st.append(Paragraph("BOTZ - Guia Cliente: Conexion WhatsApp (Producto Agentes)", s["TitleMain"]))
    st.append(Paragraph(f"Version SOP cliente | Fecha: {datetime.now().strftime('%Y-%m-%d')}", s["Sub"]))
    st.append(Paragraph("Objetivo: que un cliente conecte su numero por Evolution API y quede respondiendo en Agentes sin soporte tecnico.", s["Body"]))

    st.append(Paragraph("1) Requisitos previos", s["H1"]))
    add_bullets(
        st,
        s["BulletSop"],
        [
            "Tenant activo en Botz.",
            "Agente creado y en estado activo/publicado.",
            "Instancia en Evolution con estado Connected.",
            "URL productiva HTTPS de Botz.",
        ],
    )

    st.append(Paragraph("2) Configuracion en Botz (Agentes)", s["H1"]))
    add_bullets(
        st,
        s["BulletSop"],
        [
            "Ir a Start > Agents y abrir el agente deseado.",
            "Verificar prompt base, tono y objetivo comercial.",
            "Asignar el canal WhatsApp al agente.",
            "Confirmar que el tenant_id del agente es el del cliente correcto.",
        ],
    )

    st.append(Paragraph("3) Configuracion en Evolution (Webhook)", s["H1"]))
    add_bullets(
        st,
        s["BulletSop"],
        [
            "Menu Events > Webhook > Enabled = ON.",
            "URL = endpoint inbound de Botz (produccion).",
            "Webhook by Events = OFF para inicio rapido.",
            "Webhook Base64 = OFF (solo ON si procesaras media).",
            "Marcar evento messages.upsert.",
        ],
    )

    st.append(Paragraph("4) Prueba real (checklist)", s["H1"]))
    add_bullets(
        st,
        s["BulletSop"],
        [
            "Enviar mensaje desde un numero externo al WhatsApp conectado.",
            "Validar que Botz reciba evento y genere respuesta.",
            "Validar que la conversacion quede en el tenant correcto.",
            "Probar 3 escenarios: saludo, objecion, cierre con CTA.",
            "Confirmar que no hay respuesta duplicada.",
        ],
    )

    st.append(Paragraph("5) Fallos comunes y solucion", s["H1"]))
    add_troubleshooting_table(st)

    st.append(Spacer(1, 8))
    st.append(Paragraph("Decision tecnica: para cliente nuevo usar Agentes directos. n8n solo cuando haya integraciones complejas adicionales.", s["Body"]))

    doc.build(st)


def build_hipotecario_pdf(path):
    s = styles_pack()
    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=1.7 * cm, rightMargin=1.7 * cm, topMargin=1.5 * cm, bottomMargin=1.5 * cm)
    st = []

    st.append(Paragraph("BOTZ - Guia Cliente: Conexion WhatsApp (Herramienta Hipotecaria)", s["TitleMain"]))
    st.append(Paragraph(f"Version SOP cliente | Fecha: {datetime.now().strftime('%Y-%m-%d')}", s["Sub"]))
    st.append(Paragraph("Objetivo: conectar Evolution API para que el flujo hipotecario capture, califique y active seguimiento automaticamente.", s["Body"]))

    st.append(Paragraph("1) Requisitos previos", s["H1"]))
    add_bullets(
        st,
        s["BulletSop"],
        [
            "Tenant activo en Botz y en modulo hipotecario.",
            "Playbook/estrategia comercial cargada (si aplica).",
            "Canal WhatsApp conectado en Evolution (Connected).",
            "Campos minimos definidos: ingreso, cuota inicial, tipo de inmueble.",
        ],
    )

    st.append(Paragraph("2) Configuracion en herramienta hipotecaria", s["H1"]))
    add_bullets(
        st,
        s["BulletSop"],
        [
            "Activar flujo de calificacion hipotecaria para el tenant.",
            "Configurar mensaje inicial y secuencia de preguntas.",
            "Definir reglas de scoring (apto, en revision, no apto).",
            "Definir salida: agendar asesoria, enviar resumen y crear tarea.",
        ],
    )

    st.append(Paragraph("3) Configuracion en Evolution", s["H1"]))
    add_bullets(
        st,
        s["BulletSop"],
        [
            "Events > Webhook > Enabled ON.",
            "URL inbound de Botz para hipotecario (misma base productiva).",
            "Evento minimo obligatorio: messages.upsert.",
            "Evitar eventos innecesarios para reducir ruido.",
        ],
    )

    st.append(Paragraph("4) Pruebas reales por flujo", s["H1"]))
    add_bullets(
        st,
        s["BulletSop"],
        [
            "Caso 1: cliente apto -> debe terminar con agenda confirmada.",
            "Caso 2: cliente en revision -> debe pedir documentos y escalar a asesor.",
            "Caso 3: cliente no apto -> debe dar orientacion y siguiente paso claro.",
            "Validar que interaccion quede en CRM/Interacciones del tenant.",
            "Validar tiempos: primera respuesta menor a 10 segundos.",
        ],
    )

    st.append(Paragraph("5) Operacion diaria", s["H1"]))
    add_bullets(
        st,
        s["BulletSop"],
        [
            "Revisar bandeja de interacciones y estados del pipeline.",
            "Revisar conversion por fuente y por asesor.",
            "Ajustar preguntas si baja calidad de datos.",
            "Actualizar estrategia comercial semanalmente.",
        ],
    )

    st.append(PageBreak())
    st.append(Paragraph("6) Fallos comunes y solucion", s["H1"]))
    add_troubleshooting_table(st)

    st.append(Spacer(1, 8))
    st.append(Paragraph("Recomendacion: arrancar sin n8n. Luego agregar n8n si necesitas integraciones externas avanzadas (banco/ERP/workflows complejos).", s["Body"]))

    doc.build(st)


if __name__ == "__main__":
    out1 = "docs/GUIA_CLIENTE_CONEXION_AGENTES_WHATSAPP.pdf"
    out2 = "docs/GUIA_CLIENTE_CONEXION_HIPOTECARIO_WHATSAPP.pdf"
    build_agentes_pdf(out1)
    build_hipotecario_pdf(out2)
    print(f"OK: {out1}")
    print(f"OK: {out2}")
