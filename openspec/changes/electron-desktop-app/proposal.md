## Why

当前 llama-model-manager 需要用户手动启动后端（`node server/index.js`）和前端（`npm run dev`/`vite build`）并通过浏览器访问，使用链路长、体验割裂。需要改造为双击即可运行的桌面应用，实现开箱即用。

## What Changes

- 引入 Electron 作为桌面壳，将 React 前端和 Express 后端打包到同一进程
- Electron main process 内嵌启动 Express 后端 + BrowserWindow 加载前端
- 关窗口自动停止后端并清理 llama-server 子进程
- Express 增加静态文件服务，serve Vite build 产物
- 使用 electron-builder 打包为 Windows 单文件 exe
- 保留现有 dev 工作流（`npm run dev` 仍可用）

## Capabilities

### New Capabilities
- `desktop-ui`: Electron 桌面集成，包括主进程管理、窗口生命周期、进程清理

### Modified Capabilities
- （无）

## Impact

- 新增依赖: `electron`, `electron-builder`
- 新增目录: `electron/`（main.js, preload.js）
- 修改: `server/index.js` 增加静态文件服务
- 修改: `package.json` scripts 增加 build 和 dev 命令
- 修改: `vite.config.js` 调整 build 输出配置
- 现有 React 源码零改动，Express 路由零改动
