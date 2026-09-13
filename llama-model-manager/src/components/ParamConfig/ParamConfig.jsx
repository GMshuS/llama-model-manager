import { useState, useEffect } from 'react'

const PARAMS = [
  { key: 'ngl', label: 'ngl (GPU Layers)', type: 'number', default: 33, hint: 'Offload layers to GPU' },
  { key: 'ctx', label: 'Context Size', type: 'number', default: 64000, hint: 'Max context tokens' },
  { key: 't', label: 'Threads', type: 'number', default: 8, hint: 'CPU threads' },
  { key: 'port', label: 'Port', type: 'number', default: 8880 },
  { key: 'host', label: 'Host', type: 'text', default: '0.0.0.0' },
  { key: 'timeout', label: 'Timeout (s)', type: 'number', default: 1200 },
  { key: 'parallel', label: 'Parallel', type: 'number', default: 1 },
  { key: 'batchSize', label: 'Batch Size', type: 'number', default: 1024 },
  { key: 'ubatchSize', label: 'Ubatch Size', type: 'number', default: 512 },
  { key: 'device', label: 'Device', type: 'text', default: '', hint: 'e.g., Vulkan0' },
  { key: 'chatTemplate', label: 'Chat Template', type: 'text', default: 'auto', hint: 'e.g., auto, llama3' },
  { key: 'cors', label: 'CORS', type: 'text', default: '', hint: 'CORS origin' },
  { key: 'apiKey', label: 'API Key', type: 'text', default: '', hint: 'Custom API key' },
  { key: 'temp', label: 'Temperature', type: 'number', default: 0.7, hint: 'Sampling temperature' },
  { key: 'flashAttn', label: 'Flash Attention', type: 'select', default: 'on', options: ['on', 'off', 'auto'] },
  { key: 'cacheTypeK', label: 'Cache Type K', type: 'select', default: 'q4_0', options: ['f32', 'f16', 'bf16', 'q8_0', 'q4_0', 'q4_1', 'iq4_nl', 'q5_0', 'q5_1'] },
  { key: 'cacheTypeV', label: 'Cache Type V', type: 'select', default: 'q4_0', options: ['f32', 'f16', 'bf16', 'q8_0', 'q4_0', 'q4_1', 'iq4_nl', 'q5_0', 'q5_1'] },
]

const BOOLEAN_PARAMS = [
  { key: 'contBatching', label: 'Continuous Batching' },
  { key: 'jinja', label: 'Jinja Templates' },
]

export default function ParamConfigModal({ model, onStart, onClose }) {
  const [params, setParams] = useState({})
  const [presets, setPresets] = useState([])
  const [selectedPresetId, setSelectedPresetId] = useState('')
  const [savingPreset, setSavingPreset] = useState(false)
  const [presetName, setPresetName] = useState('')

  useEffect(() => {
    fetch('/api/presets')
      .then(r => r.json())
      .then(data => {
        setPresets(data)
        if (data.length > 0) {
          setSelectedPresetId(data[0].id)
          const defaultParams = Object.fromEntries(PARAMS.map(p => [p.key, p.default]))
          setParams({ ...defaultParams, ...data[0].params })
        }
      })
  }, [])

  const handlePresetChange = (id) => {
    setSelectedPresetId(id)
    const preset = presets.find(p => p.id === id)
    if (preset) {
      const defaultParams = Object.fromEntries(PARAMS.map(p => [p.key, p.default]))
      setParams({ ...defaultParams, ...preset.params })
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
    onStart(params)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-auto p-6">
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

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
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
