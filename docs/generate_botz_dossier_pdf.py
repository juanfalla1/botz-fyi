from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)


def build_styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="TitleBotz",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=28,
            textColor=colors.HexColor("#0f172a"),
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SubtitleBotz",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=11,
            leading=15,
            textColor=colors.HexColor("#334155"),
            spaceAfter=14,
        )
    )
    styles.add(
        ParagraphStyle(
            name="H2",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=10,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="H3",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#1e293b"),
            spaceBefore=8,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Body",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10.4,
            leading=15,
            textColor=colors.HexColor("#0f172a"),
            spaceAfter=7,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BulletBotz",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10.3,
            leading=14,
            leftIndent=12,
            bulletIndent=2,
            spaceAfter=4,
        )
    )
    return styles


def p(text, style):
    return Paragraph(text, style)


def b(text):
    return f"<b>{text}</b>"


def build_pdf(output_path: str):
    styles = build_styles()
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=1.6 * cm,
        bottomMargin=1.6 * cm,
        title="BOTZ - Dossier Comercial y de Implementacion",
        author="Botz",
    )

    story = []

    today = datetime.now().strftime("%Y-%m-%d")
    story.append(p("BOTZ", styles["TitleBotz"]))
    story.append(
        p(
            "Dossier Comercial, Estrategico y de Implementacion Tecnologica", styles["H2"]
        )
    )
    story.append(
        p(
            "Version ejecutiva robusta para presentacion comercial. Fecha: " + today,
            styles["SubtitleBotz"],
        )
    )
    story.append(
        p(
            "Este documento resume, en lenguaje comercial y de negocio, todo lo implementado en Botz: la plataforma "
            "de agentes IA (texto, voz y flujos), su capa CRM/operativa y la evolucion hacia un motor especializado "
            "de calculo y viabilidad para procesos hipotecarios e inmobiliarios.",
            styles["Body"],
        )
    )

    story.append(Spacer(1, 10))
    story.append(p("Resumen Ejecutivo", styles["H2"]))
    resumen = [
        "Botz ya no es una idea en desarrollo: es una base funcional en produccion para atencion, automatizacion y operacion comercial asistida por IA.",
        "La arquitectura implementada permite combinar agentes conversacionales, canales reales, control de consumo, seguridad de configuraciones y seguimiento operativo.",
        "La capa de negocio conecta captacion de leads, seguimiento en CRM, atencion automatica y decisiones guiadas por un motor de viabilidad.",
        "El enfoque no es solo tecnologia: es conversion, velocidad operativa, trazabilidad y escalabilidad comercial.",
    ]
    for item in resumen:
        story.append(Paragraph(item, styles["BulletBotz"], bulletText="-"))

    story.append(Spacer(1, 8))
    story.append(p("Propuesta de Valor Comercial", styles["H2"]))
    story.append(
        p(
            "Botz permite a una empresa operar con un equipo digital de IA que atiende, califica, enruta y ejecuta "
            "procesos con consistencia. Esto reduce tiempos muertos, estandariza respuestas, acelera decisiones y "
            "aumenta la capacidad comercial sin crecer linealmente en costos operativos.",
            styles["Body"],
        )
    )

    tabla_valor = Table(
        [
            [b("Dimension"), b("Situacion Tradicional"), b("Con Botz")],
            [
                "Atencion al cliente",
                "Dependencia total del horario humano",
                "Cobertura extendida con agentes IA de texto y voz",
            ],
            [
                "Calificacion comercial",
                "Criterio variable por asesor",
                "Criterio estandar con prompts, reglas y flujos",
            ],
            [
                "Operacion",
                "Tareas repetitivas manuales",
                "Automatizacion por eventos, reglas y canales",
            ],
            [
                "Decision hipotecaria",
                "Analisis lento y fragmentado",
                "Motor de calculo y viabilidad integrado",
            ],
        ],
        colWidths=[4.0 * cm, 6.2 * cm, 7.2 * cm],
    )
    tabla_valor.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9.3),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#cbd5e1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.white]),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(tabla_valor)

    story.append(PageBreak())

    story.append(p("Arquitectura Funcional Implementada", styles["H2"]))
    story.append(p("1) Capa de Agentes IA", styles["H3"]))
    agentes = [
        "Agentes de texto para atencion, onboarding, soporte y calificacion inicial.",
        "Agentes de voz para simulacion y conversacion guiada con flujo de llamada.",
        "Agentes por flujos para orquestar reglas, nodos, condiciones y acciones.",
        "Plantillas y asistentes de creacion para acelerar despliegue comercial por caso de uso.",
    ]
    for item in agentes:
        story.append(Paragraph(item, styles["BulletBotz"], bulletText="-"))

    story.append(p("2) Capa de Canales e Integraciones", styles["H3"]))
    canales = [
        "Estructura para canales (WhatsApp/Meta, proveedores, widget embebible, conectores).",
        "Webhook de Meta con verificacion, recepcion de mensajes, enrutamiento al agente y respuesta automatica.",
        "Numeros y conexiones gestionables desde interfaz, con pruebas de credenciales y estado.",
        "Flujo de onboarding asistido para clientes no tecnicos (modelo comercial estilo implementacion guiada).",
    ]
    for item in canales:
        story.append(Paragraph(item, styles["BulletBotz"], bulletText="-"))

    story.append(p("3) Capa de CRM y Operacion Comercial", styles["H3"]))
    crm = [
        "Gestion de leads, estados, seguimiento y acciones operativas.",
        "Asignacion de asesores, estructura de equipo y permisos por tenant.",
        "Vista ejecutiva con indicadores de flujo, canales y estados para seguimiento comercial.",
        "Automatizacion de procesos repetitivos para reducir friccion entre captacion y cierre.",
    ]
    for item in crm:
        story.append(Paragraph(item, styles["BulletBotz"], bulletText="-"))

    story.append(p("4) Capa de Motor de Calculo y Viabilidad", styles["H3"]))
    motor = [
        "Motor orientado a procesos hipotecarios/inmobiliarios para apoyar evaluacion y pre-viabilidad.",
        "Estandariza criterios de analisis para reducir variabilidad operativa.",
        "Acelera decisiones comerciales con soporte de datos y reglas de negocio.",
        "Se integra con la operacion de leads para priorizar casos con mejor potencial.",
    ]
    for item in motor:
        story.append(Paragraph(item, styles["BulletBotz"], bulletText="-"))

    story.append(Spacer(1, 8))
    story.append(p("5) Capa de Gobierno, Seguridad y Consumo", styles["H3"]))
    governance = [
        "Control de creditos y entitlements para uso sostenible de agentes.",
        "Eventos de uso para trazabilidad operativa y financiera.",
        "Manejo seguro de secretos de canales (encriptado/redaccion de credenciales).",
        "Hardening de endpoints con rate limits y observabilidad estructurada.",
    ]
    for item in governance:
        story.append(Paragraph(item, styles["BulletBotz"], bulletText="-"))

    story.append(PageBreak())

    story.append(p("Implementaciones Clave ya Realizadas", styles["H2"]))
    story.append(
        p(
            "A continuacion se presenta un inventario comercial de componentes implementados para demostrar grado real "
            "de avance y madurez funcional.",
            styles["Body"],
        )
    )

    bloques = [
        (
            "Agentes y Experiencia Conversacional",
            [
                "Wizard de creacion de agentes con pasos guiados y pruebas en contexto.",
                "Preview de conversaciones y simulacion de llamada para validar comportamiento antes de activar.",
                "Personalizacion de voz, acento y velocidad para experiencia mas humana.",
                "Sincronizacion texto/voz y mejoras de latencia en experiencia de prueba.",
            ],
        ),
        (
            "Canales y Mensajeria",
            [
                "Modulo de numeros y conexiones por proveedor/canal.",
                "Pruebas de credenciales y verificacion de webhook Meta.",
                "Recepcion de inbound y respuesta automatica por agente asociado.",
                "Widget publico embebible para atencion en sitio web.",
            ],
        ),
        (
            "Conocimiento y Entrenamiento",
            [
                "Carga de archivos de conocimiento (txt, md, docx, pdf).",
                "Parseo con fallback OCR para PDFs complejos o escaneados.",
                "Generacion de contexto desde sitio web para enriquecer configuracion del agente.",
                "Guardas para evitar mezcla de contexto desde dominios no esperados.",
            ],
        ),
        (
            "CRM y Equipo",
            [
                "Gestion de asesores, roles y permisos por tenant.",
                "Creacion de leads con validaciones de identidad asesor/tenant.",
                "Vistas ejecutivas de canales, estados y conversion operativa.",
                "Correcciones de consistencia para relaciones auth-users/team-members.",
            ],
        ),
        (
            "Confiabilidad y Escala Inicial",
            [
                "Indices de base de datos para consultas criticas de equipo e invitaciones.",
                "Rate limiting en endpoints de alto trafico (leads, chat-test, voice-call, invitaciones).",
                "Observabilidad basica con request_id, tiempos y eventos de error/limites.",
                "Hardening no destructivo para soportar mayor concurrencia sin romper logica.",
            ],
        ),
    ]

    for titulo, items in bloques:
        story.append(p(titulo, styles["H3"]))
        for item in items:
            story.append(Paragraph(item, styles["BulletBotz"], bulletText="-"))

    story.append(PageBreak())

    story.append(p("Casos de Uso Comerciales", styles["H2"]))
    casos = [
        (
            "Caso 1: Captacion y Calificacion de Leads",
            "Botz recibe consultas por web/canales, califica intencion, recopila datos minimos, enruta al asesor correcto y deja trazabilidad para seguimiento.",
        ),
        (
            "Caso 2: Asistente de Atencion 24/7",
            "Agente de texto y voz responde preguntas frecuentes, filtra solicitudes y escala al equipo humano cuando corresponde.",
        ),
        (
            "Caso 3: Operacion Hipotecaria Asistida",
            "El motor de viabilidad apoya el analisis inicial para priorizar casos con mejor perfil y mejorar conversion del embudo.",
        ),
        (
            "Caso 4: Implementacion Guiada para Clientes",
            "Onboarding asistido para empresas no tecnicas, con agenda comercial, carga de canales y activacion progresiva.",
        ),
    ]
    for titulo, descripcion in casos:
        story.append(p(titulo, styles["H3"]))
        story.append(p(descripcion, styles["Body"]))

    story.append(Spacer(1, 8))
    story.append(p("KPIs Sugeridos para Explotacion Comercial", styles["H2"]))
    kpis = [
        "Tiempo medio de primera respuesta (texto y voz).",
        "Porcentaje de leads calificados vs total de conversaciones.",
        "Tiempo medio de paso de lead a asesor.",
        "Tasa de conversion por canal y por segmento.",
        "Costo operativo por lead gestionado.",
        "Nivel de automatizacion efectiva en tareas repetitivas.",
    ]
    for item in kpis:
        story.append(Paragraph(item, styles["BulletBotz"], bulletText="-"))

    story.append(PageBreak())

    story.append(p("Ventajas Competitivas de Botz", styles["H2"]))
    ventajas = [
        "Arquitectura modular: texto, voz, flujos, CRM y motor de viabilidad en una sola linea de producto.",
        "Implementacion comercial real: no se queda en demo, conecta canales y operacion.",
        "Gobierno de consumo: creditos, eventos de uso y control de costos IA.",
        "Capacidad de verticalizacion: la base de agentes se adapta a dominios especificos como hipotecario/inmobiliario.",
        "Onboarding mixto: modo asistido para clientes y modo avanzado para equipos tecnicos.",
    ]
    for item in ventajas:
        story.append(Paragraph(item, styles["BulletBotz"], bulletText="-"))

    story.append(Spacer(1, 8))
    story.append(p("Roadmap Comercial-Tecnico (90 dias)", styles["H2"]))
    roadmap = Table(
        [
            [b("Fase"), b("Objetivo"), b("Entregables de negocio")],
            [
                "Fase 1 (0-30 dias)",
                "Consolidar performance y consistencia de canales/CRM",
                "Estabilidad operativa, menores incidencias y mejor tiempo de respuesta",
            ],
            [
                "Fase 2 (31-60 dias)",
                "Integraciones productivas de flujos y voz real",
                "Automatizacion en procesos clave y mayor conversion por canal",
            ],
            [
                "Fase 3 (61-90 dias)",
                "Escala comercial y analitica avanzada",
                "Dashboards de impacto, modelo de expansion por verticales y playbook comercial",
            ],
        ],
        colWidths=[3.8 * cm, 6.6 * cm, 6.9 * cm],
    )
    roadmap.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9.2),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#cbd5e1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.white]),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(roadmap)

    story.append(Spacer(1, 10))
    story.append(p("Cierre Comercial", styles["H2"]))
    story.append(
        p(
            "Botz representa una plataforma viva con avance real, orientada a resultados de negocio. La combinacion "
            "de agentes IA, automatizacion operativa y motor de viabilidad crea una ventaja tangible para equipos de "
            "ventas, atencion y operaciones. El valor no esta solo en responder mejor, sino en operar mejor.",
            styles["Body"],
        )
    )
    story.append(
        p(
            "Mensaje clave para clientes e inversion comercial: Botz convierte IA en capacidad operativa medible.",
            styles["Body"],
        )
    )

    doc.build(story)


if __name__ == "__main__":
    build_pdf("docs/BOTZ_Dossier_Comercial_IA_Motor.pdf")
    print("OK: docs/BOTZ_Dossier_Comercial_IA_Motor.pdf")
