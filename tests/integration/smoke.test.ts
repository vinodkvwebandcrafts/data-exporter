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
});
