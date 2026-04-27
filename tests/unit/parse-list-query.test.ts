import { describe as test, it, expect } from "vitest";
import { parseListQuery } from "../../admin/src/lib/parse-list-query";

test("parseListQuery", () => {
  it("parses page and pageSize", () => {
    expect(parseListQuery("?page=2&pageSize=20")).toEqual({
      pagination: { page: 2, pageSize: 20 },
    });
  });

  it("parses sort=field:asc", () => {
    expect(parseListQuery("?sort=title:ASC")).toEqual({
      sort: { title: "ASC" },
    });
  });

  it("parses locale", () => {
    expect(parseListQuery("?plugins[i18n][locale]=fr")).toEqual({
      locale: "fr",
    });
  });

  it("parses status (draft/publish)", () => {
    expect(parseListQuery("?status=draft")).toEqual({ status: "draft" });
  });

  it("passes through filters[...] as a nested object", () => {
    const out = parseListQuery("?filters[$and][0][title][$contains]=foo");
    expect(out.filters).toEqual({ $and: [{ title: { $contains: "foo" } }] });
  });

  it("combines multiple keys", () => {
    const out = parseListQuery("?page=1&sort=createdAt:DESC&status=published");
    expect(out).toEqual({
      pagination: { page: 1 },
      sort: { createdAt: "DESC" },
      status: "published",
    });
  });
});
