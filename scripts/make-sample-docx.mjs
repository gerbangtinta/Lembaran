// Writes samples/hello.docx: a real, valid DOCX with headings, runs, a list, a table and a
// page break, so the Word reader is exercised against genuine OOXML rather than a mock.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import JSZip from 'jszip';

const ROOT = resolve(import.meta.dirname, '..');

const paragraph = (text, style) =>
  `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}<w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;

const richParagraph = (runs) =>
  `<w:p>${runs
    .map((run) => {
      const props = [
        run.bold ? '<w:b/>' : '',
        run.italic ? '<w:i/>' : '',
        run.color ? `<w:color w:val="${run.color}"/>` : '',
      ].join('');
      return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${run.text}</w:t></w:r>`;
    })
    .join('')}</w:p>`;

const bullet = (text) =>
  `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>${text}</w:t></w:r></w:p>`;

const cell = (text, width) =>
  `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="pct"/></w:tcPr>${paragraph(text)}</w:tc>`;

const table = (rows) =>
  `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
    .map((edge) => `<w:${edge} w:val="single" w:sz="6" w:space="0" w:color="BFBFBF"/>`)
    .join('')}</w:tblBorders></w:tblPr>${rows
    .map((row) => `<w:tr>${row.map((text) => cell(text, 2500)).join('')}</w:tr>`)
    .join('')}</w:tbl>`;

const body = [
  paragraph('Lembaran reader fixture', 'Title'),
  richParagraph([
    { text: 'This document exists to prove the ' },
    { text: 'Word', bold: true },
    { text: ' reader lays out real OOXML: styles, runs, lists, tables and a page break.' },
  ]),
  paragraph('Section one — text and emphasis', 'Heading1'),
  richParagraph([
    { text: 'Bold', bold: true },
    { text: ' · ' },
    { text: 'italic', italic: true },
    { text: ' · ' },
    { text: 'colour', color: 'C2410C' },
    { text: ' · plain. Everything is rendered locally; the file never leaves the device.' },
  ]),
  bullet('A list item, so numbering survives the trip.'),
  bullet('A second list item, with the word banana, for the find box.'),
  bullet('A third list item.'),
  paragraph('Section two — a table', 'Heading1'),
  table([
    ['Format', 'Engine', 'License'],
    ['PDF', 'pdfjs-dist', 'Apache-2.0'],
    ['CSV', 'papaparse', 'MIT'],
    ['Word', 'docx-preview', 'Apache-2.0'],
  ]),
  ...Array.from({ length: 14 }, (_, index) =>
    paragraph(
      `Filler paragraph ${index + 1}. Long enough to wrap across a line so pagination has something to do, and to push the page break onto the next sheet.`,
    ),
  ),
  '<w:p><w:r><w:br w:type="page"/></w:r></w:p>',
  paragraph('Section three — after the page break', 'Heading1'),
  paragraph('If you can read this, the reader honoured an explicit page break in the source document.'),
  richParagraph([
    { text: 'Find the word ' },
    { text: 'banana', bold: true },
    { text: ' in this document to see the search highlight.' },
  ]),
];

const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
${body.join('\n')}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>
  </w:body>
</w:document>`;

const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="48"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:spacing w:before="360" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="1F2937"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:pPr><w:ind w:left="720"/></w:pPr></w:style>
  <w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblCellMar><w:left w:w="108" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>
</w:styles>`;

const numbering = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>`;

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>`;

const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Lembaran reader fixture</dc:title>
  <dc:creator>Lembaran</dc:creator>
  <cp:lastModifiedBy>Lembaran</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;

const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Lembaran</Application>
</Properties>`;

const zip = new JSZip();
zip.file('[Content_Types].xml', contentTypes);
zip.file('_rels/.rels', rootRels);
zip.file('word/document.xml', document);
zip.file('word/styles.xml', styles);
zip.file('word/numbering.xml', numbering);
zip.file('word/_rels/document.xml.rels', documentRels);
zip.file('docProps/core.xml', core);
zip.file('docProps/app.xml', app);

const bytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
const target = resolve(ROOT, 'samples/hello.docx');
writeFileSync(target, bytes);
console.log(`wrote samples/hello.docx (${(bytes.length / 1024).toFixed(1)} KB)`);
