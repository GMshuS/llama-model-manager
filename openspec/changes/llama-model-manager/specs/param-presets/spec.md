## ADDED Requirements

### Requirement: 全局预设 CRUD
系统 SHALL 支持创建、读取、更新、删除全局参数预设。

#### Scenario: 创建预设
- **WHEN** 用户在参数配置浮层中点击"另存为新预设"
- **THEN** 弹出命名浮层，保存为新的全局预设

#### Scenario: 编辑预设
- **WHEN** 用户在设置页面修改预设参数
- **THEN** 系统更新预设并保存

#### Scenario: 删除预设
- **WHEN** 用户在设置页面删除预设
- **THEN** 系统删除该预设，已被引用该预设的模型回退到默认预设

### Requirement: 参数包含项
参数预设 SHALL 覆盖 llama-server.exe 的完整参数集。

#### Scenario: 完整参数列表
- **WHEN** 用户查看或编辑预设
- **THEN** 展示以下参数：-ngl, --port, --host, -c (ctx), -t (threads), --timeout, --parallel, --batch-size, --ubatch-size, --cont-batching, --jinja

### Requirement: 模型参数覆盖
系统 SHALL 支持模型级参数覆盖全局预设。

#### Scenario: 模型覆盖预设
- **WHEN** 用户在启动前调整某个模型的参数
- **THEN** 系统将调整后的参数作为该模型的覆盖记录保存，下次启动时自动使用

#### Scenario: 覆盖优先级
- **WHEN** 启动服务
- **THEN** 参数优先级为：模型覆盖 > 预设 > 默认值

### Requirement: 预设列表展示
设置页面 SHALL 展示所有预设的列表，并显示默认预设标记。

#### Scenario: 查看预设列表
- **WHEN** 用户进入设置页面
- **THEN** 展示所有预设名称、参数摘要，以及默认预设的标记
