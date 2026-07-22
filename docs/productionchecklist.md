# Production Release Checklist

Run through these items before cutting a new release. See
[`docs/WORKFLOW.md`](./WORKFLOW.md) for the branch/CI/release mechanics this
checklist assumes, and [`docs/CODEBASE.md`](./CODEBASE.md) for the
architecture referenced below.

## 1. Security & Configuration

- [ ] `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true` are still set in the `BrowserWindow` `webPreferences` (`src/main/index.ts`)
- [ ] Preload script (`src/preload/index.ts`) uses `contextBridge` exclusively — no new code path exposes `ipcRenderer`, `require`, or other Node globals directly to the renderer
- [ ] `app.isPackaged` (not `NODE_ENV`) is still the dev/prod branch condition, in both the window-load logic and the CSP logic in `src/main/index.ts`
- [ ] The production CSP string in `src/main/index.ts` still matches every external host the app actually needs. As of this checklist it allows only: `cdn.jsdelivr.net` (script/style/font), `fonts.googleapis.com` / `fonts.gstatic.com` (fonts), and `ipv4.icanhazip.com` (the only `connect-src` host outside the CDN/font set). If this release adds a new external API, CDN, or font source, the CSP has been updated to include it — otherwise it will be silently blocked in the packaged build only, and may pass unnoticed in dev
- [ ] No hardcoded dev values shipped (localhost URLs, test API keys, debug flags left on)
- [ ] Data and log paths still come from `app.getPath('userData')` / `app.getPath('logs')` (`src/main/ipcs/core/settings.ts`, `src/main/services/system/logger.ts`) — `join(__dirname, ...)` is expected and correct for loading the preload script and `index.html` in `src/main/index.ts`, and is not a violation of this item
- [ ] Any new or changed IPC channel still resolves file paths through `resolveSafePath` (`src/main/ipcs/server/fs.ts`) before touching disk, so path traversal outside the selected instance's install directory stays rejected

## 2. Code Quality Gate

These are the same checks CI runs in the `quality` job — confirm they pass locally before relying on CI to catch a problem late:

- [ ] `npm run format:check` passes
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes (both `typecheck:node` and `typecheck:web`)
- [ ] `npm run test:all` passes with no skipped/failing tests
- [ ] If any service or IPC handler changed this release, the matching test folder under `tests/` (see the table in `CODEBASE.md`) was updated, not just left passing by coincidence

## 3. Version & Build Metadata

- [ ] `package.json` `version` is incremented from the last published Stable release. CI's `check-release-version` job will fail the push to `main` if the tag `v<version>` already exists, but confirm the bump locally first rather than relying on CI to catch a forgotten bump
- [ ] `package.json` `build` block (`appId`, `productName`, `win.icon`, `nsis.*`) is correct — this is the configuration electron-builder actually reads
- [ ] `electron-builder.yml` at the repository root is **not** the active config (see `CODEBASE.md`, "Supported distribution"). It currently has a different `appId` and `productName` than `package.json`. Either ignore it, reconcile it to match `package.json`, or remove it — do not edit it under the assumption it affects the build
- [ ] `resources/icon.ico` is present and is the intended icon for this release

## 4. Local Build Verification

- [ ] `npm run build:win` completes without error and produces `dist/PalServer-Manager-<version>-setup.exe` (or the current `artifactName` pattern in `package.json`)
- [ ] The installer runs on a clean machine/VM if possible, or at minimum a machine without a prior install in the way, exercising the NSIS wizard: destination-directory change, desktop shortcut, Start-menu shortcut
- [ ] The packaged app launches from the installed `.exe`, not just `npm run start` (`electron-vite preview`) — packaged CSP and `app.isPackaged` branches only take effect in the real packaged build

## 5. Manual Functional Verification

Cover the actual IPC surface end-to-end, not just a representative sample — a broken channel in an area not manually touched will not be caught by `test:ipc`'s handler-registration tests alone:

- [ ] **Instances** — create a new instance, list instances, open an existing instance, update its settings, delete an instance (with and without deleting files)
- [ ] **Server control** — start, stop, kill, and trim-RAM on a running instance; confirm the live log stream (`instance:log`) and status updates (`instance:status`) reach the terminal/dashboard UI
- [ ] **File manager** — read a directory, open/edit a file, upload a file, rename, delete, create a folder/file, archive and unarchive, open the instance folder in Explorer
- [ ] **Template / SteamCMD** — install or update the shared template from a clean data root and confirm `template:progress` events drive the install screen
- [ ] **Players** — list online/offline players against a running instance, kick, ban, unban, and send an announcement
- [ ] **RCON** — send a raw RCON command through `instances:sendRcon` and confirm the response renders correctly
- [ ] **Configuration** — edit `PalWorldSettings.ini` through the guided form and through the raw text editor; confirm both round-trip without corrupting settings the other one doesn't know about
- [ ] **Shutdown** — close the app while at least one instance is running, and confirm the Palworld server process is actually terminated (not orphaned) before the app process exits — this exercises `app.on('before-quit')` in `src/main/index.ts`, including its re-entry guard if the quit sequence is triggered twice in quick succession

## 6. Post-Release

- [ ] Confirm the GitHub release was published under the expected tag (`v<version>`, marked `latest`) with the installer asset attached
- [ ] Confirm the release body/commit reference matches what was intended to ship
- [ ] If this release follows a `dev` → `main` merge, confirm the `experimental` pre-release on `dev` is not left implying it's still the newest available build