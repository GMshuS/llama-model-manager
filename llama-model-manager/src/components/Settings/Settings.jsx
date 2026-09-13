import { useState, useEffect } from 'react'

const PARAMS = [
  { key: 'ngl', label: 'ngl (GPU Layers)', type: 'number' },
  { key: 'ctx', label: 'Context Size', type: 'number' },
  { key: 't', label: 'Threads', type: 'number' },
  { key: 'port', label: 'Port', type: 'number' },
  { key: 'host', label: 'Host', type: 'text' },
  { key: 'timeout', label: 'Timeout (s)', type: 'number' },
  { key: 'parallel', label: 'Parallel', type: 'number' },
  { key: 'batchSize', label: 'Batch Size', type: 'number' },
  { key: 'ubatchSize', label: 'Ubatch Size', type: 'number' },
  { key: 'device', label: 'Device', type: 'text' },
  { key: 'chatTemplate', label: 'Chat Template', type: 'text' },
  { key: 'cors', label: 'CORS', type: 'text' },
  { key: 'apiKey', label: 'API Key', type: 'text' },
  { key: 'temp', label: 'Temperature', type: 'number' },
  { key: 'flashAttn', label: 'Flash Attention', type: 'select', options: ['on', 'off', 'auto'] },
  { key: 'cacheTypeK', label: 'Cache Type K', type: 'select', options: ['f32', 'f16', 'bf16', 'q8_0', 'q4_0', 'q4_1', 'iq4_nl', 'q5_0', 'q5_1'] },
  { key: 'cacheTypeV', label: 'Cache Type V', type: 'select', options: ['f32', 'f16', 'bf16', 'q8_0', 'q4_0', 'q4_1', 'iq4_nl', 'q5_0', 'q5_1'] },
]

const BOOLEAN_PARAMS = [
  { key: 'contBatching', label: 'Continuous Batching' },
  { key: 'jinja', label: 'Jinja Templates' },
]

export default function Settings() {
  const [presets, setPresets] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editParams, setEditParams] = useState({})
  const [editName, setEditName] = useState('')
  const [modelsDir, setModelsDir] = useState('models')
  const [llamaServerExe, setLlamaServerExe] = useState('llama-server.exe')
  const [msg, setMsg] = useState(null)

  const loadConfig = () => {
    fetch('/api/config').then(r => r.json()).then(c => {
      if (c.llamaServerExe) setLlamaServerExe(c.llamaServerExe)
    })
  }

  useEffect(() => {
    fetch('/api/presets').then(r => r.json()).then(setPresets)
    fetch('/api/models/dir').then(r => r.json()).then(d => setModelsDir(d.dir))
    loadConfig()
  }, [])

  const startEdit = (preset) => {
    setEditingId(preset.id)
    setEditName(preset.name)
    setEditParams({ ...preset.params })
  }

  const handleSave = async () => {
    try {
      console.log('保存预设:', editingId, { name: editName, params: editParams })
      const response = await fetch(`/api/presets/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, params: editParams }),
      })
      
      console.log('响应状态:', response.status)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('保存失败响应:', errorText)
        throw new Error('保存失败')
      }
      
      const updatedPreset = await response.json()
      console.log('保存成功:', updatedPreset)
      
      // 更新本地状态
      setPresets(prev => prev.map(p => p.id === editingId ? updatedPreset : p))
      setEditingId(null)
      setMsg({ type: 'success', text: '预设已保存' })
      setTimeout(() => setMsg(null), 3000)
    } catch (error) {
      console.error('保存错误:', error)
      setMsg({ type: 'error', text: error.message })
      setTimeout(() => setMsg(null), 3000)
    }
  }

  const handleRefresh = async () => {
    try {
      const res = await fetch('/api/presets')
      const data = await res.json()
      setPresets(data)
      setMsg({ type: 'success', text: '预设列表已刷新' })
      setTimeout(() => setMsg(null), 3000)
    } catch (error) {
      console.error('刷新失败:', error)
      setMsg({ type: 'error', text: '刷新失败: ' + error.message })
      setTimeout(() => setMsg(null), 3000)
    }
  }

  const handleDelete = async (id) => {
    await fetch(`/api/presets/${id}`, { method: 'DELETE' })
    setPresets(prev => prev.filter(p => p.id !== id))
  }

  const handleParamChange = (key, value) => {
    setEditParams(prev => ({ ...prev, [key]: value }))
  }

  const handleBoolChange = (key) => {
    setEditParams(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleDirSave = async () => {
    try {
      const res = await fetch('/api/models/dir', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dir: modelsDir }),
      })
      if (!res.ok) throw new Error('保存失败')
      setMsg({ type: 'success', text: '模型目录已保存' })
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    }
    setTimeout(() => setMsg(null), 3000)
  }

  const handleExeSave = async () => {
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ llamaServerExe }),
      })
      if (!res.ok) throw new Error('保存失败')
      setMsg({ type: 'success', text: 'llama-server.exe 路径已保存' })
      loadConfig()
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    }
    setTimeout(() => setMsg(null), 3000)
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">设置</h2>

      {msg && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-900/50 text-green-400 border border-green-800' : 'bg-red-900/50 text-red-400 border border-red-800'}`}>
          {msg.text}
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">llama-server.exe 路径</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={llamaServerExe}
            onChange={e => setLlamaServerExe(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
          />
          <button onClick={handleExeSave} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">保存</button>
        </div>
        <p className="text-xs text-gray-500 mt-1">填写完整路径，如 D:\llama.cpp\build\bin\Release\llama-server.exe</p>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-400 mb-3">模型目录</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={modelsDir}
            onChange={e => setModelsDir(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
          />
          <button onClick={handleDirSave} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">保存</button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-400">参数预设</h3>
        <button 
          onClick={handleRefresh}
          className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300"
        >
          刷新列表
        </button>
      </div>
      <div className="space-y-3">
        {presets.map(preset => (
          <div key={preset.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            {editingId === preset.id ? (
              <div>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm mb-3"
                />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                  {PARAMS.map(({ key, label, type, options }) => (
                    <div key={key}>
                      <label className="text-xs text-gray-500 mb-0.5 block">{label}</label>
                      {type === 'select' ? (
                        <select
                          value={editParams[key] ?? ''}
                          onChange={e => handleParamChange(key, e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs"
                        >
                          {options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={type}
                          value={editParams[key] ?? ''}
                          onChange={e => handleParamChange(key, type === 'number' ? Number(e.target.value) : e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs"
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mb-3">
                  {BOOLEAN_PARAMS.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input type="checkbox" checked={!!editParams[key]} onChange={() => handleBoolChange(key)} className="accent-cyan-500" />
                      {label}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSave} className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm">保存</button>
                  <button onClick={() => setEditingId(null)} className="px-4 py-1.5 text-sm text-gray-400 hover:text-white">取消</button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">{preset.name}</h4>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(preset)} className="text-xs text-cyan-400 hover:text-cyan-300">编辑</button>
                    <button onClick={() => handleDelete(preset.id)} className="text-xs text-red-400 hover:text-red-300">删除</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  {Object.entries(preset.params).map(([k, v]) => (
                    <span key={k}><span className="text-gray-600">{k}:</span> {String(v)}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
