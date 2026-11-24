// Generates a searchable PDF fixture: two pages by default, more with LEMBARAN_PDF_PAGES.
// Run with: node scripts/make-sample-pdf.mjs [out.pdf]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const OUT = resolve(import.meta.dirname, process.argv[2] ?? '../samples/hello.pdf');
const PAGES = Math.max(2, Number(process.env.LEMBARAN_PDF_PAGES ?? 2));

const pageText = (index) =>
  `BT /F1 24 Tf 40 500 Td (${index === 1 ? 'Hello Lembaran' : `Page ${index}`}) Tj ET
BT /F1 12 Tf 40 460 Td (Page ${index} of ${PAGES}. A searchable word: banana.) Tj ET`;

// objects: 1 catalog, 2 pages tree, then a (page, contents) pair per page, then the font
const objects = ['<< /Type /Catalog /Pages 2 0 R >>', ''];
const kids = [];
for (let index = 1; index <= PAGES; index += 1) {
  const pageId = objects.length + 1;
  const contentId = pageId + 1;
  kids.push(`${pageId} 0 R`);
  objects.push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 420 595] /Resources << /Font << /F1 ${PAGES * 2 + 3} 0 R >> >> /Contents ${contentId} 0 R >>`,
  );
  const text = pageText(index);
  objects.push(`<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`);
}
objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
objects[1] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${PAGES} >>`;

let pdf = '%PDF-1.4\n';
const offsets = [];
objects.forEach((body, index) => {
  offsets.push(Buffer.byteLength(pdf));
  pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
});

const xrefStart = Buffer.byteLength(pdf);
pdf += `xref\n0 ${objects.length + 1}\n`;
pdf += '0000000000 65535 f \n';
for (const offset of offsets) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, pdf, 'latin1');
console.log(`wrote ${OUT} (${Buffer.byteLength(pdf)} bytes, ${PAGES} pages)`);