import { useState, useEffect } from 'react'

const PARAMS = [
  { key: 'ngl', label: '-ngl', type: 'number' },
  { key: 'ctx', label: '-c', type: 'number' },
  { key: 't', label: '-t', type: 'number' },
  { key: 'port', label: '--port', type: 'number' },
  { key: 'host', label: '--host', type: 'text' },
  { key: 'timeout', label: '--timeout', type: 'number' },
  { key: 'parallel', label: '--parallel', type: 'number' },
  { key: 'batchSize', label: '--batch-size', type: 'number' },
  { key: 'ubatchSize', label: '--ubatch-size', type: 'number' },
  { key: 'device', label: '--device', type: 'text' },
  { key: 'apiKey', label: '--api-key', type: 'text' },
  { key: 'temp', label: '--temp', type: 'number' },
  { key: 'flashAttn', label: '--flash-attn', type: 'select', options: ['on', 'off', 'auto'] },
  { key: 'cacheTypeK', label: '-ctk', type: 'select', options: ['f32', 'f16', 'bf16', 'q8_0', 'q4_0', 'q4_1', 'iq4_nl', 'q5_0', 'q5_1'] },
  { key: 'cacheTypeV', label: '-ctv', type: 'select', options: ['f32', 'f16', 'bf16', 'q8_0', 'q4_0', 'q4_1', 'iq4_nl', 'q5_0', 'q5_1'] },
  { key: 'customArgs', label: '自定义参数', type: 'textarea', hint: '追加到启动参数末尾，支持引号包裹的值' },
]

const BOOLEAN_PARAMS = []

// 内部键名到实际参数名的映射
const PARAM_KEY_TO_FLAG = {
  ngl: '-ngl', ctx: '-c', t: '-t', port: '--port', host: '--host',
  timeout: '--timeout', parallel: '--parallel',
  batchSize: '--batch-size', ubatchSize: '--ubatch-size',
  device: '--device', apiKey: '--api-key',
  temp: '--temp', flashAttn: '--flash-attn',
  cacheTypeK: '-ctk', cacheTypeV: '-ctv',
  customArgs: '自定义参数',
}

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

  const startNewPreset = () => {
    setEditingId('new')
    setEditName('')
    const defaultParams = Object.fromEntries(PARAMS.map(p => [p.key, p.default ?? '']))
    setEditParams({ ...defaultParams })
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const handleSave = async () => {
    try {
      console.log('保存预设:', editingId, { name: editName, params: editParams })
      let response
      if (editingId === 'new') {
        response = await fetch('/api/presets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editName, params: editParams }),
        })
      } else {
        response = await fetch(`/api/presets/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editName, params: editParams }),
        })
      }
      
      console.log('响应状态:', response.status)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('保存失败响应:', errorText)
        throw new Error('保存失败')
      }
      
      const updatedPreset = await response.json()
      console.log('保存成功:', updatedPreset)
      
      // 更新本地状态
      if (editingId === 'new') {
        setPresets(prev => [...prev, updatedPreset])
      } else {
        setPresets(prev => prev.map(p => p.id === editingId ? updatedPreset : p))
      }
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

  // 渲染参数输入组件
  const renderParamInput = ({ key, label, type, options, hint }) => (
    <div key={key}>
      <label className="text-xs text-gray-500 mb-0.5 block">{label}</label>
      {type === 'textarea' ? (
        <textarea
          value={editParams[key] ?? ''}
          onChange={e => handleParamChange(key, e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs h-20 resize-none"
          rows={4}
          placeholder={hint}
        />
      ) : type === 'select' ? (
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
  )

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">设置中心</h2>

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
        <div className="flex gap-2">
          <button
            onClick={startNewPreset}
            className="px-3 py-1 text-xs bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white"
          >
            + 新增预设
          </button>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300"
          >
            刷新列表
          </button>
        </div>
      </div>
      {/* 新建预设表单 - 在列表之前渲染 */}
      {editingId === 'new' && (
        <div key="new-preset" className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-3">
          <input
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            placeholder="预设名称"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm mb-3"
            autoFocus
          />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            {PARAMS.filter(p => p.key !== 'customArgs').map(p => renderParamInput(p))}
          </div>
          {/* 自定义参数独占一行 */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 mb-0.5 block">自定义参数</label>
            <textarea
              value={editParams.customArgs ?? ''}
              onChange={e => handleParamChange('customArgs', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs h-20 resize-none"
              rows={4}
              placeholder="追加到启动参数末尾，支持引号包裹的值"
            />
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
            <button onClick={cancelEdit} className="px-4 py-1.5 text-sm text-gray-400 hover:text-white">取消</button>
          </div>
        </div>
      )}
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
                  {PARAMS.filter(p => p.key !== 'customArgs').map(p => renderParamInput(p))}
                </div>
                {/* 自定义参数独占一行 */}
                <div className="mb-3">
                  <label className="text-xs text-gray-500 mb-0.5 block">自定义参数</label>
                  <textarea
                    value={editParams.customArgs ?? ''}
                    onChange={e => handleParamChange('customArgs', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs h-20 resize-none"
                    rows={4}
                    placeholder="追加到启动参数末尾，支持引号包裹的值"
                  />
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
                  {Object.entries(preset.params).map(([k, v]) => {
                    const flag = PARAM_KEY_TO_FLAG[k] || k
                    if (k === 'customArgs' && !v) return null
                    return <span key={k}><span className="text-gray-600">{k === 'customArgs' ? '自定义参数' : flag}:</span> {String(v)}</span>
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}