# WhatsApp Grup Analizci

WhatsApp grup sohbet geçmişinizi yükleyin; grup dinamiklerini, kullanıcı istatistiklerini, konu analizini ve AI destekli içgörüleri keşfedin.

---

## Özellikler

- **Drag & Drop Yükleme** — WhatsApp `.txt` dışa aktarma dosyasını sürükle bırak
- **Grup İstatistikleri** — Günlük aktivite, saatlik heatmap (24×7), haftanın günleri dağılımı, aylık trend
- **Kullanıcı Analizi** — Mesaj sayısı/yüzdesi, ortalama mesaj uzunluğu, favori saat ve gün, top 5 pasta grafiği
- **Kişi Profili** — Tek kullanıcıya ait kelime bulutu, duygu analizi, yanıt süresi tahmini, emoji/hashtag kullanımı
- **Konu Analizi** — Kelime bulutu, hashtag sıklığı, emoji analizi, paylaşılan alan adları, Türkçe/İngilizce duygu analizi
- **AI Insights** — OpenAI, Claude (Anthropic) veya yerel Qwen ile detaylı grup dinamiği analizi

---

## WhatsApp'tan Veriyi Dışa Aktarma

### Android

1. WhatsApp'ı açın → ilgili **grubu** seçin
2. Sağ üstteki **⋮ (üç nokta)** menüsüne dokunun
3. **Diğer** → **Sohbeti dışa aktar** seçin
4. **Medyasız** seçeneğini tercih edin
5. Paylaşım ekranında dosyayı **bilgisayarınıza** gönderin (e-posta, Google Drive vb.)

### iOS (iPhone)

1. WhatsApp'ı açın → ilgili **grubu** seçin
2. Grup adına dokunarak **Grup Bilgisi**'ne girin
3. En alta kaydırın → **Sohbeti Dışa Aktar** seçin
4. **Medyasız** seçeneğini tercih edin
5. Paylaşım sayfasından dosyayı bilgisayarınıza aktarın

> **Not:** Dışa aktarılan dosya `.txt` formatındadır. Sıkıştırılmış `.zip` gelirse içinden `.txt` dosyasını çıkarın.

---

## Desteklenen Formatlar

Parser 7'den fazla WhatsApp tarih/saat biçimini otomatik tanır:

| Format | Örnek |
|--------|-------|
| Köşeli parantez + nokta | `[18.01.2026, 13:12:45] Ali: Merhaba` |
| Köşeli parantez + eğik çizgi | `[9/24/23, 10:45:32 AM] Ali: Merhaba` |
| Tire ayıraçlı + virgül | `9/24/23, 10:45:32 AM - Ali: Merhaba` |
| Boşluk + tire | `18.01.2026 13:12 - Ali: Merhaba` |
| Avrupa tarihi (GG.AA.YYYY) | `24.09.2023, 10:45 - Ali: Merhaba` |
| ABD tarihi (AA/GG/YYYY) | `09/24/2023, 10:45 AM - Ali: Hi` |
| Saniyesiz format | `18.01.2026, 13:12 - Ali: Merhaba` |

Sistem mesajları (katılma, ayrılma, medya eklendi vb.) otomatik olarak filtrelenir.

---

## Yerel Kurulum

### Gereksinimler

- Python 3.10+
- Node.js 18+
- npm 9+

### 1. Depoyu Klonlayın

```bash
git clone https://github.com/kullanici-adi/whatsapp-analyzer.git
cd whatsapp-analyzer
```

### 2. Backend Kurulumu

```bash
cd backend
pip install -r requirements.txt
```

`.env` dosyasını oluşturun:

```bash
cp ../.env.example .env
```

`.env` içeriği:

```env
SECRET_KEY=gizli-anahtar-buraya-yazin
PRODUCTION=false
```

Backend'i başlatın:

```bash
python app.py
# → http://127.0.0.1:5000 adresinde çalışır
```

### 3. Frontend Kurulumu

Yeni bir terminal açın:

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173 adresinde çalışır
```

### 4. Uygulamaya Erişin

Tarayıcınızda [http://localhost:5173](http://localhost:5173) adresine gidin.

> **Not:** Frontend, geliştirme modunda API isteklerini otomatik olarak `http://127.0.0.1:5000` adresine proxy'ler. Her iki servisi aynı anda çalıştırmanız gerekir.

### Hızlı Başlangıç (Windows)

Tüm adımları tek komutla çalıştırmak için:

```bat
start.bat
```

---

## Render Üzerinde Deploy

### Ön Hazırlık

1. [Render.com](https://render.com) hesabı oluşturun
2. GitHub reponuzu Render'a bağlayın
3. Projenin kök dizininde `render.yaml` ve `Procfile` dosyaları mevcut olduğunu doğrulayın

### Frontend Build (üretim için)

Render'a deploy etmeden önce React uygulamasını derleyin:

```bash
cd frontend
npm install
npm run build
# → Derleme çıktısı backend/static/ klasörüne yazılır
# → Flask bu klasörü otomatik olarak serve eder
```

### Render'da Servis Oluşturma

#### Otomatik (render.yaml ile)

Repo kökündeki `render.yaml` dosyası zaten yapılandırılmıştır. Render dashboard'unda **"New → Blueprint"** seçerek repoyu bağlayın; Render geri kalanını otomatik yapar.

#### Manuel Adımlar

1. Render Dashboard → **New → Web Service**
2. GitHub reponuzu seçin
3. Aşağıdaki ayarları yapın:

| Alan | Değer |
|------|-------|
| **Environment** | Python |
| **Root Directory** | `backend` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn app:app` |
| **Python Version** | `3.10.0` (runtime.txt'ten alınır) |

4. **Environment Variables** bölümüne şunları ekleyin:

| Değişken | Değer |
|----------|-------|
| `SECRET_KEY` | Güçlü ve rastgele bir anahtar |
| `PRODUCTION` | `true` |

5. **Deploy** butonuna tıklayın

### Deploy Sonrası

- Render size bir URL verir (örn. `https://whatsapp-analyzer.onrender.com`)
- Flask hem API'yi hem de derlenmiş React frontend'ini bu URL üzerinden serve eder
- Ücretsiz planda ilk istek yavaş gelebilir (cold start); birkaç saniye bekleyin

> **Önemli:** Render ücretsiz planında servis uzun süre kullanılmazsa uyku moduna geçer. Üretim kullanımı için ücretli plan önerilir.

---

## AI Entegrasyonu

Uygulama üç farklı LLM sağlayıcısını destekler. API anahtarını **uygulama arayüzünden** girebilirsiniz; kayıt edilmez.

### Desteklenen Sağlayıcılar

| Sağlayıcı | Model Seçenekleri | Gereksinim |
|-----------|-------------------|-----------|
| **OpenAI** | GPT-4o, GPT-4 Turbo | OpenAI API anahtarı |
| **Anthropic (Claude)** | claude-opus-4-6, claude-sonnet-4-6 | Anthropic API anahtarı |
| **Lokal Qwen** | qwen2.5:7b (Ollama) | Ollama kurulumu (ücretsiz) |

### OpenAI API Anahtarı Edinme

1. [platform.openai.com](https://platform.openai.com) → **API Keys** → **Create new secret key**
2. Anahtarı kopyalayın ve uygulamaya yapıştırın

### Anthropic (Claude) API Anahtarı Edinme

1. [console.anthropic.com](https://console.anthropic.com) → **API Keys** → **Create Key**
2. Anahtarı kopyalayın ve uygulamaya yapıştırın

### Ollama ile Yerel Qwen (Ücretsiz, API Anahtarı Gerektirmez)

```bash
# 1. Ollama'yı yükleyin: https://ollama.com/download
# 2. Modeli çekin
ollama pull qwen2.5:7b

# 3. Ollama sunucusunu başlatın
ollama serve
# → http://localhost:11434 adresinde çalışır
```

Uygulamada **"Lokal Qwen"** seçeneğini seçin ve Ollama URL'sini (varsayılan: `http://localhost:11434`) girin.

### AI Ne Analiz Eder?

- Grup dinamikleri ve iletişim örüntüleri
- En aktif / en pasif üyeler
- Konuşma akışı ve tepki süreleri
- Olası iletişim sorunları veya riskler
- Türkçe öneriler ve öngörüler

---

## Teknoloji Altyapısı

### Backend

| Teknoloji | Sürüm | Kullanım Amacı |
|-----------|-------|---------------|
| Python | 3.10+ | Ana dil |
| Flask | latest | Web framework, REST API |
| flask-cors | latest | CORS middleware |
| pandas | latest | Veri işleme ve analiz |
| numpy | latest | Sayısal hesaplama |
| NLTK | latest | Duygu analizi (VADER) |
| scikit-learn | latest | Makine öğrenmesi yardımcıları |
| openai | latest | OpenAI API istemcisi |
| anthropic | latest | Claude API istemcisi |
| gunicorn | latest | Üretim WSGI sunucusu |
| python-dotenv | latest | Ortam değişkeni yönetimi |

### Frontend

| Teknoloji | Sürüm | Kullanım Amacı |
|-----------|-------|---------------|
| React | 18.3 | UI framework |
| Vite | 5.2 | Bundler ve geliştirme sunucusu |
| Tailwind CSS | 3.4 | Stil sistemi |
| Chart.js + react-chartjs-2 | 4.4 | Grafik ve heatmap |
| Axios | 1.6 | HTTP istemcisi |
| react-dropzone | 14.2 | Dosya yükleme |
| lucide-react | latest | İkon seti |
| react-hot-toast | 2.4 | Bildirim sistemi |

### NLP ve Analiz

- **NLTK VADER** — İngilizce duygu analizi
- **Özel Türkçe Duygu Sözlüğü** — Türkçe pozitif/negatif kelime ve emoji listesi
- **Stop Word Filtreleme** — Türkçe, İngilizce, Almanca (83+ kelime her dil için)
- **Regex Tabanlı Parser** — 7+ WhatsApp format desteği

### Mimari

```
Geliştirme Ortamı:
  Tarayıcı ←→ Vite (5173) ──proxy──→ Flask (5000)

Üretim Ortamı (Render):
  Tarayıcı ←→ Flask (gunicorn) → backend/static/ (React build)
```

- Oturum tabanlı durum yönetimi (veritabanı yok, bellek içi depolama)
- React üretim build'i `backend/static/` klasörüne yazılır, Flask hem API hem statik dosyaları serve eder

---

## Lisans

MIT
