function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function buildSimplePdf(title: string, lines: string[]) {
  const safeTitle = escapePdfText(title);
  const allLines = lines.map((line) => escapePdfText(line));
  const linesPerPage = 42;
  const pages: string[][] = [];
  for (let i = 0; i < allLines.length; i += linesPerPage) {
    pages.push(allLines.slice(i, i + linesPerPage));
  }
  if (pages.length === 0) pages.push([]);

  let objectIndex = 1;
  const objects: string[] = [];
  const pageObjects: number[] = [];

  const catalogId = objectIndex++;
  const pagesId = objectIndex++;
  const fontId = objectIndex++;

  pages.forEach((pageLines) => {
    const pageId = objectIndex++;
    const contentId = objectIndex++;
    const commands = [
      "BT",
      "/F1 18 Tf",
      "50 790 Td",
      `(${safeTitle}) Tj`,
      "/F1 10 Tf",
      "0 -24 Td",
      ...pageLines.map((line) => `(${line}) Tj T*`),
      "ET",
    ].join("\n");
    objects[pageId] =
      `${pageId} 0 obj\n<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>\nendobj\n`;
    objects[contentId] =
      `${contentId} 0 obj\n<< /Length ${commands.length} >>\nstream\n${commands}\nendstream\nendobj\n`;
    pageObjects.push(pageId);
  });

  objects[catalogId] = `${catalogId} 0 obj\n<< /Type /Catalog /Pages ${pagesId} 0 R >>\nendobj\n`;
  objects[pagesId] = `${pagesId} 0 obj\n<< /Type /Pages /Kids [${pageObjects
    .map((id) => `${id} 0 R`)
    .join(" ")}] /Count ${pageObjects.length} >>\nendobj\n`;
  objects[fontId] = `${fontId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;

  const header = "%PDF-1.4\n";
  let body = "";
  const xref: number[] = [];
  xref[0] = 0;
  for (let i = 1; i < objectIndex; i += 1) {
    xref[i] = header.length + body.length;
    body += objects[i];
  }

  const xrefOffset = header.length + body.length;
  let xrefText = `xref\n0 ${objectIndex}\n0000000000 65535 f \n`;
  for (let i = 1; i < objectIndex; i += 1) {
    xrefText += `${xref[i].toString().padStart(10, "0")} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objectIndex} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(`${header}${body}${xrefText}${trailer}`, "binary");
}
