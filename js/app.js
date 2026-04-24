// App entry point — wires all modules together

import { initBoard } from "./board.js";
import { initOLED } from "./oled.js";
import { initPomodoro } from "./pomodoro.js";
import { initSensors } from "./sensors.js";
import { Audio } from "./audio.js";
import { initAI } from "./ai.js";
import { initMic } from "./mic.js";

// Simple event bus
function createBus() {
  const listeners = {};
  return {
    on(event, handler) {
      (listeners[event] ||= []).push(handler);
    },
    emit(event, data) {
      (listeners[event] || []).forEach(h => h(data));
    }
  };
}

const bus = createBus();

// Serial monitor
const serialBody = document.getElementById("serialBody");
const serialClearBtn = document.getElementById("serialClearBtn");
const serialToggleBtn = document.getElementById("serialToggleBtn");
const MAX_LINES = 120;
let eventCount = 0;
const boardStatus = document.getElementById("boardStatus");

function pad(n, w = 2) { return n.toString().padStart(w, "0"); }
function formatNow() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

function log(level, text) {
  const line = document.createElement("div");
  line.className = `serial-line ${level}`;
  line.textContent = `[${formatNow()}] ${text}`;
  serialBody.appendChild(line);
  while (serialBody.childElementCount > MAX_LINES) {
    serialBody.removeChild(serialBody.firstChild);
  }
  serialBody.scrollTop = serialBody.scrollHeight;
  eventCount++;
  boardStatus.textContent = `Sistem çalışıyor · ${eventCount} olay`;
}

bus.on("log", ({ level, text }) => log(level || "info", text));

serialClearBtn.addEventListener("click", () => {
  serialBody.innerHTML = "";
  log("sys", "Seri monitör temizlendi");
});
let serialHidden = false;
serialToggleBtn.addEventListener("click", () => {
  serialHidden = !serialHidden;
  serialBody.classList.toggle("hidden", serialHidden);
  serialToggleBtn.textContent = serialHidden ? "Göster" : "Gizle";
});

log("sys", "[boot] Modüller yükleniyor...");

// Init modules
const board = initBoard(document.getElementById("boardContainer"));
log("sys", "[boot] Board SVG hazır");

const oled = initOLED(document.getElementById("oledCanvas"));
log("sys", "[boot] OLED SSD1306 inited");

Audio.init();
log("sys", "[boot] I2S audio chain hazır (MAX98357A)");

const sensors = initSensors(bus);
log("sys", "[boot] BME280 + HX711 tarama başladı");

const pomodoro = initPomodoro(bus);
log("sys", "[boot] Pomodoro state machine hazır");

const ai = initAI(bus);
log("sys", "[boot] Xiaozhi AI client hazır (NVIDIA NIM · Llama 3.3 70B)");

const mic = initMic(bus, (text) => {
  // Auto-send when mic finishes with final text
  ai.ask(text);
});
log("sys", `[boot] Mikrofon: ${mic.isSupported ? "hazır" : "desteklenmiyor"}`);

log("sys", "[boot] Wi-Fi bağlı · sistem çalışıyor ✓");

// ─── Physical button (from new schematic U3) ───
const physicalBtn = document.getElementById("physicalBtn");
function handleButtonPress() {
  Audio.buttonPress();
  log("info", "GPIO D6: BUTTON1 basıldı — AI tetiklendi");
  if (!ai.hasKey()) {
    log("warn", "API anahtarı yok — modal açılıyor");
    ai.openKeyModal();
    return;
  }
  if (mic.isSupported) {
    if (mic.isListening()) mic.stopListening();
    else {
      mic.startListening();
      physicalBtn.classList.add("listening");
    }
  } else {
    log("warn", "Konuşma tanıma yok — text girişi kullan");
    document.getElementById("aiInput").focus();
  }
}
physicalBtn.addEventListener("click", handleButtonPress);
board.onButtonPress(handleButtonPress);

// ─── OLED next button ───
document.getElementById("oledNextBtn").addEventListener("click", () => {
  oled.nextScreen();
});

// ─── Pomodoro UI wiring ───
const pomoTimeEl = document.getElementById("pomoTime");
const pomoBadgeEl = document.getElementById("pomoBadge");
const pomoCycleEl = document.getElementById("pomoCycle");
const pomoStartBtn = document.getElementById("pomoStartBtn");
const pomoResetBtn = document.getElementById("pomoResetBtn");
const pomoSpeedBtn = document.getElementById("pomoSpeedBtn");

function formatTime(seconds) {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.floor(Math.max(0, seconds) % 60);
  return `${pad(m)}:${pad(s)}`;
}

function renderPomoUI(state) {
  pomoTimeEl.textContent = formatTime(state.remaining);
  pomoBadgeEl.className = "badge";
  if (state.phase === "WORK") { pomoBadgeEl.textContent = "ÇALIŞMA"; pomoBadgeEl.classList.add("work"); }
  else if (state.phase === "BREAK") { pomoBadgeEl.textContent = "MOLA"; pomoBadgeEl.classList.add("break"); }
  else if (state.phase === "PAUSED") { pomoBadgeEl.textContent = "DURAKLATILDI"; }
  else { pomoBadgeEl.textContent = "HAZIR"; }

  // Cycle dots
  const dots = pomoCycleEl.querySelectorAll(".cdot");
  dots.forEach((d, i) => {
    d.classList.remove("filled", "active");
    if (i < state.cycle) d.classList.add("filled");
    else if (i === state.cycle && state.phase !== "IDLE") d.classList.add("active");
  });

  // Start button label
  if (state.phase === "IDLE") pomoStartBtn.textContent = "Başlat";
  else if (state.phase === "PAUSED") pomoStartBtn.textContent = "Devam";
  else pomoStartBtn.textContent = "Duraklat";

  // OLED sync
  oled.setPomodoro(state.phase, state.remaining, state.cycle, state.totalCycles);
  board.updateOledMini(
    state.phase === "IDLE" ? "STUDY BUDDY" :
    state.phase === "WORK" ? `WORK ${formatTime(state.remaining)}` :
    state.phase === "BREAK" ? `BREAK ${formatTime(state.remaining)}` :
    "PAUSED"
  );
}

pomoStartBtn.addEventListener("click", () => {
  const s = pomodoro.getState();
  if (s.phase === "WORK" || s.phase === "BREAK") {
    pomodoro.pause();
  } else {
    pomodoro.start();
  }
});
pomoResetBtn.addEventListener("click", () => {
  pomodoro.reset();
});
pomoSpeedBtn.addEventListener("change", () => {
  pomodoro.setSpeed(pomoSpeedBtn.checked ? 10 : 1);
});

bus.on("pomo:tick", ({ state }) => renderPomoUI(state));
bus.on("pomo:start", ({ state }) => {
  renderPomoUI(state);
  Audio.startTone();
  board.pulseI2C();
  log("pomo", `POMODORO: ${state.phase} başladı (${formatTime(state.remaining)})`);
});
bus.on("pomo:resume", ({ state }) => {
  renderPomoUI(state);
  log("pomo", `POMODORO: devam ediyor (${state.phase})`);
});
bus.on("pomo:pause", ({ state }) => {
  renderPomoUI(state);
  log("pomo", "POMODORO: duraklatıldı");
});
bus.on("pomo:reset", ({ state }) => {
  renderPomoUI(state);
  log("pomo", "POMODORO: sıfırlandı");
});
bus.on("pomo:phase-change", ({ from, to, state }) => {
  renderPomoUI(state);
  if (to === "BREAK") { Audio.breakTone(); log("pomo", `POMODORO: ÇALIŞMA → MOLA (döngü ${state.cycle}/${state.totalCycles})`); }
  else if (to === "WORK") { Audio.startTone(); log("pomo", `POMODORO: MOLA → ÇALIŞMA (döngü ${state.cycle + 1}/${state.totalCycles})`); }
});
bus.on("pomo:complete", ({ state }) => {
  renderPomoUI(state);
  Audio.endTone();
  log("pomo", "POMODORO: tüm döngüler tamamlandı! 🎉");
  // Auto AI congratulations
  if (ai.hasKey()) {
    setTimeout(() => ai.ask("4 döngülük Pomodoro'yu bitirdim, tebrik et ve yorgunluk atmak için kısa bir öneri ver."), 500);
  }
});
bus.on("pomo:speed", ({ state }) => {
  log("pomo", `Hız: ×${state.speedMultiplier}`);
});

renderPomoUI(pomodoro.getState());

// ─── Sensor wiring ───
bus.on("sensor:env", ({ temp, hum }) => {
  oled.setEnv(temp, hum);
  board.updateBmeReadout(temp, hum);
  board.pulseI2C();
});
bus.on("sensor:phone", ({ onPad, grams, alarm }) => {
  oled.setPhone(onPad, grams, alarm);
  board.phoneOnPad(onPad);
  board.alertPhone(alarm);
});
bus.on("sensor:hx711-poll", () => {
  board.hxReading();
});

// ─── Alarm events ───
bus.on("alarm:phone-removed", () => {
  Audio.alarmBuzzer();
  board.speakerPlaying(true);
  setTimeout(() => board.speakerPlaying(false), 800);
  log("err", "⚠ ALARM: telefon pad'den kaldırıldı! Buzzer çalıyor.");
  // AI reminder if key available
  if (ai.hasKey()) {
    setTimeout(() => ai.ask("Telefonumu çalışma pedinden aldım, odaklanmaya geri dönmem için motive edici kısa bir uyarı yaz."), 300);
  }
});
bus.on("alarm:phone-restored", () => {
  log("info", "✓ Telefon pad'e geri kondu");
});

// ─── AI events ───
bus.on("ai:query-start", () => {
  board.speakerPlaying(false);
});
bus.on("ai:response", ({ text }) => {
  oled.setAIResponse(text);
  board.updateOledMini("AI DEDIKI");
});
bus.on("ai:speak-start", () => {
  board.speakerPlaying(true);
  Audio.aiBeep();
});
bus.on("ai:speak-end", () => {
  board.speakerPlaying(false);
});

// ─── Mic events ───
bus.on("mic:start", () => {
  board.micListening(true);
});
bus.on("mic:end", () => {
  board.micListening(false);
  physicalBtn.classList.remove("listening");
});

// Keyboard shortcut: space to press AI button (if not focused on input)
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !["INPUT", "TEXTAREA"].includes(e.target.tagName)) {
    e.preventDefault();
    physicalBtn.click();
  }
});

// ─── Fullscreen toggle ───
const fullscreenBtn = document.getElementById("fullscreenBtn");
fullscreenBtn?.addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(err => {
      log("warn", `Tam ekran hatası: ${err.message}`);
    });
  } else {
    document.exitFullscreen?.();
  }
});
document.addEventListener("fullscreenchange", () => {
  if (!fullscreenBtn) return;
  fullscreenBtn.textContent = document.fullscreenElement ? "⛶ Çıkış" : "⛶ Tam Ekran";
});

// ─── Zoom controls ───
document.getElementById("zoomInBtn")?.addEventListener("click", () => board.zoomIn());
document.getElementById("zoomOutBtn")?.addEventListener("click", () => board.zoomOut());
document.getElementById("zoomResetBtn")?.addEventListener("click", () => board.resetView());

// ─── Board-only fullscreen ───
const boardPanel = document.querySelector(".board-panel");
const boardFullBtn = document.getElementById("boardFullBtn");
boardFullBtn?.addEventListener("click", () => {
  const fsEl = document.fullscreenElement;
  if (fsEl === boardPanel) {
    document.exitFullscreen?.();
  } else {
    boardPanel.requestFullscreen?.().catch(err => {
      log("warn", `Devre tam ekran hatası: ${err.message}`);
    });
  }
});
document.addEventListener("fullscreenchange", () => {
  const isBoardFs = document.fullscreenElement === boardPanel;
  boardPanel?.classList.toggle("is-fullscreen", isBoardFs);
  if (boardFullBtn) boardFullBtn.textContent = isBoardFs ? "✕ Kapat" : "⛶ Tam Ekran";
});

// ─── Guide toggle ───
const guideBody = document.getElementById("guideBody");
const guideToggleBtn = document.getElementById("guideToggleBtn");
let guideHidden = false;
guideToggleBtn?.addEventListener("click", () => {
  guideHidden = !guideHidden;
  guideBody.classList.toggle("hidden", guideHidden);
  guideToggleBtn.textContent = guideHidden ? "Göster" : "Gizle";
});

log("info", "Sistem hazır. Çalışmaya başla!");
