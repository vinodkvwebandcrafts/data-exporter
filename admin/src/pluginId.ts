// The plugin id used to namespace translations, permissions, and routes.
// Must match the `strapi.name` in package.json (`data-exporter`), NOT the npm
// package name (`strapi-plugin-data-exporter`).
export const PLUGIN_ID = "data-exporter";

// Lower-case alias kept in sync with PLUGIN_ID so consumers can use whichever
// naming convention they prefer.
export const pluginId = PLUGIN_ID;
