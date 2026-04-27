import type { Core } from "@strapi/strapi";

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  await strapi.admin.services.permission.actionProvider.registerMany([
    {
      uid: "export",
      pluginName: "data-exporter",
      displayName: "Export collections",
      section: "contentTypes",
      subjects: ["plugin::content-manager.contentType"],
    },
  ]);
};

export default bootstrap;
