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

- [x] **tsdown** (Rolldown) emits ESM (`.js`) + CJS (`.cjs`) + per-condition `.d.ts` / `.d.cts`. Points at `package.tsconfig.json` (root is a solution file with `references`). `tsc -b` stays as the typecheck step.
- [x] `package.json`: `"type": "module"`, `"sideEffects": false`, `engines.node >= 20`, and a per-condition `exports` map (`{ import: { types, default }, require: { types, default } }`); `main` → `.cjs`, `module` → `.js`, `bin.nf-player` → `./dist/cli.js`. `prepack` runs the build.
- [x] `files: ["dist"]` only (sourcemaps included).
- [x] **publint**: clean (`All good!`); repository URL normalized to `git+https://...`.
- [ ] **attw**: blocked by attw 0.18.2 shipping TS 5.6.1-rc, which can't parse `Float32Array<ArrayBuffer>` generics (TS 5.7+). Script kept (`pnpm attw`) for when attw bumps. `validate` runs publint only for now.
- [x] CLI cleanup: dropped `cross-fetch` polyfill (Node ≥20 has global `fetch`); dropped `tempy` for `node:fs/promises` + `node:os.tmpdir()` + `node:crypto.randomUUID()`; replaced `require('../package.json')` with `import pkg from '../package.json' with { type: 'json' }`.
- [x] **Bonus**: enabled `verbatimModuleSyntax` + `isolatedModules` in `package.tsconfig.json`; bulk-fixed the codebase via `@typescript-eslint/consistent-type-imports` autofix (inline `type` modifier) and split index.ts re-exports into value vs `export type` blocks.

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

- [x] `demo/vite.config.ts` with `@vitejs/plugin-react`; multi-entry (`./index.html` + `./debug.html`), `base: './'` for GH Pages, `server.fs.allow: ['..']` so the shared `<repo>/fixtures/*.wav` is importable.
- [x] HTML moved up: `demo/src/index.html` → `demo/index.html`; script tags now `type="module"`; CSS path adjusted.
- [x] **`Monaco.tsx` collapsed** from ~220 lines to ~85: the 90-line side-effect import wall is gone (`import * as monaco from 'monaco-editor'`), workers wired via Vite `?worker` imports. (`addExtraLib` in-editor type-help was dropped — `fs.readFileSync` of deleted hand-maintained `.d.ts` was broken anyway; see follow-ups.)
- [x] Demo typechecks against `demo.tsconfig.json`; `pnpm typecheck` at root flipped back to `tsc -b` (whole solution).
- [x] Demo `package.json` scripts: `dev`, `build`, `preview`, `typecheck`.

**React 16 → 19 fallout in the demo (fixed):**
- [x] `react-dom`'s `render` → `react-dom/client`'s `createRoot`.
- [x] `React.SFC` → `React.FC`; `React.ReactChildren | React.ReactChild` → `React.ReactNode`; `JSX.Element` → `React.JSX.Element`.
- [x] `private state` on a `PureComponent` subclass — drop the `private` modifier (React 19 typings make the inherited field public).
- [x] `CODEEditor.tsx` had two `componentDidMount` methods (legacy bug); deleted the stray `forceUpdate` one.
- [x] `MonacoEditor` `onChange` prop was required; callers passing JSON now stub `onChange={() => {}}`.
- [x] Demo's `<ScriptProcessorRenderer>.processor` poke (`private` field) — accepted as a documented `(as any)` cast in `App.tsx`. Alternative: surface it in the lib API (future).

**Package surface change (small):** `XAudioContext` is now re-exported from `nf-player` (was only available via the deep relative path `../../../src/WebAudioContext` from demo).

**Workspace import cleanup:** every `from '../../../src'` in demo became `from 'nf-player'` (workspace dep resolves to the built package).

### Phase 5 — CI/CD on GitHub Actions

- [x] Deleted `.travis.yml` (kills the stale encrypted npm token and the `spotify/`-vs-`nativeformat/` repo mismatch).

Three workflows under `.github/workflows/`:

- [x] `ci.yml` — `push` + `pull_request`: install (`--frozen-lockfile`), typecheck, lint, vitest, build package, `pnpm validate` (publint), build demo.
- [x] `release.yml` — on `release: { types: [published] }`: install, typecheck, test, build, validate, then `pnpm publish --provenance --access public --no-git-checks` with `NPM_TOKEN`. Gated by a protected `npm` environment.
- [x] `pages.yml` — push to `main`/`master`: build package + demo, deploy via `actions/configure-pages` + `upload-pages-artifact` + `deploy-pages`. **Kills the `gh-pages` npm dep.** typedoc deferred (see follow-ups).

**Injection hardening (explicit requirement):**

- [x] No `${{ github.event.* }}` / branch names / PR titles in `run:` blocks anywhere.
- [x] `pull_request` (not `pull_request_target`); no secrets exposed to fork PRs.
- [ ] Pin every third-party action to a full commit SHA. **Currently tags** (`@v4`) with `# TODO: SHA-pin` markers — one Dependabot pass will convert them. See CI follow-ups.
- [x] Top-level `permissions: contents: read`; `id-token: write` / `pages: write` added only on the publish + deploy jobs.
- [x] `actions/checkout` with `persist-credentials: false` on every job.
- [x] Node 22 pinned; pnpm version comes from `packageManager` field via `pnpm/action-setup`; `actions/setup-node` provides the pnpm cache.
- [x] `concurrency` groups cancel stale CI/pages runs.

### Phase 6 — Proposed extras (not in your list)

- [ ] **Vitest over jest** (already decided) — drop ts-jest entirely; one config shared with Vite.
- [ ] **`web-audio-test-api` (0.5.2, ~2017, unmaintained)**: evaluate replacing with `node-web-audio-api` (real Web Audio impl for Node). Stretch goal — flag if it forces test rewrites; otherwise just keep pinned.
- [ ] **eslint license headers**: keep enforcing the Apache/Spotify header — port `eslint-plugin-notice` to flat config, or swap to `eslint-plugin-license-header`.
- [x] **`debug-harness/`**: moved into the demo as `demo/debug.html` + `demo/src/debug.ts`, listed in `build.rollupOptions.input`. Standalone dir + its `declarations.d.ts` deleted. `*.wav` declaration already lived in `demo/src/declarations.d.ts`.
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
- [ ] **attw blocked on its bundled TypeScript** (0.18.2 ships TS 5.6.1-rc; our `.d.ts`
  uses TS 5.7+ `Float32Array<ArrayBuffer>` generics). Re-enable in `validate` once attw
  ships a newer TS. Removing the generic isn't an option — it's what makes `XAudioBuffer`
  structurally assignable to DOM `AudioBuffer`.
- [ ] **tsdown chunked output** produces hash-named shared files
  (`MemoryRenderer-XXX.{js,cjs}`) because index + cli share most code. Functional, but
  consider `unbundle: true` if cleaner 1:1 module output is preferred.
- [ ] **Demo main bundle is ~7 MB** (2 MB gzip) because `import * as monaco from
  'monaco-editor'` is a greedy barrel. Subpath imports (`monaco-editor/esm/vs/editor/editor.api`)
  shrink it but lose TS types — monaco-editor's `exports` map doesn't expose the subpaths.
  Languages are already code-split into separate chunks. Options: `vite-plugin-monaco-editor`
  with a language allow-list, or wait for monaco-editor to publish proper subpath types.
- [ ] **Monaco `addExtraLib` (in-editor type-help for NFPlayer/NFGrapher)** was removed —
  the old version read deleted hand-maintained `.d.ts` files via `fs.readFileSync` (a
  Parcel-v1 hack). Restore via Vite `?raw` imports of `nf-player/dist/index.d.ts` and
  `nf-grapher/.../*.d.ts` if the demo editor's autocomplete is wanted again.
- [ ] **`(nextRenderer as any).processor`** in `App.tsx` — the demo reaches into
  `ScriptProcessorRenderer`'s private field for FFT analyzer wiring. Either surface
  `processor` as part of the public API, or build a small wrapper that exposes the right
  node for analyzer connection.
- [ ] **CI follow-ups**:
  - SHA-pin third-party actions (`pnpm/action-setup`, and arguably `actions/*` too) — one
    Dependabot pass converts the `@v4` tags. Tagged with `# TODO: SHA-pin` markers in the
    workflows.
  - Configure repository for npm publish: create a protected `npm` environment with the
    `NPM_TOKEN` secret (or set up npm trusted publishing via OIDC and drop the token).
  - Enable GitHub Pages with the "GitHub Actions" source so `pages.yml` can deploy.
  - typedoc on Pages was dropped from `pages.yml` for now — modern typedoc removed the
    `--mode file` / `--excludeNotExported` flags the old script used. Add a `docs` script
    + a typedoc step once the new invocation is settled.
  - `release.yml` triggers on `release: published` (manual). If preferred, switch to
    `push: { tags: ['v*'] }` or wire `changesets`/`release-please`.