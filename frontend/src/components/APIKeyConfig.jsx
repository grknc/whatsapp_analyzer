import { useState } from 'react'
import { Eye, EyeOff, Settings } from 'lucide-react'

const LLM_OPTIONS = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    description: 'GPT-4o, GPT-4 Turbo',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    placeholder: 'sk-...',
    needsKey: true,
  },
  {
    id: 'claude',
    name: 'Claude',
    icon: '🧠',
    description: 'claude-opus-4-6, claude-sonnet-4-6',
    models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
    placeholder: 'sk-ant-...',
    needsKey: true,
  },
  {
    id: 'qwen',
    name: 'Lokal Qwen',
    icon: '🏠',
    description: 'Ollama ile yerel model',
    models: ['qwen2.5:7b', 'qwen2.5:14b', 'qwen2.5:72b', 'llama3.2', 'mistral'],
    placeholder: '',
    needsKey: false,
  },
]

export default function APIKeyConfig({ config, onChange }) {
  const [showKey, setShowKey] = useState(false)
  const [open, setOpen] = useState(false)

  const selected = LLM_OPTIONS.find((o) => o.id === config.llm_type) || LLM_OPTIONS[0]

  const update = (key, value) => onChange({ ...config, [key]: value })

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => setOpen(!open)}
        className="w-full card flex items-center justify-between hover:border-slate-600 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-slate-400" />
          <div className="text-left">
            <p className="font-semibold text-slate-200">AI Yapılandırması</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {selected.icon} {selected.name}
              {config.model && ` • ${config.model}`}
              {selected.needsKey && (config.api_key ? ' • 🔑 Key ayarlı' : ' • API key gerekli')}
            </p>
          </div>
        </div>
        <span className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="card mt-2 space-y-5 animate-slide-up">
          {/* LLM Seçimi */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">LLM Sağlayıcı</label>
            <div className="grid grid-cols-3 gap-2">
              {LLM_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => update('llm_type', opt.id)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    config.llm_type === opt.id
                      ? 'border-green-500 bg-green-500/10 text-green-400'
                      : 'border-slate-600 bg-slate-700/50 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <div className="text-xl mb-1">{opt.icon}</div>
                  <div className="text-sm font-semibold">{opt.name}</div>
                  <div className="text-xs opacity-70 mt-0.5">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Model Seçimi */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Model</label>
            <div className="flex gap-2">
              <select
                className="input-field flex-1"
                value={config.model}
                onChange={(e) => update('model', e.target.value)}
              >
                <option value="">Varsayılan</option>
                {selected.models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <input
                type="text"
                className="input-field flex-1"
                placeholder="veya özel model gir"
                value={config.model}
                onChange={(e) => update('model', e.target.value)}
              />
            </div>
          </div>

          {/* API Key */}
          {selected.needsKey && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                API Key
                <span className="ml-1 text-xs text-red-400">*Gerekli</span>
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder={selected.placeholder}
                  value={config.api_key}
                  onChange={(e) => update('api_key', e.target.value)}
                  autoComplete="off"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                🔒 Key yalnızca bu tarayıcı oturumunda tutulur, sunucuya kalıcı olarak gönderilmez.
              </p>
            </div>
          )}

          {/* Qwen URL */}
          {config.llm_type === 'qwen' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Ollama URL
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="http://localhost:11434"
                value={config.qwen_url}
                onChange={(e) => update('qwen_url', e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">
                Ollama kurulu ve çalışıyor olmalıdır. Terminal: <code className="text-green-400">ollama serve</code>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
