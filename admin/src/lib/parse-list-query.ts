import qs from "qs";

export type DocumentQuery = {
  filters?: Record<string, unknown>;
  pagination?: { page?: number; pageSize?: number };
  sort?: Record<string, "ASC" | "DESC">;
  locale?: string;
  status?: "draft" | "published";
};

/**
 * Parse a Strapi Content Manager list-view URL search string into a
 * documentService-shaped query object. Keep this a pure function so the
 * URL-to-query mapping can be unit tested in isolation.
 */
export function parseListQuery(search: string): DocumentQuery {
  const raw = qs.parse(search.startsWith("?") ? search.slice(1) : search, {
    depth: 10,
  }) as Record<string, unknown>;

  const out: DocumentQuery = {};

  if (raw.page || raw.pageSize) {
    out.pagination = {};
    if (raw.page) out.pagination.page = Number(raw.page);
    if (raw.pageSize) out.pagination.pageSize = Number(raw.pageSize);
  }

  if (typeof raw.sort === "string") {
    const [field, dir] = raw.sort.split(":");
    if (field && dir) {
      out.sort = { [field]: dir.toUpperCase() as "ASC" | "DESC" };
    }
  }

  const plugins = raw.plugins as { i18n?: { locale?: unknown } } | undefined;
  const i18nLocale = plugins?.i18n?.locale;
  if (typeof i18nLocale === "string") out.locale = i18nLocale;

  if (raw.status === "draft" || raw.status === "published") {
    out.status = raw.status;
  }

  if (raw.filters && typeof raw.filters === "object") {
    out.filters = raw.filters as Record<string, unknown>;
  }

  return out;
}
