# PalServer-Manager

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-informational?style=flat-square)
![Built with Electron](https://img.shields.io/badge/Electron-2B2E3A?style=flat-square&logo=electron&logoColor=9FEAF9)
![React 19](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-brightgreen?style=flat-square)

A desktop application for installing, configuring, and monitoring local Palworld dedicated server instances.

Built with Electron, React 19, and TypeScript. Runs entirely locally — no remote service, no background daemon. Every action (starting a server, editing configuration, browsing files, managing players) happens through the app talking directly to your machine.

## ✨ Features

- Install and manage multiple Palworld dedicated server instances from one place
- Start, stop, restart, and force-kill servers with real process lifecycle tracking
- Edit `PalWorldSettings.ini` through a guided form or a raw text editor
- Live dashboard: player count, CPU/RAM, server FPS, uptime, in-game day, base camps
- Built-in file manager for each instance's directory (create, rename, delete, upload, archive)
- Player management: view online/offline players, kick, ban, unban, and broadcast announcements
- Terminal tab with live log streaming and direct RCON command input
- Automatic SteamCMD installation and server file management, with a shared base template so new instances install fast

## 🖥️ Platform Support

Windows.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm

### Install

```bash
npm install
```

### Run in development

```bash
npm run dev
```

### Build a production installer

```bash
# Windows
npm run build:win
```

## 🏗️ Project Architecture

The app follows the standard Electron three-process model:

- **Main process** (`src/main/`) — Node.js backend. Manages server process lifecycles, coordinates SteamCMD installs, handles all filesystem operations, and polls the Palworld REST API for live metrics.
- **Preload** (`src/preload/`) — bridges the isolated renderer and the main process by exposing a safe, typed API (`window.palServerManager`) via `contextBridge`.
- **Renderer** (`src/renderer/`) — the React UI. Never touches the filesystem or spawns processes directly; every action goes through IPC to the main process.

```
src/
  main/
    ipcs/        IPC handler registrations
    services/    core business logic (instances, SteamCMD, filesystem, API clients)
  preload/       contextBridge API exposed to the renderer
  renderer/
    src/
      api/         typed frontend wrappers around the IPC API
      components/  reusable UI and per-instance management tabs
      pages/       top-level views (instance list, instance detail)
```

Application data (server instances, SteamCMD, the shared install template, logs, and settings) lives under Electron's standard per-app data directory — `%APPDATA%\palserver-manager` on Windows, `~/.config/palserver-manager` on Linux. Nothing is written outside that folder.

For a full file-by-file breakdown, IPC reference, architecture diagrams, and risk/test-coverage notes, see [`CODEBASE.md`](./docs/CODEBASE.md).

## 🧪 Testing

Tests are organized by feature area, each with unit and integration tests underneath:

```bash
npm run test:all          # full suite with coverage
npm run test:lifecycle    # server start/stop/kill and process management
npm run test:instances    # instance create/update/delete
npm run test:config       # PalWorldSettings.ini parsing and round-trip safety
npm run test:files        # file manager and path traversal protection
npm run test:players      # player database and moderation actions
npm run test:steamcmd     # SteamCMD install queue and template management
npm run test:monitor      # metrics polling and REST response handling
npm run test:ipc          # IPC handler input validation
```

## 🧹 Code Quality

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript, main and renderer
npm run format       # Prettier
```

## 🔒 Security

- `contextIsolation: true` and `sandbox: true` are enabled on the renderer.
- The renderer never has direct filesystem or process access — everything goes through validated IPC calls.
- Content-Security-Policy is applied dynamically per environment: relaxed in development (required for Vite's Hot Module Replacement), strict in production builds (`app.isPackaged`).

See [`productionchecklist.md`](./docs/productionchecklist.md) for the full production-readiness checklist and its current status.

## 🤝 Contributing

Active development happens on `dev`. `main` is reserved for release-ready code — see `productionchecklist.md` before merging into `main` or cutting a release.
