# Releasing strapi-plugin-data-exporter

## Pre-publish checklist

- [ ] CI green on `main`
- [ ] Manual dogfood smoke test passing against the latest commit
- [ ] Version bumped in `package.json` (semver)
- [ ] CHANGELOG entry added
- [ ] Tag created: `git tag v$VERSION && git push --tags`

## Publish

```bash
yarn build
yarn pack --dry-run     # inspect tarball contents — no test files, no .git
npm publish --access public
```

## Post-publish

- [ ] Verify install in a fresh Strapi 5 project: `yarn add strapi-plugin-data-exporter`
- [ ] Once stable, file the Strapi Marketplace listing PR against `strapi/strapi`
