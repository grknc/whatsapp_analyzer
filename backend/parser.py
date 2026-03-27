import re
from datetime import datetime
from typing import List, Dict, Optional


# WhatsApp mesaj formatları için regex desenleri
# Grup 1=tarih, Grup 2=saat, Grup 3=kullanıcı, Grup 4=mesaj
PATTERNS = [
    # ── Köşeli parantezli formatlar ──────────────────────────────────────────
    # [18.01.2026, 13:12:45] GÜRKAN: Mesaj
    r'^\[(\d{1,2}[\/\.]\d{1,2}[\/\.]\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\]\s+([^:]+?):\s+(.*)',
    # [18.01.2026 13:12:45] GÜRKAN: Mesaj  (virgülsüz)
    r'^\[(\d{1,2}[\/\.]\d{1,2}[\/\.]\d{2,4})\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\]\s+([^:]+?):\s+(.*)',

    # ── Tire ayıraçlı formatlar (virgüllü) ───────────────────────────────────
    # 9/24/23, 10:45:32 AM - John: Merhaba
    r'^(\d{1,2}[\/\.]\d{1,2}[\/\.]\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\s+-\s+([^:]+?):\s+(.*)',

    # ── Boşluk ayıraçlı formatlar (VİRGÜLSÜZ) ──────────────────────────────
    # 18.01.2026 13:12 - GÜRKAN: Mesaj          ← KULLANICININ FORMATI
    r'^(\d{1,2}\.\d{1,2}\.\d{4})\s+(\d{1,2}:\d{2}(?::\d{2})?)\s+-\s+([^:]+?):\s+(.*)',
    # 18/01/2026 13:12 - GÜRKAN: Mesaj
    r'^(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2}(?::\d{2})?)\s+-\s+([^:]+?):\s+(.*)',
    # 18.01.26 13:12 - GÜRKAN: Mesaj  (2 haneli yıl)
    r'^(\d{1,2}\.\d{1,2}\.\d{2})\s+(\d{1,2}:\d{2}(?::\d{2})?)\s+-\s+([^:]+?):\s+(.*)',
    # 9/24/23 10:45 AM - John: Merhaba
    r'^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\s+-\s+([^:]+?):\s+(.*)',
]

DATE_FORMATS = [
    '%m/%d/%y', '%m/%d/%Y',
    '%d/%m/%y', '%d/%m/%Y',
    '%d.%m.%Y', '%d.%m.%y',
    '%m.%d.%Y', '%m.%d.%y',
]

TIME_FORMATS = [
    '%I:%M:%S %p', '%H:%M:%S',
    '%I:%M %p',   '%H:%M',
]

SYSTEM_MESSAGE_PATTERNS = [
    r'Messages and calls are end-to-end encrypted',
    r'security code (changed|was changed)',
    r'\b(added|removed|left|joined)\b',
    r'changed the (group|subject|icon|description)',
    r'created (group|this group)',
    r'You were added',
    r'<Media omitted>',
    r'image omitted',
    r'video omitted',
    r'audio omitted',
    r'sticker omitted',
    r'document omitted',
    r'Contact card omitted',
    r'This message was deleted',
    r'You deleted this message',
    r'Missed (voice|video) call',
    r'şifreleme|şifre kodu değişti',
    # Türkçe WhatsApp sistem mesajları
    r'Mesajlar ve aramalar uçtan uca',
    r'Bu grubu siz oluşturdunuz',
    r'grubu oluşturdu',
    r'kişisini ekledi',
    r'kişisini eklediniz',
    r'Bu mesajı sildiniz',
    r'bu mesajı sildi',
    r'gruba katıldı',
    r'gruptan ayrıldı',
    r'grup simgesi',
    r'grup adı değişti',
    r'güvenlik kodu',
    r'şifreleme bildirimi',
    r'sizi ekledi',
    r'sizi çıkardı',
    r'yönetici yapıldı',
    r'kişisini ekled',
    r'\u200e',  # invisible char sometimes used in system msgs
    # Konum paylaşımları (Almanca locale)
    r'^Ort:',
    r'^Standort',
    r'maps\.google\.com',
    r'maps\.apple\.com',
    r'goo\.gl/maps',
    # Medya/dosya bildirimleri
    r'\.jpg omitted',
    r'\.mp4 omitted',
    r'\.pdf omitted',
    r'\.opus omitted',
    r'GIF omitted',
    r'<angehängt',   # Almanca ekli dosya
]


def _parse_date(date_str: str) -> Optional[datetime]:
    date_str = date_str.strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None


def _parse_time(time_str: str) -> Optional[datetime]:
    time_str = time_str.strip()
    for fmt in TIME_FORMATS:
        try:
            return datetime.strptime(time_str, fmt)
        except ValueError:
            continue
    return None


def _is_system_message(message: str) -> bool:
    for pattern in SYSTEM_MESSAGE_PATTERNS:
        if re.search(pattern, message, re.IGNORECASE):
            return True
    return False


def parse_whatsapp_chat(content: str) -> List[Dict]:
    """
    WhatsApp sohbet dışa aktarma dosyasını parse eder.
    Desteklenen formatlar:
    - [9/24/23, 10:45:32 AM] John: Merhaba
    - 9/24/23, 10:45:32 AM - John: Merhaba
    - [24.09.2023, 10:45:32] John: Merhaba
    """
    # BOM ve unicode temizle
    content = content.lstrip('\ufeff').lstrip('\u200e').lstrip('\u200f')
    lines = content.split('\n')

    messages = []
    current_msg: Optional[Dict] = None

    for line in lines:
        line_stripped = line.rstrip()
        if not line_stripped:
            if current_msg:
                current_msg['message'] += '\n'
            continue

        matched = False
        for pattern in PATTERNS:
            m = re.match(pattern, line_stripped)
            if m:
                # Önceki mesajı kaydet
                if current_msg:
                    current_msg['message'] = current_msg['message'].strip()
                    messages.append(current_msg)

                date_str, time_str, user, message = m.groups()
                user = user.strip()

                parsed_date = _parse_date(date_str)
                parsed_time = _parse_time(time_str)

                dt = None
                if parsed_date and parsed_time:
                    try:
                        dt = datetime.combine(parsed_date.date(), parsed_time.time())
                    except Exception:
                        dt = None

                current_msg = {
                    'date': parsed_date.strftime('%Y-%m-%d') if parsed_date else date_str,
                    'time': time_str.strip(),
                    'datetime': dt.isoformat() if dt else None,
                    'datetime_obj': dt,
                    'user': user,
                    'message': message.strip(),
                    'day_of_week': parsed_date.strftime('%A') if parsed_date else None,
                    'hour': dt.hour if dt else None,
                    'week': dt.isocalendar()[1] if dt else None,
                    'month': parsed_date.month if parsed_date else None,
                    'year': parsed_date.year if parsed_date else None,
                }
                matched = True
                break

        if not matched and current_msg:
            # Önceki mesajın devamı
            current_msg['message'] += '\n' + line_stripped

    # Son mesajı ekle
    if current_msg:
        current_msg['message'] = current_msg['message'].strip()
        messages.append(current_msg)

    # Sistem mesajlarını ve bot mesajlarını filtrele
    filtered = []
    for msg in messages:
        if not msg['user']:
            continue
        if _is_system_message(msg['message']):
            continue
        # Anonim kullanıcıları filtrele
        if re.match(r'^[+\d\s\-()]+$', msg['user']) and len(msg['user']) > 10:
            # Telefon numarası kullanıcı adı - geçerli
            pass
        filtered.append({k: v for k, v in msg.items() if k != 'datetime_obj'})

    return filtered


def get_parse_stats(messages: List[Dict]) -> Dict:
    """Parse istatistikleri döndürür."""
    if not messages:
        return {'total': 0, 'users': [], 'date_range': None}

    users = list(set(m['user'] for m in messages))
    dates = [m['date'] for m in messages if m['date']]

    return {
        'total': len(messages),
        'unique_users': len(users),
        'users': users,
        'date_range': {
            'start': min(dates) if dates else None,
            'end': max(dates) if dates else None,
        }
    }
