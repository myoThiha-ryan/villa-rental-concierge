/** PostgREST/pgvector expects vector columns as a "[0.1,0.2,...]" string literal. */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
