// server/src/services/exporter.ts
import type { Readable } from 'node:stream';
import { describe as describeFields, flatten } from './field-flattener';
import { createWriter, appendRow, commit } from './xlsx-writer';
import type { Core } from '@strapi/strapi';

export type RunArgs = {
  strapi: Core.Strapi;
  uid: string;
  query: Record<string, any>;
  /** Optional. If omitted or empty, every flattenable field is exported. */
  fields?: string[];
};

export type RunResult = { stream: Readable; filename: string };

function pluginConfig(strapi: Core.Strapi) {
  return strapi.config.get('plugin::data-exporter') as Record<string, any>;
}

function tokenizeFilename(template: string, singularName: string): string {
  const isoBasic = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return template.replace(/\{collection\}/g, singularName).replace(/\{date\}/g, isoBasic);
}

function err(code: string, message: string, extra: Record<string, unknown> = {}): Error {
  const e = new Error(message) as any;
  e.code = code;
  Object.assign(e, extra);
  return e;
}

export async function run({ strapi, uid, query, fields }: RunArgs): Promise<RunResult> {
  const ct = (strapi as any).contentTypes?.[uid];
  if (!ct) throw err('UNKNOWN_UID', `Unknown content type: ${uid}`);
  if (ct.kind !== 'collectionType') {
    throw err('UNSUPPORTED_KIND', `Only collection types are supported (uid=${uid})`);
  }

  const config = pluginConfig(strapi);

  const allDescriptors = describeFields(uid, {
    contentTypes: (strapi as any).contentTypes,
    components: (strapi as any).components ?? {},
    excludeAttributes: config.excludeAttributes,
    flattenDepth: config.flattenDepth,
  });

  const selected =
    !fields || fields.length === 0
      ? allDescriptors
      : allDescriptors.filter((d) => fields.includes(d.path));
  if (selected.length === 0) {
    throw err('EMPTY_FIELDS', 'No exportable fields for this content type');
  }

  const docs = (strapi as any).documents(uid);
  const total = await docs.count(query);
  if (total > config.maxRows) {
    throw err('ROW_LIMIT_EXCEEDED', 'Export exceeds configured row limit', {
      limit: config.maxRows,
      observed: total,
    });
  }

  const populate = derivePopulate(selected);

  const { stream, writer } = createWriter({
    worksheetName: ct.info?.displayName ?? uid,
    descriptors: selected,
    sanitizeFormulas: config.sanitizeFormulas,
  });

  // Background pagination + write loop. Errors after stream open propagate via `stream.destroy(err)`.
  (async () => {
    try {
      const pageSize = Math.min(config.pageSize, config.maxRows);
      for (let page = 1; ; page++) {
        const entries = await docs.findMany({
          ...query,
          populate,
          pagination: { page, pageSize },
        });
        for (const entry of entries) {
          appendRow(writer, flatten(entry, selected, { relationDisplayField: config.relationDisplayField }));
        }
        if (entries.length < pageSize) break;
      }
      await commit(writer);
    } catch (e) {
      (stream as any).destroy(e);
    }
  })();

  return {
    stream,
    filename: tokenizeFilename(config.filenameTemplate, ct.info?.singularName ?? 'export'),
  };
}

function derivePopulate(descriptors: ReturnType<typeof describeFields>): Record<string, any> {
  const populate: Record<string, any> = {};
  for (const d of descriptors) {
    const root = d.path.split('.')[0];
    if (!root) continue;
    if (d.type === 'media-url' || d.type === 'relation') {
      populate[root] = true;
    } else if (d.path.includes('.')) {
      // Component path — populate the root component
      populate[root] = true;
    } else if (d.type === 'dynamic-zone-json' || d.type === 'component-repeatable-json') {
      populate[root] = true;
    }
  }
  return populate;
}
