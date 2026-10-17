// Cloudflare Worker Proxy cho OpenRouter API
// API key được đặt qua biến môi trường (environment variable) trên Cloudflare Dashboard
// KHÔNG hardcode API key trong source code

// [FIX BUG #13] So khớp origin TUYỆT ĐỐI. Trước đây dùng startsWith với các tiền tố như
// "http://192.168." hay "https://learnhubpf.pages.dev" nên origin giả mạo kiểu
// "http://192.168.attacker.com" / "https://learnhubpf.pages.dev.evil.com" vẫn lọt qua.
const MAIN_ORIGIN = "https://learnhubpf.pages.dev";
const LOCAL_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2[0-9]|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

// [FIX BUG #13] Rate-limit nhẹ trong bộ nhớ isolate (chống spam cơ bản).
// Lưu ý: mỗi isolate có bộ đếm riêng và reset khi isolate tái tạo — không thay thế được
// Cloudflare Rate Limiting/KV, nhưng chặn được lạm dụng đơn giản.
const RATE_WINDOW_MS = 60000;
const RATE_MAX = 30;
const rateBuckets = new Map();
function isRateLimited(ip) {
  if (!ip) return false;
  const now = Date.now();
  const b = rateBuckets.get(ip);
  if (!b || now - b.start > RATE_WINDOW_MS) {
    if (rateBuckets.size > 5000) rateBuckets.clear();
    rateBuckets.set(ip, { start: now, count: 1 });
    return false;
  }
  b.count++;
  return b.count > RATE_MAX;
}

const MODEL_MAP = {
  "gemini-2.5-flash": "google/gemini-2.5-flash",
  "gemini-2.5-flash-lite": "google/gemini-2.5-flash-lite",
  "gemini-2.0-flash": "google/gemini-2.0-flash-001",
  "gemini-2.0-flash-lite": "google/gemini-2.0-flash-lite-001",
  "gemini-1.5-flash": "google/gemini-1.5-flash",
  "gemini-1.5-pro": "google/gemini-1.5-pro",
  "gemini-1.0-pro": "google/gemini-1.0-pro",
  "gpt-4o": "openai/gpt-4o",
  "gpt-4o-mini": "openai/gpt-4o-mini",
  "gpt-3.5-turbo": "openai/gpt-3.5-turbo",
  "gemma-4-31b-it": "google/gemma-4-31b-it:free",
  "nemotron-3-super": "nvidia/nemotron-3-super-120b-a12b:free",
  "gemma-4-26b-a4b-it": "google/gemma-4-26b-a4b-it:free",
  "minimax-m3": "minimax/minimax-m3:free",
  "nemotron-3-ultra": "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nemotron-3-nano": "nvidia/nemotron-3-nano-30b-a3b:free",
  "glm-5.2": "z-ai/glm-5.2:free",
  "openrouter-free": "openrouter/free"
};

const ALLOWED_MODELS = Object.keys(MODEL_MAP);

function isAllowedOrigin(origin) {
  if (!origin) return false;
  const o = String(origin).replace(/\/+$/, "");
  return o === MAIN_ORIGIN || LOCAL_ORIGIN_RE.test(o);
}

function geminiToOpenAI(requestBody) {
  const messages = [];

  if (requestBody.systemInstruction) {
    const sysParts = requestBody.systemInstruction.parts || [];
    const sysText = sysParts.map(p => p.text || "").join("\n");
    if (sysText) messages.push({ role: "system", content: sysText });
  }

  for (const turn of (requestBody.contents || [])) {
    const role = turn.role === "model" ? "assistant" : "user";
    const contentParts = [];
    for (const part of (turn.parts || [])) {
      if (part.text) {
        contentParts.push({ type: "text", text: part.text });
      } else if (part.inlineData) {
        contentParts.push({
          type: "image_url",
          image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` }
        });
      }
    }
    if (contentParts.length === 1 && contentParts[0].type === "text") {
      messages.push({ role, content: contentParts[0].text });
    } else if (contentParts.length > 0) {
      messages.push({ role, content: contentParts });
    }
  }

  const config = requestBody.generationConfig || {};
  const result = { messages };
  // [FIX BUG #13] Dùng != null để không bỏ qua temperature = 0 (0 là giá trị hợp lệ)
  if (config.temperature != null) result.temperature = config.temperature;
  if (config.maxOutputTokens != null) result.max_tokens = config.maxOutputTokens;
  return result;
}

function openAIToGemini(data) {
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return {
      candidates: [{
        content: {
          parts: [{ text: data.choices[0].message.content }],
          role: "model"
        }
      }]
    };
  }
  return data;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : MAIN_ORIGIN,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const url = new URL(request.url);

    /* GET /drive-size?fileId=... — lấy dung lượng file Google Drive.
       Key Drive đặt trong env.DRIVE_API_KEY (secret trên Cloudflare), KHÔNG lộ ra client. */
    if (url.pathname === "/drive-size") {
      const corsBase = {
        "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : MAIN_ORIGIN,
        "Content-Type": "application/json",
      };
      const json = (o, status) => new Response(JSON.stringify(o), { status, headers: corsBase });
      if (!isAllowedOrigin(origin)) return json({ error: "Origin not allowed" }, 403);
      if (!env.DRIVE_API_KEY) return json({ error: "Server configuration error" }, 500);
      const fileId = url.searchParams.get("fileId") || "";
      if (!/^[a-zA-Z0-9_-]+$/.test(fileId)) return json({ error: "Missing or invalid fileId" }, 400);
      try {
        const res = await fetch(
          "https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(fileId) +
          "?fields=size&key=" + encodeURIComponent(env.DRIVE_API_KEY),
          {
            headers: {
              "Referer": "https://learnhubpf.pages.dev/",
            },
          }
        );
        if (!res.ok) {
          const driveBody = (await res.text()).slice(0, 500);
          return json({ error: "Drive API error: " + res.status, detail: driveBody }, 502);
        }
        const driveData = await res.json();
        return json(driveData);
      } catch (err) {
        return json({ error: err.message || "Internal server error" }, 500);
      }
    }

    // [FIX BUG #13] Thêm CORS header cho các response lỗi để trình duyệt đọc được thông báo
    const corsJson = (o, status) => new Response(JSON.stringify(o), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : MAIN_ORIGIN,
      },
    });

    if (request.method !== "POST") {
      return corsJson({ error: "Method not allowed" }, 405);
    }

    // [FIX BUG #13] Rate-limit: ưu tiên binding RATE_LIMITER (đếm theo Cloudflare location,
    // dùng chung hạ tầng WAF — hoạt động cả trên *.workers.dev). Nếu chưa cấu hình binding
    // (vd chạy local / wrangler cũ) thì rơi về bộ đếm in-memory trong 1 isolate (yếu hơn).
    const clientIp = request.headers.get("CF-Connecting-IP") || "";
    let rateLimited = false;
    if (env && env.RATE_LIMITER && typeof env.RATE_LIMITER.limit === "function") {
      try {
        const r = await env.RATE_LIMITER.limit({ key: clientIp || "anonymous" });
        rateLimited = !(r && r.success);
      } catch (e) {
        rateLimited = isRateLimited(clientIp);
      }
    } else {
      rateLimited = isRateLimited(clientIp);
    }
    if (rateLimited) {
      return corsJson({ error: "Too many requests. Please try again later." }, 429);
    }

    if (!isAllowedOrigin(origin)) {
      return corsJson({ error: "Origin not allowed" }, 403);
    }

    // [FIX BUG #13] Tên biến env bị đặt nhầm (GEMINI_API_KEY) dù dùng cho OpenRouter.
    // Hỗ trợ cả hai tên để không làm hỏng secret đang cấu hình trên Cloudflare.
    const OPENROUTER_API_KEY = env.OPENROUTER_API_KEY || env.GEMINI_API_KEY;
    if (!OPENROUTER_API_KEY) {
      return corsJson({ error: "Server configuration error" }, 500);
    }

    try {
      const body = await request.json();
      const { model, requestBody } = body;

      if (!model || !requestBody) {
        return corsJson({ error: "Missing model or requestBody" }, 400);
      }

      if (!ALLOWED_MODELS.includes(model)) {
        return corsJson({ error: "Model not allowed" }, 403);
      }

      const openaiBody = geminiToOpenAI(requestBody);
      openaiBody.model = MODEL_MAP[model];

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify(openaiBody),
      });

      const data = await response.json();
      const geminiData = openAIToGemini(data);

      return new Response(JSON.stringify(geminiData), {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : MAIN_ORIGIN,
        },
      });
    } catch (err) {
      return corsJson({ error: err.message || "Internal server error" }, 500);
    }
  },
};
