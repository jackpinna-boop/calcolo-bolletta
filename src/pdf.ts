export type PdfSection = { heading: string; lines: string[] };

const cp1252: Record<string, number> = {
  "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86,
  "‡": 0x87, "ˆ": 0x88, "‰": 0x89, "Š": 0x8a, "‹": 0x8b, "Œ": 0x8c,
  "Ž": 0x8e, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95,
  "–": 0x96, "—": 0x97, "˜": 0x98, "™": 0x99, "š": 0x9a, "›": 0x9b,
  "œ": 0x9c, "ž": 0x9e, "Ÿ": 0x9f,
};

type RGB = [number, number, number];
type PdfPage = { commands: string; y: number };

const NAVY: RGB = [17, 35, 63];
const GOLD: RGB = [244, 170, 25];
const TEAL: RGB = [16, 52, 61];
const AQUA: RGB = [123, 224, 223];
const INK: RGB = [28, 43, 64];
const MUTED: RGB = [103, 115, 134];
const PALE: RGB = [245, 247, 250];
const WHITE: RGB = [255, 255, 255];
const BORDER: RGB = [222, 228, 236];

function pdfHex(text: string) {
  return Array.from(text).map((char) => {
    const code = cp1252[char] ?? char.charCodeAt(0);
    return (code >= 0 && code <= 255 ? code : 63).toString(16).padStart(2, "0");
  }).join("").toUpperCase();
}

function rgb(color: RGB) {
  return color.map((v) => (v / 255).toFixed(3)).join(" ");
}

function wrap(text: string, width: number) {
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

function drawRect(page: PdfPage, x: number, y: number, width: number, height: number, color: RGB) {
  page.commands += rgb(color) + " rg " + x + " " + y + " " + width + " " + height + " re f\n";
}

function drawLine(page: PdfPage, x1: number, y1: number, x2: number, y2: number, color: RGB, thickness = 1) {
  page.commands += rgb(color) + " RG " + thickness + " w " + x1 + " " + y1 + " m " + x2 + " " + y2 + " l S\n";
}

function drawText(page: PdfPage, text: string, x: number, y: number, size: number, bold: boolean, color: RGB, align: "left" | "right" = "left") {
  const estimatedWidth = text.length * size * (bold ? 0.55 : 0.51);
  const startX = align === "right" ? x - estimatedWidth : x;
  page.commands += rgb(color) + " rg BT /" + (bold ? "F2" : "F1") + " " + size + " Tf 1 0 0 1 " + startX.toFixed(2) + " " + y.toFixed(2) + " Tm <" + pdfHex(text) + "> Tj ET\n";
}

function makePage(title: string, date: string, theme: "light" | "water", continuation: boolean): PdfPage {
  const page: PdfPage = { commands: "", y: 0 };
  const primary = theme === "water" ? TEAL : NAVY;
  const accent = theme === "water" ? AQUA : GOLD;
  drawRect(page, 0, 0, 595, 842, WHITE);
  drawRect(page, 0, 722, 595, 120, primary);
  drawRect(page, 0, 836, 595, 6, accent);
  drawText(page, "CALCOLO BOLLETTA", 42, 808, 9, true, accent);
  drawText(page, title, 42, 779, 21, true, WHITE);
  drawText(page, continuation ? "RIEPILOGO DI CALCOLO · CONTINUA" : "Documento riepilogativo della ripartizione dei consumi", 42, 755, 9, false, [226, 233, 242]);
  drawText(page, "Generato il " + date, 553, 735, 8, false, [226, 233, 242], "right");
  page.y = 700;
  return page;
}

function drawFooter(page: PdfPage, pageNumber: number, totalPages: number, theme: "light" | "water") {
  const accent = theme === "water" ? TEAL : NAVY;
  drawLine(page, 42, 48, 553, 48, BORDER, 0.7);
  drawText(page, "Uso informativo · Verificare i dati con la bolletta originale", 42, 31, 7.5, false, MUTED);
  drawText(page, "Pagina " + pageNumber + " di " + totalPages, 553, 31, 7.5, true, accent, "right");
}

export function downloadSummaryPdf(title: string, filename: string, sections: PdfSection[]) {
  const now = new Date();
  const date = new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short" }).format(now);
  const theme = /acqua|idrica/i.test(title) || /acqua/i.test(filename) ? "water" : "light";
  const primary = theme === "water" ? TEAL : NAVY;
  const accent = theme === "water" ? AQUA : GOLD;
  const pages: PdfPage[] = [makePage(title, date, theme, false)];
  let page = pages[0];

  const newPage = () => {
    page = makePage(title, date, theme, true);
    pages.push(page);
  };

  for (const section of sections) {
    if (page.y < 150) newPage();
    page.y -= 4;
    drawText(page, section.heading.toLocaleUpperCase("it-IT"), 42, page.y, 10, true, primary);
    drawLine(page, 42, page.y - 8, 553, page.y - 8, accent, 2);
    page.y -= 20;

    section.lines.forEach((line, index) => {
      const separator = line.indexOf(":");
      const hasLabel = separator > 0;
      const label = hasLabel ? line.slice(0, separator).trim() : "";
      const value = hasLabel ? line.slice(separator + 1).trim() : line.trim();
      const labelLines = hasLabel ? wrap(label, 39) : [];
      const valueLines = hasLabel ? [] : wrap(value, 88);
      const rowHeight = hasLabel ? Math.max(29, labelLines.length * 11 + 12) : Math.max(25, valueLines.length * 12 + 10);

      if (page.y - rowHeight < 68) {
        newPage();
        drawText(page, section.heading.toLocaleUpperCase("it-IT") + " · CONTINUA", 42, page.y, 9, true, primary);
        drawLine(page, 42, page.y - 8, 553, page.y - 8, accent, 2);
        page.y -= 20;
      }
      drawRect(page, 42, page.y - rowHeight + 3, 511, rowHeight, index % 2 === 0 ? PALE : WHITE);
      if (hasLabel) {
        labelLines.forEach((part, lineIndex) => {
          drawText(page, part, 53, page.y - 12 - lineIndex * 11, 8.5, false, MUTED);
        });
        drawText(page, value, 541, page.y - rowHeight / 2 - 3, 9.5, true, INK, "right");
      } else {
        valueLines.forEach((part, lineIndex) => {
          drawText(page, part, 53, page.y - 13 - lineIndex * 12, 8.5, false, INK);
        });
      }
      page.y -= rowHeight;
    });
    page.y -= 12;
  }

  const lastPage = pages[pages.length - 1];
  if (lastPage.y < 92) newPage();
  const notePage = pages[pages.length - 1];
  notePage.y -= 2;
  drawRect(notePage, 42, notePage.y - 35, 511, 35, theme === "water" ? [235, 249, 249] : [255, 248, 231]);
  drawText(notePage, "NOTA", 53, notePage.y - 14, 7.5, true, primary);
  drawText(notePage, "Documento di supporto alla ripartizione; non sostituisce la fattura del gestore.", 53, notePage.y - 26, 7.5, false, INK);

  pages.forEach((p, index) => drawFooter(p, index + 1, pages.length, theme));

  const objects: string[] = [];
  const add = (value: string) => { objects.push(value); return objects.length; };
  const catalogId = add("");
  const pagesId = add("");
  const regularFontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const boldFontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const pageIds: number[] = [];

  pages.forEach((p) => {
    const stream = p.commands;
    const streamId = add("<< /Length " + stream.length + " >>\nstream\n" + stream + "endstream");
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
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
