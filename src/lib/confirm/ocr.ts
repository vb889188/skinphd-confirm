import { extractIndexText } from "./index-text";

export async function recognizeDocument(input: {
  fileName: string;
  note: string;
  mimeType: string;
  contentBase64: string;
}) {
  const baseline = extractIndexText(input);
  try {
    if (input.mimeType.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(input.fileName)) {
      const text = await ocrDataUrl(`data:${input.mimeType};base64,${input.contentBase64}`);
      return [baseline, text].join(" ").replace(/\s+/g, " ").trim().slice(0, 4000);
    }
    if (input.mimeType.includes("pdf") || input.fileName.toLowerCase().endsWith(".pdf")) {
      const fromPdf = await readPdf(input.contentBase64);
      if (fromPdf.text.replace(/\s/g, "").length > 40) {
        return [baseline, fromPdf.text].join(" ").replace(/\s+/g, " ").trim().slice(0, 4000);
      }
      if (fromPdf.image) {
        const text = await ocrDataUrl(fromPdf.image);
        return [baseline, text].join(" ").replace(/\s+/g, " ").trim().slice(0, 4000);
      }
    }
  } catch {
    return baseline;
  }
  return baseline;
}

async function ocrDataUrl(dataUrl: string) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(dataUrl);
    return data.text ?? "";
  } finally {
    await worker.terminate();
  }
}

async function readPdf(base64: string) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
  const data = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const doc = await pdfjs.getDocument({ data }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();
  const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
  if (text.replace(/\s/g, "").length > 40) {
    return { text, image: "" };
  }
  const viewport = page.getViewport({ scale: 1.4 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext("2d");
  if (!context) return { text, image: "" };
  await page.render({ canvasContext: context, viewport }).promise;
  return { text, image: canvas.toDataURL("image/png") };
}
