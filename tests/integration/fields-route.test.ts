import request from "supertest";
import { startStrapi } from "./helpers/strapi";
import { getSuperAdminJwt } from "./helpers/admin-token";

describe("GET /data-exporter/fields/:uid", () => {
  it("returns descriptors for the article content type", async () => {
    const strapi: any = await startStrapi();
    const jwt = await getSuperAdminJwt();
    const res = await request(strapi.server.httpServer)
      .get("/data-exporter/fields/api::article.article")
      .set("Authorization", `Bearer ${jwt}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const paths = (res.body as Array<{ path: string }>).map((d) => d.path);
    expect(paths).toEqual(
      expect.arrayContaining(["title", "views", "isPublished"])
    );
  });

  it("rejects without auth", async () => {
    const strapi: any = await startStrapi();
    await request(strapi.server.httpServer)
      .get("/data-exporter/fields/api::article.article")
      .expect(401);
  });

  it("returns 400 for an unknown uid", async () => {
    const strapi: any = await startStrapi();
    const jwt = await getSuperAdminJwt();
    await request(strapi.server.httpServer)
      .get("/data-exporter/fields/api::nope.nope")
      .set("Authorization", `Bearer ${jwt}`)
      .expect(400);
  });
});
