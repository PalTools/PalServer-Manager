# Contributing to PalServer-Manager

First off, thank you for considering contributing to PalServer-Manager! 🐾

## Where do I start?

Before diving in, please take a look at our architecture and guidelines. Since this is an Electron application that interacts with child processes and the local filesystem, there are a few important boundaries to respect:

1. **Read the Codebase Guide:** Start by reading [`docs/CODEBASE.md`](./docs/CODEBASE.md). It explains the Main/Preload/Renderer separation, where state lives, and how we handle cross-platform server processes.
2. **Understand the Rules:**
   - **Local Only:** This is strictly a local desktop app. Do not add HTTP servers or backend daemons for remote web access.
   - **Main process does the heavy lifting:** The React frontend (Renderer) never touches the filesystem or spawns processes directly. All of that logic must go in the Main process and be exposed via strict IPC channels in the Preload script.
   - **Security First:** We use strict `contextIsolation` and `nodeIntegration: false`. Do not attempt to bypass these.

## Branching Strategy

- **`main`**: The stable, production-ready branch. Do not submit PRs directly to `main` unless it is a critical hotfix.
- **`dev`**: The active development branch. **All new features and standard bug fixes should be targeted at `dev`.**

## Development Setup

1. Fork the repository and clone your fork.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development environment:
   ```bash
   npm run dev
   ```

## Making Changes

- Ensure your code follows the existing style (Vanilla CSS, React functional components, strictly typed TypeScript).
- **Run the test suite** before committing to ensure you haven't broken any core process-lifecycle logic:
  ```bash
  npm run test:all
  ```
- **Format and lint** your code:
  ```bash
  npm run format
  npm run lint
  npm run typecheck
  ```
  _(Note: Our GitHub Actions CI will automatically fail if the formatting or types are incorrect!)_

## Submitting a Pull Request

1. Push your changes to your fork.
2. Open a Pull Request targeting the **`dev`** branch.
3. If your PR introduces significant architecture changes, user-facing behaviors, or prepares a new release, verify it against the [`docs/productionchecklist.md`](./docs/productionchecklist.md).
4. Provide a clear description of the problem you solved or the feature you added, and include screenshots if you changed the UI.

Thank you for contributing!
