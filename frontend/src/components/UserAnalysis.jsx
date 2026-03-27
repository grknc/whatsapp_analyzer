import { useState, useMemo } from 'react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import { Search, Crown, Clock, MessageSquare } from 'lucide-react'

ChartJS.register(ArcElement, Tooltip, Legend)

const COLORS = [
  '#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
]

const HOURS_TR = (h) => {
  if (h === null || h === undefined) return '—'
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 || 12
  return `${h12}:00 ${ampm}`
}

const DAYS_TR = {
  Monday: 'Pzt', Tuesday: 'Sal', Wednesday: 'Çar', Thursday: 'Per',
  Friday: 'Cum', Saturday: 'Cmt', Sunday: 'Paz',
}

function Skeleton({ className = 'h-40' }) {
  return <div className={`${className} bg-slate-700 rounded-xl animate-pulse`} />
}

export default function UserAnalysis({ data, loading }) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('message_count')
  const [page, setPage] = useState(0)
  const PER_PAGE = 15

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!data) return null

  const { users = [], top5_pie = [], total_users = 0 } = data

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return users
      .filter((u) => u.user.toLowerCase().includes(q))
      .sort((a, b) => b[sortBy] - a[sortBy])
  }, [users, search, sortBy])

  const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  // Pie chart
  const pieData = {
    labels: top5_pie.map((u) => u.user),
    datasets: [{
      data: top5_pie.map((u) => u.count),
      backgroundColor: COLORS.slice(0, top5_pie.length),
      borderColor: '#0f172a',
      borderWidth: 3,
      hoverBorderWidth: 4,
    }],
  }

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#94a3b8',
          font: { size: 12 },
          padding: 12,
          boxWidth: 14,
        },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${ctx.parsed.toLocaleString('tr-TR')} mesaj`,
        },
      },
    },
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">👥 Kullanıcı Analizi</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 5 Pie */}
        <div className="card">
          <h3 className="section-title">🏆 Top 5 Kullanıcı</h3>
          <div style={{ height: 260 }}>
            <Doughnut data={pieData} options={pieOptions} />
          </div>
        </div>

        {/* Top 3 Podium */}
        <div className="card lg:col-span-2">
          <h3 className="section-title">🥇 Podyum</h3>
          <div className="flex items-end justify-center gap-4 h-[220px]">
            {[1, 0, 2].map((rank) => {
              const u = users[rank]
              if (!u) return null
              const heights = ['h-32', 'h-44', 'h-24']
              const emojis = ['🥈', '🥇', '🥉']
              const colors = [
                'from-slate-500 to-slate-400',
                'from-green-600 to-green-400',
                'from-amber-700 to-amber-500',
              ]
              const positions = [1, 0, 2]
              const idx = positions.indexOf(rank)

              return (
                <div key={rank} className="flex flex-col items-center gap-2">
                  {rank === 0 && <Crown className="w-6 h-6 text-yellow-400" />}
                  <div className="text-center">
                    <p className="text-xs text-slate-300 font-medium max-w-[90px] truncate">
                      {u.user.split(' ')[0]}
                    </p>
                    <p className="text-xs text-green-400">{u.message_count.toLocaleString('tr-TR')}</p>
                    <p className="text-xs text-slate-500">%{u.percentage}</p>
                  </div>
                  <div
                    className={`${heights[idx]} w-16 bg-gradient-to-t ${colors[idx]} rounded-t-xl
                                flex items-end justify-center pb-2 text-lg font-bold text-white`}
                  >
                    {emojis[idx]}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              className="input-field pl-9"
              placeholder="Kullanıcı ara…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            />
          </div>
          <select
            className="input-field sm:w-48"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="message_count">Mesaj Sayısı</option>
            <option value="avg_message_length">Ort. Uzunluk</option>
            <option value="total_words">Toplam Kelime</option>
            <option value="emoji_count">Emoji</option>
          </select>
        </div>

        <p className="text-xs text-slate-500 mb-3">{filtered.length} kullanıcı</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-left">
                <th className="pb-2 pr-4 w-8">#</th>
                <th className="pb-2 pr-4 min-w-[120px]">Kullanıcı</th>
                <th className="pb-2 pr-4 text-right">Mesaj</th>
                <th className="pb-2 pr-4 text-right">%</th>
                <th className="pb-2 pr-4 text-right">Ort. Uzunluk</th>
                <th className="pb-2 pr-4 text-right">Kelime</th>
                <th className="pb-2 pr-4 text-right">Emoji</th>
                <th className="pb-2 pr-4 text-right hidden md:table-cell">Fav. Saat</th>
                <th className="pb-2 text-right hidden md:table-cell">Fav. Gün</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((u, i) => {
                const globalRank = page * PER_PAGE + i
                const color = COLORS[globalRank % COLORS.length]
                return (
                  <tr
                    key={u.user}
                    className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="py-2.5 pr-4 text-slate-500 text-xs">{globalRank + 1}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: color + '30', color }}
                        >
                          {u.user[0]?.toUpperCase()}
                        </div>
                        <span className="truncate max-w-[120px] text-slate-200">{u.user}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-right font-semibold text-green-400">
                      {u.message_count.toLocaleString('tr-TR')}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="hidden sm:block w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${u.percentage}%` }}
                          />
                        </div>
                        <span className="text-slate-300">{u.percentage}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-right text-slate-300">{u.avg_message_length}</td>
                    <td className="py-2.5 pr-4 text-right text-slate-300">{u.total_words?.toLocaleString('tr-TR')}</td>
                    <td className="py-2.5 pr-4 text-right text-yellow-400">{u.emoji_count}</td>
                    <td className="py-2.5 pr-4 text-right text-slate-400 hidden md:table-cell text-xs">
                      {HOURS_TR(u.favorite_hour)}
                    </td>
                    <td className="py-2.5 text-right text-slate-400 hidden md:table-cell text-xs">
                      {DAYS_TR[u.favorite_day] || u.favorite_day || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700">
            <span className="text-xs text-slate-500">
              Sayfa {page + 1} / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-30"
              >
                ← Önceki
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages - 1}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-30"
              >
                Sonraki →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
