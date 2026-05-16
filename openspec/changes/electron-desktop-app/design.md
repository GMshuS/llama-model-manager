## Context

当前 llama-model-manager 是 Web 应用：用户需手动启动 Node.js 后端（`node server/index.js`）和 Vite 开发服务器（`npm run dev`），再打开浏览器访问。现有代码基于 React + Vite + Express + WebSocket。

本设计描述如何用 Electron 将其包裹为原生桌面应用，实现双击运行、自动拉起后端、原生窗口展示。

约束条件：
- v1 仅支持 Windows（延续现有约束）
- 现有 React 和 Express 代码零改动
- 保留 `npm run dev` 开发工作流

## Goals / Non-Goals

**Goals：**
- 单个 exe，双击即启动，直接显示主窗口
- Electron main process 自动拉起 Express 后端
- BrowserWindow 加载 Vite build 产物，展示 React UI
- 关闭窗口时隐藏到系统托盘，应用在后台继续运行
- 托盘提供右键菜单（显示窗口 / 退出）
- 系统关机时自动清理并退出
- 端口冲突时自动扫描空闲端口，无需用户介入
- 使用 electron-builder 打包为 Windows 单文件安装包/exe
- 开发时保留 Vite HMR 加速迭代（内部开发模式）

**Non-Goals：**
- 自动更新（v1 不做，手动更新）
- macOS/Linux 支持（v1 仅限 Windows，后续可加）
- React/Express 代码重构
- 窗口自定义标题栏等深度原生定制
- 端口配置持久化（每次启动动态扫描）

## Decisions

### 架构方案：Electron 内嵌 Express

| 决策 | 选择 | 理由 |
|------|------|------|
| 桌面壳 | Electron | 生态成熟，React 零改动，单进程架构天然支持自动拉起 |
| 后端集成 | Main process 内嵌 | Express 直接 run 在 Electron 主进程，无需 sidecar 进程管理 |
| 前端加载 | BrowserWindow + file:// | Vite build → dist/ → Electron 直接加载，不依赖 HTTP |
| 打包 | electron-builder | 最成熟的 Electron 打包工具，支持 NSIS 安装包 |
| 安全 | contextBridge + preload | 遵循 Electron 安全最佳实践，不启用 nodeIntegration |
| Express 端口 | 启动时自动扫描 | 默认 3001，被占则 +1 直到找到空闲端口，不持久化 |
| 窗口关闭行为 | 隐藏到托盘 | 关闭不退出，后台运行，托盘右键菜单退出 |
| 托盘退出 | 右键菜单 + before-quit | 用户主动退出或系统关机时清理子进程 |

### 进程生命周期

```
用户双击 exe
  └─ Electron 启动
       ├─ main.js
       │    ├─ 端口检测: 尝试 3001 → 被占 → +1 直到空闲
       │    ├─ 启动 Express 在空闲端口
       │    │    ├─ REST API (不变)
       │    │    ├─ WebSocket (不变)
       │    │    └─ 静态文件服务 (serve dist/)
       │    ├─ 创建 BrowserWindow
       │    │    └─ loadFile('dist/index.html')
       │    ├─ preload 注入 serverPort 到 window
       │    ├─ 创建系统托盘 (右键菜单: 显示/退出)
       │    └─ 返回主进程继续
       └─ React UI 渲染
            ├─ API 调用 → /api/* → Express (同源)
            └─ WebSocket → ws://localhost:{port}/ws

用户关闭窗口
  └─ win.on('close')
       ├─ event.preventDefault()
       └─ win.hide()

用户点击托盘 → 显示
  └─ win.show()

用户点击托盘 → 退出 / 系统关机
  └─ app.on('before-quit')
       ├─ processManager.killAll()  // 停 llama-server
       └─ app.quit()                // Express 随主进程退出
```

### 项目结构变化

```
llama-model-manager/
├── electron/              ← 新增
│   ├── main.js           Electron 主进程入口 (端口扫描, 窗口, 托盘)
│   └── preload.js        Context bridge (注入 serverPort)
├── assets/               ← 新增
│   └── tray-icon.svg     托盘图标 (矢量，运行时转为 PNG)
├── server/
│   └── index.js          修改: 接受 --port 参数 + 静态文件服务
├── src/                  微调 (useWebSocket 读取 preload 注入的 port)
├── dist/                 Vite build 输出
├── package.json          修改: + electron 依赖 + scripts
├── electron-builder.yml  ← 新增: 打包配置
└── vite.config.js        修改: base 路径
```

### Express 静态文件服务

```js
// server/index.js 新增
app.use(express.static(path.join(__dirname, '..', 'dist')))
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/ws')) return next()
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'))
})
```

### 开发工作流

开发时使用 Vite HMR 加速迭代，Electron 加载 Vite 开发服务器：

| 场景 | 命令 |
|------|------|
| 开发时 (HMR) | `npm run dev:electron` (Vite dev server + Electron 加载 http://localhost:5173) |
| 预览桌面版 | `npm run build:electron` (vite build → electron .) |
| 打包 exe | `npm run dist` (vite build → electron-builder) |

开发模式下 Electron 通过 `http://localhost:5173` 加载前端，HMR 正常生效；
Express 端口仍使用自动扫描逻辑，由 preload 注入到前端。

### WebSocket 兼容

现有 useWebSocket hook 硬编码 `ws://${window.location.hostname}:3001/ws`。当 Electron 加载 file:// 时，`window.location.hostname` 为空字符串。

修改方式：
1. main.js 检测到空闲端口后，通过 preload 注入
2. preload.js 通过 contextBridge 暴露 serverPort
3. useWebSocket 优先读取 `window.electronAPI.serverPort`，回退到 `3001`；hostname 回退为 `localhost`

```js
// useWebSocket.js 修改
const port = window.electronAPI?.serverPort || 3001
const host = window.location.hostname || 'localhost'
const url = `ws://${host}:${port}/ws`
```

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| WebSocket 端口在 file:// 下无法从 location 获取 | preload 注入 serverPort，useWebSocket 优先读取 |
| 文件路径在打包后与开发时不一致 | 使用 `app.getAppPath()` 或 `__dirname` 统一路径解析 |
| 安全策略 (CSP) 阻止 file:// 加载 | main.js 配置 `webPreferences.webSecurity = false` 或正确设置 CSP |
| electron-builder 打包后的路径问题 | 确保 asset 路径使用 `process.resourcesPath` |
| 开发和生产环境的 WebSocket host 不同 | 通过 preload 注入 port，统一 localhost |
| 缺少托盘图标资源 | 使用内联 SVG 生成或引用公共图标库 |
