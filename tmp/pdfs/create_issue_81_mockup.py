from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    LongTable,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "output" / "pdf" / "niduna-informe-personalizado-ejemplo.pdf"
ICON = ROOT / "assets" / "images" / "icon.png"

NAVY = colors.HexColor("#18234B")
MUTED = colors.HexColor("#65708F")
CREAM = colors.HexColor("#FFF9EC")
SURFACE = colors.HexColor("#FFFFFF")
BORDER = colors.HexColor("#E7DEC8")
AQUA = colors.HexColor("#48C9C4")
AQUA_SOFT = colors.HexColor("#DDF5F3")
CORAL = colors.HexColor("#FF756B")
CORAL_SOFT = colors.HexColor("#FFE0D8")
BUTTER = colors.HexColor("#FFD86B")
BUTTER_SOFT = colors.HexColor("#FFF0B5")
LAVENDER = colors.HexColor("#C8A9F0")
LAVENDER_SOFT = colors.HexColor("#EEE3FA")


def register_fonts():
    regular = Path("C:/Windows/Fonts/arial.ttf")
    bold = Path("C:/Windows/Fonts/arialbd.ttf")
    if regular.exists() and bold.exists():
        pdfmetrics.registerFont(TTFont("Niduna", str(regular)))
        pdfmetrics.registerFont(TTFont("Niduna-Bold", str(bold)))
        return "Niduna", "Niduna-Bold"
    return "Helvetica", "Helvetica-Bold"


FONT, FONT_BOLD = register_fonts()


def draw_header_footer(canvas, doc):
    width, height = A4
    canvas.saveState()
    canvas.setFillColor(CREAM)
    canvas.rect(0, 0, width, height, stroke=0, fill=1)

    canvas.drawImage(str(ICON), 18 * mm, height - 20 * mm, 10 * mm, 10 * mm, mask="auto")
    canvas.setFillColor(NAVY)
    canvas.setFont(FONT_BOLD, 13)
    canvas.drawString(31 * mm, height - 14 * mm, "Niduna")
    canvas.setFillColor(MUTED)
    canvas.setFont(FONT, 7.5)
    canvas.drawString(31 * mm, height - 18 * mm, "Coordinación familiar del cuidado")

    canvas.setFillColor(NAVY)
    canvas.setFont(FONT_BOLD, 8.5)
    canvas.drawRightString(width - 18 * mm, height - 14 * mm, "Familia de Stephanie")
    canvas.setFillColor(MUTED)
    canvas.setFont(FONT, 7.5)
    canvas.drawRightString(width - 18 * mm, height - 18 * mm, "Bebé: Stephanie")

    footer_y = 12 * mm
    canvas.setStrokeColor(BORDER)
    canvas.line(18 * mm, footer_y + 5 * mm, width - 18 * mm, footer_y + 5 * mm)
    canvas.setFont(FONT, 7.2)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, footer_y, "niduna.com  |  Generado el 2 sep 2026 a las 11:45")
    canvas.drawRightString(width - 18 * mm, footer_y, f"Página {doc.page}")
    canvas.restoreState()


class NidunaDocTemplate(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(
            filename,
            pagesize=A4,
            leftMargin=18 * mm,
            rightMargin=18 * mm,
            topMargin=27 * mm,
            bottomMargin=23 * mm,
            title="Ejemplo de informe personalizado - Niduna",
            author="Niduna",
        )
        frame = Frame(
            self.leftMargin,
            self.bottomMargin,
            self.width,
            self.height,
            id="content",
            leftPadding=0,
            rightPadding=0,
            topPadding=0,
            bottomPadding=0,
        )
        self.addPageTemplates(PageTemplate(id="main", frames=[frame], onPage=draw_header_footer))


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="Eyebrow", fontName=FONT_BOLD, fontSize=8, leading=10, textColor=CORAL, spaceAfter=3, tracking=1.2))
styles.add(ParagraphStyle(name="HeroTitle", fontName=FONT_BOLD, fontSize=24, leading=28, textColor=NAVY, spaceAfter=5))
styles.add(ParagraphStyle(name="BodyNiduna", fontName=FONT, fontSize=9.5, leading=14, textColor=MUTED))
styles.add(ParagraphStyle(name="Section", fontName=FONT_BOLD, fontSize=14, leading=18, textColor=NAVY, spaceBefore=4, spaceAfter=8))
styles.add(ParagraphStyle(name="Small", fontName=FONT, fontSize=7.5, leading=10, textColor=MUTED))
styles.add(ParagraphStyle(name="TableHead", fontName=FONT_BOLD, fontSize=7.2, leading=9, textColor=NAVY))
styles.add(ParagraphStyle(name="TableCell", fontName=FONT, fontSize=7.5, leading=10, textColor=NAVY))
styles.add(ParagraphStyle(name="TableCellBold", fontName=FONT_BOLD, fontSize=7.5, leading=10, textColor=NAVY))


def panel_table(items, widths, background=AQUA_SOFT):
    table = Table([items], colWidths=widths, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), background),
        ("BOX", (0, 0), (-1, -1), 0.7, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ("ROUNDEDCORNERS", [10]),
    ]))
    return table


def summary_card(title, main, detail, note, accent, soft):
    content = [
        Paragraph(title.upper(), ParagraphStyle("card-eye", parent=styles["Eyebrow"], textColor=accent, fontSize=7)),
        Paragraph(main, ParagraphStyle("card-main", fontName=FONT_BOLD, fontSize=15, leading=18, textColor=NAVY, spaceAfter=4)),
        Paragraph(detail, ParagraphStyle("card-detail", fontName=FONT, fontSize=8, leading=11, textColor=MUTED, spaceAfter=2)),
        Paragraph(note, ParagraphStyle("card-note", fontName=FONT_BOLD, fontSize=7.2, leading=10, textColor=NAVY)),
    ]
    card = Table([[content]], colWidths=[82 * mm], rowHeights=[35 * mm])
    card.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), soft),
        ("BOX", (0, 0), (-1, -1), 0.8, accent),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 11),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("ROUNDEDCORNERS", [10]),
    ]))
    return card


def build_story():
    story = [
        Spacer(1, 4 * mm),
        Paragraph("INFORME PERSONALIZADO", styles["Eyebrow"]),
        Paragraph("Cuidados de Stephanie", styles["HeroTitle"]),
        Paragraph("Un resumen claro del relevo compartido por la familia durante el periodo seleccionado.", styles["BodyNiduna"]),
        Spacer(1, 5 * mm),
    ]

    period = panel_table([
        Paragraph("<b>PERIODO</b><br/>26 ago - 1 sep 2026", styles["BodyNiduna"]),
        Paragraph("<b>FILTROS</b><br/>Todos los cuidados", styles["BodyNiduna"]),
        Paragraph("<b>REGISTROS</b><br/>19 resultados", styles["BodyNiduna"]),
        Paragraph("<b>COLUMNAS</b><br/>Fecha, tipo, detalle y persona", styles["BodyNiduna"]),
    ], [43.5 * mm] * 4)
    story.extend([period, Spacer(1, 6 * mm), Paragraph("Resumen del periodo", styles["Section"])])

    cards = Table([
        [summary_card("Alimentación", "7 tomas", "540 ml registrados", "Intervalo medio: 3 h 10 min", CORAL, CORAL_SOFT), summary_card("Pañales", "11 cambios", "7 pipí · 1 caca · 3 mixtos", "Actividad del periodo", colors.HexColor("#B78A00"), BUTTER_SOFT)],
        [summary_card("Sueño", "0 min", "Todavía no hay sueño registrado", "Sin datos para promediar", colors.HexColor("#7756A8"), LAVENDER_SOFT), summary_card("Notas", "1 nota", "Compartida por la familia", "Incluida en el detalle", colors.HexColor("#177D79"), AQUA_SOFT)],
    ], colWidths=[86 * mm, 86 * mm], rowHeights=[37 * mm, 37 * mm], hAlign="LEFT")
    cards.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 4), ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    story.extend([cards, Spacer(1, 3 * mm), Paragraph("Contactos incluidos", styles["Section"])])

    contacts = panel_table([
        Paragraph("<b>Pediatra - Dra. Laura Martín</b><br/>+34 600 123 456<br/>Centro Pediátrico Norte", styles["BodyNiduna"]),
        Paragraph("<b>Hospital de referencia</b><br/>+34 900 000 112<br/>Calle Salud 18, Madrid", styles["BodyNiduna"]),
    ], [87 * mm, 87 * mm], background=SURFACE)
    story.extend([contacts, Spacer(1, 6 * mm), Paragraph("Detalle de registros", styles["Section"])])

    rows = [
        ("1 sep 2026, 22:10", "Alimentación", "Fórmula · 80 ml · Blemil Confort", "Alejandro"),
        ("1 sep 2026, 20:40", "Pañal", "Pipí", "Stephanie"),
        ("1 sep 2026, 18:55", "Alimentación", "Pecho · 18 min", "Stephanie"),
        ("1 sep 2026, 16:05", "Pañal", "Mixto", "Alejandro"),
        ("1 sep 2026, 14:40", "Nota", "Vitamina D administrada después de la toma.", "Stephanie"),
        ("1 sep 2026, 13:20", "Alimentación", "Fórmula · 70 ml", "Alejandro"),
        ("1 sep 2026, 11:15", "Pañal", "Pipí", "Stephanie"),
        ("1 sep 2026, 09:05", "Alimentación", "Pecho · 22 min", "Stephanie"),
        ("1 sep 2026, 07:25", "Pañal", "Caca", "Alejandro"),
        ("1 sep 2026, 05:55", "Alimentación", "Fórmula · 90 ml", "Alejandro"),
        ("1 sep 2026, 03:10", "Pañal", "Pipí", "Stephanie"),
        ("31 ago 2026, 23:45", "Alimentación", "Pecho · 16 min", "Stephanie"),
        ("31 ago 2026, 21:30", "Pañal", "Mixto", "Alejandro"),
        ("31 ago 2026, 19:20", "Alimentación", "Fórmula · 80 ml", "Alejandro"),
        ("31 ago 2026, 17:10", "Pañal", "Pipí", "Stephanie"),
        ("31 ago 2026, 14:05", "Pañal", "Pipí", "Alejandro"),
        ("31 ago 2026, 11:50", "Pañal", "Mixto", "Stephanie"),
        ("31 ago 2026, 08:35", "Pañal", "Pipí", "Alejandro"),
        ("31 ago 2026, 05:40", "Pañal", "Pipí", "Stephanie"),
    ]
    table_data = [[Paragraph("FECHA", styles["TableHead"]), Paragraph("TIPO", styles["TableHead"]), Paragraph("DETALLE", styles["TableHead"]), Paragraph("REGISTRADO POR", styles["TableHead"])]]
    for date, event_type, detail, author in rows:
        table_data.append([
            Paragraph(date, styles["TableCell"]),
            Paragraph(event_type, styles["TableCellBold"]),
            Paragraph(detail, styles["TableCell"]),
            Paragraph(author, styles["TableCell"]),
        ])

    records = LongTable(table_data, colWidths=[38 * mm, 30 * mm, 70 * mm, 36 * mm], repeatRows=1, hAlign="LEFT")
    records.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), AQUA_SOFT),
        ("BOX", (0, 0), (-1, -1), 0.6, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [SURFACE, colors.HexColor("#FAF6EC")]),
    ]))
    story.extend([
        records,
        Spacer(1, 5 * mm),
        KeepTogether([
            panel_table([
                Paragraph("<b>Importante</b><br/>Este informe ayuda a coordinar el cuidado familiar. No sustituye una historia clínica, una valoración médica ni los servicios de emergencia.", styles["BodyNiduna"]),
            ], [174 * mm], background=LAVENDER_SOFT),
        ]),
    ])
    return story


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = NidunaDocTemplate(str(OUTPUT))
    doc.build(build_story())
    print(OUTPUT)


if __name__ == "__main__":
    main()
