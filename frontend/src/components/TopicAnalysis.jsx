import { useMemo } from 'react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend)

// CSS tabanlı custom word cloud — harici kütüphane gerektirmez
function WordCloud({ words }) {
  if (!words || words.length === 0) return null
  const max = words[0]?.value || 1
  const COLORS = [
    '#22c55e','#3b82f6','#a855f7','#f59e0b','#06b6d4',
    '#ec4899','#84cc16','#f97316','#6366f1','#14b8a6',
  ]
  return (
    <div className="flex flex-wrap gap-2 items-center justify-center p-4">
      {words.slice(0, 70).map((w, i) => {
        const ratio = w.value / max
        const size  = Math.round(12 + ratio * 36)          // 12–48 px
        const color = COLORS[i % COLORS.length]
        const opacity = 0.5 + ratio * 0.5
        return (
          <span
            key={w.text}
            title={`${w.value} kez`}
            style={{ fontSize: size, color, opacity, lineHeight: 1.2 }}
            className="font-bold cursor-default select-none hover:opacity-100 transition-opacity"
          >
            {w.text}
          </span>
        )
      })}
    </div>
  )
}

const SENTIMENT_COLORS = {
  positive: '#22c55e',
  negative: '#ef4444',
  neutral:  '#64748b',
}

function Skeleton({ className = 'h-40' }) {
  return <div className={`${className} bg-slate-700 rounded-xl animate-pulse`} />
}

const PIE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '60%',
  plugins: {
    legend: {
      position: 'right',
      labels: { color: '#94a3b8', font: { size: 12 }, padding: 14, boxWidth: 14 },
    },
    tooltip: {
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      borderWidth: 1,
      titleColor: '#f1f5f9',
      bodyColor: '#94a3b8',
    },
  },
}


export default function TopicAnalysis({ data, loading }) {
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-72" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const {
    word_cloud = [],
    hashtags = [],
    top_emojis = [],
    sentiment = {},
    top_domains = [],
    total_unique_words = 0,
    vocabulary_richness = 0,
  } = data

  // Sentiment pie
  const sentimentPie = {
    labels: ['Pozitif', 'Negatif', 'Nötr'],
    datasets: [{
      data: [sentiment.positive, sentiment.negative, sentiment.neutral],
      backgroundColor: ['#22c55e', '#ef4444', '#475569'],
      borderColor: '#0f172a',
      borderWidth: 3,
      hoverBorderWidth: 4,
    }],
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">💬 Konu & Kelime Analizi</h2>

      {/* Vocab Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Benzersiz Kelime', value: total_unique_words.toLocaleString('tr-TR'), color: 'text-green-400' },
          { label: 'Kelime Zenginliği', value: (vocabulary_richness * 100).toFixed(1) + '%', color: 'text-blue-400' },
          { label: 'Hashtag', value: hashtags.length, color: 'text-purple-400' },
          { label: 'Emoji Çeşidi', value: top_emojis.length, color: 'text-yellow-400' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <p className="text-xs text-slate-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Word Cloud */}
      {word_cloud.length > 0 && (
        <div className="card">
          <h3 className="section-title">☁️ Kelime Bulutu</h3>
          <div className="bg-slate-900 rounded-xl overflow-hidden min-h-[280px] flex items-center justify-center">
            <WordCloud words={word_cloud} />
          </div>
        </div>
      )}

      {/* Sentiment + Hashtags */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Duygu Analizi */}
        <div className="card">
          <h3 className="section-title">😊 Duygu Analizi</h3>
          {sentiment.positive !== undefined ? (
            <>
              <div style={{ height: 220 }}>
                <Doughnut data={sentimentPie} options={PIE_OPTIONS} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {[
                  { key: 'positive', label: 'Pozitif', pct: sentiment.positive_pct, emoji: '😊' },
                  { key: 'negative', label: 'Negatif', pct: sentiment.negative_pct, emoji: '😞' },
                  { key: 'neutral',  label: 'Nötr',    pct: sentiment.neutral_pct,  emoji: '😐' },
                ].map((s) => (
                  <div key={s.key} className="bg-slate-700/50 rounded-lg p-2">
                    <p className="text-lg">{s.emoji}</p>
                    <p className="text-sm font-bold" style={{ color: SENTIMENT_COLORS[s.key] }}>
                      %{s.pct}
                    </p>
                    <p className="text-xs text-slate-400">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-center">
                <span className="text-sm text-slate-400">Genel Durum: </span>
                <span className="text-sm font-semibold" style={{ color: SENTIMENT_COLORS[sentiment.overall] || '#94a3b8' }}>
                  {sentiment.overall === 'positive' ? '😊 Pozitif' :
                   sentiment.overall === 'negative' ? '😞 Negatif' : '😐 Nötr'}
                </span>
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-sm">Duygu verisi yok.</p>
          )}
        </div>

        {/* Hashtags */}
        <div className="card">
          <h3 className="section-title"># Hashtag'ler</h3>
          {hashtags.length > 0 ? (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {hashtags.map((h, i) => (
                <div key={h.tag} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-5">{i + 1}</span>
                  <div className="flex-1 bg-slate-700/50 rounded-lg px-3 py-2 flex items-center justify-between">
                    <span className="text-purple-400 text-sm font-medium">{h.tag}</span>
                    <span className="text-slate-400 text-xs">{h.count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Hashtag bulunamadı.</p>
          )}
        </div>
      </div>

      {/* Emojis + Top Domains */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Emojis */}
        {top_emojis.length > 0 && (
          <div className="card">
            <h3 className="section-title">😂 En Çok Kullanılan Emojiler</h3>
            <div className="grid grid-cols-5 gap-2">
              {top_emojis.slice(0, 15).map((e, i) => (
                <div key={i} className="bg-slate-700/50 rounded-xl p-3 text-center">
                  <p className="text-2xl">{e.emoji}</p>
                  <p className="text-xs text-slate-400 mt-1">{e.count}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Words List */}
        <div className="card">
          <h3 className="section-title">📝 En Sık Kelimeler</h3>
          <div className="flex flex-wrap gap-2">
            {word_cloud.slice(0, 30).map((w) => {
              const size = Math.max(10, Math.min(20, 10 + (w.value / (word_cloud[0]?.value || 1)) * 10))
              return (
                <span
                  key={w.text}
                  className="px-2 py-1 bg-slate-700 rounded-lg text-green-300 font-medium cursor-default
                             hover:bg-slate-600 transition-colors"
                  style={{ fontSize: `${size}px` }}
                  title={`${w.value} kez kullanıldı`}
                >
                  {w.text}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {/* Top Domains */}
      {top_domains.length > 0 && (
        <div className="card">
          <h3 className="section-title">🔗 En Çok Paylaşılan Siteler</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {top_domains.map((d) => (
              <div key={d.domain} className="bg-slate-700/50 rounded-lg p-3 text-center">
                <p className="text-slate-200 text-sm font-medium truncate">{d.domain}</p>
                <p className="text-green-400 text-xs mt-1">{d.count} paylaşım</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
