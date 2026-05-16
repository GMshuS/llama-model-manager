# llama.cpp 模型管理工具

## 项目背景

有个集中的UI工具管理llama.cpp模型的下载、启动API服务等

## 技术栈

js的react框架

## llama.cpp 服务启动示例

```bash
.\llama-server.exe -m ..\models\codellama-13b-instruct.Q4_K_M.gguf -ngl 28 --port 8880 --host 0.0.0.0 -c 24576 -t 8 --timeout 120 --parallel 1 --batch-size 1024 --ubatch-size 512 --cont-batching --jinja
```