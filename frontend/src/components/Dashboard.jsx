import { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import { MessageSquare, Users, Clock, Calendar, TrendingUp, Globe, Image } from 'lucide-react'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler
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
    x: {
      grid: { color: '#1e293b' },
      ticks: { color: '#64748b', maxRotation: 45 },
    },
    y: {
      grid: { color: '#1e293b' },
      ticks: { color: '#64748b' },
    },
  },
}

function StatCard({ icon: Icon, label, value, sub, color = 'text-green-400' }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400 text-sm font-medium">{label}</span>
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <p className={`stat-value ${color}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

function Skeleton({ className = 'h-40' }) {
  return <div className={`${className} bg-slate-700 rounded-xl animate-pulse`} />
}

export default function Dashboard({ data, loading }) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!data) return null

  const {
    total_messages, unique_users, avg_messages_per_day, total_words,
    avg_message_length, media_count, url_count, emoji_count,
    date_range, daily_activity = [], active_days = [],
    hourly_heatmap = [], monthly_trend = [],
  } = data

  // Günlük aktivite chart
  const dailyLabels = daily_activity.slice(-60).map((d) => d.date?.slice(5))
  const dailyCounts = daily_activity.slice(-60).map((d) => d.count)

  const dailyChartData = {
    labels: dailyLabels,
    datasets: [{
      label: 'Mesaj',
      data: dailyCounts,
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34,197,94,0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: dailyLabels.length > 40 ? 0 : 3,
      pointHoverRadius: 5,
    }],
  }

  // Günlere göre bar
  const dayLabels = active_days.map((d) => d.day)
  const dayCounts = active_days.map((d) => d.count)
  const maxDay = Math.max(...dayCounts, 1)

  const dayChartData = {
    labels: dayLabels,
    datasets: [{
      label: 'Mesaj',
      data: dayCounts,
      backgroundColor: dayCounts.map((c) =>
        c === maxDay ? 'rgba(34,197,94,0.8)' : 'rgba(34,197,94,0.35)'
      ),
      borderColor: 'rgba(34,197,94,0.5)',
      borderWidth: 1,
      borderRadius: 6,
    }],
  }

  // Aylık trend
  const monthLabels = monthly_trend.map((m) => m.month_year)
  const monthCounts = monthly_trend.map((m) => m.count)
  const monthChartData = {
    labels: monthLabels,
    datasets: [{
      label: 'Mesaj',
      data: monthCounts,
      backgroundColor: 'rgba(99,102,241,0.5)',
      borderColor: '#6366f1',
      borderWidth: 2,
      borderRadius: 4,
    }],
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-xl font-bold text-white">📊 Grup Geneli Analizi</h2>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={MessageSquare} label="Toplam Mesaj" value={total_messages?.toLocaleString('tr-TR')} />
        <StatCard icon={Users}         label="Aktif Kullanıcı" value={unique_users} color="text-blue-400" />
        <StatCard icon={TrendingUp}    label="Günlük Ort." value={avg_messages_per_day} sub="mesaj/gün" color="text-purple-400" />
        <StatCard icon={Clock}         label="Ort. Uzunluk" value={avg_message_length} sub="karakter" color="text-yellow-400" />
        <StatCard icon={Globe}         label="Toplam Kelime" value={total_words?.toLocaleString('tr-TR')} color="text-cyan-400" />
        <StatCard icon={Image}         label="Medya" value={media_count} color="text-pink-400" />
        <StatCard icon={Globe}         label="Link" value={url_count} color="text-orange-400" />
        <StatCard icon={MessageSquare} label="Emoji" value={emoji_count} color="text-yellow-300" />
      </div>

      {/* Tarih Aralığı */}
      {date_range?.start && (
        <div className="card flex items-center gap-3 text-sm">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400">Dönem:</span>
          <span className="text-slate-200 font-medium">
            {date_range.start} → {date_range.end}
          </span>
        </div>
      )}

      {/* Günlük Aktivite */}
      {dailyCounts.length > 0 && (
        <div className="card">
          <h3 className="section-title">📈 Günlük Mesaj Aktivitesi (Son 60 Gün)</h3>
          <div style={{ height: 240 }}>
            <Line
              data={dailyChartData}
              options={{
                ...CHART_DEFAULTS,
                plugins: {
                  ...CHART_DEFAULTS.plugins,
                  tooltip: {
                    ...CHART_DEFAULTS.plugins.tooltip,
                    callbacks: {
                      label: (ctx) => ` ${ctx.parsed.y} mesaj`,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      )}

      {/* Haftanın Günleri + Saatlik Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {active_days.length > 0 && (
          <div className="card">
            <h3 className="section-title">📅 Haftanın En Aktif Günleri</h3>
            <div style={{ height: 220 }}>
              <Bar data={dayChartData} options={CHART_DEFAULTS} />
            </div>
          </div>
        )}

        {hourly_heatmap.length > 0 && (
          <div className="card overflow-x-auto">
            <h3 className="section-title">🕐 Saatlik Aktivite Haritası</h3>
            <HourlyHeatmap data={hourly_heatmap} />
          </div>
        )}
      </div>

      {/* Aylık Trend */}
      {monthCounts.length > 1 && (
        <div className="card">
          <h3 className="section-title">📆 Aylık Mesaj Trendi</h3>
          <div style={{ height: 220 }}>
            <Bar data={monthChartData} options={CHART_DEFAULTS} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Hourly Heatmap ────────────────────────────────────────────────────────────
const DAYS_TR = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

function HourlyHeatmap({ data }) {
  const maxVal = useMemo(() => Math.max(...data.map((d) => d.count), 1), [data])

  // Build lookup: day → hour → count
  const lookup = useMemo(() => {
    const m = {}
    data.forEach(({ day, hour, count }) => {
      if (!m[day]) m[day] = {}
      m[day][hour] = count
    })
    return m
  }, [data])

  const getColor = (count) => {
    if (!count) return 'bg-slate-700'
    const ratio = count / maxVal
    if (ratio < 0.15) return 'bg-green-900/60'
    if (ratio < 0.35) return 'bg-green-700/70'
    if (ratio < 0.60) return 'bg-green-500/80'
    if (ratio < 0.80) return 'bg-green-400'
    return 'bg-green-300'
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        {/* Hour labels */}
        <div className="flex ml-20 mb-1">
          {[0,3,6,9,12,15,18,21].map((h) => (
            <div key={h} className="flex-1 text-center text-xs text-slate-500">{h}:00</div>
          ))}
        </div>

        {DAYS_TR.map((day) => (
          <div key={day} className="flex items-center gap-1 mb-1">
            <span className="w-20 text-xs text-slate-400 text-right pr-2 flex-shrink-0">{day}</span>
            <div className="flex gap-0.5 flex-1">
              {Array.from({ length: 24 }, (_, h) => {
                const count = lookup[day]?.[h] ?? 0
                return (
                  <div
                    key={h}
                    className={`flex-1 h-5 rounded-sm ${getColor(count)} transition-colors`}
                    title={`${day} ${h}:00 – ${count} mesaj`}
                  />
                )
              })}
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-2 mt-3 ml-20 text-xs text-slate-500">
          <span>Az</span>
          {['bg-slate-700', 'bg-green-900/60', 'bg-green-700/70', 'bg-green-500/80', 'bg-green-400', 'bg-green-300'].map((c, i) => (
            <div key={i} className={`w-4 h-4 rounded-sm ${c}`} />
          ))}
          <span>Çok</span>
        </div>
      </div>
    </div>
  )
}
