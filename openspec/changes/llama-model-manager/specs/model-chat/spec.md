## ADDED Requirements

### Requirement: 简单对话测试
系统 SHALL 提供针对当前运行模型的单轮对话测试。

#### Scenario: 发送消息
- **WHEN** 用户输入文本并点击发送
- **THEN** 系统通过 HTTP POST 请求 llama-server 的 `/completion` 接口，返回模型回复并展示

#### Scenario: 服务未运行时提示
- **WHEN** 无服务运行且用户尝试对话
- **THEN** 提示"请先启动模型服务"

### Requirement: 对话界面
对话测试 SHALL 包含消息输入框、发送按钮和对话展示区域。

#### Scenario: 对话显示
- **WHEN** 用户和模型完成一轮对话
- **THEN** 用户消息和模型回复分行展示，支持 markdown 渲染
