import { startStrapi, stopStrapi } from "./helpers/strapi";

describe("integration smoke", () => {
  afterAll(async () => {
    await stopStrapi();
  });

  it("boots the test app with the plugin loaded and the article CT registered", async () => {
    const strapi: any = await startStrapi();

    expect(strapi).toBeDefined();
    expect(strapi.contentTypes["api::article.article"]).toBeDefined();
    expect(strapi.plugin("data-exporter")).toBeDefined();
  });

  it("registers the export action against real collection-type UIDs", async () => {
    const strapi: any = await startStrapi();

    const action = strapi.admin.services.permission.actionProvider.get(
      "plugin::data-exporter.export"
    );

    expect(action).toBeDefined();
    expect(action.section).toBe("contentTypes");
    expect(action.subjects).toContain("api::article.article");
    expect(action.subjects).not.toContain("plugin::content-manager.contentType");
  });
});
