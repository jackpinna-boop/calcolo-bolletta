export type PdfSection = { heading: string; lines: string[] };

const cp1252: Record<string, number> = {
  "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86,
  "‡": 0x87, "ˆ": 0x88, "‰": 0x89, "Š": 0x8a, "‹": 0x8b, "Œ": 0x8c,
  "Ž": 0x8e, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95,
  "–": 0x96, "—": 0x97, "˜": 0x98, "™": 0x99, "š": 0x9a, "›": 0x9b,
  "œ": 0x9c, "ž": 0x9e, "Ÿ": 0x9f,
};

function pdfHex(text: string) {
  return Array.from(text).map((char) => {
    const code = cp1252[char] ?? char.charCodeAt(0);
    return (code >= 0 && code <= 255 ? code : 63).toString(16).padStart(2, "0");
  }).join("").toUpperCase();
}

function wrap(text: string, width = 88) {
  if (!text) return [""];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (line && (line + " " + word).length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? line + " " + word : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function downloadSummaryPdf(title: string, filename: string, sections: PdfSection[]) {
  const now = new Date();
  const date = new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short" }).format(now);
  const rows: Array<{ text: string; kind: "title" | "meta" | "heading" | "body" | "gap" }> = [
    { text: title, kind: "title" },
    { text: "Generato il " + date, kind: "meta" },
    { text: "Documento riepilogativo dei calcoli inseriti nell'applicazione Calcolo Bolletta.", kind: "meta" },
    { text: "", kind: "gap" },
  ];
  for (const section of sections) {
    rows.push({ text: section.heading, kind: "heading" });
    for (const line of section.lines) {
      for (const part of wrap(line)) rows.push({ text: part, kind: "body" });
    }
    rows.push({ text: "", kind: "gap" });
  }
  rows.push({ text: "Nota: riepilogo di ripartizione a uso informativo; verificare i dati della bolletta originale.", kind: "meta" });

  const pageRows: typeof rows[] = [];
  let current: typeof rows = [];
  let used = 0;
  for (const row of rows) {
    const height = row.kind === "title" ? 28 : row.kind === "heading" ? 22 : row.kind === "gap" ? 10 : 16;
    if (used + height > 700 && current.length) {
      pageRows.push(current);
      current = [];
      used = 0;
    }
    current.push(row);
    used += height;
  }
  if (current.length) pageRows.push(current);

  const objects: string[] = [];
  const add = (value: string) => { objects.push(value); return objects.length; };
  const catalogId = add("");
  const pagesId = add("");
  const regularFontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const boldFontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const pageIds: number[] = [];
  pageRows.forEach((page) => {
    let commands = "";
    let y = 790;
    for (const row of page) {
      if (row.kind === "gap") { y -= 10; continue; }
      const size = row.kind === "title" ? 17 : row.kind === "heading" ? 12 : row.kind === "meta" ? 9 : 10;
      const font = row.kind === "title" || row.kind === "heading" ? "F2" : "F1";
      commands += "BT /" + font + " " + size + " Tf 48 " + y + " Td <" + pdfHex(row.text) + "> Tj ET\n";
      y -= row.kind === "title" ? 28 : row.kind === "heading" ? 22 : 16;
    }
    const streamId = add("<< /Length " + commands.length + " >>\nstream\n" + commands + "endstream");
    const pageId = add("<< /Type /Page /Parent " + pagesId + " 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 " + regularFontId + " 0 R /F2 " + boldFontId + " 0 R >> >> /Contents " + streamId + " 0 R >>");
    pageIds.push(pageId);
  });
  objects[catalogId - 1] = "<< /Type /Catalog /Pages " + pagesId + " 0 R >>";
  objects[pagesId - 1] = "<< /Type /Pages /Kids [" + pageIds.map((id) => id + " 0 R").join(" ") + "] /Count " + pageIds.length + " >>";

  let document = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(document.length);
    document += (index + 1) + " 0 obj\n" + object + "\nendobj\n";
  });
  const xrefOffset = document.length;
  document += "xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i++) document += offsets[i].toString().padStart(10, "0") + " 00000 n \n";
  document += "trailer\n<< /Size " + (objects.length + 1) + " /Root " + catalogId + " 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF";
  const blob = new Blob([document], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = filename + "-" + now.toISOString().slice(0, 10) + ".pdf";
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
