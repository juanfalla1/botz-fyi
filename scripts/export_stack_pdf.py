from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


def load_lines(path: str):
    with open(path, "r", encoding="utf-8") as f:
        return [line.rstrip("\n") for line in f]


def to_pdf(md_path: str, pdf_path: str):
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=LETTER,
        rightMargin=0.65 * inch,
        leftMargin=0.65 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
        title="Botz Stack e Integraciones",
    )

    h1 = ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=17, leading=21, spaceBefore=8, spaceAfter=6)
    h2 = ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=13, leading=16, spaceBefore=7, spaceAfter=4)
    body = ParagraphStyle("body", fontName="Helvetica", fontSize=10, leading=13, spaceAfter=3)
    mono = ParagraphStyle("mono", fontName="Courier", fontSize=9, leading=12, leftIndent=10, spaceAfter=2)

    story = []
    in_code = False

    for raw in load_lines(md_path):
        line = raw.strip()

        if line.startswith("```"):
            in_code = not in_code
            story.append(Spacer(1, 4))
            continue

        if in_code:
            safe = raw.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            story.append(Paragraph(safe, mono))
            continue

        if not line:
            story.append(Spacer(1, 5))
            continue

        if line.startswith("# "):
            text = line[2:].strip()
            story.append(Paragraph(text, h1))
            continue

        if line.startswith("## "):
            text = line[3:].strip()
            story.append(Paragraph(text, h2))
            continue

        if line.startswith("- "):
            text = "• " + line[2:].strip()
        else:
            text = line

        safe = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        story.append(Paragraph(safe, body))

    doc.build(story)


if __name__ == "__main__":
    to_pdf("docs/BOTZ_STACK_E_INTEGRACIONES.md", "BOTZ_STACK_E_INTEGRACIONES.pdf")
    print("BOTZ_STACK_E_INTEGRACIONES.pdf")
