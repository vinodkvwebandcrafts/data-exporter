import type { Core } from '@strapi/strapi';

const PERMISSION_ACTION = 'plugin::data-exporter.export';

const policy = async (ctx: any, _config: unknown, { strapi }: { strapi: Core.Strapi }) => {
  const user = ctx.state?.user;
  if (!user) return false;

  const uid: string | undefined = ctx.params?.uid ?? ctx.request?.body?.uid;
  if (!uid) return false;

  const perms = await strapi.admin.services.permission.findUserPermissions(user);
  return (
    Array.isArray(perms) &&
    perms.some((p: any) => p.action === PERMISSION_ACTION && p.subject === uid)
  );
};

export default policy;
