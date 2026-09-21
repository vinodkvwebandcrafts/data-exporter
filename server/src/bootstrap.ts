import type { Core } from "@strapi/strapi";

/**
 * Returns the UIDs of every content type that the Content Manager displays
 * (collection types and single types alike).
 *
 * Mirrors what core content-manager does when it registers its own
 * `explorer.*` actions (see `services/permission.registerPermissions`): the
 * role editor builds the "Collection Types" / "Single Types" grids from each
 * action's `subjects`, so the subjects must be real content-type UIDs
 * (`api::brand.brand`, ...) or the "Export" column has a header but no rows
 * to toggle.
 */
export const getExportableContentTypeUids = (strapi: Core.Strapi): string[] => {
  const cmContentTypes = (strapi as any).plugin?.("content-manager")?.service?.("content-types");
  const displayed: Array<{ uid: string }> =
    typeof cmContentTypes?.findDisplayedContentTypes === "function"
      ? cmContentTypes.findDisplayedContentTypes()
      : Object.values((strapi as any).contentTypes ?? {}).filter(
          (ct: any) => ct?.pluginOptions?.["content-manager"]?.visible !== false,
        );

  return displayed.map((ct) => ct.uid);
};

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  await strapi.admin.services.permission.actionProvider.registerMany([
    {
      uid: "export",
      pluginName: "data-exporter",
      displayName: "Export to xlsx",
      section: "contentTypes",
      subjects: getExportableContentTypeUids(strapi),
    },
  ]);
};

export default bootstrap;
