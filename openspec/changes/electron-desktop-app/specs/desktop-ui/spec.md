## ADDED Requirements

### Requirement: Desktop app boots and shows UI on double-click

The system SHALL launch as a single executable. On double-click, the Express backend SHALL start automatically and a native window SHALL display the React UI without requiring any manual steps.

#### Scenario: Double-click exe opens app window
- **WHEN** user double-clicks the packaged exe
- **THEN** a native desktop window appears within 5 seconds showing the app UI

#### Scenario: Backend starts before UI loads
- **WHEN** the app launches
- **THEN** Express backend SHALL be listening on port 3001 before the window loads the UI

### Requirement: Window close stops all services

Closing the main application window SHALL terminate the Express backend and any child processes (llama-server) managed by the process manager.

#### Scenario: Close window kills llama-server
- **WHEN** user closes the app window
- **THEN** any running llama-server child process SHALL be terminated immediately

#### Scenario: Express server stops on app quit
- **WHEN** the Electron app quits
- **THEN** the Express server SHALL gracefully shut down

### Requirement: Development workflow preserved

The system SHALL support the existing development workflow where frontend and backend can be started independently via `npm run dev`.

#### Scenario: Dev mode still works
- **WHEN** user runs `npm run dev`
- **THEN** Vite dev server starts on port 5173 with HMR and proxies API to Express on port 3001

### Requirement: UI communicates with same-origin backend

The React UI SHALL make API calls and WebSocket connections to the Express backend without CORS issues.

#### Scenario: API calls use relative paths
- **WHEN** React app makes an API request
- **THEN** it SHALL use relative URL `/api/*` and resolve to the Express backend on the same origin

#### Scenario: WebSocket connects to localhost:3001
- **WHEN** the React app establishes a WebSocket connection in Electron
- **THEN** it SHALL connect to `ws://localhost:3001/ws`

### Requirement: Distributable single-file installer

The system SHALL be packable into a Windows installer (NSIS) or portable exe using electron-builder.

#### Scenario: Build produces installer
- **WHEN** user runs `npm run dist`
- **THEN** electron-builder SHALL produce an exe installer in the `release/` directory

#### Scenario: Packaged app includes all assets
- **WHEN** the packaged app runs
- **THEN** the Vite build output (dist/) and Express server code SHALL be bundled inside the executable resources
