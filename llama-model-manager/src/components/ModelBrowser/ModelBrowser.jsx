import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ParamConfigModal from '../ParamConfig/ParamConfig'

export default function ModelBrowser() {
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [configModel, setConfigModel] = useState(null)
  const navigate = useNavigate()

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/models')
      const data = await res.json()
      setModels(data)
    } catch { } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchModels(); const t = setInterval(fetchModels, 5000); return () => clearInterval(t) }, [])

  const handleStart = async (model, params) => {
    const res = await fetch('/api/server/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelPath: model.path, modelName: model.name, params }),
    })
    if (!res.ok) {
      const err = await res.json()
      alert(`启动失败: ${err.error}`)
      return
    }
    navigate('/dashboard')
  }

  const handleModelClick = async (model) => {
    setConfigModel(model)
  }

  if (loading) {
    return <div className="text-gray-400">扫描模型中...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">模型列表</h2>
        <p className="text-sm text-gray-500 ml-4">点击具体的模型可以启动，启动后跳转到仪表盘页面查看状态</p>
      </div>
      {models.length === 0 ? (
        <div className="text-gray-500 text-center py-20 border-2 border-dashed border-gray-800 rounded-xl">
          <p className="text-lg mb-2">暂无模型</p>
          <p className="text-sm">请将 GGUF 模型文件放入 models/ 目录</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map(model => (
            <div
              key={model.name}
              onClick={() => handleModelClick(model)}
              className={`relative p-4 rounded-xl border cursor-pointer transition-all hover:border-cyan-500/50 hover:bg-gray-800/50 ${model.running ? 'border-cyan-500 bg-gray-800' : 'border-gray-800 bg-gray-900'}`}
            >
              {model.running && (
                <span className="absolute top-2 right-2 px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-full">运行中</span>
              )}
              <h3 className="font-medium truncate mb-2">{model.name}</h3>
              <div className="flex gap-3 text-sm text-gray-400">
                <span>{model.sizeFormatted}</span>
                <span className="text-cyan-600">{model.quantization}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {configModel && (
        <ParamConfigModal
          model={configModel}
          onStart={(params) => handleStart(configModel, params)}
          onClose={() => setConfigModel(null)}
        />
      )}
    </div>
  )
}
