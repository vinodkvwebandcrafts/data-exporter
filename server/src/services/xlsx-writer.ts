// server/src/services/xlsx-writer.ts
import ExcelJS from 'exceljs';
import { PassThrough, Readable } from 'node:stream';
import type { FieldDescriptor } from './field-flattener';

export type WriterOptions = {
  worksheetName: string;
  descriptors: FieldDescriptor[];
  sanitizeFormulas: boolean;
};

export type WriterHandle = {
  workbook: ExcelJS.stream.xlsx.WorkbookWriter;
  worksheet: ExcelJS.Worksheet;
  descriptors: FieldDescriptor[];
  sanitizeFormulas: boolean;
};

const FORMULA_PREFIXES = ['=', '+', '-', '@'];

function maybeSanitize(value: unknown, sanitize: boolean): unknown {
  if (!sanitize) return value;
  if (typeof value !== 'string') return value;
  if (value.length === 0) return value;
  if (FORMULA_PREFIXES.includes(value[0]!)) return `'${value}`;
  return value;
}

export function createWriter(opts: WriterOptions): { stream: Readable; writer: WriterHandle } {
  const passthrough = new PassThrough();
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: passthrough,
    // useStyles is required for the streaming writer to persist cell-level
    // styling (e.g. bold header) through xlsx serialization.
    useStyles: true,
  });
  const worksheet = workbook.addWorksheet(opts.worksheetName, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  worksheet.columns = opts.descriptors.map((d) => ({
    header: d.label,
    key: d.path,
  }));

  // Bold the header row — apply font per-cell so it survives serialization
  const headerRow = worksheet.getRow(1);
  for (let i = 1; i <= opts.descriptors.length; i += 1) {
    headerRow.getCell(i).font = { bold: true };
  }
  headerRow.commit();

  return {
    stream: passthrough,
    writer: {
      workbook,
      worksheet,
      descriptors: opts.descriptors,
      sanitizeFormulas: opts.sanitizeFormulas,
    },
  };
}

export function appendRow(handle: WriterHandle, row: Record<string, unknown>): void {
  const ordered: Record<string, unknown> = {};
  for (const d of handle.descriptors) {
    ordered[d.path] = maybeSanitize(row[d.path], handle.sanitizeFormulas);
  }
  const r = handle.worksheet.addRow(ordered);
  r.commit();
}

export async function commit(handle: WriterHandle): Promise<void> {
  handle.worksheet.commit();
  await handle.workbook.commit();
}
