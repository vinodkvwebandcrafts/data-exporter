import type { Core } from "@strapi/strapi";

/**
 * Returns the UIDs of every collection type that the Content Manager displays.
 *
 * Mirrors what core content-manager does when it registers its own
 * `explorer.*` actions (see `services/permission.registerPermissions`): the
 * role editor builds the "Collection Types" grid from each action's `subjects`,
 * so the subjects must be real content-type UIDs (`api::brand.brand`, ...) or
 * the "Export collections" column has a header but no rows to toggle.
 *
 * Only collection types are returned because the exporter rejects single types
 * with `UNSUPPORTED_KIND`.
 */
export const getExportableContentTypeUids = (strapi: Core.Strapi): string[] => {
  const cmContentTypes = (strapi as any).plugin?.("content-manager")?.service?.("content-types");
  const displayed: Array<{ uid: string; kind?: string }> =
    typeof cmContentTypes?.findDisplayedContentTypes === "function"
      ? cmContentTypes.findDisplayedContentTypes()
      : Object.values((strapi as any).contentTypes ?? {}).filter(
          (ct: any) => ct?.pluginOptions?.["content-manager"]?.visible !== false,
        );

  return displayed.filter((ct) => ct.kind === "collectionType").map((ct) => ct.uid);
};

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  await strapi.admin.services.permission.actionProvider.registerMany([
    {
      uid: "export",
      pluginName: "data-exporter",
      displayName: "Export collections",
      section: "contentTypes",
      subjects: getExportableContentTypeUids(strapi),
    },
  ]);
};

export default bootstrap;
