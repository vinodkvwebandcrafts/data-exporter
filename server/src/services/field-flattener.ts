// server/src/services/field-flattener.ts

export type FieldDescriptor = {
  path: string;
  label: string;
  type:
    | 'string' | 'text' | 'integer' | 'decimal' | 'boolean' | 'datetime'
    | 'date' | 'time' | 'json' | 'enumeration' | 'uid' | 'email'
    | 'media-url' | 'relation' | 'dynamic-zone-json' | 'component-repeatable-json';
};

export type DescribeContext = {
  contentTypes: Record<string, any>;
  components: Record<string, any>;
  excludeAttributes: string[];
  flattenDepth: number;
};

const SCALAR_TYPES = new Set([
  'string', 'text', 'integer', 'decimal', 'biginteger', 'float',
  'boolean', 'datetime', 'date', 'time', 'json', 'enumeration', 'uid', 'email',
]);

function labelize(path: string): string {
  const last = path.split('.').pop() ?? path;
  return last.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();
}

function describeAttributes(
  attrs: Record<string, any>,
  ctx: DescribeContext,
  prefix: string,
  depth: number,
): FieldDescriptor[] {
  const out: FieldDescriptor[] = [];

  for (const [name, attr] of Object.entries(attrs)) {
    if (ctx.excludeAttributes.includes(name)) continue;
    if (attr.type === 'password') continue;

    const path = prefix ? `${prefix}.${name}` : name;

    if (SCALAR_TYPES.has(attr.type)) {
      out.push({ path, label: labelize(path), type: normalizeScalar(attr.type) });
      continue;
    }

    if (attr.type === 'media') {
      out.push({ path, label: labelize(path), type: 'media-url' });
      continue;
    }

    if (attr.type === 'relation') {
      out.push({ path, label: labelize(path), type: 'relation' });
      continue;
    }

    if (attr.type === 'dynamiczone') {
      out.push({ path, label: labelize(path), type: 'dynamic-zone-json' });
      continue;
    }

    if (attr.type === 'component') {
      if (attr.repeatable) {
        out.push({ path, label: labelize(path), type: 'component-repeatable-json' });
        continue;
      }
      if (depth >= ctx.flattenDepth) {
        out.push({ path, label: labelize(path), type: 'json' });
        continue;
      }
      const compDef = ctx.components[attr.component];
      if (!compDef) {
        out.push({ path, label: labelize(path), type: 'json' });
        continue;
      }
      out.push(...describeAttributes(compDef.attributes, ctx, path, depth + 1));
      continue;
    }

    // Unknown attribute kind — fall back to JSON to avoid silent omission.
    out.push({ path, label: labelize(path), type: 'json' });
  }

  return out;
}

function normalizeScalar(t: string): FieldDescriptor['type'] {
  if (t === 'biginteger' || t === 'float') return 'decimal';
  return t as FieldDescriptor['type'];
}

export function describe(uid: string, ctx: DescribeContext): FieldDescriptor[] {
  const ct = ctx.contentTypes[uid];
  if (!ct) {
    const err = new Error(`UNKNOWN_UID: ${uid}`);
    (err as any).code = 'UNKNOWN_UID';
    throw err;
  }
  return describeAttributes(ct.attributes, ctx, '', 0);
}
