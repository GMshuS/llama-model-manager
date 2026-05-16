## ADDED Requirements

### Requirement: 外部进程自动检测
系统 SHALL 在启动时扫描端口范围，检测外部启动的 llama-server 进程。

#### Scenario: 发现外部进程
- **WHEN** 系统启动或用户刷新
- **THEN** 扫描配置的端口范围（默认 8880-8890），通过 GET /health 确认是否为 llama-server 进程

#### Scenario: 进程纳入监控
- **WHEN** 检测到外部 llama-server 进程
- **THEN** 将其纳入仪表盘，显示"外部启动"标签，展示运行状态和端口

### Requirement: 外部进程终止
系统 SHALL 支持通过 UI 终止外部检测到的 llama-server 进程。

#### Scenario: 终止外部进程需确认
- **WHEN** 用户点击停止按钮，目标为外部启动的进程
- **THEN** 弹出确认对话框，用户确认后执行 kill

#### Scenario: 无法终止时提示
- **WHEN** 系统权限不足无法终止外部进程
- **THEN** 提示用户手动关闭
