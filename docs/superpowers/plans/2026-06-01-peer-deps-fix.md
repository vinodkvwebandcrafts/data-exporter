# Peer Deps Fix (1.1.1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish `strapi-plugin-data-excel-exporter@1.1.1` with relaxed peer dependency ranges so the plugin installs cleanly on any Strapi 5.x project, then deprecate the broken 1.1.0.

**Architecture:** Metadata-only change to `package.json` (peer deps loosened, `@strapi/sdk-plugin` dropped from peers, version bumped to 1.1.1). No source code changes. Verification is a real tarball install into a scratch Strapi 5.47 app before publish. Publish + deprecate are user-run because they require npm auth and are externally visible.

**Tech Stack:** npm, yarn (Berry), git, Strapi 5.47 (for scratch test app).

**Spec:** `docs/superpowers/specs/2026-06-01-peer-deps-fix-design.md`

---

## File Structure

- **Modify:** `package.json` — only file changed in this release. Two edits: `peerDependencies` block (relax + drop `@strapi/sdk-plugin`) and `version` field (`1.1.0` → `1.1.1`).
- **Create (transient, not committed):** `strapi-plugin-data-excel-exporter-v1.1.1.tgz` in repo root, produced by `yarn pack`. Used for verification, ignored by `.gitignore` patterns (`*.tgz` is typically already ignored — verify in Task 2).
- **No source code touched.** No test files added — the verification step (Task 3) is a real-install smoke test against an actual Strapi app, which is the appropriate test for a peer-deps fix.

---

### Task 1: Update `package.json`

**Files:**
- Modify: `package.json` (peer deps block at lines 78–88, version field at line 2)

- [ ] **Step 1: Read the current `package.json`**

Confirm current state matches what the spec assumes:
- `"version": "1.1.0"` at line 2
- `peerDependencies` block at lines 78–88 contains `react-intl: "^6.8.9"` and `@strapi/sdk-plugin: "^6.1.0"`

If the file has drifted, stop and reconcile before editing.

- [ ] **Step 2: Bump the version field**

Edit `package.json`:

```diff
- "version": "1.1.0",
+ "version": "1.1.1",
```

- [ ] **Step 3: Replace the `peerDependencies` block**

Replace the entire `peerDependencies` block with:

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
},
```

Notes:
- `@strapi/sdk-plugin` is deliberately removed — it's a build tool used by plugin authors only, not consumers. Leaving it as a peer creates phantom install warnings.
- `devDependencies` block is NOT touched. Keep dev deps pinned tight; only peers loosen.

- [ ] **Step 4: Verify the edit with `git diff`**

Run: `git diff package.json`

Expected output (abbreviated):
```
- "version": "1.1.0",
+ "version": "1.1.1",
...
   "peerDependencies": {
-    "@strapi/design-system": "^2.2.0",
-    "@strapi/icons": "^2.2.0",
-    "@strapi/sdk-plugin": "^6.1.0",
-    "@strapi/strapi": "^5.43.0",
-    "react": "^18.3.1",
-    "react-dom": "^18.3.1",
-    "react-intl": "^6.8.9",
-    "react-router-dom": "^6.30.3",
-    "styled-components": "^6.4.1"
+    "@strapi/strapi": "^5.0.0",
+    "@strapi/design-system": "^2.0.0",
+    "@strapi/icons": "^2.0.0",
+    "react": "^18.0.0",
+    "react-dom": "^18.0.0",
+    "react-intl": "^6.6.0",
+    "react-router-dom": "^6.0.0",
+    "styled-components": "^6.0.0"
   },
```

Stop and reconcile if `devDependencies` shows any diff — those must not change.

- [ ] **Step 5: Do NOT commit yet**

The commit happens in Task 4 after verification passes. If verification fails and peer ranges need tweaking, you don't want a published-bad commit in history.

---

### Task 2: Build and pack the tarball

**Files:**
- Modify (auto-generated): `dist/**` via `yarn build`
- Create (transient): `strapi-plugin-data-excel-exporter-v1.1.1.tgz` in repo root

- [ ] **Step 1: Confirm `*.tgz` is gitignored**

Run: `git check-ignore -v strapi-plugin-data-excel-exporter-v1.1.1.tgz`

Expected: a line showing the rule that ignores it (e.g. `.gitignore:N:*.tgz`).

If the command exits non-zero (not ignored), add `*.tgz` to `.gitignore` before continuing. The tarball must not be accidentally committed.

- [ ] **Step 2: Build the plugin**

Run: `yarn build`

Expected: `strapi-plugin build` completes without errors. `dist/` is regenerated.

- [ ] **Step 3: Pack the tarball**

Run: `yarn pack`

Expected: `strapi-plugin-data-excel-exporter-v1.1.1.tgz` is created in repo root. The filename embeds the version, which confirms the version bump from Task 1 took effect.

If the filename shows `v1.1.0`, Task 1 Step 2 didn't save — return to Task 1.

- [ ] **Step 4: Inspect tarball contents**

Run: `tar -tzf strapi-plugin-data-excel-exporter-v1.1.1.tgz | head -30`

Expected: see `package/dist/...`, `package/package.json`, `package/README.md`, `package/LICENSE`. Should NOT see `package/tests/`, `package/.git/`, `package/admin/src/`, or `package/server/src/` (source files — only `dist/` ships per `files` field).

- [ ] **Step 5: Note the absolute tarball path for Task 3**

Run: `realpath strapi-plugin-data-excel-exporter-v1.1.1.tgz` (or `pwd` + filename if `realpath` is unavailable on Windows).

Save this path. You'll paste it into the scratch app's `npm install` command in Task 3.

---

### Task 3: Verify in a scratch Strapi 5.47 project

**Files:** None in this repo. All work happens in a sibling directory.

**Who runs this:** The human user runs this task. It scaffolds a real Strapi app (interactive, slow, depends on machine state). The assistant prepares commands; the user executes and reports back.

- [ ] **Step 1: Pick a scratch directory**

Choose a directory OUTSIDE this repo (e.g. `C:\Users\wac\scratch\` or `/tmp/scratch/`). Create it if needed:

```bash
mkdir -p /path/to/scratch && cd /path/to/scratch
```

- [ ] **Step 2: Scaffold a fresh Strapi 5 app**

Run:

```bash
npx create-strapi-app@latest scratch-test --quickstart --no-run
```

This produces a Strapi 5.x project (defaults to the latest 5.x, currently 5.47 or higher) using SQLite. It does NOT auto-start the admin (the `--no-run` flag).

Expected: `scratch-test/` directory exists with `package.json` showing `"@strapi/strapi": "5.x.x"`.

- [ ] **Step 3: Install the tarball — the critical test**

```bash
cd scratch-test
npm install /absolute/path/to/strapi-plugin-data-excel-exporter-v1.1.1.tgz
```

Replace `/absolute/path/to/` with the path saved in Task 2 Step 5.

**Pass criterion:** install completes with NO `ERESOLVE` error and NO need for `--legacy-peer-deps` or `--force`. Peer dep warnings (e.g. `npm warn`) are acceptable; resolution errors are not.

**Fail handling:** if `ERESOLVE` still fires, read the error to identify which peer range is still too tight. Return to Task 1 Step 3, loosen that specific range, then redo Task 2 → re-run this step. Do NOT proceed.

- [ ] **Step 4: Enable the plugin**

In `scratch-test/config/plugins.ts` (or `plugins.js`), add:

```ts
export default () => ({
  'data-exporter': { enabled: true },
});
```

- [ ] **Step 5: Build and run the admin**

```bash
npm run build
npm run develop
```

Expected: admin builds without errors, dev server starts, the admin panel is reachable at `http://localhost:1337/admin`.

If the build fails on a module resolution error, the peer ranges allow installation but not actual use — a deeper compatibility issue exists. Stop and investigate before publishing.

- [ ] **Step 6: Smoke-test the Export action**

1. Create an admin user (first-run flow).
2. Create a trivial content-type (e.g. `Article` with a `title` field) via Content-Type Builder.
3. Add 1–2 entries.
4. Open the list view, tick a row's checkbox.
5. Confirm the **Export** button appears in the bulk-action bar.
6. Click Export — confirm an `.xlsx` file downloads.
7. Open the file — confirm it contains the entry's data.

If any step fails, the bug is now in code (not peer deps) and warrants a separate investigation. Stop and report.

- [ ] **Step 7: Report verification result**

User confirms in chat: "verification passed" — or paste the failing output. Do not proceed to Task 4 without an explicit pass.

---

### Task 4: Commit, tag, and push

**Files:**
- Modify: `package.json` (already staged via the edits in Task 1)

**Who runs this:** Assistant prepares commands. User can run, or authorize the assistant to run via Bash.

- [ ] **Step 1: Stage only `package.json`**

```bash
git add package.json
```

Run `git status` to confirm ONLY `package.json` is staged. If `dist/` shows as modified, that's expected (Task 2 Step 2 rebuilt it) — but it should not be staged because it's gitignored (`dist/` is in the `files` field for npm but excluded from git).

If `dist/` IS staged or shows up as untracked-not-ignored, stop — `.gitignore` is missing a rule.

- [ ] **Step 2: Commit**

```bash
git commit -m "chore: relax peer deps for broader Strapi 5.x compatibility

Bumps version to 1.1.1. No code changes — peer dependency ranges
loosened so the plugin installs on any Strapi 5.x without
--legacy-peer-deps. Drops @strapi/sdk-plugin from peers (build-tool
only, not a consumer dep)."
```

- [ ] **Step 3: Create annotated tag**

```bash
git tag -a v1.1.1 -m "Relax peer deps so install works on all Strapi 5.x.

Fixes ERESOLVE on react-intl with Strapi 5.47, plus loosens other
peer ranges to match what Strapi 5.x actually ships. No source changes."
```

- [ ] **Step 4: Push commit and tag**

```bash
git push
git push --tags
```

Expected: both pushes succeed. `master` advances by one commit, `v1.1.1` tag appears on the remote.

---

### Task 5: Publish to npm

**Who runs this:** USER ONLY. Requires npm authentication tied to the user's npm account. Assistant must not run `npm publish`.

- [ ] **Step 1: Verify you're logged in as the right npm user**

Run: `npm whoami`

Expected: prints the npm account that owns `strapi-plugin-data-excel-exporter`. If it prints a different user or errors, run `npm login` first.

- [ ] **Step 2: Dry-run the publish**

```bash
npm publish --access public --dry-run
```

Expected: shows the file list that will be uploaded — same files seen in Task 2 Step 4 (`package.json`, `README.md`, `LICENSE`, `dist/**`). No source, no tests, no `.git`.

If the file list shows anything unexpected (test files, source files, `.env`), STOP. Check the `files` field in `package.json` and the `.npmignore` (if any) before continuing.

- [ ] **Step 3: Publish**

```bash
npm publish --access public
```

Note: `prepublishOnly` hook in `package.json` runs `yarn verify && yarn build` before the publish. If either fails, the publish aborts — fix and retry.

Expected: `+ strapi-plugin-data-excel-exporter@1.1.1` printed on success.

- [ ] **Step 4: Verify the published version**

```bash
npm view strapi-plugin-data-excel-exporter version
```

Expected: prints `1.1.1`.

```bash
npm view strapi-plugin-data-excel-exporter peerDependencies
```

Expected: prints the relaxed peer deps from Task 1 Step 3.

---

### Task 6: Deprecate 1.1.0

**Who runs this:** USER ONLY. Requires npm authentication.

- [ ] **Step 1: Deprecate 1.1.0**

```bash
npm deprecate strapi-plugin-data-excel-exporter@1.1.0 "Peer deps too strict — install fails on Strapi 5.x. Upgrade to 1.1.1."
```

Expected: command exits 0 with no error.

- [ ] **Step 2: Verify the deprecation took effect**

```bash
npm view strapi-plugin-data-excel-exporter@1.1.0 deprecated
```

Expected: prints the deprecation message exactly as set in Step 1.

- [ ] **Step 3: Test the consumer-facing experience**

In any directory, run:

```bash
npm install strapi-plugin-data-excel-exporter@1.1.0 --dry-run
```

Expected: see a `npm warn deprecated strapi-plugin-data-excel-exporter@1.1.0: Peer deps too strict...` line in the output. This confirms users will see the warning.

- [ ] **Step 4: Final sanity check — fresh install of 1.1.1**

Back in the scratch-test directory from Task 3:

```bash
cd scratch-test
rm -rf node_modules package-lock.json
npm uninstall strapi-plugin-data-excel-exporter
npm install strapi-plugin-data-excel-exporter
```

(Note: install by name now, NOT by tarball path. This pulls 1.1.1 from the registry.)

Expected: 1.1.1 installs cleanly with no `ERESOLVE`, no `--legacy-peer-deps`. This is the real end-user experience.

If it fails — the published 1.1.1 has the same problem as 1.1.0. Publish 1.1.2 with corrected ranges. (npm does not allow republishing the same version.)

- [ ] **Step 5: Cleanup**

The scratch-test directory is no longer needed. Delete it or keep it for future plugin testing — user choice.

Optionally remove the local tarball:

```bash
rm strapi-plugin-data-excel-exporter-v1.1.1.tgz
```

---

## Done criteria

- [ ] `package.json` shows `version: "1.1.1"` and the relaxed `peerDependencies` block.
- [ ] `git log` shows the commit and `v1.1.1` tag on `master`, pushed to origin.
- [ ] `npm view strapi-plugin-data-excel-exporter version` returns `1.1.1`.
- [ ] `npm view strapi-plugin-data-excel-exporter@1.1.0 deprecated` returns the deprecation message.
- [ ] Fresh `npm install strapi-plugin-data-excel-exporter` into a Strapi 5.47 app succeeds with no flags.
