# strapi-plugin-data-exporter

[![npm version](https://img.shields.io/npm/v/strapi-plugin-data-exporter.svg)](https://www.npmjs.com/package/strapi-plugin-data-exporter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/license/mit)

Export Strapi v5 collections to `.xlsx` files directly from the admin panel.

A button appears in every Content Manager list view; clicking it opens a modal where you pick which fields to include, then streams the matching entries down to your browser as an Excel workbook. Filters, sort, locale, and draft/publish state from the list view are honored — what you see is what you export.

## Requirements

- Strapi `^5.0.0`
- Node `>=20.0.0 <=24.x.x`
- React 18

## Installation

```bash
yarn add strapi-plugin-data-exporter
# or
npm install strapi-plugin-data-exporter
```

Enable the plugin in `config/plugins.ts` (or `.js`):

```ts
export default () => ({
  'data-exporter': {
    enabled: true,
  },
});
```

Then rebuild and start the admin:

```bash
yarn build
yarn develop
```

## Permissions

Bulk-exporting a collection is intentionally separate from reading individual entries. After installing the plugin, grant the **Export collections** action to roles that should have it:

1. Open **Settings → Administration Panel → Roles**.
2. Pick a role (e.g. *Editor*).
3. Under the relevant content type, tick **Export collections**.
4. Save.

Users in roles without this permission won't see the Export button on the list view.

Super-admins always have access — they don't need explicit permission.

## Usage

1. Open any collection in the **Content Manager**.
2. Apply filters, sort, locale, or draft/publish state as you would normally.
3. Click **Export** in the list-view header.
4. Pick the fields you want in the modal.
5. Click **Export**. The `.xlsx` downloads automatically.

The exported file matches the rows visible in the list view: the same filters, the same sort order, the same locale, the same draft/publish state.

## Configuration

All keys are optional; defaults are shown.

```ts
// config/plugins.ts
export default () => ({
  'data-exporter': {
    enabled: true,
    config: {
      maxRows: 50_000,
      pageSize: 500,
      flattenDepth: 3,
      relationDisplayField: 'id',
      excludeAttributes: ['password', 'resetPasswordToken'],
      filenameTemplate: '{collection}-{date}.xlsx',
      sanitizeFormulas: true,
    },
  },
});
```

| Key | Default | Description |
|---|---|---|
| `maxRows` | `50000` | Hard cap on entries per export. Exports above this fail with HTTP 413. |
| `pageSize` | `500` | Internal pagination size used while streaming. Auto-clamped to `maxRows`. |
| `flattenDepth` | `3` | How many levels of nested components to flatten into dotted columns. Deeper paths are collapsed to a JSON column. Range `[1, 10]`. |
| `relationDisplayField` | `'id'` | Which field of a related entry to render in cells. Many-relations are joined by comma. |
| `excludeAttributes` | `['password', 'resetPasswordToken']` | Attribute names that are never exported, regardless of selection. |
| `filenameTemplate` | `'{collection}-{date}.xlsx'` | `{collection}` → `info.singularName`. `{date}` → ISO-8601 basic UTC (e.g. `20260427T143015Z`). |
| `sanitizeFormulas` | `true` | If true, prepend `'` to cell values starting with `=`/`+`/`-`/`@`. See **Security** below. |

## How an export happens

```
admin click  →  POST /data-exporter/export { uid, query, fields }
            →  isAuthenticatedAdmin policy
            →  has-export-permission policy   (RBAC check on uid)
            →  controller validates body
            →  exporter.run
                ├─ describe(uid) → validate fields
                ├─ documentService.count(query) → check vs maxRows
                ├─ open xlsx stream-writer
                └─ paginate documentService.findMany (page=N, pageSize)
                     └─ per entry: flatten → xlsx-writer.appendRow
                ├─ commit
                └─ return Readable
            →  controller pipes Readable to response
            →  browser downloads <collection>-<ISO>.xlsx
```

The export streams — entries flow from the database, through pagination, into xlsx rows, and out to the browser without ever buffering the full file in memory.

## What gets exported

| Strapi attribute | Exported as |
|---|---|
| Scalars (string, integer, boolean, date, datetime, JSON, enumeration, …) | One column each |
| Components (single, nested) | Flattened into dotted columns (`address.country.name`) up to `flattenDepth` |
| Repeatable components | One column, JSON-encoded array |
| Dynamic zones | One column, JSON-encoded array |
| Media (single) | URL string |
| Relations (single) | The related entry's `relationDisplayField` (default: `id`) |
| Relations (many) | Comma-joined `relationDisplayField` values |
| Password | Always excluded |

## Security: formula injection

By default (`sanitizeFormulas: true`), any cell value starting with `=`, `+`, `-`, or `@` gets a leading apostrophe (`'`) prepended. This neutralizes the well-known [CSV/xlsx formula-injection](https://owasp.org/www-community/attacks/CSV_Injection) vector — without it, a user who can write into a content-type field could craft a value like `=HYPERLINK(...)` that executes when another admin opens the exported file in Excel.

Disable only if your data is fully trusted **and** downstream consumers handle escaping themselves.

## Limits

- **Row cap**: 50,000 by default. Tune via `maxRows`. Exceeding it fails the export with HTTP 413 (`ROW_LIMIT_EXCEEDED`) before any bytes are written.
- **Request timeout**: For exports near the cap (~30–60s on commodity hardware with wide schemas), make sure your Strapi/Koa `requestTimeout` is at least 120s. Adjust in `config/server.ts`:
  ```ts
  export default ({ env }) => ({
    // …
    requestTimeout: 120_000,
  });
  ```

## FAQ

**Q: Can I export every locale at once?**
No — the export reflects the current list-view locale. Switch the locale picker to export a different language, or repeat the export.

**Q: Can I customize the relation display per content type?**
Not in v1. `relationDisplayField` is global. Per-relation overrides are tracked for v2.

**Q: Why is the file empty / why does my browser open the response inline?**
Some networks rewrite `Content-Disposition` headers. If filenames look generic (`export.xlsx`) or the file streams to the browser tab instead of downloading, check that no proxy is stripping headers between Strapi and the client.

**Q: My collection has 200k rows. How do I export it?**
Increase `maxRows` and `requestTimeout` (and your Node memory if needed). For collections that large, an async/job-queue mode is on the roadmap for v2.

## Out of scope (v1)

- REST or CLI export triggers
- Bulk-action on selected rows
- Async/job-queue mode
- Multi-sheet "full fidelity" workbooks
- Per-relation `relationDisplayField` overrides
- Strapi v4 compatibility

## License

MIT — see [LICENSE](./LICENSE).
