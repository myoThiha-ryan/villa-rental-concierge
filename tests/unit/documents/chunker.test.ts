import { describe, it, expect } from "vitest";
import { chunkText } from "@/lib/documents/chunker";

describe("chunkText", () => {
  it("returns empty array for empty input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n\n  ")).toEqual([]);
  });

  it("keeps short text as a single chunk", () => {
    const chunks = chunkText("The wifi password is sunset123.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toContain("sunset123");
    expect(chunks[0].index).toBe(0);
  });

  it("splits long text into multiple sequentially-indexed chunks", () => {
    const para = "word ".repeat(400); // ~2000 chars
    const chunks = chunkText(para, { chunkSize: 500, overlap: 50 });
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c, i) => expect(c.index).toBe(i));
  });

  it("respects paragraph boundaries when accumulating", () => {
    const text = "Para one is here.\n\nPara two is here.\n\nPara three is here.";
    const chunks = chunkText(text, { chunkSize: 1000 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toContain("Para one");
    expect(chunks[0].content).toContain("Para three");
  });
});
