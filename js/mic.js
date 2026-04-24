// Web Speech API (SpeechRecognition) — tr-TR dictation for mic button
// Also emulates the INMP441 wake-word pathway ("hey buddy" / "hey bud") when enabled.

export function initMic(bus, onFinalText) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const micBtn = document.getElementById("micBtn");
  const inputEl = document.getElementById("aiInput");

  if (!SR) {
    micBtn.disabled = true;
    micBtn.title = "Tarayıcı konuşma tanımayı desteklemiyor (Chrome gerekli)";
    bus.emit("log", { level: "warn", text: "Web Speech API yok — mikrofon devre dışı." });
    return {
      toggle() {},
      startListening() {},
      isSupported: false
    };
  }

  let recognition = null;
  let listening = false;

  function createRecognition() {
    const r = new SR();
    r.lang = "tr-TR";
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    return r;
  }

  function startListening() {
    if (listening) return;
    recognition = createRecognition();
    let finalText = "";

    recognition.onstart = () => {
      listening = true;
      micBtn.classList.add("listening");
      micBtn.textContent = "🔴";
      bus.emit("mic:start");
      bus.emit("log", { level: "info", text: "INMP441: kayıt başladı (I2S stream)" });
      inputEl.placeholder = "Dinleniyor... konuş";
    };
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }
      inputEl.value = finalText + interim;
      bus.emit("mic:interim", { text: finalText + interim });
    };
    recognition.onerror = (event) => {
      bus.emit("log", { level: "err", text: `Mikrofon hatası: ${event.error}` });
      stopListening();
    };
    recognition.onend = () => {
      listening = false;
      micBtn.classList.remove("listening");
      micBtn.textContent = "🎤";
      inputEl.placeholder = "Asistan'a yaz... (örn. odaklanamıyorum, ne yapayım?)";
      bus.emit("mic:end", { finalText });
      bus.emit("log", { level: "info", text: "INMP441: kayıt bitti" });
      if (finalText.trim()) {
        inputEl.value = finalText.trim();
        if (onFinalText) onFinalText(finalText.trim());
      }
    };

    try {
      recognition.start();
    } catch (e) {
      bus.emit("log", { level: "err", text: `Mikrofon başlatılamadı: ${e.message}` });
    }
  }

  function stopListening() {
    if (recognition && listening) {
      try { recognition.stop(); } catch (e) {}
    }
  }

  micBtn.addEventListener("click", () => {
    if (listening) stopListening();
    else startListening();
  });

  return {
    toggle() { if (listening) stopListening(); else startListening(); },
    startListening,
    stopListening,
    isSupported: true,
    isListening() { return listening; }
  };
}
