export function extractIndexText(input: { fileName: string; note: string; mimeType: string; contentBase64: string }) {
  const chunks = [input.fileName, input.note, input.mimeType];
  if (input.mimeType.includes("pdf") || input.fileName.toLowerCase().endsWith(".pdf")) {
    chunks.push(readablePdfStrings(input.contentBase64));
  }
  return chunks
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
}

function readablePdfStrings(base64: string) {
  try {
    const binary = atob(base64);
    const matches = binary.match(/[\x20-\x7E]{6,}/g) ?? [];
    return matches
      .filter((item) => /[A-Za-z]/.test(item) && !item.startsWith("<<"))
      .slice(0, 80)
      .join(" ");
  } catch {
    return "";
  }
}
