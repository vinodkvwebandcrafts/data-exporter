import { PLUGIN_ID } from "./pluginId";
import { ExportButton } from "./components/ExportButton";
import en from "./translations/en.json";

export default {
  register(app: any) {
    // Register the plugin itself so Strapi's admin tracks it.
    app.registerPlugin({
      id: PLUGIN_ID,
      name: "Data Exporter",
    });

    // Inject the Export button into every collection's list-view actions zone.
    // `getPlugin('content-manager')` returns the content-manager Plugin which
    // exposes `injectComponent(containerName, blockName, component)`.
    app
      .getPlugin("content-manager")
      ?.injectComponent("listView", "actions", {
        name: "data-exporter-export-button",
        Component: ExportButton,
      });

    // NOTE: RBAC permission actions are registered server-side via
    // `strapi.admin.services.permission.actionProvider.registerMany(...)` in
    // server/src/bootstrap.ts (Task 8). Strapi 5.43.x does NOT expose an
    // admin-side `app.registerPermissionAction` method, so the registration
    // lives on the server where the action provider API is available.
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
