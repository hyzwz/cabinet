import JSZip from "jszip";

export interface PptxSlidePreview {
  index: number;
  title: string;
  paragraphs: string[];
}

export interface PptxPreview {
  slideCount: number;
  slides: PptxSlidePreview[];
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#([0-9]+);/g, (_match, decimal: string) =>
      String.fromCodePoint(parseInt(decimal, 10))
    )
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function normalizeParagraph(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractParagraphs(slideXml: string): string[] {
  const paragraphs: string[] = [];
  const paragraphMatches = slideXml.matchAll(/<(?:\w+:)?p\b[\s\S]*?<\/(?:\w+:)?p>/g);

  for (const paragraphMatch of paragraphMatches) {
    const paragraphXml = paragraphMatch[0];
    const textRuns = Array.from(
      paragraphXml.matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g),
      (match) => decodeXmlText(match[1])
    );
    const paragraph = normalizeParagraph(textRuns.join(""));
    if (paragraph) paragraphs.push(paragraph);
  }

  return paragraphs;
}

function getSlideNumber(filename: string): number {
  const match = filename.match(/slide(\d+)\.xml$/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

export async function parsePptxPreview(buffer: Buffer | ArrayBuffer | Uint8Array): Promise<PptxPreview> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((filename) => /^ppt\/slides\/slide\d+\.xml$/.test(filename))
    .sort((a, b) => getSlideNumber(a) - getSlideNumber(b));

  const slides: PptxSlidePreview[] = [];

  for (const filename of slideFiles) {
    const slideXml = await zip.file(filename)?.async("text");
    if (!slideXml) continue;

    const paragraphs = extractParagraphs(slideXml);
    slides.push({
      index: getSlideNumber(filename),
      title: paragraphs[0] || `Slide ${slides.length + 1}`,
      paragraphs,
    });
  }

  return {
    slideCount: slides.length,
    slides,
  };
}
