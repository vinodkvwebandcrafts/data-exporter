# Relax peer dependencies for Strapi 5.x compatibility

**Date**: 2026-06-01
**Status**: Approved, pending implementation
**Affects**: `package.json`, new release `1.1.1`

## Problem

`strapi-plugin-data-excel-exporter@1.1.0` fails to install on Strapi 5.x projects with `ERESOLVE`. The plugin's published `peerDependencies` are pinned to the versions used during development (Strapi 5.43+), which are tighter than what Strapi 5.x actually ships. The immediate trigger is `react-intl@^6.8.9` — Strapi 5.47 ships `react-intl@6.6.2`, so npm cannot satisfy the constraint.

Example failure (npm 10):

```
npm error Conflicting peer dependency: react-intl@6.8.9
npm error peer react-intl@"^6.8.9" from strapi-plugin-data-excel-exporter@1.1.0
```

The same class of conflict will surface on `@strapi/strapi`, `@strapi/design-system`, `styled-components`, and `react-router-dom` for any consumer not on the exact dev-time versions.

## Goals

- Plugin installs cleanly (no `--legacy-peer-deps`, no `--force`) on any Strapi 5.x project.
- The README's stated compatibility (`Strapi ^5.0.0`, React 18) becomes truthful — currently it advertises broader support than the peer ranges allow.
- Existing 1.1.0 users are steered to the fix without breaking anyone pinned to it.

## Non-goals

- Supporting Strapi 4.x or pre-release Strapi 6.
- Supporting React 17 (Strapi 5 requires React 18).
- Introducing a CI matrix that installs against multiple Strapi versions. Useful, but out of scope for this patch — track separately.
- Creating `CHANGELOG.md`. The release notes live in the git tag annotation.

## Design

### Peer dependency ranges

Replace the current `peerDependencies` block in `package.json` with:

```json
"peerDependencies": {
  "@strapi/strapi": "^5.0.0",
  "@strapi/design-system": "^2.0.0",
  "@strapi/icons": "^2.0.0",
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "react-intl": "^6.6.0",
  "react-router-dom": "^6.0.0",
  "styled-components": "^6.0.0"
}
```

Rationale:

| Entry | Range | Reason |
| --- | --- | --- |
| `@strapi/strapi` | `^5.0.0` | Matches README; covers all Strapi 5.x. |
| `@strapi/design-system` | `^2.0.0` | Strapi 5 uses v2. |
| `@strapi/icons` | `^2.0.0` | Strapi 5 uses v2. |
| `react` | `^18.0.0` | Strapi 5 requires React 18. |
| `react-dom` | `^18.0.0` | Same. |
| `react-intl` | `^6.6.0` | Strapi 5.47 ships 6.6.2; this is the immediate ERESOLVE fix. |
| `react-router-dom` | `^6.0.0` | Strapi 5 ships v6. |
| `styled-components` | `^6.0.0` | Strapi 5 ships v6. |

**Drop `@strapi/sdk-plugin` from `peerDependencies` entirely.** It is the plugin's build tool (`strapi-plugin build`/`watch`), used by plugin authors, never invoked by consumers of the published tarball. Keep it in `devDependencies` only. Leaving it as a peer creates phantom warnings on every consumer install.

`devDependencies` stay pinned as-is — they govern this repo's own reproducible builds and should not be loosened.

### Version

Bump `package.json` `version` from `1.1.0` to `1.1.1`. This is a patch — metadata-only change, no source modifications.

### Changelog

No `CHANGELOG.md` file. Release notes go in the annotated git tag (`git tag -a v1.1.1 -m "..."`) and the npm publish description.

## Verification

Before publishing, verify the tarball installs cleanly into a real Strapi 5 project.

1. In this repo:
   ```bash
   yarn build
   yarn pack
   ```
   Produces `strapi-plugin-data-excel-exporter-v1.1.1.tgz`.

2. In a scratch directory outside this repo:
   ```bash
   npx create-strapi-app@latest scratch-test --quickstart --no-run
   cd scratch-test
   npm install /absolute/path/to/strapi-plugin-data-excel-exporter-v1.1.1.tgz
   ```

3. **Pass criterion**: step 2's `npm install` completes with no `ERESOLVE` error and no `--legacy-peer-deps` flag.

4. Enable the plugin in `scratch-test/config/plugins.ts`:
   ```ts
   export default () => ({
     'data-exporter': { enabled: true },
   });
   ```

5. Run `npm run build && npm run develop`. Confirm:
   - Admin starts without errors.
   - Opening any collection's list view shows the **Export** action in the bulk-action bar when rows are selected.

**Stop criterion**: if step 3 fails, fix peer ranges, re-`yarn pack`, retry from step 2. Do not proceed to release until step 3 is clean.

## Release flow

1. Commit:
   ```
   chore: relax peer deps for broader Strapi 5.x compatibility
   ```
2. Tag:
   ```bash
   git tag -a v1.1.1 -m "Relax peer deps so install works on all Strapi 5.x"
   ```
3. Push:
   ```bash
   git push && git push --tags
   ```
4. Publish (requires user's npm auth):
   ```bash
   npm publish --access public
   ```
5. Deprecate 1.1.0 (requires user's npm auth):
   ```bash
   npm deprecate strapi-plugin-data-excel-exporter@1.1.0 \
     "Peer deps too strict — install fails on Strapi 5.x. Upgrade to 1.1.1."
   ```

Steps 4 and 5 are user-run because they require npm authentication and are externally visible / hard to reverse. Steps 1–3 can be assistant-prepared and user-confirmed.

## Risks

- **Older Strapi 5.x versions are untested.** The plugin was developed and tested against 5.43+. Declaring `^5.0.0` covers 5.0–5.42 by claim only. Mitigation: the README continues to list 5.43+ as the recommended floor in usage examples, and any user on 5.0–5.42 hitting a runtime issue can be told to upgrade Strapi.
- **`@strapi/sdk-plugin` removal from peers is conventional but not universally followed.** Some plugin templates keep it as a peer. Risk is negligible — at worst, consumers see no warning where they previously saw a phantom one.
- **A typo in a peer range publishes another broken version.** Mitigated by the mandatory tarball-install verification step (§ Verification).
