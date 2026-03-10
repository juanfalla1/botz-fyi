from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


def build_cv_pdf(output_path: str) -> None:
    doc = SimpleDocTemplate(
        output_path,
        pagesize=LETTER,
        rightMargin=0.65 * inch,
        leftMargin=0.65 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
        title="Juan Carlos Garcia Falla - CV",
    )

    title_style = ParagraphStyle(
        "Title",
        fontName="Helvetica-Bold",
        fontSize=19,
        leading=22,
        spaceAfter=6,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle",
        fontName="Helvetica-Bold",
        fontSize=10.8,
        leading=14,
        spaceAfter=2,
    )
    body_style = ParagraphStyle(
        "Body",
        fontName="Helvetica",
        fontSize=10,
        leading=13,
        spaceAfter=3,
    )
    section_style = ParagraphStyle(
        "Section",
        fontName="Helvetica-Bold",
        fontSize=11.8,
        leading=15,
        spaceBefore=8,
        spaceAfter=4,
    )

    story = []

    story.append(Paragraph("JUAN CARLOS GARCIA FALLA", title_style))
    story.append(Paragraph("Product Manager (IA y Automatización) | Project Manager (Scrum)", subtitle_style))
    story.append(Paragraph("Toronto, Canadá", body_style))
    story.append(Paragraph("📧 juangfalla@gmail.com", body_style))
    story.append(Paragraph("🌐 botz.fyi | 💻 github.com/juanfalla1", body_style))

    story.append(Spacer(1, 7))
    story.append(Paragraph("PERFIL PROFESIONAL", section_style))
    story.append(
        Paragraph(
            "Product / Project Manager con más de 10 años de experiencia liderando productos digitales, automatización de procesos "
            "y proyectos tecnológicos en sectores financieros, SaaS y consultoría. Experiencia en definición estratégica de producto, "
            "gestión de roadmap, liderazgo de equipos multidisciplinarios y entrega de soluciones tecnológicas end-to-end.",
            body_style,
        )
    )
    story.append(
        Paragraph(
            "Fundador de Botz, plataforma de automatización impulsada por inteligencia artificial que integra agentes inteligentes "
            "de voz y texto, APIs, webhooks y flujos n8n para automatizar operaciones empresariales, gestión de leads y análisis "
            "de procesos financieros como evaluación de viabilidad crediticia y herramientas de análisis hipotecario.",
            body_style,
        )
    )
    story.append(
        Paragraph(
            "Capacidad para conectar negocio, producto y tecnología, facilitando la entrega de soluciones escalables basadas en IA y automatización.",
            body_style,
        )
    )

    story.append(Paragraph("EXPERIENCIA PROFESIONAL", section_style))

    experiences = [
        (
            "Sun Capital — Project Manager / Product Manager",
            "Sep 2024 – Presente | Toronto, Canadá",
            [
                "Escalamiento de prácticas Scrum en programas tecnológicos y gestión de múltiples iniciativas de transformación digital.",
                "Gestión de roadmap y coordinación entre equipos de Infrastructure, Security y IT Operations.",
                "Planificación y ejecución de sprints, backlog management y métricas de entrega.",
                "Definición de historias de usuario, criterios de aceptación y planificación de pruebas UAT.",
                "Coordinación de entregas alineadas con estándares de seguridad y compliance corporativo.",
                "Colaboración con equipos de gestión de dispositivos y seguridad empresarial con Microsoft Intune.",
            ],
        ),
        (
            "Sun Capital — Project Manager / Transformation Lead (Proyecto Italcol)",
            "2024 – Presente",
            [
                "Liderazgo de iniciativas de automatización logística internacional.",
                "Implementación de soluciones con Azure, UiPath, Power Automate y Form Recognizer.",
                "Diseño de procesos AS-IS / TO-BE para optimización operativa.",
                "Definición de indicadores de eficiencia operativa y mejora continua.",
                "Coordinación de despliegues tecnológicos en ambientes corporativos.",
            ],
        ),
        (
            "Botz — Founder / Product Manager",
            "2023 – Presente",
            [
                "Diseño y desarrollo de plataforma de automatización impulsada por IA.",
                "Creación de agentes inteligentes de voz y texto para interacción automatizada con clientes.",
                "Desarrollo de herramientas para análisis y automatización de procesos hipotecarios y evaluación de viabilidad crediticia.",
                "Integración de APIs, webhooks y flujos n8n para gestión de leads y procesos empresariales.",
                "Automatización comercial mediante WhatsApp, Telegram, Gmail y Google Sheets.",
                "Desarrollo de aplicaciones web con Next.js, Node.js y Supabase.",
                "Implementación de clasificación y scoring de leads con modelos OpenAI.",
                "Construcción de flujo WhatsApp con memoria persistente, cotización automática PDF con TRM y envío de fichas técnicas/imágenes.",
                "Diseño de CRM operacional con métricas comerciales, estado de oportunidades y control de habilitación por integración.",
                "Implementación de autenticación OTP para acceso de usuarios y validación de onboarding.",
            ],
        ),
        (
            "Aportes en Línea — Technical Project Manager / Technical Product Owner & Cybersecurity",
            "Abr 2022 – Oct 2023",
            [
                "Liderazgo de la entrega segura de productos digitales.",
                "Gestión de backlog y coordinación entre equipos de desarrollo, seguridad y negocio.",
                "Implementación de prácticas OWASP y remediación de vulnerabilidades (incluyendo XSS).",
                "Coordinación con infraestructura para cumplimiento de estándares de seguridad.",
            ],
        ),
        (
            "TalentPitch — Product Owner",
            "Ago 2022 – Feb 2023",
            [
                "Definición de visión de producto y roadmap estratégico.",
                "Gestión de backlog y priorización de funcionalidades.",
                "Implementación de ciclos de product discovery y delivery.",
                "Coordinación entre equipos de UX/UI y desarrollo.",
            ],
        ),
        (
            "Verska — Co-Founder / Business Manager / Development Manager / Product Owner",
            "Sep 2021 – Presente",
            [
                "Desarrollo de soluciones digitales y automatización de procesos para empresas.",
                "Definición de arquitectura tecnológica y estándares de desarrollo.",
                "Gestión de proyectos de tecnología y consultoría digital.",
            ],
        ),
        (
            "BNP Paribas Cardif — Product Owner / Líder de Negocio Directo",
            "Feb 2012 – Sep 2021",
            [
                "Liderazgo de proyectos de transformación digital.",
                "Coordinación de equipos multidisciplinarios entre tecnología, operaciones y negocio.",
                "Optimización de procesos operativos mediante tecnología.",
                "Implementación de dashboards y KPIs para seguimiento de desempeño.",
                "Gestión de backlog y desarrollo de nuevos productos digitales.",
            ],
        ),
    ]

    for role, period, bullets in experiences:
        story.append(Paragraph(role, subtitle_style))
        story.append(Paragraph(period, body_style))
        for b in bullets:
            story.append(Paragraph(f"- {b}", body_style))
        story.append(Spacer(1, 2.5))

    story.append(Paragraph("HABILIDADES PRINCIPALES", section_style))
    skills_blocks = [
        (
            "Gestión de Producto y Proyectos",
            ["Scrum", "Gestión de Roadmap", "OKRs", "Gestión de Stakeholders", "Agile Delivery"],
        ),
        (
            "Automatización e Inteligencia Artificial",
            ["n8n", "OpenAI", "Automatización de procesos", "Agentes inteligentes de voz y texto"],
        ),
        (
            "Desarrollo y Tecnología",
            ["React", "Next.js", "Node.js", "APIs", "Webhooks", "Supabase"],
        ),
        (
            "Cloud y DevOps",
            ["Azure", "Vercel", "CI/CD"],
        ),
        (
            "Datos y Analítica",
            ["Google Sheets", "Dashboards", "Análisis de datos"],
        ),
        (
            "Seguridad",
            ["Prácticas OWASP", "Desarrollo seguro"],
        ),
    ]

    for title, items in skills_blocks:
        story.append(Paragraph(f"<b>{title}:</b> {', '.join(items)}", body_style))

    story.append(Paragraph("EDUCACIÓN", section_style))
    story.append(Paragraph("Postgrado en Gestión de Proyectos — Politécnico de Colombia (2024)", body_style))
    story.append(Paragraph("Administrador de Empresas — Universidad CUN (2012)", body_style))

    story.append(Paragraph("CERTIFICACIONES", section_style))
    certs = [
        "Google Cloud Cybersecurity Certificate",
        "Introducción a los Principios de Seguridad en la Computación en la Nube",
        "Introducción al Análisis de Datos con Python",
        "Competencias Digitales para Profesionales",
    ]
    for c in certs:
        story.append(Paragraph(f"- {c}", body_style))

    doc.build(story)


if __name__ == "__main__":
    output = "Juan_Carlos_Garcia_Falla_CV_Actualizado.pdf"
    build_cv_pdf(output)
    print(output)
