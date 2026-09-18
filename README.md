# llama.cpp Manager

一个集中管理 llama.cpp 模型的桌面应用，基于 Electron + React + Express。

## 功能

- **桌面应用**：双击启动，原生窗口，系统托盘后台运行
- 模型浏览器：扫描并展示 models/ 目录的 GGUF 模型
- 参数预设：全局预设模板 + 模型级参数覆盖
- 一键启停：选择模型后快速启动/停止 llama-server
- 实时日志：WebSocket 推送服务器日志
- 性能监控：tokens/s、内存等指标
- 对话测试：简单的单轮对话窗口
- 外部进程接管：自动检测并管理外部启动的 llama-server

## 使用前提

- Node.js 18+
- [llama.cpp](https://github.com/ggml-org/llama.cpp) 已安装，`llama-server.exe` 在 PATH 中
- GGUF 模型文件放入 `models/` 目录

## 快速开始

### Web 开发模式（前后端独立）

```bash
# 安装依赖
npm install

# 启动后端服务 (端口 3001)
npm run server

# 新开终端，启动前端开发服务器 (端口 5173，HMR 热更新)
npm run dev
```

然后在浏览器打开 `http://localhost:5173`。

### 桌面应用预览

```bash
npm run build:electron
```

构建前端并启动 Electron 窗口加载桌面版。

### 打包为安装程序

```bash
npm run dist
```

使用 electron-builder 打包为 Windows NSIS 安装包，输出到 `release/` 目录。

## 端口分配

- 桌面模式启动时自动扫描空闲端口（从 3001 开始）
- Web 开发模式默认使用 3001
- 可通过 `--port` 参数指定端口

## 参数预设

内置两个预设模板：

- **性能优先**：ngl=99, ctx=32768, threads=16，适用于高性能 GPU
- **省内存**：ngl=12, ctx=8192, threads=4，适用于低显存环境

可在设置页面自定义预设。

## 项目结构

```
llama-model-manager/
├── electron/         # Electron 桌面壳
│   ├── main.js                # 主进程 (端口扫描、窗口、托盘、进程管理)
│   └── preload.js             # 预加载脚本 (注入 serverPort 到渲染进程)
├── server/           # Node.js 后端
│   ├── index.js               # Express + WebSocket 入口
│   ├── routes/                # API 路由
│   ├── services/              # 业务逻辑服务
│   └── store/                 # JSON 配置存储
├── src/              # React 前端
│   ├── App.jsx                # 主应用布局 + 路由
│   ├── components/            # UI 组件
│   └── hooks/                 # WebSocket Hook
├── models/           # GGUF 模型目录
├── dist/             # Vite 构建输出 (在 Electron 中以 file:// 加载)
├── electron-builder.yml       # electron-builder 打包配置
├── vite.config.js
└── package.json
```
