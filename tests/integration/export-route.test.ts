import request from "supertest";
import ExcelJS from "exceljs";
import { startStrapi } from "./helpers/strapi";
import { getSuperAdminJwt } from "./helpers/admin-token";

describe("POST /data-exporter/export", () => {
  beforeAll(async () => {
    const strapi: any = await startStrapi();
    await strapi
      .documents("api::article.article")
      .create({ data: { title: "A", views: 1 } });
    await strapi
      .documents("api::article.article")
      .create({ data: { title: "B", views: 2 } });
  });

  it("returns an xlsx workbook with selected rows", async () => {
    const strapi: any = await startStrapi();
    const jwt = await getSuperAdminJwt();
    const res = await request(strapi.server.httpServer)
      .post("/data-exporter/export")
      .set("Authorization", `Bearer ${jwt}`)
      .send({
        uid: "api::article.article",
        query: {},
        fields: ["title", "views"],
      })
      .buffer(true)
      .parse((response, cb) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);

    expect(res.headers["content-type"]).toMatch(
      /openxmlformats-officedocument\.spreadsheetml/
    );

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(res.body);
    const ws = wb.worksheets[0];
    expect(ws.getRow(1).getCell(1).value).toBe("Title");
    expect(ws.getRow(2).getCell(1).value).toBe("A");
    expect(ws.getRow(3).getCell(1).value).toBe("B");
  });

  it("returns 400 on unknown uid", async () => {
    const strapi: any = await startStrapi();
    const jwt = await getSuperAdminJwt();
    await request(strapi.server.httpServer)
      .post("/data-exporter/export")
      .set("Authorization", `Bearer ${jwt}`)
      .send({
        uid: "api::nope.nope",
        query: {},
        fields: ["title"],
      })
      .expect(400);
  });

  it("returns 413 when count exceeds maxRows", async () => {
    const strapi: any = await startStrapi();
    const jwt = await getSuperAdminJwt();
    const cfg = strapi.config.get("plugin::data-exporter") as Record<string, any>;
    const original = cfg.maxRows;
    cfg.maxRows = 1;
    try {
      await request(strapi.server.httpServer)
        .post("/data-exporter/export")
        .set("Authorization", `Bearer ${jwt}`)
        .send({
          uid: "api::article.article",
          query: {},
          fields: ["title"],
        })
        .expect(413);
    } finally {
      cfg.maxRows = original;
    }
  });
});
