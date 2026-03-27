import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import clsx from 'clsx'

export default function UploadSection({ onUpload, loading, uploadStats }) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileError, setFileError] = useState('')

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setFileError('')
    if (rejectedFiles.length > 0) {
      setFileError('Sadece .txt dosyaları kabul edilir.')
      return
    }
    const file = acceptedFiles[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) {
      setFileError('Dosya 50 MB sınırını aşıyor.')
      return
    }
    setSelectedFile(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/plain': ['.txt'] },
    multiple: false,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  })

  const handleAnalyze = () => {
    if (selectedFile && !loading) {
      onUpload(selectedFile)
    }
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">WhatsApp Sohbetini Analiz Et</h2>
        <p className="text-slate-400 text-sm">
          WhatsApp'tan dışa aktardığınız .txt dosyasını yükleyin
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200',
          isDragActive || dragActive
            ? 'border-green-400 bg-green-500/10 scale-[1.01]'
            : selectedFile
            ? 'border-green-500/50 bg-green-500/5'
            : 'border-slate-600 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800'
        )}
      >
        <input {...getInputProps()} />

        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-12 h-12 text-green-400 animate-spin" />
            <p className="text-slate-300 font-medium">Analiz ediliyor…</p>
          </div>
        ) : selectedFile ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-green-500/20 rounded-2xl flex items-center justify-center">
              <FileText className="w-7 h-7 text-green-400" />
            </div>
            <div>
              <p className="text-white font-semibold">{selectedFile.name}</p>
              <p className="text-slate-400 text-sm">{formatSize(selectedFile.size)}</p>
            </div>
            <p className="text-xs text-slate-500">Farklı bir dosya için tıkla veya sürükle</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-slate-700 rounded-2xl flex items-center justify-center">
              <Upload className="w-7 h-7 text-slate-400" />
            </div>
            <div>
              <p className="text-slate-200 font-semibold">Dosyayı buraya sürükle</p>
              <p className="text-slate-400 text-sm mt-1">veya tıklayarak seç</p>
            </div>
            <div className="flex gap-2 mt-1">
              <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-md">.txt</span>
              <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-md">Max 50 MB</span>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {fileError && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {fileError}
        </div>
      )}

      {/* Analyze Button */}
      {selectedFile && !loading && (
        <button onClick={handleAnalyze} className="btn-primary w-full py-3 text-base">
          🔍 Analizi Başlat
        </button>
      )}

      {/* Success Stats */}
      {uploadStats && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-semibold">Analiz Tamamlandı!</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Toplam Mesaj', value: uploadStats.total?.toLocaleString('tr-TR') },
              { label: 'Kullanıcı',   value: uploadStats.unique_users },
              { label: 'Başlangıç',   value: uploadStats.date_range?.start?.slice(0, 7) || '—' },
              { label: 'Bitiş',       value: uploadStats.date_range?.end?.slice(0, 7) || '—' },
            ].map((s) => (
              <div key={s.label} className="bg-slate-800 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-green-400">{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How-to Guide */}
      <div className="card mt-2">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">📱 WhatsApp'tan Nasıl Dışa Aktarılır?</h3>
        <ol className="text-sm text-slate-400 space-y-1.5 list-decimal list-inside">
          <li>WhatsApp'ta grubu açın</li>
          <li>Sağ üstteki 3 nokta → <strong className="text-slate-300">Diğer</strong></li>
          <li><strong className="text-slate-300">Sohbeti Dışa Aktar</strong> seçin</li>
          <li><strong className="text-slate-300">Medyasız</strong> seçin → .txt dosyasını kaydedin</li>
          <li>Dosyayı yukarıya sürükleyin</li>
        </ol>
      </div>
    </div>
  )
}
