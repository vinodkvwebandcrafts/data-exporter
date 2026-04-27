import { describe as test, it, expect, vi } from 'vitest';
import { run } from '../../server/src/services/exporter';
import ExcelJS from 'exceljs';
import { Readable } from 'node:stream';
import { allFixtures } from '../fixtures/content-types';

async function streamToBuffer(s: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of s) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks);
}

function makeStrapi(opts: {
  total: number;
  entries: any[];
  config?: Partial<Record<string, any>>;
}) {
  const config = {
    maxRows: 50_000,
    pageSize: 500,
    flattenDepth: 3,
    relationDisplayField: 'id',
    excludeAttributes: ['password'],
    filenameTemplate: '{collection}-{date}.xlsx',
    sanitizeFormulas: true,
    ...opts.config,
  };
  return {
    contentTypes: allFixtures.contentTypes,
    components: allFixtures.components,
    config: {
      get: (key: string) => (key === 'plugin::data-exporter' ? config : undefined),
    },
    documents: vi.fn(() => ({
      count: vi.fn().mockResolvedValue(opts.total),
      findMany: vi.fn().mockResolvedValue(opts.entries),
    })),
  };
}

test('exporter.run', () => {
  it('rejects unknown uid', async () => {
    const strapi = makeStrapi({ total: 0, entries: [] });
    await expect(
      run({ strapi: strapi as any, uid: 'api::nope.nope', query: {}, fields: ['title'] }),
    ).rejects.toMatchObject({ code: 'UNKNOWN_UID' });
  });

  it('rejects empty fields after intersection', async () => {
    const strapi = makeStrapi({ total: 0, entries: [] });
    await expect(
      run({ strapi: strapi as any, uid: 'api::article.article', query: {}, fields: ['nonexistent'] }),
    ).rejects.toMatchObject({ code: 'EMPTY_FIELDS' });
  });

  it('rejects when total exceeds maxRows', async () => {
    const strapi = makeStrapi({ total: 100, entries: [], config: { maxRows: 10 } });
    await expect(
      run({ strapi: strapi as any, uid: 'api::article.article', query: {}, fields: ['title'] }),
    ).rejects.toMatchObject({ code: 'ROW_LIMIT_EXCEEDED', limit: 10, observed: 100 });
  });

  it('streams a workbook with selected fields and rows', async () => {
    const strapi = makeStrapi({
      total: 2,
      entries: [
        { id: 1, title: 'A', views: 10 },
        { id: 2, title: 'B', views: 20 },
      ],
    });
    const { stream, filename } = await run({
      strapi: strapi as any,
      uid: 'api::article.article',
      query: {},
      fields: ['title', 'views'],
    });
    const buf = await streamToBuffer(stream);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.worksheets[0];
    expect(filename).toMatch(/^article-\d{8}T\d{6}Z\.xlsx$/);
    expect(ws.getRow(1).getCell(1).value).toBe('Title');
    expect(ws.getRow(2).getCell(1).value).toBe('A');
    expect(ws.getRow(2).getCell(2).value).toBe(10);
    expect(ws.getRow(3).getCell(1).value).toBe('B');
  });
});
