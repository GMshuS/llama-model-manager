import { useState, useEffect } from 'react'

const InfoItem = ({ label, value, description }) => (
  <div className="mb-3">
    <div className="flex items-baseline gap-2">
      <span className="text-gray-400 text-sm">{label}:</span>
      <span className="text-white text-sm">{value || 'unknown'}</span>
    </div>
    {description && (
      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
    )}
  </div>
)

export default function ModelDetailModal({ model, onClose }) {
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/models/detail/${encodeURIComponent(model.name)}`)
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || '获取详情失败')
        }
        const data = await res.json()
        setDetails(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [model.name])

  const getArchitecturePrefix = (architecture) => {
    const prefixMap = {
      'llama': 'llama',
      'qwen35': 'qwen35',
      'gemma4': 'gemma4',
      'deepseek': 'deepseek',
      'qwen2': 'qwen2',
      'qwen': 'qwen'
    }
    return prefixMap[architecture] || architecture
  }

  const renderDetails = () => {
    if (!details) return null

    const archPrefix = getArchitecturePrefix(details.architecture)

    return (
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        {/* 文件基础信息 */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-cyan-400">文件基础信息</h3>
          <InfoItem 
            label="GGUF版本" 
            value={details.version}
            description={details.version === '2' ? 'v2兼容老版本；v1过旧，建议重转GGUF' : details.version === '3' ? '建议v3' : ''}
          />
          <InfoItem 
            label="模型架构" 
            value={details.architecture}
            description="架构标识；llama.cpp靠此字段选择解析器，字段错会直接乱码"
          />
          <InfoItem 
            label="参数大小" 
            value={details.size_label}
            description="标称参数量，仅供参考"
          />
          <InfoItem 
            label="量化类型" 
            value={details.file_type}
            description="基础量化编码；K‑quant混合量化看张量列表，此字段仅主标记"
          />
          <InfoItem 
            label="量化工具" 
            value={details.quantized_by}
          />
        </div>

        {/* 模型网络超参 */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-cyan-400">模型网络超参</h3>
          <InfoItem 
            label="上下文大小" 
            value={details.context_length}
            description={`\`‑c\`参数不能大于该值，强行开大输出乱码`}
          />
          <InfoItem 
            label="模型层数" 
            value={details.block_count}
            description="blk.0 ~ blk.N‑1，张量列表层数需要匹配"
          />
          <InfoItem 
            label="隐藏维度" 
            value={details.embedding_length}
            description="用于手工估算KV缓存占用"
          />
          <InfoItem 
            label="FFN维度" 
            value={details.feed_forward_length}
            description="FFN越大模型算力需求越高"
          />
          <InfoItem 
            label="模型架构" 
            value={details.expert_count ? 'MoE混合' : '稠密Dense'}
            description={details.expert_count ? `MoE混合专家模型，共${details.expert_count}个专家` : '稠密Dense模型'}
          />
          <InfoItem 
            label="MoE每轮激活" 
            value={details.expert_used_count}
            description={details.expert_used_count ? `每轮激活${details.expert_used_count}个专家` : '非MoE模型'}
          />
        </div>

        {/* 内置推测加速头 */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-cyan-400">内置推测加速头</h3>
          <InfoItem 
            label="MTP支持" 
            value={details.num_pred_heads ? '是' : '否'}
            description={details.num_pred_heads ? `支持MTP，${details.num_pred_heads}个预测头` : '不支持MTP内置草稿'}
          />
          <InfoItem 
            label="Flash支持" 
            value={details.num_draft_layers ? (details.num_draft_layers > 0 ? 'd-flash/d-spark' : '否') : '否'}
            description={details.num_draft_layers ? '支持d-flash/d-spark内置草稿' : '不支持d-flash/d-spark内置草稿'}
          />
        </div>

        {/* 分词器元数据 */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-cyan-400">分词器元数据</h3>
          <InfoItem 
            label="分词器类型" 
            value={details.tokenizer_model}
            description="分词器模型类型"
          />
          <InfoItem 
            label="分词器模板" 
            value={details.chat_template ? '已配置' : '未配置'}
            description={details.chat_template ? 'llama‑server自动组装对话prompt' : '必须手动\`--chat‑template xxx\`，否则对话格式错乱'}
          />
          {details.chat_template && (
            <div className="mt-2 p-2 bg-gray-800 rounded text-xs text-gray-400 max-h-24 overflow-y-auto">
              {details.chat_template}
            </div>
          )}
        </div>

        {/* gguf-dump 完整输出 */}
        {details.raw_output && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-cyan-400">完整输出</h3>
            <pre className="p-3 bg-gray-800 rounded text-xs text-gray-300 max-h-64 overflow-auto whitespace-pre">
              {details.raw_output}
            </pre>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">模型详情</h3>
          <span className="text-sm text-gray-400 truncate max-w-[200px]">{model.name}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-400">加载中...</div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="text-red-400 mb-2">{error}</div>
            <div className="text-sm text-gray-500">请确保gguf-dump已安装并可用</div>
          </div>
        ) : (
          renderDetails()
        )}

        <div className="flex justify-end mt-6">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm text-gray-400 hover:text-white"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}