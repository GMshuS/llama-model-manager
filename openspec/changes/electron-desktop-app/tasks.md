## 1. Setup & Dependencies

- [x] 1.1 Install electron and electron-builder as devDependencies
- [x] 1.2 Create electron/ directory with main.js and preload.js

## 2. Electron Main Process

- [x] 2.1 Write electron/main.js: create BrowserWindow, configure webPreferences with preload
- [x] 2.2 Write electron/main.js: dynamic import of Express server on app ready
- [x] 2.3 Write electron/main.js: handle window-all-closed to cleanup and quit
- [x] 2.4 Write electron/preload.js: expose minimal API via contextBridge (if needed)

## 3. Express Integration

- [x] 3.1 Add static file serving to server/index.js for dist/ directory
- [x] 3.2 Add SPA fallback route in Express (non-API routes → index.html)
- [x] 3.3 Add `--port` argument support to Express for configurable port

## 4. WebSocket Fix for Electron

- [x] 4.1 Modify useWebSocket.js to use `localhost` instead of `window.location.hostname` when running in Electron (or when hostname is empty)
- [x] 4.2 Verify WebSocket reconnection works in Electron context

## 5. Build & Packaging Config

- [x] 5.1 Configure vite.config.js base path for Electron (relative paths)
- [x] 5.2 Create electron-builder.yml with Windows NSIS config
- [x] 5.3 Add build script: `"build:electron": "vite build && electron ."`
- [x] 5.4 Add dist script: `"dist": "vite build && electron-builder"`
- [x] 5.5 Configure electron-builder to include server/ directory and dist/ in resources

## 6. Verify

- [ ] 6.1 Test `npm run build:electron` launches app window with backend running
- [x] 6.2 Test API calls work (models list, presets, server control)
- [x] 6.3 Test WebSocket connects and receives real-time updates
- [ ] 6.4 Test closing window stops Express and cleanly exits
- [x] 6.5 Test `npm run dev` still works for independent frontend development
- [ ] 6.6 Test `npm run dist` produces a working installer/exe
