## Why

使用 llama.cpp 时，每次启动服务都需要手动输入冗长的命令行参数，模型管理分散在文件系统中，缺乏统一的 UI 来浏览模型、配置参数、启停服务和监控运行状态。本变更旨在提供一个集中的 WebUI 工具，解决这些碎片化操作的问题。

## What Changes

- React WebUI 仪表盘，提供模型浏览、服务控制、参数配置、性能监控和对话测试功能
- Node.js 后端进程管理器，负责 llama-server 子进程的启停和状态监控
- 模型浏览器：扫描 `models/` 目录，展示本地 GGUF 模型列表
- 参数预设系统：全局预设模板 + 模型级参数覆盖，支持可视化配置
- 一键启停：点击模型即可启动/停止服务，无预设时弹出参数配置浮层
- 外部进程接管：自动检测已有 llama-server 进程，支持监控和 kill（需确认弹窗）
- 实时日志流：WebSocket/SSE 推送服务器日志
- 性能仪表盘：展示 tokens/s、内存占用等指标
- 简单对话测试：单轮对话测试窗口

## Capabilities

### New Capabilities
- `model-browser`: 扫描 models/ 目录，以列表/卡片形式展示本地 GGUF 模型文件（名称、大小、量化类型）
- `server-control`: 一键启动/停止 llama-server 进程，支持运行时状态监控
- `param-presets`: 全局参数预设的 CRUD 管理，以及模型级别的参数覆盖记忆
- `model-chat`: 针对运行中的模型，提供简单的单轮对话测试
- `performance-monitor`: 实时展示 tokens/s、内存使用量、进程 PID、运行时长等指标
- `service-takeover`: 自动扫描端口检测外部启动的 llama-server 进程，纳入 UI 监控，支持弹窗确认后 kill

### Modified Capabilities

（无）

## Impact

- 新增独立的 Web 应用程序，包含前端 (React) 和后端 (Node.js) 两部分
- 依赖 Node.js 运行时和 llama-server 可执行文件
- 不修改现有 llama.cpp 的任何代码或配置
