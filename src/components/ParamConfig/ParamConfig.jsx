import { useState, useEffect } from 'react'

const PARAMS = [
  { key: 'ngl', label: '-ngl', type: 'number', default: 33, hint: 'GPU Layers (--gpu-layers)' },
  { key: 'ctx', label: '-c', type: 'number', default: 64000, hint: 'Context Size (--ctx-size)' },
  { key: 't', label: '-t', type: 'number', default: 8, hint: 'Threads' },
  { key: 'port', label: '--port', type: 'number', default: 8880, hint: 'Server port' },
  { key: 'host', label: '--host', type: 'text', default: '0.0.0.0', hint: 'Bind address' },
  { key: 'timeout', label: '--timeout', type: 'number', default: 1200, hint: 'Timeout in seconds' },
  { key: 'parallel', label: '--parallel', type: 'number', default: 1, hint: 'Parallel sequences' },
  { key: 'batchSize', label: '--batch-size', type: 'number', default: 1024, hint: 'Batch size' },
  { key: 'ubatchSize', label: '--ubatch-size', type: 'number', default: 512, hint: 'Micro batch size' },
  { key: 'device', label: '--device', type: 'text', default: '', hint: 'Compute device (e.g., Vulkan0, CUDA0)' },
  { key: 'apiKey', label: '--api-key', type: 'text', default: '', hint: 'API key' },
  { key: 'temp', label: '--temp', type: 'number', default: 0.7, hint: 'Temperature' },
  { key: 'flashAttn', label: '--flash-attn', type: 'select', default: 'on', options: ['on', 'off', 'auto'], hint: 'Flash attention' },
  { key: 'cacheTypeK', label: '-ctk', type: 'select', default: 'q4_0', options: ['f32', 'f16', 'bf16', 'q8_0', 'q4_0', 'q4_1', 'iq4_nl', 'q5_0', 'q5_1'], hint: 'K cache type' },
  { key: 'cacheTypeV', label: '-ctv', type: 'select', default: 'q4_0', options: ['f32', 'f16', 'bf16', 'q8_0', 'q4_0', 'q4_1', 'iq4_nl', 'q5_0', 'q5_1'], hint: 'V cache type' },
]

const BOOLEAN_PARAMS = []

export default function ParamConfigModal({ model, onStart, onClose }) {
  const [params, setParams] = useState({})
  const [presets, setPresets] = useState([])
  const [selectedPresetId, setSelectedPresetId] = useState('')
  const [savingPreset, setSavingPreset] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [customArgs, setCustomArgs] = useState('')

  useEffect(() => {
    fetch('/api/presets')
      .then(r => r.json())
      .then(data => {
        setPresets(data)
        if (data.length > 0) {
          setSelectedPresetId(data[0].id)
          const defaultParams = Object.fromEntries(PARAMS.map(p => [p.key, p.default]))
          setParams({ ...defaultParams, ...data[0].params })
          // 同步预设的自定义参数
          setCustomArgs(data[0].params.customArgs ?? '')
        }
      })
  }, [])

  const handlePresetChange = (id) => {
    setSelectedPresetId(id)
    const preset = presets.find(p => p.id === id)
    if (preset) {
      const defaultParams = Object.fromEntries(PARAMS.map(p => [p.key, p.default]))
      setParams({ ...defaultParams, ...preset.params })
      // 同步预设的自定义参数
      setCustomArgs(preset.params.customArgs ?? '')
    }
  }

  const handleParamChange = (key, value) => {
    setParams(prev => ({ ...prev, [key]: value }))
    setSelectedPresetId('')
  }

  const handleBooleanChange = (key) => {
    setParams(prev => ({ ...prev, [key]: !prev[key] }))
    setSelectedPresetId('')
  }

  const handleSavePreset = async () => {
    if (!presetName.trim()) return
    await fetch('/api/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: presetName.trim(), params }),
    })
    setPresetName('')
    setSavingPreset(false)
    const res = await fetch('/api/presets')
    setPresets(await res.json())
  }

  const handleSaveAndStart = async () => {
    await fetch(`/api/models/config/${encodeURIComponent(model.name)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        presetId: selectedPresetId,
        overrides: params,
      }),
    })
    // 将自定义参数合并到启动参数中
    const startParams = { ...params, customArgs }
    onStart(startParams)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">参数配置</h3>
          <span className="text-sm text-gray-400 truncate max-w-[200px]">{model.name}</span>
        </div>

        <div className="mb-4">
          <label className="text-sm text-gray-400 mb-1 block">预设模板</label>
          <select
            value={selectedPresetId}
            onChange={e => handlePresetChange(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
          >
            {presets.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
            <option value="">自定义</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {PARAMS.map(({ key, label, type, hint, options, default: defaultValue }) => (
            <div key={key}>
              <label className="text-xs text-gray-400 mb-1 block">{label}</label>
              {type === 'select' ? (
                <select
                  value={params[key] ?? defaultValue}
                  onChange={e => handleParamChange(key, e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm"
                >
                  {options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={type}
                  value={params[key] ?? ''}
                  onChange={e => handleParamChange(key, type === 'number' ? Number(e.target.value) : e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm"
                />
              )}
              {hint && <p className="text-[10px] text-gray-600 mt-0.5">{hint}</p>}
            </div>
          ))}
        </div>

        <div className="mb-4">
          <label className="text-sm text-gray-400 mb-1 block">自定义参数</label>
          <textarea
            value={customArgs}
            onChange={e => setCustomArgs(e.target.value)}
            placeholder='例如: --chat-template-kwargs "{\"enable_thinking\":false}" --some-flag "value with spaces"'
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm h-20 resize-none"
            rows={3}
          />
          <p className="text-[10px] text-gray-600 mt-0.5">追加到启动参数末尾，支持带空格的值（用引号包裹）</p>
        </div>

        <div className="flex gap-4 mb-6">
          {BOOLEAN_PARAMS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={!!params[key]}
                onChange={() => handleBooleanChange(key)}
                className="accent-cyan-500"
              />
              {label}
            </label>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-4">
          {savingPreset ? (
            <>
              <input
                type="text"
                value={presetName}
                onChange={e => setPresetName(e.target.value)}
                placeholder="预设名称"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm"
                autoFocus
              />
              <button onClick={handleSavePreset} className="px-3 py-1.5 bg-gray-700 rounded-lg text-sm hover:bg-gray-600">保存</button>
              <button onClick={() => setSavingPreset(false)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white">取消</button>
            </>
          ) : (
            <button onClick={() => setSavingPreset(true)} className="text-sm text-cyan-400 hover:text-cyan-300">+ 另存为新预设</button>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">取消</button>
          <button onClick={handleSaveAndStart} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium transition-colors">启动</button>
        </div>
      </div>
    </div>
  )
}