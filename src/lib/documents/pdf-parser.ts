/**
 * Extracts plain text from a PDF buffer. pdf-parse (v2) is imported lazily so the
 * dependency only loads in the server route that needs it.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}
