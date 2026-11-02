import pymupdf


def extract_text(path: str) -> str:
    """Extract and concatenate text from all pages of a PDF file."""
    doc = pymupdf.open(path)
    try:
        pages = [page.get_text() for page in doc]
    finally:
        doc.close()
    return "\n".join(pages).strip()


def chunk_text(text: str, max_chars: int = 1000, overlap: int = 200) -> list[str]:
    """Split text into overlapping character windows. Empty text -> []."""
    text = text.strip()
    if not text:
        return []
    chunks: list[str] = []
    start = 0
    length = len(text)
    while start < length:
        end = min(start + max_chars, length)
        chunks.append(text[start:end])
        if end >= length:
            break
        start = end - overlap
    return chunks
