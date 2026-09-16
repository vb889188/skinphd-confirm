/** Minimal multi-page text PDF. No extra dependency. */

function pdfEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function textPagesToPdf(lines: string[]): Uint8Array {
  const pageWidth = 595;
  const pageHeight = 842;
  const left = 50;
  const top = 800;
  const leading = 13;
  const maxLines = 54;
  const pages: string[][] = [];
  let current: string[] = [];
  for (const raw of lines) {
    const line = raw.length > 110 ? `${raw.slice(0, 107)}...` : raw;
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
      const text = pdfEscape(line || " ");
      if (idx === 0) commands.push(`(${text}) Tj`);
      else commands.push(`T* (${text}) Tj`);
    });
    commands.push("ET");
    const stream = commands.join("\n");
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");

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
  return new TextEncoder().encode(out);
}

export function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  if (typeof btoa === "function") return btoa(binary);
  return Buffer.from(bytes).toString("base64");
}
