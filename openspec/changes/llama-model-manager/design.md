## Context

llama.cpp 缺乏统一的模型管理工具，用户需手动通过命令行管理模型下载、服务启动、参数配置和运行监控。本设计描述一个基于 React + Node.js 的集中 WebUI 工具。

当前状态：无现有系统，完全新建。

约束条件：
- 仅支持 Windows 平台（v1）
- 仅支持 llama.cpp 后端
- 用户自行下载 GGUF 模型到指定目录
- Node.js 运行时需用户自行安装

## Goals / Non-Goals

**Goals：**
- 提供 WebUI 浏览本地 GGUF 模型列表
- 支持全局参数预设和模型级参数覆盖的混合配置模型
- 一键启停 llama-server 进程
- 实时日志流和性能指标展示
- 支持检测和接管外部启动的 llama-server 进程
- 内置简单的单轮对话测试

**Non-Goals：**
- 模型下载功能（v1 不实现，用户自行下载）
- 多模型同时运行（v1 仅支持单实例模式）
- 推理后端切换（v1 仅支持 llama.cpp）
- macOS/Linux 支持（v1 仅限 Windows）
- 多轮对话 / 会话管理
- 用户认证 / 权限系统

## Decisions

### 技术栈

| 决策 | 选择 | 理由 |
|------|------|------|
| 前端框架 | React 18 + Vite | 轻量、主流生态、快速开发 |
| 后端 | Node.js + Express | 统一 JavaScript 技术栈，child_process 原生支持进程管理 |
| 实时通信 | WebSocket (ws) | 日志推送和性能指标需要低延迟 |
| 配置存储 | JSON 文件 | v1 无需数据库，简单可靠 |
| 样式方案 | Tailwind CSS | 快速构建 UI，保持一致性 |
| 构建工具 | Vite | 开发体验好，构建快 |

### 进程管理方案

Node.js child_process.spawn 管理 llama-server 子进程。

```
后端启动流程：
1. 组装命令行参数（预设 + 模型覆盖 + 模型路径）
2. spawn('llama-server.exe', [args...])
3. 监听 stdout/stderr 实时推送到 WebSocket
4. 轮询 GET /health 检测服务就绪
5. 定期解析 stdout 提取 tokens/s 指标
6. 子进程退出时更新状态
```

### 参数模型设计

采用"全局预设 + 模型级覆盖"两层结构：

```
预设模板 (perf-max, mem-saver, 自定义...)
    │
    ├── 通用参数: port, host, timeout, cont-batching, jinja
    │
    └── 被模型覆盖: 每个模型可覆盖部分参数
        例: codellama-13b → ngl=28 (覆盖预设的 ngl=99)
```

参数按优先级：模型覆盖 > 预设 > 默认值

### 外部进程检测

- 启动时扫描 8880-8890 端口段（可配置）
- 对响应的端口发送 GET /health 确认是 llama-server
- 获取进程信息（PID、启动参数）
- 加入监控面板，显示"外部启动"标签
- 用户点击停止时弹窗确认后 kill

### 项目结构

```
llama-model-manager/
├── server/                    # Node.js 后端
│   ├── index.js               # Express 入口
│   ├── routes/
│   │   ├── models.js          # 模型扫描 API
│   │   ├── server.js          # 服务控制 API
│   │   └── presets.js         # 预设管理 API
│   ├── services/
│   │   ├── process-manager.js # 进程生命周期管理
│   │   ├── port-scanner.js    # 端口扫描/进程发现
│   │   └── metrics-parser.js  # tokens/s 等指标提取
│   └── store/
│       ├── presets.json       # 预设数据
│       └── models.json        # 模型记忆数据
├── src/                       # React 前端
│   ├── App.jsx
│   ├── components/
│   │   ├── ModelBrowser/      # 模型列表/卡片
│   │   ├── ServerControl/     # 启停控制面板
│   │   ├── ParamConfig/       # 参数配置浮层
│   │   ├── Dashboard/         # 运行仪表盘
│   │   ├── LogViewer/         # 实时日志
│   │   ├── ChatTest/          # 对话测试
│   │   └── Settings/          # 预设管理设置页
│   └── hooks/
│       └── useWebSocket.js    # WebSocket 连接管理
├── package.json
└── vite.config.js
```

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| Windows 上进程 kill 不完全 | 使用 taskkill /F + 进程树清理 |
| 端口扫描误判非 llama 进程 | 不仅检查端口，还验证 /health 响应格式 |
| 用户并发操作（切换过快） | 操作队列，串行执行启停 |
| 大模型启动慢（几十秒） | 启动中状态 + 进度提示 + 超时机制 |
| 外部进程权限不足无法 kill | 检测失败时提示用户手动关闭 |
| WebSocket 断连 | 自动重连机制 |
