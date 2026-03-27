import json
import requests
from typing import Dict, Any, Optional


SYSTEM_PROMPT = """Sen bir WhatsApp grup analiz uzmanısın. Sana verilen istatistiksel verileri analiz ederek:
1. Grup dinamiklerini ve iletişim örüntülerini açıkla
2. Aktif ve pasif üyeleri belirle
3. Konuşma konularını ve trendleri analiz et
4. Olası riskleri (aşırı egemen kullanıcılar, toksik dil eğilimleri vb.) tespit et
5. Gruba özgü tavsiyeler ver
6. Kısa, özlü ve Türkçe bir özet sun

Yanıtlarını Markdown formatında yaz. Başlıklar, maddeler ve vurgular kullan."""


def _build_prompt(data_summary: str, user_prompt: str = "") -> str:
    base = f"""Aşağıdaki WhatsApp grup verilerini analiz et ve detaylı bir değerlendirme sun:

{data_summary}

{user_prompt if user_prompt else "Grup dinamiklerini, iletişim kalıplarını, riskleri ve tavsiyeleri analiz et."}"""
    return base


def _friendly_error(e: Exception, provider: str) -> str:
    """API hatalarını kullanıcı dostu mesaja çevirir."""
    msg = str(e)
    if 'invalid_api_key' in msg or 'invalid x-api-key' in msg or 'Incorrect API key' in msg:
        names = {'openai': 'OpenAI', 'claude': 'Claude (Anthropic)', 'qwen_local': 'Ollama'}
        return f"Geçersiz API key. Lütfen {names.get(provider, provider)} API key'inizi kontrol edin."
    if 'insufficient_quota' in msg or 'exceeded' in msg:
        return "API limitiniz dolmuş veya ödeme yapılmamış. Hesabınızı kontrol edin."
    if 'model_not_found' in msg or 'does not exist' in msg:
        return "Model bulunamadı. Model adını kontrol edin."
    if 'rate_limit' in msg:
        return "Çok fazla istek gönderildi (rate limit). Kısa süre bekleyip tekrar deneyin."
    if 'connection' in msg.lower() or 'timeout' in msg.lower():
        return f"{provider} API'ye bağlanılamadı. İnternet bağlantınızı kontrol edin."
    # Ham hata mesajından sadece 'message' kısmını çek
    import re as _re
    m = _re.search(r"'message':\s*'([^']+)'", msg)
    if m:
        return m.group(1)
    return msg[:300]  # çok uzun hata mesajlarını kırp


def analyze_with_openai(
    api_key: str,
    data_summary: str,
    user_prompt: str = "",
    model: str = "gpt-4o",
) -> Dict[str, Any]:
    """OpenAI API ile analiz."""
    try:
        import openai
        client = openai.OpenAI(api_key=api_key)

        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": _build_prompt(data_summary, user_prompt)},
            ],
            max_tokens=2000,
            temperature=0.7,
        )
        content = response.choices[0].message.content
        return {
            "success": True,
            "content": content,
            "model": model,
            "provider": "openai",
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
            }
        }
    except Exception as e:
        return {"success": False, "error": _friendly_error(e, "openai"), "provider": "openai"}


def analyze_with_claude(
    api_key: str,
    data_summary: str,
    user_prompt: str = "",
    model: str = "claude-opus-4-6",
) -> Dict[str, Any]:
    """Anthropic Claude API ile analiz."""
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        response = client.messages.create(
            model=model,
            max_tokens=2000,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": _build_prompt(data_summary, user_prompt)},
            ],
        )
        content = response.content[0].text
        return {
            "success": True,
            "content": content,
            "model": model,
            "provider": "claude",
            "usage": {
                "prompt_tokens": response.usage.input_tokens,
                "completion_tokens": response.usage.output_tokens,
            }
        }
    except Exception as e:
        return {"success": False, "error": _friendly_error(e, "claude"), "provider": "claude"}


def analyze_with_qwen(
    data_summary: str,
    user_prompt: str = "",
    base_url: str = "http://localhost:11434",
    model: str = "qwen2.5:7b",
) -> Dict[str, Any]:
    """Ollama üzerinden lokal Qwen ile analiz."""
    try:
        prompt = f"{SYSTEM_PROMPT}\n\n{_build_prompt(data_summary, user_prompt)}"

        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "num_predict": 2000,
            }
        }

        resp = requests.post(
            f"{base_url}/api/generate",
            json=payload,
            timeout=120,
        )
        resp.raise_for_status()
        result = resp.json()

        return {
            "success": True,
            "content": result.get("response", ""),
            "model": model,
            "provider": "qwen_local",
        }
    except requests.exceptions.ConnectionError:
        return {
            "success": False,
            "error": f"Ollama'ya bağlanılamadı. Ollama çalışıyor mu? URL: {base_url}",
            "provider": "qwen_local",
        }
    except Exception as e:
        return {"success": False, "error": str(e), "provider": "qwen_local"}


def get_llm_insights(
    llm_type: str,
    data_summary: str,
    api_key: Optional[str] = None,
    user_prompt: str = "",
    model: Optional[str] = None,
    qwen_url: str = "http://localhost:11434",
) -> Dict[str, Any]:
    """LLM türüne göre analiz yap."""
    llm_type = llm_type.lower().strip()

    if llm_type == "openai":
        if not api_key:
            return {"success": False, "error": "OpenAI API key gerekli.", "provider": "openai"}
        return analyze_with_openai(
            api_key=api_key,
            data_summary=data_summary,
            user_prompt=user_prompt,
            model=model or "gpt-4o",
        )

    elif llm_type in ("claude", "anthropic"):
        if not api_key:
            return {"success": False, "error": "Claude API key gerekli.", "provider": "claude"}
        return analyze_with_claude(
            api_key=api_key,
            data_summary=data_summary,
            user_prompt=user_prompt,
            model=model or "claude-opus-4-6",
        )

    elif llm_type in ("qwen", "local", "ollama"):
        return analyze_with_qwen(
            data_summary=data_summary,
            user_prompt=user_prompt,
            base_url=qwen_url,
            model=model or "qwen2.5:7b",
        )

    else:
        return {
            "success": False,
            "error": f"Geçersiz LLM tipi: {llm_type}. Desteklenenler: openai, claude, qwen",
            "provider": llm_type,
        }
