// Writes samples/hello.xlsx: a real, valid XLSX with three visible sheets, one hidden sheet,
// formulas with cached values, a merged title and number formats — so the Excel reader is
// exercised against genuine OOXML rather than a mock.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import JSZip from 'jszip';

const ROOT = resolve(import.meta.dirname, '..');
const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
const R = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

const text = (ref, value, style = 0) =>
  `<c r="${ref}" t="inlineStr"${style ? ` s="${style}"` : ''}><is><t xml:space="preserve">${value}</t></is></c>`;
const number = (ref, value, style = 0) =>
  `<c r="${ref}"${style ? ` s="${style}"` : ''}><v>${value}</v></c>`;
const formula = (ref, expression, cached, style = 0) =>
  `<c r="${ref}"${style ? ` s="${style}"` : ''}><f>${expression}</f><v>${cached}</v></c>`;

const sheet = ({ rows, merges = [], cols = [], dimension, frozen = false }) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet ${NS} ${R}>${dimension ? `<dimension ref="${dimension}"/>` : ''}
  <sheetViews><sheetView workbookViewId="0">${frozen ? '<pane xSplit="1" ySplit="1" topLeftCell="B2" activePane="bottomRight" state="frozen"/>' : ''}</sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  ${cols.length > 0 ? `<cols>${cols.map((c) => `<col min="${c.min}" max="${c.max}" width="${c.width}" customWidth="1"/>`).join('')}</cols>` : ''}
  <sheetData>${rows.join('\n')}</sheetData>
  ${merges.length > 0 ? `<mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''}
</worksheet>`;

const header = ['City', 'Country', 'Population', 'Area km²', 'Note'];

const cities = [
  ['Jakarta', 'Indonesia', 10562088, 662.33, 'capital'],
  ['Bandung', 'Indonesia', 2444160, 167.31, 'highland, cool'],
  ['Surabaya', 'Indonesia', 2874314, 350.54, 'port city'],
  ['Medan', 'Indonesia', 2435252, 265.1, ''],
  ['Tokyo', 'Japan', 13960000, 2194.07, 'mega city, dense'],
];

/** `LEMBARAN_XLSX_ROWS=500 node scripts/make-sample-xlsx.mjs` writes a scrollable workbook. */
const extraRows = Number(process.env.LEMBARAN_XLSX_ROWS ?? 0) || 0;
for (let index = 0; index < extraRows; index += 1) {
  const row = index + cities.length + 1;
  cities.push([`City ${row}`, `Realm ${(index % 7) + 1}`, 1000000 + index * 37, 100 + index, `generated row, ${row}`]);
}

const citiesSheet = sheet({
  dimension: `A1:E${cities.length + 2}`,
  frozen: true,
  cols: [
    { min: 1, max: 1, width: 18 },
    { min: 2, max: 2, width: 14 },
    { min: 3, max: 3, width: 14 },
    { min: 4, max: 4, width: 12 },
    { min: 5, max: 5, width: 22 },
  ],
  rows: [
    `<row r="1" s="1" customFormat="1">${header.map((value, index) => text(`${String.fromCharCode(65 + index)}1`, value, 1)).join('')}</row>`,
    ...cities.map(([city, country, population, area, note], index) => {
      const row = index + 2;
      return `<row r="${row}">${text(`A${row}`, city)}${text(`B${row}`, country)}${number(`C${row}`, population)}${number(`D${row}`, area)}${text(`E${row}`, note)}</row>`;
    }),
    `<row r="${cities.length + 2}">${text(`A${cities.length + 2}`, 'Source: fixture data, numbers are illustrative.', 0)}</row>`,
  ],
  merges: [`A${cities.length + 2}:E${cities.length + 2}`],
});

const totalPopulation = cities.slice(0, 5).reduce((sum, [, , population]) => sum + population, 0);
const averageArea = cities.slice(0, 5).reduce((sum, [, , , area]) => sum + area, 0) / 5;
const largestShare = Math.max(...cities.slice(0, 5).map(([, , population]) => population)) / totalPopulation;

const summarySheet = sheet({
  dimension: 'A1:D9',
  cols: [
    { min: 1, max: 1, width: 22 },
    { min: 2, max: 2, width: 16 },
    { min: 3, max: 3, width: 4 },
    { min: 4, max: 4, width: 20 },
  ],
  rows: [
    `<row r="1">${text('A1', 'City population — Lembaran fixture', 1)}</row>`,
    `<row r="3">${text('A3', 'Cities')}${formula('B3', 'COUNTA(Cities!A2:A6)', cities.length)}</row>`,
    `<row r="4">${text('A4', 'Total population')}${formula('B4', 'SUM(Cities!C2:C6)', totalPopulation)}</row>`,
    `<row r="5">${text('A5', 'Average area (km²)')}${formula('B5', 'AVERAGE(Cities!D2:D6)', averageArea.toFixed(2))}</row>`,
    `<row r="6">${text('A6', 'Largest share')}${formula('B6', 'MAX(Cities!C2:C6)/B4', largestShare.toFixed(6), 2)}</row>`,
    `<row r="8">${text('A8', 'Each value above is a formula; the engine calculates it on this device.')}</row>`,
    `<row r="9">${text('A9', 'Find the word Tokyo to jump across sheets.')}</row>`,
  ],
  merges: ['A1:D1'],
});

const notesSheet = sheet({
  dimension: 'A1:C4',
  cols: [
    { min: 1, max: 1, width: 40 },
    { min: 2, max: 2, width: 26 },
    { min: 3, max: 3, width: 20 },
  ],
  rows: [
    `<row r="1">${text('A1', 'Reading notes', 1)}</row>`,
    `<row r="2">${text('A2', 'Sheet tabs at the bottom switch worksheets; hidden sheets stay hidden.')}</row>`,
    `<row r="3">${text('A3', 'Click a cell to read its address and formatted value in the status line.')}</row>`,
    `<row r="4">${text('A4', 'Ctrl+F searches every sheet, including this one.')}</row>`,
  ],
  merges: ['A1:C1'],
});

const hiddenSheet = sheet({
  dimension: 'A1:A1',
  rows: [`<row r="1">${text('A1', 'hidden sheet')}</row>`],
});

const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook ${NS} ${R}>
  <sheets>
    <sheet name="Cities" sheetId="1" r:id="rId1"/>
    <sheet name="Summary" sheetId="2" r:id="rId2"/>
    <sheet name="Notes" sheetId="3" r:id="rId3"/>
    <sheet name="Raw" sheetId="4" r:id="rId4" state="hidden"/>
  </sheets>
  <calcPr calcId="191029" fullCalcOnLoad="1"/>
</workbook>`;

const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet4.xml"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet ${NS}>
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE4EFE6"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
    <xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet4.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Lembaran spreadsheet fixture</dc:title>
  <dc:creator>Lembaran</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;

const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Lembaran</Application></Properties>`;

const zip = new JSZip();
zip.file('[Content_Types].xml', contentTypes);
zip.file('_rels/.rels', rootRels);
zip.file('docProps/core.xml', core);
zip.file('docProps/app.xml', app);
zip.file('xl/workbook.xml', workbook);
zip.file('xl/_rels/workbook.xml.rels', workbookRels);
zip.file('xl/styles.xml', styles);
zip.file('xl/worksheets/sheet1.xml', citiesSheet);
zip.file('xl/worksheets/sheet2.xml', summarySheet);
zip.file('xl/worksheets/sheet3.xml', notesSheet);
zip.file('xl/worksheets/sheet4.xml', hiddenSheet);

const bytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
const target = resolve(ROOT, process.argv[2] ?? 'samples/hello.xlsx');
writeFileSync(target, bytes);
console.log(`wrote ${process.argv[2] ?? 'samples/hello.xlsx'} (${(bytes.length / 1024).toFixed(1)} KB, 3 visible + 1 hidden sheet)`);
