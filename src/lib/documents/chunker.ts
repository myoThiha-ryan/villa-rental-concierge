export interface TextChunk {
  content: string;
  index: number;
}

/**
 * Splits text into overlapping chunks suitable for embedding. Tries to break on
 * paragraph then sentence boundaries to keep chunks semantically coherent.
 */
export function chunkText(
  text: string,
  options?: { chunkSize?: number; overlap?: number }
): TextChunk[] {
  const chunkSize = options?.chunkSize ?? 1000;
  const overlap = options?.overlap ?? 150;

  const normalized = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!normalized) return [];

  // Split into paragraphs first, then accumulate into chunks.
  const paragraphs = normalized.split(/\n\n+/);
  const chunks: TextChunk[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (para.length > chunkSize) {
      // Flush current, then hard-split the oversized paragraph.
      if (current.trim()) {
        chunks.push({ content: current.trim(), index: chunks.length });
        current = "";
      }
      for (const piece of splitLong(para, chunkSize, overlap)) {
        chunks.push({ content: piece, index: chunks.length });
      }
      continue;
    }

    if ((current + "\n\n" + para).length > chunkSize) {
      chunks.push({ content: current.trim(), index: chunks.length });
      // Start the next chunk with a tail of the previous one for context overlap.
      current = current.slice(-overlap) + "\n\n" + para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }

  if (current.trim()) {
    chunks.push({ content: current.trim(), index: chunks.length });
  }

  return chunks;
}

function splitLong(text: string, chunkSize: number, overlap: number): string[] {
  const pieces: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    pieces.push(text.slice(start, end).trim());
    if (end === text.length) break;
    start = end - overlap;
  }
  return pieces;
}
