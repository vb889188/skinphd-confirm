export type ExtractedSource = {
  fileName: string;
  content: string;
  name: string;
  module: string;
  category: "training" | "equipment" | "internal_waiver";
  dailyRateRands: number | null;
  defaultDays: number | null;
  passPercent: number | null;
  mandatoryMonths: number | null;
  hasWaiver: boolean;
  equipmentLabel: string | null;
};

export async function extractSourceDocument(file: File): Promise<ExtractedSource> {
  const lower = file.name.toLowerCase();
  let raw = "";
  if (lower.endsWith(".txt") || file.type.startsWith("text/")) raw = await file.text();
  else if (lower.endsWith(".pptx") || lower.endsWith(".zip")) raw = await extractPptxText(await file.arrayBuffer());
  else if (lower.endsWith(".pdf")) raw = await extractPdfText(await file.arrayBuffer());
  else throw new Error("Use a .pptx, .txt, or .pdf source file. Paste wording if the file cannot be read.");

  const content = cleanExtractedText(raw);
  if (content.length < 80) throw new Error("Could not read enough source wording from that file. Paste the printed text.");
  return annotateSource(file.name, content);
}

export function annotateSource(fileName: string, content: string): ExtractedSource {
  const lines = content.split("\n").map((line) => line.trim()).filter(Boolean);
  const heading = lines.find((line) => /agreement|waiver/i.test(line)) ?? lines[0] ?? fileName;
  const module = lines.find((line) => /training module|hydroderm|diode|oneskin|deluxe|sales|dermaplan|algae|product & retail/i.test(line)) ?? heading;
  const category: ExtractedSource["category"] = /waiver/i.test(heading) && !/training|equipment/i.test(heading)
    ? "internal_waiver"
    : /equipment/i.test(content.slice(0, 400))
      ? "equipment"
      : "training";
  const rate = content.match(/R\s*([0-9][0-9\s]*)\s*(?:per day|for the day)/i);
  const days = content.match(/period of\s+\*?_?(\d+)_?\s*day/i) ?? content.match(/course duration is\s+\*?_?(\d+)/i);
  const pass = content.match(/pass(?: grade)? is\s+(\d+)\s*%/i) ?? content.match(/an\s+\*?(\d+)\s*%\*? minimum pass/i);
  const months = content.match(/period of\s+(\d+)\s+months?\s+\(the mandatory period\)/i);
  const equipment = content.match(/deemed cost for the\s+(.+?)\s+is/i);
  return {
    fileName,
    content,
    name: heading.replace(/\s+/g, " ").slice(0, 160),
    module: module.replace(/\s+/g, " ").slice(0, 160),
    category,
    dailyRateRands: rate ? Number(rate[1].replace(/\s+/g, "")) : null,
    defaultDays: days ? Number(days[1]) : null,
    passPercent: pass ? Number(pass[1]) : null,
    mandatoryMonths: months ? Number(months[1]) : null,
    hasWaiver: /waiver & release of liability/i.test(content),
    equipmentLabel: equipment ? equipment[1].trim() : null,
  };
}

function cleanExtractedText(value: string) {
  return value
    .replace(/\u0000/g, "")
    .replace(/A black background with green and white letters[^\n]*/gi, "")
    .replace(/AI-generated content may be incorrect\.?/gi, "")
    .replace(/Text, logo\s+Description automatically generated/gi, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractPptxText(buffer: ArrayBuffer) {
  const files = await unzip(new Uint8Array(buffer));
  const slides = Object.keys(files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const chunks = slides.map((name) => xmlText(files[name] ?? ""));
  return chunks.filter(Boolean).join("\n\n");
}

function xmlText(xml: string) {
  return [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)]
    .map((match) => decodeXml(match[1]))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeXml(value: string) {
  return value
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

async function extractPdfText(buffer: ArrayBuffer) {
  const raw = new TextDecoder("latin1").decode(buffer);
  const matches = [...raw.matchAll(/\((?:\\\)|[^)]){4,}\)/g)].map((match) =>
    match[0].slice(1, -1).replace(/\\n/g, "\n").replace(/\\\)/g, ")").replace(/\\\(/g, "("),
  );
  return matches.join("\n");
}

async function unzip(bytes: Uint8Array) {
  const files: Record<string, string> = {};
  let offset = 0;
  while (offset + 30 <= bytes.length) {
    if (readU32(bytes, offset) !== 0x04034b50) break;
    const method = readU16(bytes, offset + 8);
    const compSize = readU32(bytes, offset + 18);
    const nameLen = readU16(bytes, offset + 26);
    const extraLen = readU16(bytes, offset + 28);
    const name = new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + nameLen));
    const start = offset + 30 + nameLen + extraLen;
    const payload = bytes.slice(start, start + compSize);
    offset = start + compSize;
    if (name.endsWith("/")) continue;
    const inflated = method === 0 ? payload : await inflateRaw(payload);
    files[name] = new TextDecoder().decode(inflated);
  }
  return files;
}

function readU16(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readU32(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
}

async function inflateRaw(payload: Uint8Array) {
  const stream = new Blob([payload as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
