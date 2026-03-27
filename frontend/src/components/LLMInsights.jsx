import { useState } from 'react'
import { Loader2, Sparkles, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { getLLMInsights } from '../api/client'
import toast from 'react-hot-toast'

const PROMPT_SUGGESTIONS = [
  'Gruptaki en baskın üyeyi ve etkisini analiz et',
  'Konuşma konularını ve anahtar temaları listele',
  'Toksik veya negatif mesaj örüntüleri var mı?',
  'Grup dinamiklerini iyileştirmek için öneriler sun',
  'En aktif ve en pasif dönemleri analiz et',
  'Grubun genel ruh halini ve enerjisini yorumla',
]

function MarkdownRenderer({ content }) {
  // Basit Markdown → HTML dönüşümü
  const html = content
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>• $1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^---$/gm, '<hr/>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')

  return (
    <div
      className="prose-dark"
      dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }}
    />
  )
}

function InsightCard({ title, icon, children }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="card">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left"
      >
        <h3 className="section-title mb-0">
          <span>{icon}</span>
          {title}
        </h3>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  )
}

export default function LLMInsights({ config }) {
  const [loading, setLoading]       = useState(false)
  const [result, setResult]         = useState(null)
  const [error, setError]           = useState('')
  const [userPrompt, setUserPrompt] = useState('')

  const providerLabel = {
    openai: '🤖 OpenAI',
    claude: '🧠 Claude',
    qwen:   '🏠 Lokal Qwen',
  }[config.llm_type] || config.llm_type

  const canRun = config.llm_type === 'qwen' || !!config.api_key

  const handleAnalyze = async () => {
    if (!canRun) {
      toast.error('API key gerekli. Yükleme sayfasındaki yapılandırmayı kontrol edin.')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await getLLMInsights({
        llm_type:    config.llm_type,
        api_key:     config.api_key,
        model:       config.model || undefined,
        user_prompt: userPrompt,
        qwen_url:    config.qwen_url,
      })
      setResult(res.data)
      toast.success('AI analizi tamamlandı!')
    } catch (err) {
      const msg = err.message || 'Bilinmeyen hata'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // İçeriği bölümlere ayır
  const parseInsightSections = (content) => {
    const sections = []
    const sectionRegex = /^#{1,3}\s+(.+)$/gm
    let match
    const matches = []
    while ((match = sectionRegex.exec(content)) !== null) {
      matches.push({ title: match[1], index: match.index })
    }

    if (matches.length < 2) {
      return [{ title: 'Analiz', icon: '📊', content }]
    }

    const icons = ['📊', '👥', '💬', '⚠️', '💡', '✅', '🎯', '📈', '🔍', '🌟']
    matches.forEach((m, i) => {
      const start = m.index
      const end = i < matches.length - 1 ? matches[i + 1].index : content.length
      const body = content.slice(start, end).replace(/^#{1,3}\s+.+\n/, '').trim()
      if (body) {
        sections.push({
          title: m.title,
          icon: icons[i % icons.length],
          content: body,
        })
      }
    })
    return sections.length > 0 ? sections : [{ title: 'Analiz', icon: '📊', content }]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-white">🤖 AI Insights</h2>
        <span className="text-xs bg-slate-700 text-slate-300 px-2.5 py-1 rounded-full border border-slate-600">
          {providerLabel}
          {config.model && ` • ${config.model}`}
        </span>
      </div>

      {/* Config Status */}
      {!canRun && (
        <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-yellow-300 font-medium text-sm">API Key Gerekli</p>
            <p className="text-yellow-400/70 text-xs mt-0.5">
              Yükleme sekmesindeki AI Yapılandırması bölümünden API key ekleyin.
            </p>
          </div>
        </div>
      )}

      {/* Prompt Suggestions */}
      <div className="card space-y-4">
        <h3 className="section-title">💭 Soru veya Konu Girin</h3>

        <div className="flex flex-wrap gap-2">
          {PROMPT_SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setUserPrompt(s)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                userPrompt === s
                  ? 'bg-green-500/20 border-green-500/50 text-green-400'
                  : 'border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <textarea
          className="input-field h-24 resize-none"
          placeholder="Gruba özel sorunuzu veya analiz talebinizi buraya yazın… (boş bırakırsanız genel analiz yapılır)"
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
        />

        <button
          onClick={handleAnalyze}
          disabled={loading || !canRun}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              AI analiz ediyor…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              AI Analizi Başlat
            </>
          )}
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="card flex flex-col items-center gap-4 py-10 animate-pulse">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full animate-ping" />
          </div>
          <div className="text-center">
            <p className="text-slate-200 font-medium">{providerLabel} analiz ediyor…</p>
            <p className="text-slate-400 text-sm mt-1">Bu işlem 10-30 saniye sürebilir</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-300 font-medium">Analiz Başarısız</p>
            <p className="text-red-400/80 text-sm mt-1">{error}</p>
            {(error.toLowerCase().includes('api key') || error.toLowerCase().includes('geçersiz')) && (
              <div className="mt-3 p-3 bg-slate-800 rounded-lg text-xs text-slate-400 space-y-1">
                <p className="font-medium text-slate-300">🔑 API Key Nasıl Alınır?</p>
                <p>• <strong className="text-blue-400">OpenAI:</strong> platform.openai.com → API Keys</p>
                <p>• <strong className="text-purple-400">Claude:</strong> console.anthropic.com → API Keys</p>
                <p>• <strong className="text-green-400">Lokal Qwen:</strong> API key gerekmez, Ollama çalıştırın</p>
                <p className="mt-2 text-slate-500">Yükleme sekmesinden doğru sağlayıcı ve key'i girdiğinizden emin olun.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {result?.content && !loading && (
        <div className="space-y-4 animate-slide-up">
          {/* Meta */}
          <div className="flex items-center gap-3 text-sm text-slate-400 bg-slate-800/50 rounded-lg px-4 py-2.5 border border-slate-700">
            <Sparkles className="w-4 h-4 text-green-400" />
            <span>
              {providerLabel}
              {result.model && ` • ${result.model}`}
            </span>
            {result.usage && (
              <span className="ml-auto text-xs text-slate-500">
                {result.usage.prompt_tokens + result.usage.completion_tokens} token
              </span>
            )}
          </div>

          {/* Sections */}
          {parseInsightSections(result.content).map((section, i) => (
            <InsightCard key={i} title={section.title} icon={section.icon}>
              <MarkdownRenderer content={section.content} />
            </InsightCard>
          ))}

          {/* Raw Full Text (collapsible) */}
          <details className="card cursor-pointer">
            <summary className="text-sm text-slate-400 hover:text-slate-200 transition-colors select-none">
              📄 Ham Yanıt Görüntüle
            </summary>
            <pre className="mt-3 text-xs text-slate-400 whitespace-pre-wrap font-mono leading-relaxed bg-slate-900 rounded-lg p-4 overflow-x-auto">
              {result.content}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}
