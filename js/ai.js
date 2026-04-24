// NVIDIA NIM API client + TTS for Study Buddy AI
// OpenAI-compatible endpoint. User's own nvapi-... key, stored in localStorage.
// For demo/localhost only.

const MODEL = "meta/llama-3.3-70b-instruct";
// Uses local proxy (server.py) to avoid CORS. Proxy forwards to
// https://integrate.api.nvidia.com/v1/chat/completions with the user's Bearer token.
const API_URL = "/api/chat";
const MAX_HISTORY = 8;

const SYSTEM_PROMPT = `Sen "Study Buddy" adlı, öğrencilere odaklanma ve çalışma konusunda yardım eden Türkçe bir çalışma asistanısın. XIAO ESP32-S3 tabanlı fiziksel bir cihazın içinde çalışıyorsun; cihaz Pomodoro (25 dk çalışma / 5 dk mola), telefon algılama (load cell + HX711), sıcaklık-nem takibi (BME280) ve sesli etkileşim özelliklerine sahip.

Kurallar:
- Kısa ve net cevap ver (2-4 cümle). Sesli okunacak, uzun olursa sıkıcı olur.
- Motive edici ama abartısız, samimi bir ton kullan.
- Cevaplar Türkçe olsun.
- Pomodoro, odaklanma, çalışma teknikleri, mola önerileri, zihinsel sağlık konularında uzmansın.
- Emoji nadiren kullan, 1 taneyi geçme.
- Kullanıcı selamlarsa sen de selamla ve kısa bir soru sor.
- Matematik, programlama, fizik gibi konularda da yardım edebilirsin.`;

export function initAI(bus) {
  let apiKey = localStorage.getItem("nvidiaKey") || "";
  let conversationHistory = []; // [{role, content}]
  let pending = false;

  const chatEl = document.getElementById("aiChat");
  const inputEl = document.getElementById("aiInput");
  const sendBtn = document.getElementById("aiSendBtn");
  const statusEl = document.getElementById("aiStatus");

  // Modal
  const modal = document.getElementById("apiModal");
  const modalInput = document.getElementById("apiKeyInput");
  const modalSave = document.getElementById("apiKeySave");
  const modalCancel = document.getElementById("apiKeyCancel");
  const modalClear = document.getElementById("apiKeyClear");
  const modalStatus = document.getElementById("apiKeyStatus");
  const apiKeyBtn = document.getElementById("apiKeyBtn");

  function updateKeyIndicator() {
    if (apiKey) {
      apiKeyBtn.textContent = "🔑 Key: ✓";
      apiKeyBtn.style.color = "var(--accent)";
    } else {
      apiKeyBtn.textContent = "🔑 API Key";
      apiKeyBtn.style.color = "";
    }
  }
  updateKeyIndicator();

  apiKeyBtn.addEventListener("click", () => {
    modalInput.value = apiKey;
    modalStatus.textContent = "";
    modal.hidden = false;
    setTimeout(() => modalInput.focus(), 50);
  });
  modalCancel.addEventListener("click", () => { modal.hidden = true; });
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });
  modalSave.addEventListener("click", () => {
    const val = modalInput.value.trim();
    if (!val) {
      modalStatus.textContent = "Anahtar boş olamaz.";
      modalStatus.className = "modal-status error";
      return;
    }
    if (!val.startsWith("nvapi-")) {
      modalStatus.textContent = "Anahtar 'nvapi-' ile başlamalı.";
      modalStatus.className = "modal-status error";
      return;
    }
    apiKey = val;
    localStorage.setItem("nvidiaKey", apiKey);
    modalStatus.textContent = "✓ Anahtar kaydedildi.";
    modalStatus.className = "modal-status";
    updateKeyIndicator();
    bus.emit("log", { level: "info", text: "NVIDIA API anahtarı kaydedildi." });
    setTimeout(() => { modal.hidden = true; }, 800);
  });
  modalClear.addEventListener("click", () => {
    apiKey = "";
    localStorage.removeItem("nvidiaKey");
    modalInput.value = "";
    modalStatus.textContent = "Anahtar silindi.";
    updateKeyIndicator();
    bus.emit("log", { level: "warn", text: "NVIDIA API anahtarı silindi." });
  });

  // Input wiring
  function send() {
    const text = inputEl.value.trim();
    if (!text || pending) return;
    inputEl.value = "";
    ask(text);
  }
  sendBtn.addEventListener("click", send);
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") send();
  });

  // Hint chips
  document.querySelectorAll(".chip[data-hint]").forEach(chip => {
    chip.addEventListener("click", () => {
      ask(chip.dataset.hint);
    });
  });

  function appendMsg(role, content) {
    const div = document.createElement("div");
    div.className = role === "user" ? "ai-msg ai-msg-user" : "ai-msg ai-msg-bot";
    div.textContent = content;
    chatEl.appendChild(div);
    chatEl.scrollTop = chatEl.scrollHeight;
    return div;
  }

  function appendError(text) {
    const div = document.createElement("div");
    div.className = "ai-msg ai-msg-error";
    div.textContent = `⚠ ${text}`;
    chatEl.appendChild(div);
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  function appendThinking() {
    const div = document.createElement("div");
    div.className = "ai-msg ai-msg-bot";
    div.innerHTML = `<span class="thinking">düşünüyor</span>`;
    chatEl.appendChild(div);
    chatEl.scrollTop = chatEl.scrollHeight;
    return div;
  }

  async function ask(userText) {
    if (!apiKey) {
      bus.emit("log", { level: "warn", text: "AI: API anahtarı yok — modal açılıyor." });
      modal.hidden = false;
      modalStatus.textContent = "AI kullanmak için anahtar gir.";
      modalStatus.className = "modal-status error";
      setTimeout(() => modalInput.focus(), 50);
      return;
    }

    pending = true;
    statusEl.textContent = "Düşünüyor...";
    appendMsg("user", userText);
    bus.emit("log", { level: "ai", text: `USER: ${userText}` });
    bus.emit("ai:query-start");
    const thinkingEl = appendThinking();

    conversationHistory.push({ role: "user", content: userText });
    if (conversationHistory.length > MAX_HISTORY) {
      conversationHistory = conversationHistory.slice(-MAX_HISTORY);
    }

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json"
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 400,
          temperature: 0.6,
          top_p: 0.9,
          stream: false,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...conversationHistory
          ]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API ${response.status}: ${errText.slice(0, 150)}`);
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || "(boş cevap)";

      conversationHistory.push({ role: "assistant", content: reply });
      thinkingEl.remove();
      appendMsg("bot", reply);

      bus.emit("log", { level: "ai", text: `AI: ${reply.slice(0, 80)}${reply.length > 80 ? "..." : ""}` });
      bus.emit("ai:response", { text: reply });
      speak(reply);

      // Log token usage if available
      if (data.usage) {
        const u = data.usage;
        bus.emit("log", {
          level: "info",
          text: `AI tokens: in=${u.prompt_tokens || 0} out=${u.completion_tokens || 0} total=${u.total_tokens || 0}`
        });
      }
    } catch (err) {
      thinkingEl.remove();
      appendError(err.message);
      bus.emit("log", { level: "err", text: `AI HATA: ${err.message}` });
      bus.emit("ai:error", { error: err.message });
    } finally {
      pending = false;
      statusEl.textContent = "Hazır";
      bus.emit("ai:query-end");
    }
  }

  function speak(text) {
    if (!window.speechSynthesis) return;
    // Cancel any previous
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "tr-TR";
    utter.rate = 1.05;
    utter.pitch = 1.0;
    // Pick a Turkish voice if available
    const voices = speechSynthesis.getVoices();
    const trVoice = voices.find(v => v.lang?.startsWith("tr")) || voices.find(v => v.lang?.startsWith("tr-TR"));
    if (trVoice) utter.voice = trVoice;
    utter.onstart = () => bus.emit("ai:speak-start");
    utter.onend = () => bus.emit("ai:speak-end");
    utter.onerror = () => bus.emit("ai:speak-end");
    speechSynthesis.speak(utter);
  }

  // Preload voices
  if (window.speechSynthesis) {
    speechSynthesis.getVoices();
    speechSynthesis.addEventListener?.("voiceschanged", () => {});
  }

  return {
    ask,
    speak,
    hasKey() { return !!apiKey; },
    openKeyModal() { apiKeyBtn.click(); }
  };
}
