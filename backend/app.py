import os
import json
import uuid
import tempfile
from pathlib import Path

from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

from parser import parse_whatsapp_chat, get_parse_stats
from analysis import build_dataframe, get_group_analysis, get_user_analysis, get_topic_analysis, prepare_llm_summary, get_user_profile
from llm_integration import get_llm_insights

# ─── App Setup ────────────────────────────────────────────────────────────────
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path="")
app.secret_key = os.environ.get("SECRET_KEY", "whatsapp-analyzer-dev-secret-2024")
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50 MB

IS_PRODUCTION = os.environ.get("RENDER") or os.environ.get("RAILWAY_ENVIRONMENT") or os.environ.get("PRODUCTION")

if IS_PRODUCTION:
    CORS(app, supports_credentials=True)          # tüm originlere izin (aynı domain)
else:
    CORS(app, supports_credentials=True, origins=["http://localhost:5173", "http://127.0.0.1:5173"])

# ─── In-Memory Storage ────────────────────────────────────────────────────────
# session_id → {messages, dataframe}
_store: dict = {}

ALLOWED_EXTENSIONS = {"txt"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def get_session_id() -> str:
    """Mevcut veya yeni session ID döndürür."""
    sid = session.get("session_id")
    if not sid:
        sid = str(uuid.uuid4())
        session["session_id"] = sid
    return sid


def get_df(sid: str):
    """Stored DataFrame döndür."""
    entry = _store.get(sid)
    if not entry:
        return None
    return entry.get("df")


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "version": "1.0.0"})


@app.route("/upload", methods=["POST"])
def upload_file():
    """
    POST /upload
    Multipart: file=<.txt>
    Returns: session_id, parse stats
    """
    if "file" not in request.files:
        return jsonify({"error": "Dosya bulunamadı. 'file' alanını gönderin."}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Dosya seçilmedi."}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Sadece .txt dosyaları desteklenir."}), 400

    try:
        content = file.read().decode("utf-8", errors="replace")
    except Exception as e:
        return jsonify({"error": f"Dosya okunamadı: {str(e)}"}), 400

    if len(content.strip()) < 50:
        return jsonify({"error": "Dosya çok kısa veya boş görünüyor."}), 400

    # Parse et
    try:
        messages = parse_whatsapp_chat(content)
    except Exception as e:
        return jsonify({"error": f"Parse hatası: {str(e)}"}), 500

    if not messages:
        return jsonify({
            "error": "Mesaj parse edilemedi. Dosya formatını kontrol edin. "
                     "Desteklenen format: [9/24/23, 10:45:32 AM] Kullanıcı: Mesaj"
        }), 422

    # DataFrame oluştur ve kaydet
    df = build_dataframe(messages)
    sid = get_session_id()
    _store[sid] = {"messages": messages, "df": df}

    stats = get_parse_stats(messages)
    return jsonify({
        "success": True,
        "session_id": sid,
        "stats": stats,
        "message": f"{stats['total']} mesaj başarıyla yüklendi.",
    })


@app.route("/parse", methods=["POST"])
def parse_messages():
    """
    POST /parse
    JSON: {content: str} or multipart file
    Returns: parsed messages sample
    """
    sid = get_session_id()
    entry = _store.get(sid)

    if not entry:
        return jsonify({"error": "Önce dosya yükleyin (/upload)."}), 400

    messages = entry["messages"]
    # İlk 20 mesajı önizleme için döndür
    sample = messages[:20]
    return jsonify({
        "total": len(messages),
        "sample": sample,
    })


@app.route("/analysis/group", methods=["GET"])
def analysis_group():
    """GET /analysis/group → Grup istatistikleri."""
    sid = get_session_id()
    df = get_df(sid)

    if df is None or df.empty:
        return jsonify({"error": "Veri bulunamadı. Önce dosya yükleyin."}), 404

    try:
        result = get_group_analysis(df)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"Analiz hatası: {str(e)}"}), 500


@app.route("/analysis/users", methods=["GET"])
def analysis_users():
    """GET /analysis/users → Kullanıcı bazında istatistikler."""
    sid = get_session_id()
    df = get_df(sid)

    if df is None or df.empty:
        return jsonify({"error": "Veri bulunamadı. Önce dosya yükleyin."}), 404

    try:
        result = get_user_analysis(df)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"Analiz hatası: {str(e)}"}), 500


@app.route("/analysis/topics", methods=["GET"])
def analysis_topics():
    """GET /analysis/topics → Konu ve kelime analizi."""
    sid = get_session_id()
    df = get_df(sid)

    if df is None or df.empty:
        return jsonify({"error": "Veri bulunamadı. Önce dosya yükleyin."}), 404

    try:
        result = get_topic_analysis(df)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"Analiz hatası: {str(e)}"}), 500


@app.route("/llm-insights", methods=["POST"])
def llm_insights():
    """
    POST /llm-insights
    JSON: {
        llm_type: "openai" | "claude" | "qwen",
        api_key: str (optional for qwen),
        model: str (optional),
        user_prompt: str (optional),
        qwen_url: str (optional, default: http://localhost:11434)
    }
    """
    sid = get_session_id()
    df = get_df(sid)

    if df is None or df.empty:
        return jsonify({"error": "Veri bulunamadı. Önce dosya yükleyin."}), 404

    body = request.get_json(silent=True) or {}
    llm_type = body.get("llm_type", "openai")
    api_key = body.get("api_key", "")
    model = body.get("model")
    user_prompt = body.get("user_prompt", "")
    qwen_url = body.get("qwen_url", "http://localhost:11434")

    # LLM özeti hazırla
    try:
        data_summary = prepare_llm_summary(df)
    except Exception as e:
        return jsonify({"error": f"Özet hazırlanamadı: {str(e)}"}), 500

    # LLM'e gönder
    result = get_llm_insights(
        llm_type=llm_type,
        data_summary=data_summary,
        api_key=api_key if api_key else None,
        user_prompt=user_prompt,
        model=model,
        qwen_url=qwen_url,
    )

    if not result.get("success"):
        return jsonify({"error": result.get("error", "LLM hatası"), "provider": result.get("provider")}), 500

    return jsonify(result)


@app.route("/analysis/user-profile", methods=["GET"])
def analysis_user_profile():
    """
    GET /analysis/user-profile?user=<username>
    Belirli bir kullanıcının detaylı profil analizi.
    """
    sid = get_session_id()
    df = get_df(sid)

    if df is None or df.empty:
        return jsonify({"error": "Veri bulunamadı. Önce dosya yükleyin."}), 404

    username = request.args.get("user", "").strip()
    if not username:
        return jsonify({"error": "Kullanıcı adı gerekli. ?user=... parametresi ekleyin."}), 400

    try:
        result = get_user_profile(df, username)
        if 'error' in result:
            return jsonify(result), 404
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"Profil analizi hatası: {str(e)}"}), 500


@app.route("/session/clear", methods=["POST"])
def clear_session():
    """Oturum verisini temizle."""
    sid = get_session_id()
    _store.pop(sid, None)
    session.clear()
    return jsonify({"success": True, "message": "Oturum temizlendi."})


@app.route("/session/status", methods=["GET"])
def session_status():
    """Oturum durumunu döndür."""
    sid = get_session_id()
    entry = _store.get(sid)
    if entry:
        return jsonify({
            "has_data": True,
            "message_count": len(entry.get("messages", [])),
            "session_id": sid,
        })
    return jsonify({"has_data": False, "session_id": sid})


# ─── React Static Files (Production) ─────────────────────────────────────────
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    """Production'da React build dosyalarını serve eder."""
    if not os.path.exists(STATIC_DIR):
        return jsonify({"status": "API running", "message": "Frontend build not found."}), 200
    target = os.path.join(STATIC_DIR, path)
    if path and os.path.exists(target):
        return send_from_directory(STATIC_DIR, path)
    return send_from_directory(STATIC_DIR, "index.html")


# ─── Error Handlers ───────────────────────────────────────────────────────────

@app.errorhandler(413)
def too_large(e):
    return jsonify({"error": "Dosya çok büyük. Maksimum 50 MB."}), 413


@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Sunucu hatası."}), 500


# ─── Entry Point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("WhatsApp Analyzer Backend başlatılıyor...")
    print("API: http://localhost:5000")
    app.run(debug=True, port=5000, host="0.0.0.0")
