import re
import json
import string
from collections import Counter
from typing import List, Dict, Any

import pandas as pd
import numpy as np

# NLTK lazy import
_nltk_ready = False

def _ensure_nltk():
    global _nltk_ready
    if _nltk_ready:
        return
    try:
        import nltk
        for pkg in ['vader_lexicon', 'stopwords', 'punkt', 'punkt_tab']:
            try:
                nltk.download(pkg, quiet=True)
            except Exception:
                pass
        _nltk_ready = True
    except Exception:
        pass


# Türkçe stop words
TURKISH_STOP_WORDS = {
    'bir', 've', 'bu', 'da', 'de', 'ile', 'için', 'ya', 'mi', 'mu', 'mü', 'mı',
    'ne', 'o', 'ki', 'ben', 'sen', 'biz', 'siz', 'onlar', 'ama', 'fakat', 'ancak',
    'çok', 'daha', 'en', 'her', 'hiç', 'bile', 'gibi', 'kadar', 'olan', 'oldu',
    'olur', 'olarak', 'var', 'yok', 'çünkü', 'nasıl', 'neden', 'hangi', 'bazı',
    'tüm', 'bütün', 'böyle', 'şöyle', 'şu', 'evet', 'hayır', 'tamam', 'tabii',
    'sanki', 'hep', 'artık', 'zaten', 'sadece', 'sadece', 'hem', 'ise', 'eğer',
    'yani', 'şimdi', 'sonra', 'önce', 'hiçbir', 'bazıları', 'aslında', 'belki',
    'acaba', 'çünkü', 'lakin', 'üzere', 'beraber', 'birlikte', 'karşı', 'göre',
    'bana', 'sana', 'ona', 'bize', 'size', 'onlara', 'benden', 'senden', 'ondan',
    'bizden', 'sizden', 'onlardan', 'bende', 'sende', 'onda', 'bizde', 'sizde',
    'ha', 'hı', 'ee', 'aa', 'yaa', 'lan', 'ya', 'be', 'abi', 'abla', 'hocam',
    'tamam', 'tamamdır', 'ok', 'okay', 'peki', 'iyiyim', 'iyi', 'güzel', 'harika',
    'olur', 'olmuş', 'olacak', 'oluyor', 'oluyordu', 'olsun', 'olsa',
    'değil', 'değildi', 'değildir', 'mi', 'mı', 'mu', 'mü', 'ki',
    'ile', 'den', 'dan', 'nin', 'nın', 'nun', 'nün', 'nın', 'ta', 'te', 'dır', 'dir',
    'geldi', 'geldim', 'gideceğim', 'gidelim', 'gel', 'git', 'bak', 'baktım',
    'dedim', 'dedi', 'dedin', 'dedik', 'diyorum', 'diyor', 'diyoruz',
}

GERMAN_STOP_WORDS = {
    # Yaygın Almanca kelimeler
    'der', 'die', 'das', 'und', 'in', 'ist', 'von', 'mit', 'den', 'dem',
    'ein', 'eine', 'einen', 'einer', 'einem', 'des', 'zu', 'auf', 'für',
    'sich', 'nicht', 'auch', 'an', 'als', 'am', 'aus', 'bei', 'nach',
    'wie', 'er', 'sie', 'wir', 'ich', 'du', 'es', 'man', 'hat', 'war',
    'sind', 'wird', 'haben', 'werden', 'kann', 'aber', 'oder', 'wenn',
    'noch', 'bis', 'dann', 'durch', 'immer', 'alle', 'mehr', 'nur',
    'schon', 'so', 'über', 'um', 'vor', 'sehr', 'zum', 'zur', 'da',
    'diese', 'diesem', 'diesen', 'dieser', 'dieses', 'hier', 'ihr',
    'keine', 'kein', 'waren', 'wurde', 'werden', 'worden', 'habe',
    # Konum ile ilgili Almanca kelimeler
    'vereinigte', 'staaten', 'bundesstaat', 'deutschland', 'bundesrepublik',
    'vereinigtes', 'königreich', 'standort', 'adresse', 'straße',
    'ort', 'stadt', 'land', 'nord', 'süd', 'west', 'ost',
}

ENGLISH_STOP_WORDS = {
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it',
    'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this',
    'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
    'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
    'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
    'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
    'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could',
    'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come',
    'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how',
    'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because',
    'any', 'these', 'give', 'day', 'most', 'us', 'i', 'am', 'are', 'was',
    'were', 'been', 'has', 'had', 'is', 'did', 'does', 'done', 'got',
    'yeah', 'ok', 'okay', 'lol', 'haha', 'oh', 'ah', 'yes', 'no', 'hi', 'hey',
}

ALL_STOP_WORDS = TURKISH_STOP_WORDS | ENGLISH_STOP_WORDS | GERMAN_STOP_WORDS


# Basit Türkçe duygu sözlüğü
TURKISH_SENTIMENT = {
    'positive': {
        'güzel', 'harika', 'mükemmel', 'süper', 'iyi', 'çok iyi', 'bravo', 'tebrikler',
        'seviyorum', 'sev', 'mutlu', 'mutluluk', 'sevinç', 'güldüm', 'kahkaha',
        'teşekkür', 'sağol', 'eyvallah', 'başarılı', 'başarı', 'kazandı', 'kazandık',
        'merhaba', 'selam', 'hoş', 'şahane', 'fevkalade', 'kusursuz', 'dahi',
        ':)', ':d', '😊', '😄', '🎉', '❤️', '👍', '💯', '🔥', '😍', '🥳', '😂',
        'güldürüyor', 'eğlenceli', 'eğlence', 'parti', 'kutlama',
    },
    'negative': {
        'kötü', 'berbat', 'rezalet', 'saçma', 'olmaz', 'yanlış', 'hata', 'hatalı',
        'üzgün', 'üzüntü', 'ağladım', 'ağladı', 'ağlıyor', 'korkuyorum', 'korku',
        'kızgın', 'sinirli', 'sinirlendim', 'nefret', 'nefret ediyorum',
        'sorun', 'problem', 'sıkıntı', 'yoruldum', 'yorgun', 'bıktım', 'bıkmak',
        'artık istemiyorum', 'olmadı', 'başaramadım', 'kaybettik', 'kaybetti',
        ':(', ':/', '😢', '😭', '😠', '😡', '💔', '👎', '😤', '😞', '🤮',
        'rezil', 'pis', 'çirkin', 'berbat', 'iğrenç', 'boktan',
    }
}


def build_dataframe(messages: List[Dict]) -> pd.DataFrame:
    """Mesajlardan DataFrame oluşturur."""
    if not messages:
        return pd.DataFrame()

    df = pd.DataFrame(messages)

    # datetime parse
    if 'datetime' in df.columns:
        df['datetime'] = pd.to_datetime(df['datetime'], errors='coerce')
        df['date'] = df['datetime'].dt.date
        df['hour'] = df['datetime'].dt.hour
        df['day_of_week'] = df['datetime'].dt.day_name()
        df['week'] = df['datetime'].dt.isocalendar().week
        df['month'] = df['datetime'].dt.month
        df['year'] = df['datetime'].dt.year
        df['month_year'] = df['datetime'].dt.to_period('M').astype(str)

    df['message_length'] = df['message'].astype(str).apply(len)
    df['word_count'] = df['message'].astype(str).apply(lambda x: len(x.split()))
    df['has_emoji'] = df['message'].astype(str).apply(_has_emoji)
    df['has_url'] = df['message'].astype(str).apply(
        lambda x: bool(re.search(r'https?://', x))
    )
    df['has_hashtag'] = df['message'].astype(str).apply(
        lambda x: bool(re.search(r'#\w+', x))
    )

    return df


def _has_emoji(text: str) -> bool:
    emoji_pattern = re.compile(
        "[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF"
        "\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF"
        "\U00002702-\U000027B0\U000024C2-\U0001F251]+",
        flags=re.UNICODE
    )
    return bool(emoji_pattern.search(text))


def get_group_analysis(df: pd.DataFrame) -> Dict[str, Any]:
    """Grup geneli analizi."""
    if df.empty:
        return {}

    # Günlük aktivite
    daily = df.groupby('date').size().reset_index(name='count')
    daily['date'] = daily['date'].astype(str)
    daily_list = daily.to_dict('records')

    # En aktif günler (day of week)
    dow_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    dow_tr = {
        'Monday': 'Pazartesi', 'Tuesday': 'Salı', 'Wednesday': 'Çarşamba',
        'Thursday': 'Perşembe', 'Friday': 'Cuma', 'Saturday': 'Cumartesi', 'Sunday': 'Pazar'
    }
    if 'day_of_week' in df.columns:
        dow = df.groupby('day_of_week').size().reindex(dow_order, fill_value=0)
        active_days = [
            {'day': dow_tr.get(d, d), 'day_en': d, 'count': int(c)}
            for d, c in dow.items()
        ]
    else:
        active_days = []

    # Saatlik dağılım (heatmap için 24x7)
    heatmap_data = []
    if 'hour' in df.columns and 'day_of_week' in df.columns:
        for hour in range(24):
            for day in dow_order:
                count = len(df[(df['hour'] == hour) & (df['day_of_week'] == day)])
                heatmap_data.append({
                    'hour': hour,
                    'day': dow_tr.get(day, day),
                    'day_en': day,
                    'count': int(count)
                })

    # Aylık trend
    monthly = []
    if 'month_year' in df.columns:
        monthly_g = df.groupby('month_year').size().reset_index(name='count')
        monthly = monthly_g.to_dict('records')

    # Medya istatistikleri
    media_count = df['message'].str.contains('<Media omitted>|omitted', case=False, na=False).sum()
    url_count = df['has_url'].sum() if 'has_url' in df.columns else 0
    emoji_count = df['has_emoji'].sum() if 'has_emoji' in df.columns else 0

    return {
        'total_messages': int(len(df)),
        'unique_users': int(df['user'].nunique()),
        'date_range': {
            'start': str(df['date'].min()) if 'date' in df.columns else None,
            'end': str(df['date'].max()) if 'date' in df.columns else None,
        },
        'avg_messages_per_day': round(float(df.groupby('date').size().mean()), 1) if 'date' in df.columns else 0,
        'total_words': int(df['word_count'].sum()) if 'word_count' in df.columns else 0,
        'avg_message_length': round(float(df['message_length'].mean()), 1) if 'message_length' in df.columns else 0,
        'media_count': int(media_count),
        'url_count': int(url_count),
        'emoji_count': int(emoji_count),
        'daily_activity': daily_list,
        'active_days': active_days,
        'hourly_heatmap': heatmap_data,
        'monthly_trend': monthly,
    }


def get_user_analysis(df: pd.DataFrame) -> Dict[str, Any]:
    """Kullanıcı bazında analiz."""
    if df.empty:
        return {'users': [], 'top5': []}

    total = len(df)
    user_stats = []

    for user, group in df.groupby('user'):
        avg_len = round(float(group['message_length'].mean()), 1) if 'message_length' in group.columns else 0
        avg_words = round(float(group['word_count'].mean()), 1) if 'word_count' in group.columns else 0
        count = len(group)

        # Favori saat
        fav_hour = None
        if 'hour' in group.columns:
            hour_counts = group['hour'].value_counts()
            if not hour_counts.empty:
                fav_hour = int(hour_counts.index[0])

        # En aktif gün
        fav_day = None
        if 'day_of_week' in group.columns:
            day_counts = group['day_of_week'].value_counts()
            if not day_counts.empty:
                fav_day = day_counts.index[0]

        user_stats.append({
            'user': user,
            'message_count': count,
            'percentage': round(count / total * 100, 1),
            'avg_message_length': avg_len,
            'avg_word_count': avg_words,
            'total_words': int(group['word_count'].sum()) if 'word_count' in group.columns else 0,
            'favorite_hour': fav_hour,
            'favorite_day': fav_day,
            'emoji_count': int(group['has_emoji'].sum()) if 'has_emoji' in group.columns else 0,
            'url_count': int(group['has_url'].sum()) if 'has_url' in group.columns else 0,
        })

    # Mesaj sayısına göre sırala
    user_stats.sort(key=lambda x: x['message_count'], reverse=True)

    # Top 5 pie chart verisi
    top5 = user_stats[:5]
    others_count = sum(u['message_count'] for u in user_stats[5:])
    top5_pie = [{'user': u['user'], 'count': u['message_count']} for u in top5]
    if others_count > 0:
        top5_pie.append({'user': 'Diğerleri', 'count': others_count})

    return {
        'users': user_stats,
        'top5_pie': top5_pie,
        'total_users': len(user_stats),
    }


def get_topic_analysis(df: pd.DataFrame) -> Dict[str, Any]:
    """Konu ve kelime analizi."""
    if df.empty:
        return {}

    _ensure_nltk()

    all_text = ' '.join(df['message'].astype(str).tolist()).lower()

    # Emojileri çıkar
    emoji_pattern = re.compile(
        "[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF"
        "\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF"
        "\U00002702-\U000027B0\U000024C2-\U0001F251]+",
        flags=re.UNICODE
    )

    # Emojileri say
    all_emojis = emoji_pattern.findall(all_text)
    emoji_counter = Counter(all_emojis)

    # Hashtag'leri çıkar
    hashtags = re.findall(r'#(\w+)', all_text)
    hashtag_counter = Counter(hashtags)

    # Kelimeleri temizle ve say
    clean_text = emoji_pattern.sub(' ', all_text)
    # URL'leri tamamen kaldır (konum linkleri dahil)
    clean_text = re.sub(r'https?://\S+', ' ', clean_text)
    clean_text = re.sub(r'www\.\S+', ' ', clean_text)
    # Konum paylaşımı metinlerini kaldır (Almanca/İngilizce)
    clean_text = re.sub(r'ort:\s*\S+', ' ', clean_text, flags=re.IGNORECASE)
    clean_text = re.sub(r'standort\s*\S+', ' ', clean_text, flags=re.IGNORECASE)
    clean_text = re.sub(r'location\s*\S+', ' ', clean_text, flags=re.IGNORECASE)
    # Hashtag, noktalama, rakam kaldır
    clean_text = re.sub(r'#\w+', ' ', clean_text)
    clean_text = re.sub(r'[^\w\s]', ' ', clean_text)
    clean_text = re.sub(r'\d+', ' ', clean_text)
    # Çok kısa kelimeleri kaldır (≤2 karakter)
    clean_text = re.sub(r'\b\w{1,2}\b', ' ', clean_text)

    words = [w.strip() for w in clean_text.split() if len(w.strip()) > 3]
    filtered_words = [w for w in words if w not in ALL_STOP_WORDS]
    word_counter = Counter(filtered_words)

    # Duygu analizi
    sentiment = _analyze_sentiment(df)

    # URL istatistikleri
    urls = re.findall(r'(https?://[^\s]+)', ' '.join(df['message'].tolist()))
    domains = []
    for url in urls:
        m = re.search(r'https?://(?:www\.)?([^/\s]+)', url)
        if m:
            domains.append(m.group(1))
    domain_counter = Counter(domains)

    # Trend timeline - haftalık kelime trendleri
    weekly_activity = []
    if 'week' in df.columns and 'year' in df.columns:
        try:
            wg = df.groupby(['year', 'week']).size().reset_index(name='count')
            weekly_activity = wg.to_dict('records')
        except Exception:
            pass

    return {
        'word_cloud': [
            {'text': w, 'value': c}
            for w, c in word_counter.most_common(80)
        ],
        'hashtags': [
            {'tag': f'#{t}', 'count': c}
            for t, c in hashtag_counter.most_common(30)
        ],
        'top_emojis': [
            {'emoji': e, 'count': c}
            for e, c in emoji_counter.most_common(20)
        ],
        'top_domains': [
            {'domain': d, 'count': c}
            for d, c in domain_counter.most_common(10)
        ],
        'sentiment': sentiment,
        'weekly_activity': weekly_activity,
        'total_unique_words': len(word_counter),
        'vocabulary_richness': round(len(word_counter) / max(len(filtered_words), 1), 4),
    }


def _analyze_sentiment(df: pd.DataFrame) -> Dict[str, Any]:
    """Duygu analizi (VADER + Türkçe sözlük)."""
    positive = 0
    negative = 0
    neutral = 0

    # VADER ile İngilizce duygu analizi dene
    vader_available = False
    sia = None
    try:
        from nltk.sentiment.vader import SentimentIntensityAnalyzer
        sia = SentimentIntensityAnalyzer()
        vader_available = True
    except Exception:
        pass

    for _, row in df.iterrows():
        msg = str(row.get('message', '')).lower()
        score = 0

        # Türkçe duygu analizi
        pos_hits = sum(1 for word in TURKISH_SENTIMENT['positive'] if word in msg)
        neg_hits = sum(1 for word in TURKISH_SENTIMENT['negative'] if word in msg)

        if pos_hits > neg_hits:
            score = 1
        elif neg_hits > pos_hits:
            score = -1

        # VADER ağırlığını da ekle
        if vader_available and sia:
            try:
                vs = sia.polarity_scores(msg)
                compound = vs['compound']
                if compound >= 0.05:
                    score = max(score, 1)
                elif compound <= -0.05:
                    score = min(score, -1)
            except Exception:
                pass

        if score > 0:
            positive += 1
        elif score < 0:
            negative += 1
        else:
            neutral += 1

    total = positive + negative + neutral
    return {
        'positive': positive,
        'negative': negative,
        'neutral': neutral,
        'positive_pct': round(positive / max(total, 1) * 100, 1),
        'negative_pct': round(negative / max(total, 1) * 100, 1),
        'neutral_pct': round(neutral / max(total, 1) * 100, 1),
        'overall': 'positive' if positive > negative else ('negative' if negative > positive else 'neutral'),
    }


def get_user_profile(df: pd.DataFrame, username: str) -> Dict[str, Any]:
    """Belirli bir kullanıcı için detaylı profil analizi."""
    _ensure_nltk()

    udf = df[df['user'] == username]
    if udf.empty:
        return {'error': f'Kullanıcı bulunamadı: {username}'}

    total_group = len(df)
    total_user  = len(udf)

    emoji_pattern = re.compile(
        "[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF"
        "\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF"
        "\U00002702-\U000027B0\U000024C2-\U0001F251]+",
        flags=re.UNICODE
    )

    all_text = ' '.join(udf['message'].astype(str).tolist()).lower()

    # Emojiler
    all_emojis = emoji_pattern.findall(all_text)
    emoji_counter = Counter(all_emojis)

    # Kelime bulutu
    clean = emoji_pattern.sub(' ', all_text)
    clean = re.sub(r'https?://\S+', ' ', clean)
    clean = re.sub(r'www\.\S+', ' ', clean)
    clean = re.sub(r'#\w+', ' ', clean)
    clean = re.sub(r'[^\w\s]', ' ', clean)
    clean = re.sub(r'\d+', ' ', clean)
    clean = re.sub(r'\b\w{1,3}\b', ' ', clean)
    words = [w for w in clean.split() if len(w) > 3 and w not in ALL_STOP_WORDS]
    word_counter = Counter(words)

    # Hashtag'ler
    hashtags = re.findall(r'#(\w+)', ' '.join(udf['message'].astype(str).tolist()).lower())
    hashtag_counter = Counter(hashtags)

    # Duygu analizi
    sentiment = _analyze_sentiment(udf)

    # Saatlik aktivite
    hourly = {}
    if 'hour' in udf.columns:
        for h in range(24):
            hourly[h] = int(len(udf[udf['hour'] == h]))

    # Günlük aktivite
    DOW_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
    DOW_TR = {'Monday':'Pazartesi','Tuesday':'Salı','Wednesday':'Çarşamba',
              'Thursday':'Perşembe','Friday':'Cuma','Saturday':'Cumartesi','Sunday':'Pazar'}
    daily_dow = {}
    if 'day_of_week' in udf.columns:
        for d in DOW_ORDER:
            daily_dow[DOW_TR[d]] = int(len(udf[udf['day_of_week'] == d]))

    # Aylık mesaj trendi
    monthly = []
    if 'month_year' in udf.columns:
        mg = udf.groupby('month_year').size().reset_index(name='count')
        monthly = mg.to_dict('records')

    # Günlük aktivite (zaman serisi - son 60 gün)
    daily_ts = []
    if 'date' in udf.columns:
        dg = udf.groupby('date').size().reset_index(name='count')
        dg['date'] = dg['date'].astype(str)
        daily_ts = dg.tail(60).to_dict('records')

    # Mesaj uzunluk dağılımı
    msg_lengths = udf['message_length'].tolist() if 'message_length' in udf.columns else []
    length_buckets = {'1-50': 0, '51-100': 0, '101-200': 0, '201-500': 0, '500+': 0}
    for l in msg_lengths:
        if l <= 50:    length_buckets['1-50'] += 1
        elif l <= 100: length_buckets['51-100'] += 1
        elif l <= 200: length_buckets['101-200'] += 1
        elif l <= 500: length_buckets['201-500'] += 1
        else:          length_buckets['500+'] += 1

    # En uzun mesajlar
    top_messages = (
        udf.nlargest(5, 'message_length')[['message', 'date', 'time', 'message_length']]
        .to_dict('records')
        if 'message_length' in udf.columns else []
    )

    # Yanıt süresi (yaklaşık) - kullanıcının grupta art arda mesaj attığı durumlar hariç
    response_hours = []
    if 'datetime' in df.columns:
        df_sorted = df.sort_values('datetime').reset_index(drop=True)
        df_sorted['datetime'] = pd.to_datetime(df_sorted['datetime'], errors='coerce')
        for i, row in df_sorted.iterrows():
            if row['user'] == username and i > 0:
                prev = df_sorted.iloc[i - 1]
                if prev['user'] != username and pd.notna(row['datetime']) and pd.notna(prev['datetime']):
                    diff = (row['datetime'] - prev['datetime']).total_seconds() / 3600
                    if 0 < diff < 24:
                        response_hours.append(round(diff, 2))

    avg_response = round(sum(response_hours) / len(response_hours), 2) if response_hours else None

    return {
        'user': username,
        'stats': {
            'message_count': total_user,
            'percentage': round(total_user / max(total_group, 1) * 100, 1),
            'avg_message_length': round(float(udf['message_length'].mean()), 1) if 'message_length' in udf.columns else 0,
            'avg_word_count': round(float(udf['word_count'].mean()), 1) if 'word_count' in udf.columns else 0,
            'total_words': int(udf['word_count'].sum()) if 'word_count' in udf.columns else 0,
            'total_emojis': len(all_emojis),
            'unique_emojis': len(emoji_counter),
            'url_count': int(udf['has_url'].sum()) if 'has_url' in udf.columns else 0,
            'avg_response_hours': avg_response,
            'date_range': {
                'start': str(udf['date'].min()) if 'date' in udf.columns else None,
                'end':   str(udf['date'].max()) if 'date' in udf.columns else None,
            },
        },
        'word_cloud': [{'text': w, 'value': c} for w, c in word_counter.most_common(60)],
        'top_words': [{'text': w, 'value': c} for w, c in word_counter.most_common(20)],
        'hashtags':  [{'tag': f'#{t}', 'count': c} for t, c in hashtag_counter.most_common(15)],
        'emojis':    [{'emoji': e, 'count': c} for e, c in emoji_counter.most_common(20)],
        'sentiment': sentiment,
        'hourly_activity': [{'hour': h, 'count': v} for h, v in hourly.items()],
        'daily_dow': [{'day': d, 'count': v} for d, v in daily_dow.items()],
        'monthly_trend': monthly,
        'daily_timeline': daily_ts,
        'length_distribution': [{'range': k, 'count': v} for k, v in length_buckets.items()],
        'top_messages': [
            {'message': m['message'][:200], 'date': str(m.get('date','')),
             'time': m.get('time',''), 'length': m.get('message_length', 0)}
            for m in top_messages
        ],
    }


def prepare_llm_summary(df: pd.DataFrame) -> str:
    """LLM'e gönderilecek özet hazırlar."""
    if df.empty:
        return "Mesaj verisi bulunamadı."

    group_stats = get_group_analysis(df)
    user_stats = get_user_analysis(df)
    topic_stats = get_topic_analysis(df)

    top_users = user_stats['users'][:5]
    top_words = topic_stats.get('word_cloud', [])[:20]
    sentiment = topic_stats.get('sentiment', {})

    summary = f"""
WhatsApp Grup Analiz Özeti:

GENEL İSTATİSTİKLER:
- Toplam mesaj: {group_stats.get('total_messages', 0)}
- Aktif kullanıcı: {group_stats.get('unique_users', 0)}
- Tarih aralığı: {group_stats.get('date_range', {}).get('start', 'N/A')} - {group_stats.get('date_range', {}).get('end', 'N/A')}
- Günlük ortalama mesaj: {group_stats.get('avg_messages_per_day', 0)}
- Toplam kelime: {group_stats.get('total_words', 0)}

EN AKTİF KULLANICILAR:
{chr(10).join(f"- {u['user']}: {u['message_count']} mesaj (%{u['percentage']})" for u in top_users)}

EN SIK KULLANILAN KELİMELER:
{', '.join(w['text'] for w in top_words)}

DUYGU ANALİZİ:
- Pozitif: %{sentiment.get('positive_pct', 0)}
- Negatif: %{sentiment.get('negative_pct', 0)}
- Nötr: %{sentiment.get('neutral_pct', 0)}
- Genel durum: {sentiment.get('overall', 'neutral')}

HASHTAG'LER:
{', '.join(h['tag'] for h in topic_stats.get('hashtags', [])[:10])}
"""
    return summary.strip()
