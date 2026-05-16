## ADDED Requirements

### Requirement: 一键启动服务
系统 SHALL 支持用户点击模型后一键启动 llama-server 进程。

#### Scenario: 有预设时直接启动
- **WHEN** 用户点击有预设记录的模型
- **THEN** 系统使用预设参数 + 模型覆盖参数组装命令，立即启动服务

#### Scenario: 无预设时弹出参数配置
- **WHEN** 用户点击无预设记录的模型
- **THEN** 系统弹出参数配置浮层，用户配置完成后点击"启动"继续

#### Scenario: 启动成功后跳转仪表盘
- **WHEN** 服务启动完成并就绪
- **THEN** 系统自动切换到仪表盘页面，显示运行状态

### Requirement: 一键停止服务
系统 SHALL 支持一键停止正在运行的 llama-server 进程。

#### Scenario: 停止 UI 启动的进程
- **WHEN** 用户点击停止按钮，且进程由 UI 启动
- **THEN** 系统直接 kill 子进程，无需确认

#### Scenario: 停止外部进程需确认
- **WHEN** 用户点击停止按钮，但进程由外部启动
- **THEN** 系统弹出确认对话框"检测到外部启动的进程，确认终止？"，确认后 kill

### Requirement: 服务状态监控
系统 SHALL 持续监控 llama-server 进程的运行状态。

#### Scenario: 状态更新
- **WHEN** 服务正在运行
- **THEN** 仪表盘显示"运行中"状态及运行时长

#### Scenario: 异常退出
- **WHEN** 子进程意外退出
- **THEN** 系统更新状态为"已停止"并显示退出码

### Requirement: 启动超时处理
系统 SHALL 在启动超时时给出提示。

#### Scenario: 启动超时
- **WHEN** 服务启动超过 60 秒仍未就绪
- **THEN** 系统提示"启动超时，请检查模型路径或参数"
