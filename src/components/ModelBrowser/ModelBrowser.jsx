import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ParamConfigModal from '../ParamConfig/ParamConfig'
import ModelCard from './ModelCard'
import ModelDetailModal from './ModelDetailModal'

export default function ModelBrowser() {
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [configModel, setConfigModel] = useState(null)
  const [detailModel, setDetailModel] = useState(null)
  const [modelNotes, setModelNotes] = useState({})
  const navigate = useNavigate()

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/models')
      const data = await res.json()
      setModels(data)
      
      // 加载备注信息
      const notes = {}
      for (const model of data) {
        const configRes = await fetch(`/api/models/config/${encodeURIComponent(model.name)}`)
        const config = await configRes.json()
        if (config.note) {
          notes[model.name] = config.note
        }
      }
      setModelNotes(notes)
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

  const handleModelStart = async (model) => {
    setConfigModel(model)
  }

  const handleShowDetail = (model) => {
    setDetailModel(model)
  }

  const handleNoteChange = async (modelName, note) => {
    try {
      // 获取当前配置
      const configRes = await fetch(`/api/models/config/${encodeURIComponent(modelName)}`)
      const config = await configRes.json()
      
      // 更新备注
      await fetch(`/api/models/config/${encodeURIComponent(modelName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          note: note
        })
      })
      
      // 更新本地状态
      setModelNotes(prev => ({
        ...prev,
        [modelName]: note
      }))
    } catch (err) {
      console.error('保存备注失败:', err)
    }
  }

  if (loading) {
    return <div className="text-gray-400">扫描模型中...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">模型列表</h2>
      </div>
      {models.length === 0 ? (
        <div className="text-gray-500 text-center py-20 border-2 border-dashed border-gray-800 rounded-xl">
          <p className="text-lg mb-2">暂无模型</p>
          <p className="text-sm">请将 GGUF 模型文件放入 models/ 目录</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map(model => (
            <ModelCard
              key={model.name}
              model={model}
              onStart={handleModelStart}
              onShowDetail={handleShowDetail}
              note={modelNotes[model.name] || ''}
              onNoteChange={(note) => handleNoteChange(model.name, note)}
            />
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

      {detailModel && (
        <ModelDetailModal
          model={detailModel}
          onClose={() => setDetailModel(null)}
        />
      )}
    </div>
  )
}