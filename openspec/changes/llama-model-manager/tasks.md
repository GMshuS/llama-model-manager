## 1. 项目初始化

- [x] 1.1 初始化 Node.js 项目，创建 package.json，安装依赖（express, ws, cors, chokidar）
- [x] 1.2 初始化 Vite + React 前端项目结构
- [x] 1.3 配置 Tailwind CSS
- [x] 1.4 创建项目目录结构（server/, src/, 子目录）

## 2. 后端：基础架构

- [x] 2.1 创建 Express 服务器入口（index.js），配置 CORS 和 JSON body parser
- [x] 2.2 集成 WebSocket 服务（ws 库），建立连接管理
- [x] 2.3 实现配置存储服务（JSON 文件读写：presets.json, models.json）
- [x] 2.4 实现后端启动脚本和 package.json 命令

## 3. 后端：模型扫描 API

- [x] 3.1 实现 models 目录扫描路由（GET /api/models），返回 .gguf 文件列表及元数据
- [x] 3.2 支持配置 models 目录路径（默认 ./models/）

## 4. 后端：进程管理器

- [x] 4.1 实现 ProcessManager 类（spawn/kill/status 方法），管理 llama-server 子进程
- [x] 4.2 实现命令组装逻辑（预设参数 + 模型覆盖 + 模型路径）
- [x] 4.3 实现实时日志推送（子进程 stdout/stderr → WebSocket 广播）
- [x] 4.4 实现端口扫描器，检测外部 llama-server 进程
- [x] 4.5 实现进程状态监控和自动更新（定时健康检查）

## 5. 后端：预设管理 API

- [x] 5.1 实现预设 CRUD 路由（GET/POST/PUT/DELETE /api/presets）
- [x] 5.2 实现模型参数记忆路由（GET/PUT /api/models/:name/config）
- [x] 5.3 读取 proposal.md、design.md 和 specs/ 目录下的所有规范文件

## 6. 后端：对话和指标

- [x] 6.1 实现对话代理路由（POST /api/chat），转发到 llama-server 的 /completion
- [x] 6.2 实现日志解析，提取 tokens/s 等性能指标
- [x] 6.3 通过 WebSocket 定期推送性能指标

## 7. 前端：基础布局

- [x] 7.1 创建 App 根组件，实现侧边栏 + 主内容区布局
- [x] 7.2 实现路由（模型列表、仪表盘、设置页）
- [x] 7.3 实现 WebSocket Hook（useWebSocket）

## 8. 前端：模型浏览器

- [x] 8.1 实现 ModelBrowser 组件（模型列表/卡片展示，含名称、大小、量化类型）
- [x] 8.2 实现运行状态标记（当前运行模型显示"运行中"标识）
- [x] 8.3 点击模型卡片触发启动流程

## 9. 前端：参数配置浮层

- [x] 9.1 实现 ParamConfigModal 组件（参数表单：ngl, ctx, threads, port 等）
- [x] 9.2 实现预设选择器（下拉选择预设模板）
- [x] 9.3 实现"另存为新预设"功能
- [x] 9.4 实现模型参数覆盖保存逻辑

## 10. 前端：仪表盘

- [x] 10.1 实现 ServerControl 组件（启停按钮、状态指示灯、运行摘要）
- [x] 10.2 实现 PerformanceMetrics 组件（tokens/s 实时指标、内存、PID）
- [x] 10.3 实现 LogViewer 组件（WebSocket 实时日志流，带时间戳，自动滚动）
- [x] 10.4 实现外部进程检测提示（"外部启动"标签 + 停止确认弹窗）

## 11. 前端：对话测试

- [x] 11.1 实现 ChatTest 组件（消息输入框 + 发送按钮 + 对话展示区域）
- [x] 11.2 支持 Markdown 渲染模型回复

## 12. 前端：设置页面

- [x] 12.1 实现 Settings 页面（预设列表展示、编辑、删除）
- [x] 12.2 实现预设编辑表单（完整参数列表）
- [x] 12.3 实现 models 目录路径配置

## 13. 集成与完善

- [x] 13.1 联调完整流程：选择模型 → 参数配置 → 启动 → 监控 → 对话 → 停止
- [x] 13.2 错误处理：网络异常、进程崩溃、超时等场景的 UI 提示
- [x] 13.3 外部进程检测 → 纳入监控 → 停止确认 → kill 全流程
- [x] 13.4 编写 README 使用说明
