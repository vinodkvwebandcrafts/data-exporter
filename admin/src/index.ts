import { PLUGIN_ID } from "./pluginId";
import { ExportBulkAction } from "./components/ExportBulkAction";
import en from "./translations/en.json";

export default {
  register(app: any) {
    app.registerPlugin({
      id: PLUGIN_ID,
      name: "Data Exporter",
    });

    // Add a bulk action that appears above the list view table once the user
    // selects ≥1 row. Receives the selected `documents`, the content-type
    // `model`, and the `collectionType` discriminator.
    app.getPlugin("content-manager")?.apis?.addBulkAction?.([ExportBulkAction]);

    // NOTE: RBAC permission actions are registered server-side via
    // `strapi.admin.services.permission.actionProvider.registerMany(...)` in
    // server/src/bootstrap.ts (Task 8). Strapi 5.43.x does NOT expose an
    // admin-side `app.registerPermissionAction` method.
  },

  bootstrap() {},

  async registerTrads({ locales }: { locales: string[] }) {
    const importedTrads = await Promise.all(
      locales.map(async (locale) => {
        if (locale === "en") {
          return { data: prefixKeys(en), locale };
        }
        return { data: {}, locale };
      })
    );

    return importedTrads;
  },
};

function prefixKeys(obj: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[`${PLUGIN_ID}.${k}`] = v;
  }
  return out;
}
