import { useState, useEffect, useCallback } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, ArcElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { Search, User, MessageSquare, Clock, Hash, Smile, TrendingUp, FileText } from 'lucide-react'
import { getUserAnalysis, getUserProfile } from '../api/client'
import toast from 'react-hot-toast'

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, ArcElement,
  Title, Tooltip, Legend, Filler
)

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      borderWidth: 1,
      titleColor: '#f1f5f9',
      bodyColor: '#94a3b8',
    },
  },
  scales: {
    x: { grid: { color: '#1e293b' }, ticks: { color: '#64748b' } },
    y: { grid: { color: '#1e293b' }, ticks: { color: '#64748b' } },
  },
}

const COLORS = [
  '#22c55e','#3b82f6','#a855f7','#f59e0b','#06b6d4',
  '#ec4899','#84cc16','#f97316','#6366f1','#14b8a6',
]

const SENTIMENT_COLORS = { positive: '#22c55e', negative: '#ef4444', neutral: '#64748b' }

function Skeleton({ className = 'h-32' }) {
  return <div className={`${className} bg-slate-700 rounded-xl animate-pulse`} />
}

// Kullanıcı avatarı
function Avatar({ name, size = 'md' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-12 h-12 text-base', lg: 'w-16 h-16 text-xl' }
  const color = COLORS[name?.charCodeAt(0) % COLORS.length] || '#22c55e'
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-bold flex-shrink-0`}
      style={{ backgroundColor: color + '25', color, border: `2px solid ${color}40` }}
    >
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

// CSS word cloud
function WordCloud({ words }) {
  if (!words?.length) return <p className="text-slate-500 text-sm text-center py-4">Kelime bulunamadı</p>
  const max = words[0]?.value || 1
  return (
    <div className="flex flex-wrap gap-1.5 items-center justify-center p-3">
      {words.slice(0, 50).map((w, i) => {
        const ratio = w.value / max
        const size  = Math.round(11 + ratio * 32)
        const color = COLORS[i % COLORS.length]
        return (
          <span
            key={w.text}
            title={`${w.value} kez`}
            style={{ fontSize: size, color, opacity: 0.55 + ratio * 0.45, lineHeight: 1.2 }}
            className="font-bold cursor-default select-none hover:opacity-100 transition-opacity"
          >
            {w.text}
          </span>
        )
      })}
    </div>
  )
}

export default function UserProfile({ userData }) {
  const [userList,   setUserList]   = useState([])
  const [selected,   setSelected]   = useState('')
  const [search,     setSearch]     = useState('')
  const [profile,    setProfile]    = useState(null)
  const [loading,    setLoading]    = useState(false)

  // Kullanıcı listesini userData'dan al
  useEffect(() => {
    if (userData?.users?.length) {
      setUserList(userData.users)
    } else {
      getUserAnalysis()
        .then((r) => setUserList(r.data.users || []))
        .catch(() => {})
    }
  }, [userData])

  const loadProfile = useCallback(async (username) => {
    if (!username) return
    setLoading(true)
    setProfile(null)
    try {
      const res = await getUserProfile(username)
      setProfile(res.data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSelect = (username) => {
    setSelected(username)
    setSearch('')
    loadProfile(username)
  }

  const filteredUsers = userList.filter((u) =>
    u.user.toLowerCase().includes(search.toLowerCase())
  )

  // ── Chart data ────────────────────────────────────────────────────────────
  const hourlyData = profile ? {
    labels: Array.from({ length: 24 }, (_, h) => `${h}:00`),
    datasets: [{
      label: 'Mesaj',
      data: Array.from({ length: 24 }, (_, h) => {
        const found = profile.hourly_activity?.find((d) => d.hour === h)
        return found?.count || 0
      }),
      backgroundColor: 'rgba(34,197,94,0.5)',
      borderColor: '#22c55e',
      borderWidth: 1,
      borderRadius: 4,
    }],
  } : null

  const dowData = profile ? {
    labels: profile.daily_dow?.map((d) => d.day) || [],
    datasets: [{
      label: 'Mesaj',
      data: profile.daily_dow?.map((d) => d.count) || [],
      backgroundColor: (profile.daily_dow || []).map((_, i) => COLORS[i % COLORS.length] + '70'),
      borderColor: (profile.daily_dow || []).map((_, i) => COLORS[i % COLORS.length]),
      borderWidth: 1,
      borderRadius: 4,
    }],
  } : null

  const sentimentData = profile?.sentiment ? {
    labels: ['Pozitif', 'Negatif', 'Nötr'],
    datasets: [{
      data: [
        profile.sentiment.positive,
        profile.sentiment.negative,
        profile.sentiment.neutral,
      ],
      backgroundColor: ['#22c55e', '#ef4444', '#475569'],
      borderColor: '#0f172a',
      borderWidth: 3,
    }],
  } : null

  const lengthData = profile ? {
    labels: profile.length_distribution?.map((d) => d.range) || [],
    datasets: [{
      label: 'Mesaj',
      data: profile.length_distribution?.map((d) => d.count) || [],
      backgroundColor: 'rgba(99,102,241,0.6)',
      borderColor: '#6366f1',
      borderWidth: 1,
      borderRadius: 4,
    }],
  } : null

  const timelineData = profile?.daily_timeline?.length ? {
    labels: profile.daily_timeline.map((d) => d.date?.slice(5)),
    datasets: [{
      label: 'Mesaj',
      data: profile.daily_timeline.map((d) => d.count),
      borderColor: '#a855f7',
      backgroundColor: 'rgba(168,85,247,0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: profile.daily_timeline.length > 30 ? 0 : 3,
    }],
  } : null

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">👤 Kişi Profil Analizi</h2>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* ── Sol Panel: Kullanıcı Seçimi ─────────────────────────────── */}
        <div className="card lg:col-span-1 space-y-3">
          <h3 className="section-title text-sm">Kullanıcı Seç</h3>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              className="input-field pl-8 text-sm py-2"
              placeholder="Ara…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="space-y-1 max-h-[480px] overflow-y-auto pr-1">
            {filteredUsers.map((u) => (
              <button
                key={u.user}
                onClick={() => handleSelect(u.user)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                  selected === u.user
                    ? 'bg-green-500/20 border border-green-500/40'
                    : 'hover:bg-slate-700 border border-transparent'
                }`}
              >
                <Avatar name={u.user} size="sm" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">{u.user}</p>
                  <p className="text-xs text-slate-500">{u.message_count} msg • %{u.percentage}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Sağ Panel: Profil İçeriği ──────────────────────────────── */}
        <div className="lg:col-span-3 space-y-5">
          {!selected && !loading && (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <User className="w-12 h-12 text-slate-600 mb-3" />
              <p className="text-slate-400 font-medium">Soldaki listeden bir kullanıcı seçin</p>
              <p className="text-slate-500 text-sm mt-1">Kişiye özel detaylı analiz görünecek</p>
            </div>
          )}

          {loading && (
            <div className="space-y-4">
              <Skeleton className="h-28" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-20" />)}
              </div>
              <Skeleton className="h-52" />
              <Skeleton className="h-52" />
            </div>
          )}

          {profile && !loading && (
            <div className="space-y-5 animate-fade-in">
              {/* Profil Header */}
              <div className="card flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Avatar name={profile.user} size="lg" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white">{profile.user}</h3>
                  <p className="text-slate-400 text-sm mt-0.5">
                    {profile.stats?.date_range?.start} → {profile.stats?.date_range?.end}
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="text-center bg-slate-700 rounded-xl px-4 py-2">
                    <p className="text-2xl font-bold text-green-400">
                      {profile.stats?.message_count?.toLocaleString('tr-TR')}
                    </p>
                    <p className="text-xs text-slate-400">Mesaj</p>
                  </div>
                  <div className="text-center bg-slate-700 rounded-xl px-4 py-2">
                    <p className="text-2xl font-bold text-blue-400">%{profile.stats?.percentage}</p>
                    <p className="text-xs text-slate-400">Pay</p>
                  </div>
                </div>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: MessageSquare, label: 'Ort. Uzunluk', value: profile.stats?.avg_message_length, unit: 'kar', color: 'text-green-400' },
                  { icon: FileText,      label: 'Ort. Kelime',  value: profile.stats?.avg_word_count,      unit: 'kelime', color: 'text-blue-400' },
                  { icon: TrendingUp,    label: 'Top. Kelime',  value: profile.stats?.total_words?.toLocaleString('tr-TR'), color: 'text-purple-400' },
                  { icon: Smile,         label: 'Emoji',        value: profile.stats?.total_emojis,        color: 'text-yellow-400' },
                  { icon: Hash,          label: 'Benzersiz Emoji', value: profile.stats?.unique_emojis,    color: 'text-pink-400' },
                  { icon: Clock,         label: 'Ort. Yanıt',   value: profile.stats?.avg_response_hours ? `${profile.stats.avg_response_hours}s` : '—', color: 'text-cyan-400' },
                  { icon: MessageSquare, label: 'Link Paylaşım', value: profile.stats?.url_count,          color: 'text-orange-400' },
                  { icon: User,          label: 'Durum',         value: profile.sentiment?.overall === 'positive' ? '😊 Pozitif' : profile.sentiment?.overall === 'negative' ? '😞 Negatif' : '😐 Nötr', color: 'text-slate-300' },
                ].map((s, i) => (
                  <div key={i} className="stat-card">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-400">{s.label}</span>
                      <s.icon className="w-3.5 h-3.5 text-slate-600" />
                    </div>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value ?? '—'}</p>
                    {s.unit && <p className="text-xs text-slate-500">{s.unit}</p>}
                  </div>
                ))}
              </div>

              {/* Kelime Bulutu */}
              {profile.word_cloud?.length > 0 && (
                <div className="card">
                  <h3 className="section-title">☁️ Kelime Bulutu</h3>
                  <div className="bg-slate-900 rounded-xl min-h-[220px] flex items-center justify-center">
                    <WordCloud words={profile.word_cloud} />
                  </div>
                </div>
              )}

              {/* Saatlik + Günlük Aktivite */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {hourlyData && (
                  <div className="card">
                    <h3 className="section-title">🕐 Saatlik Aktivite</h3>
                    <div style={{ height: 180 }}>
                      <Bar data={hourlyData} options={{ ...CHART_DEFAULTS, scales: { ...CHART_DEFAULTS.scales, x: { ...CHART_DEFAULTS.scales.x, ticks: { color: '#64748b', maxRotation: 0, callback: (v) => v % 6 === 0 ? `${v}:00` : '' } } } }} />
                    </div>
                  </div>
                )}
                {dowData && (
                  <div className="card">
                    <h3 className="section-title">📅 Haftanın Günleri</h3>
                    <div style={{ height: 180 }}>
                      <Bar data={dowData} options={CHART_DEFAULTS} />
                    </div>
                  </div>
                )}
              </div>

              {/* Duygu + Mesaj Uzunluk Dağılımı */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {sentimentData && (
                  <div className="card">
                    <h3 className="section-title">😊 Duygu Analizi</h3>
                    <div className="flex items-center gap-4">
                      <div style={{ height: 160, width: 160, flexShrink: 0 }}>
                        <Doughnut
                          data={sentimentData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            cutout: '60%',
                            plugins: {
                              legend: { display: false },
                              tooltip: { backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, titleColor: '#f1f5f9', bodyColor: '#94a3b8' },
                            },
                          }}
                        />
                      </div>
                      <div className="space-y-2 flex-1">
                        {[
                          { key: 'positive', label: 'Pozitif', pct: profile.sentiment.positive_pct, emoji: '😊' },
                          { key: 'negative', label: 'Negatif', pct: profile.sentiment.negative_pct, emoji: '😞' },
                          { key: 'neutral',  label: 'Nötr',    pct: profile.sentiment.neutral_pct,  emoji: '😐' },
                        ].map((s) => (
                          <div key={s.key} className="flex items-center gap-2">
                            <span className="text-base">{s.emoji}</span>
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${s.pct}%`, backgroundColor: SENTIMENT_COLORS[s.key] }}
                              />
                            </div>
                            <span className="text-xs font-bold w-10 text-right" style={{ color: SENTIMENT_COLORS[s.key] }}>
                              %{s.pct}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {lengthData && (
                  <div className="card">
                    <h3 className="section-title">📏 Mesaj Uzunluğu Dağılımı</h3>
                    <div style={{ height: 160 }}>
                      <Bar data={lengthData} options={CHART_DEFAULTS} />
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline */}
              {timelineData && (
                <div className="card">
                  <h3 className="section-title">📈 Aktivite Zaman Çizelgesi</h3>
                  <div style={{ height: 180 }}>
                    <Line data={timelineData} options={CHART_DEFAULTS} />
                  </div>
                </div>
              )}

              {/* Emojiler + En Sık Kelimeler */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {profile.emojis?.length > 0 && (
                  <div className="card">
                    <h3 className="section-title">😂 Kullandığı Emojiler</h3>
                    <div className="grid grid-cols-5 gap-2">
                      {profile.emojis.slice(0, 15).map((e, i) => (
                        <div key={i} className="bg-slate-700/50 rounded-xl p-2 text-center">
                          <p className="text-2xl leading-tight">{e.emoji}</p>
                          <p className="text-xs text-slate-400 mt-1">{e.count}</p>
                        </div>
                      ))}
                    </div>
                    {profile.emojis.length === 0 && (
                      <p className="text-slate-500 text-sm">Emoji kullanılmamış.</p>
                    )}
                  </div>
                )}

                <div className="card">
                  <h3 className="section-title">📝 En Sık Kelimeler</h3>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {profile.top_words?.slice(0, 15).map((w, i) => {
                      const max = profile.top_words[0]?.value || 1
                      return (
                        <div key={w.text} className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 w-4">{i + 1}</span>
                          <div className="flex-1 h-5 bg-slate-700 rounded overflow-hidden">
                            <div
                              className="h-full rounded flex items-center px-2"
                              style={{
                                width: `${(w.value / max) * 100}%`,
                                backgroundColor: COLORS[i % COLORS.length] + '60',
                              }}
                            >
                              <span className="text-xs font-medium text-slate-200 truncate">{w.text}</span>
                            </div>
                          </div>
                          <span className="text-xs text-slate-400 w-8 text-right">{w.value}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Hashtag'ler */}
              {profile.hashtags?.length > 0 && (
                <div className="card">
                  <h3 className="section-title"># Kullandığı Hashtag'ler</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.hashtags.map((h) => (
                      <span key={h.tag} className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-full text-sm font-medium">
                        {h.tag} <span className="text-purple-500/70 text-xs">{h.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* En Uzun Mesajlar */}
              {profile.top_messages?.length > 0 && (
                <div className="card">
                  <h3 className="section-title">📜 En Uzun Mesajlar</h3>
                  <div className="space-y-3">
                    {profile.top_messages.map((m, i) => (
                      <div key={i} className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs text-slate-500">{m.date} {m.time}</span>
                          <span className="ml-auto text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                            {m.length} karakter
                          </span>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed line-clamp-3">
                          {m.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
