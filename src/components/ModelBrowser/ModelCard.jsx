import { useState, useRef } from 'react'

export default function ModelCard({ model, onStart, onShowDetail, note, onNoteChange }) {
  const [isHovered, setIsHovered] = useState(false)
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [tempNote, setTempNote] = useState(note || '')
  const noteInputRef = useRef(null)

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    if (isEditingNote) {
      setIsEditingNote(false)
      setTempNote(note || '')
    }
  }

  const handleNoteClick = (e) => {
    e.stopPropagation()
    setIsEditingNote(true)
    setTimeout(() => noteInputRef.current?.focus(), 0)
  }

  const handleNoteSave = () => {
    if (tempNote.length <= 12) {
      onNoteChange(tempNote)
    }
    setIsEditingNote(false)
  }

  const handleNoteKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleNoteSave()
    } else if (e.key === 'Escape') {
      setTempNote(note || '')
      setIsEditingNote(false)
    }
  }

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative p-4 rounded-xl border transition-all duration-200 ${
        model.running 
          ? 'border-cyan-500 bg-gray-800/80' 
          : 'border-gray-800 bg-gray-900/80 hover:border-gray-700'
      }`}
    >
      {/* 运行状态标签 */}
      {model.running && (
        <span className="absolute top-2 right-2 px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-full">
          运行中
        </span>
      )}
      
      {/* 模型名称 */}
      <h3 className="font-medium max-w-full overflow-hidden text-ellipsis mb-2" title={model.name}>
        {model.name}
      </h3>
      
      {/* 模型信息 */}
      <div className="flex gap-3 text-sm text-gray-400">
        <span>{model.sizeFormatted}</span>
        <span className="text-cyan-600">{model.quantization}</span>
      </div>
      
      {/* 备注显示 */}
      {note && !isEditingNote && (
        <div className="mt-2 text-xs text-gray-500 truncate" title={note}>
          {note}
        </div>
      )}
      
      {/* 悬停操作面板 */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gray-800/90 backdrop-blur-sm rounded-b-xl p-3 flex justify-end gap-2 transition-all duration-200 ${
          isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'
        }`}
      >
        {/* 备注编辑框 */}
        {isEditingNote ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              ref={noteInputRef}
              type="text"
              value={tempNote}
              onChange={(e) => setTempNote(e.target.value)}
              onBlur={handleNoteSave}
              onKeyDown={handleNoteKeyDown}
              maxLength={12}
              placeholder="添加备注（最多12字）"
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
            />
            <span className="text-xs text-gray-400">{tempNote.length}/12</span>
          </div>
        ) : (
          <>
            {/* 启动按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onStart(model)
              }}
              className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded transition-colors"
            >
              启动
            </button>
            
            {/* 详情按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onShowDetail(model)
              }}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors"
            >
              详情
            </button>
            
            {/* 备注按钮 */}
            <button
              onClick={handleNoteClick}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded transition-colors"
            >
              备注
            </button>
          </>
        )}
      </div>
    </div>
  )
}