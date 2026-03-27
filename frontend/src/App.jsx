import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  uploadFile,
  getGroupAnalysis,
  getUserAnalysis,
  getTopicAnalysis,
  getSessionStatus,
  clearSession,
} from './api/client'

import UploadSection   from './components/UploadSection'
import APIKeyConfig    from './components/APIKeyConfig'
import Dashboard       from './components/Dashboard'
import UserAnalysis    from './components/UserAnalysis'
import TopicAnalysis   from './components/TopicAnalysis'
import LLMInsights     from './components/LLMInsights'
import UserProfile     from './components/UserProfile'

const TABS = [
  { id: 'upload',   label: '📂 Yükle'         },
  { id: 'group',    label: '📊 Grup Geneli'    },
  { id: 'users',    label: '👥 Kullanıcılar'   },
  { id: 'profile',  label: '👤 Kişi Profili'   },
  { id: 'topics',   label: '💬 Konular'        },
  { id: 'llm',      label: '🤖 AI Insights'    },
]

export default function App() {
  const [activeTab, setActiveTab]       = useState('upload')
  const [hasData, setHasData]           = useState(false)
  const [loading, setLoading]           = useState(false)
  const [uploadStats, setUploadStats]   = useState(null)

  const [groupData, setGroupData]       = useState(null)
  const [userData,  setUserData]        = useState(null)
  const [topicData, setTopicData]       = useState(null)

  const [llmConfig, setLlmConfig] = useState({
    llm_type: 'openai',
    api_key: '',
    model: '',
    qwen_url: 'http://localhost:11434',
  })

  // Oturum durumunu kontrol et
  useEffect(() => {
    getSessionStatus()
      .then((r) => {
        if (r.data.has_data) {
          setHasData(true)
          loadAllData()
        }
      })
      .catch(() => {})
  }, [])

  const loadAllData = useCallback(async () => {
    try {
      const [g, u, t] = await Promise.all([
        getGroupAnalysis(),
        getUserAnalysis(),
        getTopicAnalysis(),
      ])
      setGroupData(g.data)
      setUserData(u.data)
      setTopicData(t.data)
    } catch (err) {
      toast.error('Analiz yüklenemedi: ' + err.message)
    }
  }, [])

  const handleUpload = async (file) => {
    setLoading(true)
    try {
      const res = await uploadFile(file)
      setUploadStats(res.data.stats)
      setHasData(true)
      toast.success(res.data.message)
      await loadAllData()
      setActiveTab('group')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    try {
      await clearSession()
      setHasData(false)
      setGroupData(null)
      setUserData(null)
      setTopicData(null)
      setUploadStats(null)
      setActiveTab('upload')
      toast.success('Oturum temizlendi.')
    } catch {
      toast.error('Temizleme başarısız.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center text-lg shadow-lg shadow-green-500/30">
              💬
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">WhatsApp Grup Analizci</h1>
              <p className="text-xs text-slate-400">Sohbet geçmişinizi keşfedin</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasData && uploadStats && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                {uploadStats.total?.toLocaleString('tr-TR')} mesaj
              </span>
            )}
            {hasData && (
              <button onClick={handleClear} className="btn-secondary text-sm py-1.5 px-3">
                🗑 Temizle
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={tab.id !== 'upload' && !hasData}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''} ${
                tab.id !== 'upload' && !hasData ? 'opacity-30 cursor-not-allowed' : ''
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'upload' && (
          <div className="animate-fade-in space-y-6">
            <UploadSection onUpload={handleUpload} loading={loading} uploadStats={uploadStats} />
            <APIKeyConfig config={llmConfig} onChange={setLlmConfig} />
          </div>
        )}

        {activeTab === 'group' && hasData && (
          <div className="animate-fade-in">
            <Dashboard data={groupData} loading={!groupData} />
          </div>
        )}

        {activeTab === 'users' && hasData && (
          <div className="animate-fade-in">
            <UserAnalysis data={userData} loading={!userData} />
          </div>
        )}

        {activeTab === 'profile' && hasData && (
          <div className="animate-fade-in">
            <UserProfile userData={userData} />
          </div>
        )}

        {activeTab === 'topics' && hasData && (
          <div className="animate-fade-in">
            <TopicAnalysis data={topicData} loading={!topicData} />
          </div>
        )}

        {activeTab === 'llm' && hasData && (
          <div className="animate-fade-in">
            <LLMInsights config={llmConfig} groupData={groupData} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-slate-600 border-t border-slate-800 mt-10">
        WhatsApp Grup Analizci • Verileriniz tarayıcınızda kalır
      </footer>
    </div>
  )
}
