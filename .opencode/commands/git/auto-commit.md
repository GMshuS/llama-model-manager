---
description: 自动分析变更并提交代码
allowed-tools: Bash(git:*)
---

# Git 自动提交助手

请按以下步骤执行：

1. **检查状态**：运行 `git status --short` 查看变更
2. **分析变更**：运行 `git diff` 分析修改内容
3. **分类处理**：
   - 新增文件 → `git add <文件>`
   - 修改文件 → `git add <文件>`
   - 删除文件 → `git rm <文件>`
4. **生成提交信息**：根据变更类型按 Conventional Commits 规范生成：
   - `feat:` 新功能
   - `fix:` 修复
   - `docs:` 文档
   - `refactor:` 重构
   - `style:` 格式调整
   - `chore:` 构建/工具
5. **执行提交**：`git commit -m "type: description"`
6. **推送**（可选）：`git push`

注意：
- 每次提交前询问用户确认
- 避免使用 `git add .`，明确指定文件
- 提交信息用中文，不超过50字