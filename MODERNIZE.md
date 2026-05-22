# Modernization Plan

Theme: **simplify**. Fewer deps, fewer config files, fewer bespoke workarounds.
Last meaningful work: 2019–2020. Toolchain is ~6 years stale.

## Decisions (locked)

- **Package output**: dual ESM + CJS + `.d.ts`, single build tool.
- **CLI** (`nf-player` bin): keep.
- **Git hooks**: slim — husky + lint-staged run prettier/eslint only; drop commitlint.
- **Bundler**: Vite for the demo (Parcel 2 is the rejected alternative).
- **Test runner**: Vitest (shares Vite config; removes jest + ts-jest + @types/jest).

## Current state

- `nf-player`: TS in `src/`, `tsc -b` → CJS in `dist/`, ships a CLI. One tsconfig covers package + demo (`jsx` set even though package is code-only).
- `demo/`: React 16 + monaco 0.20 + styled-components 5, Parcel v1. **Not a real workspace member** — own `package-lock.json` (npm!), own `node_modules`, hand-maintained `demo/nf-player.d.ts` + `demo/nf-grapher.d.ts` instead of resolving the real package.
- `Monaco.tsx`: ~90-line manual ESM import list — a Parcel-v1 tree-shaking workaround.
- CI: Travis. Publishes to npm on tag; pushes `demo/dist` to GH Pages.
- `pnpm-workspace.yaml`: has placeholder junk (`allowBuilds: deasync: set this to true or false`) left by a pnpm install prompt; no `packages:` field.

## Plan

### Phase 1 — Workspace & tsconfig

- [x] Make `demo` a real pnpm workspace member: `packages: ['.', 'demo']` in `pnpm-workspace.yaml`; placeholder `allowBuilds` block replaced with real `husky: true`.
- [x] Delete `demo/package-lock.json`, `demo/.npmrc`, `demo/node_modules`, `demo/.cache`, `.cache-demo` (also `demo/dist`, `demo/.DS_Store`).
- [x] `demo/package.json`: depend on `nf-player: workspace:*` and `nf-grapher` (was leaked transitively); added `"private": true`.
- [x] Delete `demo/nf-player.d.ts` and `demo/nf-grapher.d.ts` — types now come from the real packages.
- [x] Split tsconfig into three at repo root (also deleted `demo/tsconfig.json`):
  - `tsconfig.json` — solution file: `references` → package + demo; no files of its own.
  - `package.tsconfig.json` — lib: no `jsx`, `lib: [es2022, dom]`, `target: es2022`, `module: preserve`, `declaration`, `composite`+`noEmit` (tsdown emits; tsc is typecheck-only). `include: src`.
  - `demo.tsconfig.json` — `jsx: react-jsx`, DOM libs, `include: demo/src`.
- [x] Decorators check: `src` uses none — `emitDecoratorMetadata`/`experimentalDecorators` dropped.
- [ ] Replace `.eslintignore` symlink — moved to Phase 3 (eslint 9 flat-config migration).

### Phase 2 — Package build (dual ESM/CJS)

- [ ] Adopt **tsdown** (Rolldown-based; emits ESM + CJS + per-condition `.d.ts`, externalizes deps). Fallback: `tsup`. Replaces `tsc -b` for builds; `tsc --noEmit` stays as the typecheck step.
- [ ] `package.json`: add `"type": "module"`, `"sideEffects": false`, `engines.node >= 20`, and an `exports` map:
  ```jsonc
  "exports": { ".": { "types": "./dist/index.d.ts",
                        "import": "./dist/index.mjs",
                        "require": "./dist/index.cjs" } }
  ```
  `main` → `.cjs`, `module` → `.mjs`, `bin.nf-player` → `./dist/cli.mjs`.
- [ ] `files`: ship `dist` only (+ sourcemaps). Stop publishing raw `src`.
- [ ] **Validate before publish** (the tooling you asked for):
  - `@arethetypeswrong/cli` (`attw --pack`) — confirms types resolve under node/bundler/ESM/CJS.
  - `publint` — confirms `exports`/`main`/`files` correctness.
  Wire both into CI and a `prepublishOnly` guard.
- [ ] CLI cleanup: drop `cross-fetch` (Node 20+ has global `fetch`) — delete `import 'cross-fetch/polyfill'`. Replace `tempy` with `node:fs` `mkdtemp(os.tmpdir())`. Replace `require('../package.json')` with a JSON import / `createRequire`.

### Phase 3 — Dependency upgrades (pinned, exact)

`savePrefix: ''` only takes effect on `pnpm add` (not `pnpm up`) — bulk-stripping `^`/`~` from `package.json` after upgrade is required.

- [x] **Root**: typescript 3.8 → 6.0, prettier 1 → 3, eslint 6 → 10 (flat config) + typescript-eslint, debug 4.1 → 4.4, typedoc 0.17 → 0.28; `nf-grapher`/`pseudo-audio-param`/`soundtouch-ts`/`wav-decoder`/`wav-encoder`/`web-audio-test-api` already at latest. `@types/node` 13 → 25.
- [x] **Demo**: react 16 → 19, react-dom 16 → 19, styled-components 5 → 6, monaco-editor 0.20 → 0.55, `@types/react(-dom)` to match.
- [x] **Removed**: parcel-bundler, npm-run-all, jest, ts-jest, @types/jest, @commitlint/*, gh-pages, eslint-plugin-prettier, eslint-plugin-notice, @typescript-eslint/* (replaced by `typescript-eslint`). **Deferred to Phase 2**: cross-fetch, tempy (still imported in `src/cli.ts` — removed alongside the code change). web-audio-test-api kept per Phase 6.
- [x] **Added** (root): vitest, tsdown, @arethetypeswrong/cli, publint, typescript-eslint, @eslint/js. **Added** (demo): vite, @vitejs/plugin-react.
- [x] Code fixes for TS 6.0: `import * as Debug` → `import Debug` (cli.ts; eslint --fix rewrote BaseRenderer.ts to a named import); `Float32Array` → `Float32Array<ArrayBuffer>` in `XAudioBuffer` (TS 5.7 typed-array generics); `catch(e)` → `e as Error` casts in ContentCache + BaseRenderer; `window.performance.now()` → `performance.now()` in ScriptProcessorRenderer (kills the jsdom dependency).
- [x] Delete the `.eslintignore` symlink — eslint 9 flat config defines `ignores` in config.
- [x] `pnpm-workspace.yaml` build-script approval: handled in Phase 1 (`allowBuilds: { husky: true }` — pnpm 11's key, not `onlyBuiltDependencies`).
- [x] **Bonus migrations done here**: jest → vitest (`vitest.config.ts`, `globals: true`); husky v4 → v9 (`.husky/pre-commit`, `prepare` script); dropped commitlint + conventional-commits; `.prettierrc.js` → `.prettierrc` (JSON, kills CJS-in-ESM lint error); scripts overhaul (`test`, `test:watch`, `typecheck`, `lint`, `format`, `format:check`, `clean`, `prepare`); `engines.node >= 20`; removed parcel `browserslist` workarounds in both packages.

### Phase 4 — Demo on Vite

- [ ] `demo/vite.config.ts` with `@vitejs/plugin-react`; entry `demo/src/index.html`, `base: './'` for GH Pages.
- [ ] `demo/src/index.html`: point script at `index.ts` as a module (Vite handles it).
- [ ] **Simplify `Monaco.tsx`**: delete the ~90-line manual import list; `import * as monaco from 'monaco-editor'` and load workers via Vite `?worker` imports (or `vite-plugin-monaco-editor`). This is the single biggest complexity win.
- [ ] Demo `tsx` typechecks against `demo.tsconfig.json`.

### Phase 5 — CI/CD on GitHub Actions

Delete `.travis.yml` (kills the stale encrypted npm token and the `spotify/` vs `nativeformat/` repo mismatch).

Three workflows under `.github/workflows/`:

- `ci.yml` — on `push` + `pull_request`: install, typecheck, lint, `vitest run`, build package, build demo.
- `release.yml` — on tag / GitHub Release: build, `attw` + `publint`, `pnpm publish --provenance` via npm OIDC (no long-lived token if trusted publishing is set up; else `NPM_TOKEN` secret).
- `pages.yml` — on push to `main`: build demo + typedoc, deploy via official `actions/upload-pages-artifact` + `actions/deploy-pages`. **Removes the `gh-pages` npm dep** and the branch-pushing flow.

**Injection hardening (explicit requirement):**

- [ ] Never interpolate `${{ github.event.* }}`, branch names, PR titles, or commit messages directly into `run:` blocks. Pass them through `env:` and reference as quoted shell vars.
- [ ] Use `pull_request` (not `pull_request_target`) for PR CI; do not expose secrets to fork PRs.
- [ ] Pin every third-party action to a full commit SHA, not a tag.
- [ ] Set least-privilege `permissions:` per workflow: default `contents: read`; add `id-token: write` + `pages: write` only in `pages.yml`/`release.yml`.
- [ ] `actions/checkout` with `persist-credentials: false` where the job doesn't push.
- [ ] Pin `pnpm` + Node versions; cache via `actions/setup-node` built-in pnpm cache.

### Phase 6 — Proposed extras (not in your list)

- [ ] **Vitest over jest** (already decided) — drop ts-jest entirely; one config shared with Vite.
- [ ] **`web-audio-test-api` (0.5.2, ~2017, unmaintained)**: evaluate replacing with `node-web-audio-api` (real Web Audio impl for Node). Stretch goal — flag if it forces test rewrites; otherwise just keep pinned.
- [ ] **eslint license headers**: keep enforcing the Apache/Spotify header — port `eslint-plugin-notice` to flat config, or swap to `eslint-plugin-license-header`.
- [ ] **`debug-harness/`**: a Parcel-served dev scratchpad importing `../src`. Move it into the demo as `demo/debug.html` (a second HTML entry). Vite dev serves any root-relative `.html` automatically (`/debug.html`); the only build config needed is adding it to `build.rollupOptions.input` alongside `index.html`. Drop the standalone `debug-harness/` dir and its `declarations.d.ts`.
- [ ] **README**: update setup/build/deploy instructions (pnpm, new scripts, no Travis).
- [ ] **`dependabot.yml`**: re-enable for *security* updates only — pinned deps still want CVE bumps. There are ~20 stale open dependabot branches; close them after the upgrade lands.
- [ ] **`scripts` cleanup**: `setup`/`setup:ci` (manual `cd demo`) become unnecessary once `demo` is a workspace member — a single `pnpm install` covers both.

## Risks / watch-items

- TS 5 strictness + new `lib`/`target` may surface type errors in 6-year-old `src` — typecheck early.
- `tempy` v3+ is ESM-only; sidestepped by dropping it for `node:fs`.
- Monaco worker wiring differs between Parcel and Vite — verify the demo editor actually loads workers.
- React 16→19 + styled-components 5→6: check for removed lifecycle APIs / SC v6 breaking changes in `demo/`.
- Dual-format CLI: the `bin` must be ESM (`cli.mjs`) since deps resolve cleanly there; verify `attw` is happy with the dual `exports`.

## Suggested execution order

Phase 1 → 3 (deps) → 2 (package build) → 4 (demo) → 5 (CI) → 6 (extras). Keep each phase a separate commit; run typecheck + tests after each.

# Notes During Execution to Be Addressed Later

- [ ] **Typecheck validation deferred to Phase 3.** The new tsconfigs use `module: preserve`,
  `composite`+`noEmit`, and `jsx: react-jsx` — all require TS ≥5.6. Repo currently has TS 3.8.3,
  so `tsc -b` cannot validate the split until Phase 3 upgrades TypeScript. Run `tsc -b` then.
- [ ] **Demo typecheck blocked until React upgrade.** `demo.tsconfig.json` sets `jsx: react-jsx`,
  which needs `react/jsx-runtime` (React ≥17). Demo is still on React 16.13 until Phase 3 — do
  not run the demo typecheck before then.
- [ ] **pnpm 11 build-script key** is `allowBuilds` (map of name→bool) in `pnpm-workspace.yaml`,
  not `onlyBuiltDependencies`. pnpm re-scaffolds a placeholder if a build script is unapproved.
  After husky → v9 (Phase 3), husky uses a `prepare` script and likely needs no entry at all —
  revisit whether `allowBuilds` can be emptied entirely.
- [ ] `nf-grapher` added to `demo/package.json` as `^1.2.24` (matches root). Phase 3 must pin
  both root and demo to the same exact version.
- [x] ~~husky v4 hooks broken under pnpm~~ — resolved by Phase 3 husky → v9 migration.
  Still committing Phase 3 with `-n` to avoid running prettier 3 reformatting on the
  large diff; subsequent commits use the v9 hooks normally.
- [ ] **`pnpm typecheck` is scoped to package only** (`tsc -b package.tsconfig.json`).
  Demo currently has 196 typecheck errors — Monaco.tsx import list (Phase 4 rewrite),
  React 19 / styled-components 6 typing fallout. Flip back to `tsc -b` when Phase 4 is done.
- [ ] **`lint` has 34 warnings** (mostly unused vars; `prefer-spread`/`no-empty`/etc. relaxed
  to warn). Errors are zero. Tighten back up in Phase 6 alongside license-header enforcement.
- [ ] **`allowBuilds` in `pnpm-workspace.yaml`** can likely be emptied — husky v9 uses the
  root `prepare` lifecycle script, not a dependency build script. Remove on next install.
- [ ] **One-time `pnpm format` pass** (prettier 3 on the whole repo) should be its own
  commit later — there's drift from prettier 1.x defaults.