## ADDED Requirements

### Requirement: 实时日志流
系统 SHALL 通过 WebSocket 实时推送 llama-server 的标准输出和错误输出。

#### Scenario: 查看实时日志
- **WHEN** 服务正在运行
- **THEN** 仪表盘展示实时滚动日志，每行带时间戳

#### Scenario: 日志自动清理
- **WHEN** 日志行数超过 1000 行
- **THEN** 自动清除最早的日志，保持界面性能

### Requirement: 性能指标展示
系统 SHALL 实时展示 tokens/s、内存占用量和进程 PID。

#### Scenario: tokens/s 指标
- **WHEN** 服务正在处理请求
- **THEN** 系统从日志中解析 tokens/s 数据并实时更新

#### Scenario: 进程信息展示
- **WHEN** 服务正在运行
- **THEN** 仪表盘展示进程 PID 和运行时长

### Requirement: 服务信息摘要
系统 SHALL 展示当前运行模型名称、端口号和运行时长。

#### Scenario: 运行摘要
- **WHEN** 服务正在运行
- **THEN** 仪表盘顶部展示模型名称、端口号和已运行时间
