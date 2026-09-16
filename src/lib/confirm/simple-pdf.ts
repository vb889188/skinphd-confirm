/** Minimal PDF: text pages plus optional PNG signature marks. No extra dependency. */

function foldPdfText(value: string) {
  const map: Record<string, string> = {
    "\u2018": "'",
    "\u2019": "'",
    "\u201C": '"',
    "\u201D": '"',
    "\u2013": "-",
    "\u2014": "-",
    "\u2026": "...",
    "\u00B7": "-",
    "\u2022": "-",
  };
  let out = "";
  for (const ch of value.normalize("NFKD")) {
    if (map[ch]) {
      out += map[ch];
      continue;
    }
    const code = ch.charCodeAt(0);
    if (code >= 0x0300 && code <= 0x036f) continue;
    if (code <= 255) out += ch;
    else out += "?";
  }
  return out;
}

function pdfLiteral(value: string) {
  let s = "";
  for (const ch of foldPdfText(value)) {
    const code = ch.charCodeAt(0);
    if (ch === "\\" || ch === "(" || ch === ")") s += `\\${ch}`;
    else if (code < 32 || code > 126) s += `\\${code.toString(8).padStart(3, "0")}`;
    else s += ch;
  }
  return s;
}

function wrapLine(raw: string, width: number) {
  const text = foldPdfText(raw);
  if (text.length <= width) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!word) continue;
    if (!current) {
      current = word.length > width ? word.slice(0, width) : word;
      continue;
    }
    if (`${current} ${word}`.length <= width) current = `${current} ${word}`;
    else {
      lines.push(current);
      current = word.length > width ? word.slice(0, width) : word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function assemblePdf(objects: string[]) {
  let out = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(out.length);
    out += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n`;
  out += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    out += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i += 1) bytes[i] = out.charCodeAt(i) & 0xff;
  return bytes;
}

export function textPagesToPdf(lines: string[]): Uint8Array {
  const pageWidth = 595;
  const pageHeight = 842;
  const left = 50;
  const top = 800;
  const leading = 13;
  const maxLines = 54;
  const wrapped = lines.flatMap((line) => wrapLine(line, 90));
  const pages: string[][] = [];
  let current: string[] = [];
  for (const line of wrapped) {
    current.push(line);
    if (current.length >= maxLines) {
      pages.push(current);
      current = [];
    }
  }
  if (current.length) pages.push(current);
  if (!pages.length) pages.push([""]);

  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  const pageIds = pages.map((_, i) => 3 + i * 2);
  objects.push(
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`,
  );

  pages.forEach((pageLines, i) => {
    const pageObj = 3 + i * 2;
    const contentObj = pageObj + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentObj} 0 R /Resources << /Font << /F1  ${3 + pages.length * 2} 0 R >> >> >>`,
    );
    const commands = ["BT", "/F1 10 Tf", `${left} ${top} Td`, `${leading} TL`];
    pageLines.forEach((line, idx) => {
      const text = pdfLiteral(line || " ");
      if (idx === 0) commands.push(`(${text}) Tj`);
      else commands.push(`T* (${text}) Tj`);
    });
    commands.push("ET");
    const stream = commands.join("\n");
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>");
  return assemblePdf(objects);
}

export type SignatureMark = {
  role: string;
  typedName: string;
  signedAt: string;
  how: string;
  consent: boolean;
  pngRgb?: { width: number; height: number; bytes: Uint8Array } | null;
};

function rgbStream(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]);
  return s;
}

export function signedRecordToPdf(headerLines: string[], marks: SignatureMark[], wording: string[]): Uint8Array {
  const pageWidth = 595;
  const pageHeight = 842;
  const objects: string[] = [];
  objects.push("placeholder-catalog");
  objects.push("placeholder-pages");
  const pageObjectNumbers: number[] = [];
  const courierId = { n: 0 };
  const signFontId = { n: 0 };

  const addPage = (content: string, extraXObjects: string) => {
    const pageNo = objects.length + 1;
    const contentNo = pageNo + 1;
    pageObjectNumbers.push(pageNo);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentNo} 0 R /Resources << /Font << /F1  COURIER 0 R /F2  SIGNFONT 0 R >> /XObject << ${extraXObjects} >> >> >>`,
    );
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  };

  const header = headerLines.flatMap((line) => wrapLine(line, 88));
  let y = 800;
  const cmds: string[] = [];
  const pushText = (font: string, size: number, x: number, yy: number, text: string) => {
    cmds.push("BT", `${font} ${size} Tf`, `${x} ${yy} Td`, `(${pdfLiteral(text)}) Tj`, "ET");
  };
  pushText("/F2", 16, 50, y, "SkinPhD Confirm  -  Certificate of record");
  y -= 22;
  for (const line of header) {
    pushText("/F1", 10, 50, y, line);
    y -= 13;
  }
  y -= 8;
  pushText("/F1", 12, 50, y, "Signatures");
  y -= 18;

  const xobjectsOnCover: string[] = [];
  marks.forEach((mark, index) => {
    if (y < 220) {
      addPage(cmds.join("\n"), xobjectsOnCover.join(" "));
      cmds.length = 0;
      xobjectsOnCover.length = 0;
      y = 800;
    }
    pushText("/F1", 11, 50, y, `${mark.role}`);
    y -= 16;
    pushText("/F2", 18, 50, y, mark.typedName || "Name not typed");
    y -= 16;
    pushText("/F1", 9, 50, y, `${mark.signedAt}   ${mark.how}   consent: ${mark.consent ? "yes" : "no"}`);
    y -= 14;
    cmds.push("0.72 0.53 0.23 RG", "1.2 w", "50 " + y + " m", "320 " + y + " l", "S");
    y -= 8;
    if (mark.pngRgb && mark.pngRgb.width > 0 && mark.pngRgb.height > 0) {
      const imgObj = objects.length + 1;
      const raw = rgbStream(mark.pngRgb.bytes);
      objects.push(
        `<< /Type /XObject /Subtype /Image /Width ${mark.pngRgb.width} /Height ${mark.pngRgb.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${raw.length} >>\nstream\n${raw}\nendstream`,
      );
      const name = `/Im${index + 1}`;
      xobjectsOnCover.push(`${name} ${imgObj} 0 R`);
      const drawW = 240;
      const drawH = Math.max(36, Math.round((mark.pngRgb.height / mark.pngRgb.width) * drawW));
      y -= drawH;
      cmds.push("q", `${drawW} 0 0 ${drawH} 50 ${y} cm`, `${name} Do`, "Q");
      y -= 16;
    } else {
      pushText("/F1", 9, 50, y, "Typed name only. No drawn mark was captured.");
      y -= 18;
    }
    y -= 10;
  });
  addPage(cmds.join("\n"), xobjectsOnCover.join(" "));

  const wordingLines = wording.flatMap((line) => wrapLine(line, 90));
  const maxLines = 52;
  for (let i = 0; i < wordingLines.length; i += maxLines) {
    const slice = wordingLines.slice(i, i + maxLines);
    const body = ["BT", "/F1 10 Tf", "50 800 Td", "13 TL"];
    slice.forEach((line, idx) => {
      const text = pdfLiteral(line || " ");
      body.push(idx === 0 ? `(${text}) Tj` : `T* (${text}) Tj`);
    });
    body.push("ET");
    addPage(body.join("\n"), "");
  }

  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>");
  courierId.n = objects.length;
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic /Encoding /WinAnsiEncoding >>");
  signFontId.n = objects.length;
  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((n) => `${n} 0 R`).join(" ")}] /Count ${pageObjectNumbers.length} >>`;
  for (let i = 0; i < objects.length; i += 1) {
    objects[i] = objects[i].replace(/COURIER/g, String(courierId.n)).replace(/SIGNFONT/g, String(signFontId.n));
  }
  return assemblePdf(objects);
}

export async function pngDataUrlToRgb(dataUrl: string | null | undefined) {
  if (!dataUrl || typeof document === "undefined") return null;
  if (!dataUrl.startsWith("data:image")) return null;
  try {
    const image = new Image();
    image.src = dataUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("mark"));
    });
    const width = Math.min(640, Math.max(1, image.naturalWidth || image.width));
    const height = Math.min(240, Math.max(1, image.naturalHeight || image.height));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    const pixels = ctx.getImageData(0, 0, width, height).data;
    const rgb = new Uint8Array(width * height * 3);
    let o = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const a = pixels[i + 3] / 255;
      rgb[o] = Math.round(pixels[i] * a + 255 * (1 - a));
      rgb[o + 1] = Math.round(pixels[i + 1] * a + 255 * (1 - a));
      rgb[o + 2] = Math.round(pixels[i + 2] * a + 255 * (1 - a));
      o += 3;
    }
    return { width, height, bytes: rgb };
  } catch {
    return null;
  }
}

export function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  if (typeof btoa === "function") return btoa(binary);
  return Buffer.from(bytes).toString("base64");
}
