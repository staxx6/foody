/**
 * Writes Excel files (.xlsx). Such a file is a ZIP archive of XML documents;
 * both are written here, as only texts, numbers, dates and times in plain
 * tables are needed.
 */

/** A point in time shown as date or as time of day */
export type DateCell = { date: Date; show: 'date' | 'time' };
export type Cell = string | number | DateCell | null;

export type Sheet = {
  name: string;
  /**
   * Titles above the column titles that span several columns each, to group
   * them. Their widths have to add up to the number of columns.
   */
  groups?: { title: string; columns: number }[];
  /** The column titles */
  header: string[];
  /** An empty row separates blocks */
  rows: Cell[][];
  /**
   * The background of each row: 0 for none, 1 or 2 for one of two light
   * colors, e.g. alternating to tell blocks apart
   */
  bands?: number[];
};

/** The colors of the title rows and of the two bands, as ARGB */
const HEADER_COLOR = 'FF4F46E5';
const BAND_COLORS = ['FFE8EDFB', 'FFFDF1E3'];

const HEADER_STYLE = 1;
/**
 * The index of the style of a cell in cellXfs of STYLES: the plain ones
 * first, then the same three for each band
 */
function styleOf(kind: 'text' | 'date' | 'time', band: number): number {
  const offset = { text: 0, date: 1, time: 2 }[kind];
  if (band > 0) return 4 + (band - 1) * 3 + offset;
  return kind === 'text' ? 0 : 1 + offset;
}

const solidFill = (color: string) =>
  `<fill><patternFill patternType="solid"><fgColor rgb="${color}"/></patternFill></fill>`;
// Fills: 2 is the header, 3 and 4 are the bands. Fonts: 1 is bold, 2 the
// white bold one of the header. Number formats: 14 is a date, 20 a time.
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${solidFill(HEADER_COLOR)}${BAND_COLORS.map(solidFill).join('')}</fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="10">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="20" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
${[3, 4]
  .map(
    (fill) =>
      `<xf numFmtId="0" fontId="0" fillId="${fill}" borderId="0" xfId="0" applyFill="1"/>` +
      // The day is what the eye looks for in a band
      `<xf numFmtId="14" fontId="1" fillId="${fill}" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>` +
      `<xf numFmtId="20" fontId="0" fillId="${fill}" borderId="0" xfId="0" applyNumberFormat="1" applyFill="1"/>`,
  )
  .join('\n')}
</cellXfs>
</styleSheet>`;

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const DAY = 86_400_000;

function escapeXml(text: string): string {
  return (
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      // Characters XML does not allow at all
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
  );
}

/** A, B, ... Z, AA, AB, ... */
function columnName(index: number): string {
  let name = '';
  for (let rest = index + 1; rest > 0; rest = Math.floor((rest - 1) / 26)) {
    name = String.fromCharCode(65 + ((rest - 1) % 26)) + name;
  }
  return name;
}

/**
 * Excel counts days since 30 December 1899 and knows no time zones, so the
 * local time is what has to arrive there
 */
function excelDate(date: Date): number {
  const local = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  );
  return (local - Date.UTC(1899, 11, 30)) / DAY;
}

function cellXml(
  cell: Cell,
  reference: string,
  isHeader: boolean,
  band: number,
): string {
  const styled = (kind: 'text' | 'date' | 'time') => {
    const style = isHeader ? HEADER_STYLE : styleOf(kind, band);
    return style > 0 ? ` s="${style}"` : '';
  };

  if (cell === null || cell === '') {
    // Empty cells of a colored row carry the color too
    return styled('text') ? `<c r="${reference}"${styled('text')}/>` : '';
  }
  if (typeof cell === 'number') {
    return `<c r="${reference}"${styled('text')}><v>${cell}</v></c>`;
  }
  if (typeof cell === 'string') {
    return `<c r="${reference}" t="inlineStr"${styled('text')}><is><t xml:space="preserve">${escapeXml(cell)}</t></is></c>`;
  }
  const serial = excelDate(cell.date);
  return cell.show === 'date'
    ? `<c r="${reference}"${styled('date')}><v>${Math.floor(serial)}</v></c>`
    : `<c r="${reference}"${styled('time')}><v>${serial - Math.floor(serial)}</v></c>`;
}

function sheetXml(sheet: Sheet): string {
  // The titles of the groups stand in the first column of their group
  const groupRow = (sheet.groups ?? []).flatMap(({ title, columns }) => [
    title,
    ...new Array<Cell>(columns - 1).fill(null),
  ]);
  const titleRows = sheet.groups ? [groupRow, sheet.header] : [sheet.header];

  const rows = [...titleRows, ...sheet.rows].map((row, rowIndex) => {
    const isTitle = rowIndex < titleRows.length;
    const band = isTitle
      ? 0
      : (sheet.bands?.[rowIndex - titleRows.length] ?? 0);
    // A colored row is colored across the whole table
    const padded =
      isTitle || band > 0
        ? sheet.header.map((_, column) => row[column] ?? null)
        : row;
    const cells = padded.map((cell, column) =>
      cellXml(cell, `${columnName(column)}${rowIndex + 1}`, isTitle, band),
    );
    return `<row r="${rowIndex + 1}">${cells.join('')}</row>`;
  });

  // Each title of a group is one cell across its columns
  const merges: string[] = [];
  let firstColumn = 0;
  for (const { columns } of sheet.groups ?? []) {
    if (columns > 1) {
      merges.push(
        `<mergeCell ref="${columnName(firstColumn)}1:${columnName(firstColumn + columns - 1)}1"/>`,
      );
    }
    firstColumn += columns;
  }

  // Wide enough for the longest text of each column, within limits
  const widths = sheet.header.map((title, column) => {
    const longest = Math.max(
      title.length,
      ...sheet.rows.map((row) => {
        const cell = row[column];
        return typeof cell === 'string' ? cell.length : 10;
      }),
    );
    return Math.min(Math.max(longest + 2, 8), 60);
  });
  const columns = widths
    .map(
      (width, column) =>
        `<col min="${column + 1}" max="${column + 1}" width="${width}" customWidth="1"/>`,
    )
    .join('');

  return (
    XML_HEADER +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    // The titles stay visible when scrolling
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${titleRows.length}" topLeftCell="A${titleRows.length + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<cols>${columns}</cols>` +
    `<sheetData>${rows.join('')}</sheetData>` +
    (merges.length > 0
      ? `<mergeCells count="${merges.length}">${merges.join('')}</mergeCells>`
      : '') +
    '</worksheet>'
  );
}

/** Names of sheets are limited to 31 characters and must not contain these */
function sheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);
}

function workbookFiles(sheets: Sheet[]): Record<string, string> {
  const files: Record<string, string> = {
    '[Content_Types].xml':
      XML_HEADER +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sheets
        .map(
          (_, index) =>
            `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
        )
        .join('') +
      '</Types>',
    '_rels/.rels':
      XML_HEADER +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>',
    'xl/workbook.xml':
      XML_HEADER +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets>' +
      sheets
        .map(
          (sheet, index) =>
            `<sheet name="${escapeXml(sheetName(sheet.name))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
        )
        .join('') +
      '</sheets></workbook>',
    'xl/_rels/workbook.xml.rels':
      XML_HEADER +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheets
        .map(
          (_, index) =>
            `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
        )
        .join('') +
      `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
      '</Relationships>',
    'xl/styles.xml': STYLES,
  };
  sheets.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = sheetXml(sheet);
  });
  return files;
}

// --- ZIP archive, without compression ---

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Little-endian bytes of numbers given as [value, size in bytes] */
function bytes(...fields: [number, number][]): Uint8Array {
  const size = fields.reduce((sum, [, length]) => sum + length, 0);
  const view = new DataView(new ArrayBuffer(size));
  let offset = 0;
  for (const [value, length] of fields) {
    if (length === 2) view.setUint16(offset, value, true);
    else view.setUint32(offset, value, true);
    offset += length;
  }
  return new Uint8Array(view.buffer);
}

function zip(files: Record<string, string>): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const directory: Uint8Array[] = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const crc = crc32(data);
    // version, flags (UTF-8 names), method (stored), time, date, crc, sizes
    const common: [number, number][] = [
      [20, 2],
      [0x0800, 2],
      [0, 2],
      [0, 2],
      [0x21, 2],
      [crc, 4],
      [data.length, 4],
      [data.length, 4],
      [nameBytes.length, 2],
      [0, 2],
    ];

    const header = bytes([0x04034b50, 4], ...common);
    parts.push(header, nameBytes, data);
    directory.push(
      bytes(
        [0x02014b50, 4],
        [20, 2],
        ...common,
        [0, 2],
        [0, 2],
        [0, 2],
        [0, 4],
        [offset, 4],
      ),
      nameBytes,
    );
    offset += header.length + nameBytes.length + data.length;
  }

  const directorySize = directory.reduce((sum, part) => sum + part.length, 0);
  const count = Object.keys(files).length;
  const end = bytes(
    [0x06054b50, 4],
    [0, 2],
    [0, 2],
    [count, 2],
    [count, 2],
    [directorySize, 4],
    [offset, 4],
    [0, 2],
  );

  const all = [...parts, ...directory, end];
  const result = new Uint8Array(
    new ArrayBuffer(all.reduce((sum, part) => sum + part.length, 0)),
  );
  let position = 0;
  for (const part of all) {
    result.set(part, position);
    position += part.length;
  }
  return result;
}

/** The content of an .xlsx file with the given sheets */
export function createXlsx(sheets: Sheet[]): Uint8Array<ArrayBuffer> {
  return zip(workbookFiles(sheets));
}

export const XLSX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
