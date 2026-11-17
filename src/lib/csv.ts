/**
 * Tiny dependency-free CSV reader.
 *
 * Handles the parts of RFC 4180 that Excel and Google Sheets actually emit:
 * quoted fields, escaped quotes ("") inside quotes, CRLF line endings, and a
 * UTF-8 BOM at the start of the file. Rows that are entirely blank are ignored.
 */

export interface CsvRow {
  values: string[];
  line: number;
}

export interface CsvDocument {
  header: string[];
  rows: CsvRow[];
}

/** Normalise a header cell so "Register Number" and "register_number" match. */
export function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function parseCsv(text: string): CsvDocument {
  const source = text.replace(/^\uFEFF/, "");
  const rows: CsvRow[] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let line = 1;
  let rowLine = 1;

  const endField = () => {
    row.push(field.trim());
    field = "";
  };
  const endRow = () => {
    endField();
    if (row.some((value) => value !== "")) rows.push({ values: row, line: rowLine });
    row = [];
  };

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
        if (char === "\n") line += 1;
      }
      continue;
    }

    if (char === '"' && field === "") {
      inQuotes = true;
    } else if (char === ",") {
      endField();
    } else if (char === "\n") {
      endRow();
      line += 1;
      rowLine = line;
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field !== "" || row.length) endRow();

  const header = (rows.shift()?.values ?? []).map(normalizeHeader);
  return { header, rows };
}

/** Build a fast header-name -> column-index lookup. First occurrence wins. */
export function columnIndex(header: string[]): Map<string, number> {
  const index = new Map<string, number>();
  header.forEach((name, position) => {
    if (!index.has(name)) index.set(name, position);
  });
  return index;
}

/** Read one cell using any of the accepted header aliases. */
export function cell(
  values: string[],
  columns: Map<string, number>,
  aliases: string[],
): string {
  for (const alias of aliases) {
    const position = columns.get(alias);
    if (position !== undefined) return values[position]?.trim() ?? "";
  }
  return "";
}
