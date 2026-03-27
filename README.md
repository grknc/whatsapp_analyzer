# WhatsApp Grup Analizci

WhatsApp grup sohbet geçmişinizi analiz eden full-stack uygulama.

## Özellikler

- **Drag & Drop Yükleme** — WhatsApp .txt dışa aktarma dosyasını sürükle bırak
- **Grup İstatistikleri** — Günlük aktivite, haftanın günleri, saatlik heatmap, aylık trend
- **Kullanıcı Analizi** — Mesaj sayısı, yüzde, ortalama uzunluk, favori saat/gün, top 5 pie chart
- **Konu Analizi** — Kelime bulutu, hashtag, emoji, duygu analizi, paylaşılan siteler
- **AI Insights** — OpenAI, Claude veya yerel Qwen ile detaylı grup analizi

## Kurulum

### Hızlı Başlangıç (Windows)
```
start.bat
```

### Manuel Kurulum

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python app.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Uygulama: http://localhost:5173

## WhatsApp'tan Dışa Aktarma

1. WhatsApp → Grup → 3 Nokta → **Diğer** → **Sohbeti Dışa Aktar**
2. **Medyasız** seçin
3. .txt dosyasını kaydedin ve uygulamaya yükleyin

## Desteklenen Formatlar

```
[9/24/23, 10:45:32 AM] John: Merhaba
9/24/23, 10:45:32 AM - John: Merhaba
[24.09.2023, 10:45:32] John: Merhaba
```

## AI Entegrasyonu

| Sağlayıcı | Model | Gereksinim |
|-----------|-------|-----------|
| OpenAI | GPT-4o, GPT-4 Turbo | API Key |
| Claude | claude-opus-4-6, claude-sonnet-4-6 | API Key |
| Lokal Qwen | qwen2.5:7b + Ollama | Ollama kurulu |

### Ollama Kurulumu (Lokal Qwen için)
```bash
# Ollama indir: https://ollama.ai
ollama pull qwen2.5:7b
ollama serve
```

## Teknoloji

- **Backend:** Python, Flask, pandas, NLTK, scikit-learn
- **Frontend:** React, Vite, Tailwind CSS, Chart.js, react-wordcloud
- **NLP:** NLTK VADER + Türkçe duygu sözlüğü
