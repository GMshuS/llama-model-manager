## ADDED Requirements

### Requirement: 模型目录扫描
系统 SHALL 扫描指定目录（默认为 `models/`）下的所有 `.gguf` 文件。

#### Scenario: 扫描目录成功
- **WHEN** 用户打开 WebUI
- **THEN** 系统自动扫描 models/ 目录并返回所有 `.gguf` 文件列表

#### Scenario: 目录为空
- **WHEN** models/ 目录下没有 `.gguf` 文件
- **THEN** 系统显示空状态提示，引导用户放置模型文件

### Requirement: 模型信息展示
系统 SHALL 展示每个模型的文件名、文件大小和量化类型。

#### Scenario: 展示模型卡片
- **WHEN** 扫描完成
- **THEN** 每个模型以卡片形式展示名称、文件大小（自动换算 GB/MB）和量化类型（从文件名解析 Q4_K_M 等后缀）

### Requirement: 模型运行状态标记
系统 SHALL 在模型列表中标记当前正在运行的模型。

#### Scenario: 标记当前模型
- **WHEN** 有服务正在运行
- **THEN** 对应的模型卡片上显示"运行中"标识
