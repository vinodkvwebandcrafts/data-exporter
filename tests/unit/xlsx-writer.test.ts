import { describe as test, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { Readable } from 'node:stream';
import { createWriter, appendRow, commit } from '../../server/src/services/xlsx-writer';
import type { FieldDescriptor } from '../../server/src/services/field-flattener';

async function streamToBuffer(s: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of s) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks);
}

async function readBack(buf: Buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  return wb.worksheets[0];
}

const descriptors: FieldDescriptor[] = [
  { path: 'title', label: 'Title', type: 'string' },
  { path: 'views', label: 'Views', type: 'integer' },
  { path: 'isPublished', label: 'Is Published', type: 'boolean' },
  { path: 'metadata', label: 'Metadata', type: 'json' },
];

test('xlsx-writer', () => {
  it('writes a workbook with bold frozen header and data rows', async () => {
    const { stream, writer } = createWriter({
      worksheetName: 'Article',
      descriptors,
      sanitizeFormulas: true,
    });
    appendRow(writer, { title: 'Hello', views: 5, isPublished: true, metadata: '{"a":1}' });
    appendRow(writer, { title: 'World', views: 9, isPublished: false, metadata: '{"b":2}' });
    const finished = commit(writer);
    const buf = await streamToBuffer(stream);
    await finished;
    const ws = await readBack(buf);
    expect(ws.name).toBe('Article');
    // Header row
    expect(ws.getRow(1).getCell(1).value).toBe('Title');
    expect(ws.getRow(1).getCell(1).font?.bold).toBe(true);
    // Data
    expect(ws.getRow(2).getCell(1).value).toBe('Hello');
    expect(ws.getRow(2).getCell(2).value).toBe(5);
    expect(ws.getRow(2).getCell(3).value).toBe(true);
    expect(ws.getRow(3).getCell(1).value).toBe('World');
    // Frozen first row
    expect(ws.views?.[0]?.ySplit).toBe(1);
  });

  it('prepends apostrophe to formula-prefix cells when sanitizeFormulas=true', async () => {
    const { stream, writer } = createWriter({
      worksheetName: 'Article',
      descriptors: [{ path: 'title', label: 'Title', type: 'string' }],
      sanitizeFormulas: true,
    });
    appendRow(writer, { title: '=SUM(A1:A2)' });
    appendRow(writer, { title: '+danger' });
    appendRow(writer, { title: '-danger' });
    appendRow(writer, { title: '@danger' });
    appendRow(writer, { title: 'normal' });
    const finished = commit(writer);
    const buf = await streamToBuffer(stream);
    await finished;
    const ws = await readBack(buf);
    expect(ws.getRow(2).getCell(1).value).toBe("'=SUM(A1:A2)");
    expect(ws.getRow(3).getCell(1).value).toBe("'+danger");
    expect(ws.getRow(4).getCell(1).value).toBe("'-danger");
    expect(ws.getRow(5).getCell(1).value).toBe("'@danger");
    expect(ws.getRow(6).getCell(1).value).toBe('normal');
  });

  it('does not prepend apostrophes when sanitizeFormulas=false', async () => {
    const { stream, writer } = createWriter({
      worksheetName: 'Article',
      descriptors: [{ path: 'title', label: 'Title', type: 'string' }],
      sanitizeFormulas: false,
    });
    appendRow(writer, { title: '=SUM(A1:A2)' });
    const finished = commit(writer);
    const buf = await streamToBuffer(stream);
    await finished;
    const ws = await readBack(buf);
    expect(ws.getRow(2).getCell(1).value).toBe('=SUM(A1:A2)');
  });
});
