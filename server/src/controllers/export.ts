// server/src/controllers/export.ts
import type { Core } from '@strapi/strapi';
import { describe as describeFields } from '../services/field-flattener';
import { run as runExport } from '../services/exporter';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async fields(ctx: any) {
    const { uid } = ctx.params;
    if (!uid || typeof uid !== 'string') {
      return ctx.badRequest({ code: 'INVALID_BODY', message: 'uid is required' });
    }
    const config = strapi.config.get('plugin::data-exporter') as Record<string, any>;
    try {
      const descriptors = describeFields(uid, {
        contentTypes: (strapi as any).contentTypes,
        components: (strapi as any).components ?? {},
        excludeAttributes: config.excludeAttributes,
        flattenDepth: config.flattenDepth,
      });
      ctx.body = descriptors;
    } catch (e: any) {
      if (e.code === 'UNKNOWN_UID') {
        return ctx.badRequest({ code: 'UNKNOWN_UID', message: e.message });
      }
      throw e;
    }
  },

  async run(ctx: any) {
    const { uid, query, fields } = ctx.request.body ?? {};
    if (
      typeof uid !== 'string' ||
      typeof query !== 'object' ||
      query === null ||
      (fields !== undefined && !Array.isArray(fields))
    ) {
      return ctx.badRequest({
        code: 'INVALID_BODY',
        message: 'Expected { uid: string, query: object, fields?: string[] }',
      });
    }

    try {
      const { stream, filename } = await runExport({ strapi, uid, query, fields });
      ctx.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      ctx.set('Content-Disposition', `attachment; filename="${filename}"`);
      ctx.body = stream;
    } catch (e: any) {
      switch (e.code) {
        case 'UNKNOWN_UID':
        case 'UNSUPPORTED_KIND':
        case 'EMPTY_FIELDS':
        case 'INVALID_BODY':
          return ctx.badRequest({ code: e.code, message: e.message });
        case 'ROW_LIMIT_EXCEEDED':
          ctx.status = 413;
          ctx.body = { error: { code: e.code, message: e.message, limit: e.limit, observed: e.observed } };
          return;
        default:
          strapi.log.error(e, { uid, query });
          throw e;
      }
    }
  },
});
