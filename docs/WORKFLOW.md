# Development Workflow

This document describes how work actually moves through this repository:
branching, local setup, the required checks before a change is considered
complete, how releases are cut, and where to look before making a change.
It complements [`CODEBASE.md`](./CODEBASE.md) (architecture/IPC reference)
and [`productionchecklist.md`](./productionchecklist.md) (release gate).

---

## 1. Branches

- **`main`** — stable, release-ready. Every push to `main` triggers a
  Windows build and publishes/updates the rolling **Stable** GitHub
  release (tag `latest`, versioned as `vX.Y.Z` from `package.json`).
  Do not push directly to `main` except for critical hotfixes.
- **`dev`** — active development. All new features and standard bug
  fixes are targeted here. Every push to `dev` triggers a Windows build
  and publishes/updates the rolling **Experimental** pre-release (tag
  `experimental`).
- **`feature/<featurename>`** - Branch off from `dev` for new features.

- Both branches run the same CI quality gate (format, lint, typecheck)
  on every push and pull request, regardless of target branch.

## 2. Local setup

```bash
npm install
npm run dev
```

`npm install` triggers `postinstall` (`electron-builder install-app-deps`).
If `npm run dev` fails with an Electron "uninstall" error immediately
after install, that is a known local-environment issue — see
[`electron-dev-fix.md`](../electron-dev-fix.md) at the repository root.

## 3. Making a change

1. Read [`CODEBASE.md`](./CODEBASE.md) first to confirm which layer the
   change belongs in (`src/main/services`, `src/main/ipcs`,
   `src/preload`, or `src/renderer/src`) and which existing IPC channel,
   service, or component it touches.
2. Respect the process boundary: the renderer never touches the
   filesystem or spawns processes directly. All such logic lives in
   `src/main/services/`, is exposed via `src/main/ipcs/`, typed in
   `src/preload/index.d.ts`, and wrapped for the UI in
   `src/renderer/src/api/`.
3. If the change adds or modifies an IPC channel, update all four
   layers together: the handler (`ipcs/`), the underlying service
   (`services/`), the preload bridge and its typings
   (`preload/index.ts` / `index.d.ts`), and the renderer API wrapper
   (`renderer/src/api/`). See the channel table in `CODEBASE.md` for
   the current contract.
4. Match existing style: functional React components, strictly typed
   TypeScript, vanilla CSS (no CSS-in-JS or utility framework).
5. If the change affects security-relevant settings
   (`nodeIntegration`, `contextIsolation`, `sandbox`, CSP), treat it as
   a checklist item — see `productionchecklist.md` §1.

## 4. Tests

Tests live under `tests/<feature-area>/unit|integration`, mirroring the
service boundaries in `CODEBASE.md`. Run the suite for the area you
touched, and the full suite before considering a change done:

```bash
npm run test:lifecycle    # server start/stop/kill and process management
npm run test:instances    # instance create/update/delete
npm run test:config       # PalWorldSettings.ini parsing and round-trip safety
npm run test:files        # file manager and path traversal protection
npm run test:players      # player database and moderation actions
npm run test:steamcmd     # SteamCMD install queue and template management
npm run test:monitor      # metrics polling and REST response handling
npm run test:ipc          # IPC handler input validation
npm run test:all          # full suite with coverage
```

If a change touches a service or IPC handler that already has tests,
update the existing test file in place rather than creating a new one.
If it's a genuinely new feature area with no existing test folder, that
is a decision to raise explicitly rather than guess a folder name.

## 5. Required checks before a change is considered done

These are the same three checks CI enforces, and they must all pass
locally before a change is called finished:

```bash
npm run format:check   # Prettier — verify only, does not rewrite files
npm run lint            # ESLint (cached via .eslintcache)
npm run typecheck       # tsc --noEmit for both tsconfig.node.json and tsconfig.web.json
```

- `npm run format` (with `--write`) may be used to fix formatting, but
  only for the lines actually touched by the change — do not let a
  formatter pass rewrite unrelated files.
- `npm run typecheck` runs two separate projects in sequence
  (`typecheck:node` for main/preload, `typecheck:web` for the renderer).
  A failure in either must be resolved; do not narrow `tsconfig`
  scope or add `--skipLibCheck`-style workarounds to silence it.
- Run the relevant `npm run test:*` script(s) for the area changed
  (§4) as part of the same "done" gate — CI's quality job does not run
  tests, but a change that breaks tests is not complete.
- `npm run build` (which itself runs `typecheck` before invoking
  `electron-vite build`) is the closest local approximation of what CI's
  build job does, and is worth running for any change that touches
  main-process startup, IPC registration, or build configuration.

## 6. Continuous Integration

`.github/workflows/ci.yml` defines two jobs, both on `windows-latest`:

1. **`quality`** — runs on every push and pull request:
   `npm run format:check`, then `npm run lint`, then `npm run typecheck`.
2. **`build-windows`** — runs after `quality` passes:
   `npm run build:win`, producing the NSIS installer.
   - On a push to the repository's default branch (`main`), the
     resulting installer is published/updated as the **Stable**
     release, tagged `v<version>` from `package.json` and marked
     `latest`.
   - On a push to `dev`, the installer is published/updated as the
     **Experimental** pre-release, tagged `experimental`.
   - Pull requests build but do not publish a release.

CI does not run the Vitest suite — test execution is a local/PR-review
responsibility, not a CI gate, at present.

## 7. Cutting a release

1. Confirm the change set is merged into `dev` and has been building
   and running correctly there (the `experimental` pre-release is the
   live proving ground).
2. Increment the version in `package.json` (`productionchecklist.md` §2).
3. Work through [`productionchecklist.md`](./productionchecklist.md) in
   full — security/config, build/packaging, and manual UI verification.
4. Merge `dev` into `main`. The push to `main` triggers CI, and on
   success the Windows installer is published as the new Stable
   release automatically. There is no separate manual publish step.

## 8. Git usage

- This workflow assumes standard commit/push/PR mechanics, but an AI
  agent operating in this repo must never run `git commit`, `git push`,
  or any other history/remote-changing command itself — those are
  always left for a human to run. See the agent rules file for the
  full policy.
- Read-only git commands (`git status`, `git diff`, `git log`) are fine
  for understanding current repository state.

## 9. Where to look next

| Question                                                     | See                           |
| ------------------------------------------------------------ | ----------------------------- |
| What does each file/service do, and what's the IPC contract? | `docs/CODEBASE.md`            |
| Is this ready to release?                                    | `docs/productionchecklist.md` |
| `npm run dev` fails right after install                      | `electron-dev-fix.md`         |
| How do I contribute / branch / PR?                           | `CONTRIBUTING.md`             |
