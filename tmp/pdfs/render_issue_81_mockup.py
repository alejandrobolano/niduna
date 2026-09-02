from pathlib import Path

import pypdfium2 as pdfium


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "output" / "pdf" / "niduna-informe-personalizado-ejemplo.pdf"
OUTPUT = ROOT / "tmp" / "pdfs" / "rendered"


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    document = pdfium.PdfDocument(SOURCE)

    for index, page in enumerate(document):
        image = page.render(scale=2.0).to_pil()
        image.save(OUTPUT / f"page-{index + 1}.png")

    print(f"Rendered {len(document)} pages to {OUTPUT}")


if __name__ == "__main__":
    main()
