# Production Release Checklist

Run through these items before cutting a new release.

## 1. Security & Configuration

- [ ] `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true` are enabled in `BrowserWindow`
- [ ] Preload script uses `contextBridge` with no direct Node API exposure
- [ ] No hardcoded dev values (e.g., localhost URLs, test API keys)
- [ ] `app.isPackaged` is used for dev/prod branching instead of `NODE_ENV`
- [ ] All file paths use `app.getPath(...)` instead of relative `./` paths

## 2. Build & Packaging

- [ ] `package.json` version is incremented
- [ ] Output directory and icon paths are correct in `package.json` build config
- [ ] Code formats correctly (`npm run format:check`)
- [ ] Linter passes with no errors (`npm run lint`)
- [ ] TypeScript compiles cleanly (`npm run typecheck`)
- [ ] Test suite passes completely (`npm run test:all`)

## 3. Manual UI Verification

- [ ] Build the packaged app locally (`npm run build:win`)
- [ ] App launches cleanly from the packaged `.exe`
- [ ] Dashboard correctly loads and displays instances
- [ ] Server start, stop, and kill actions work as expected
- [ ] File manager reads and writes correctly
- [ ] Closing the app cleanly terminates any background Palworld server processes
