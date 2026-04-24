// OLED 128x64 SSD1306 simulation on canvas (rendered at 3x scale = 384x192)

const W = 128, H = 64, SCALE = 3;
const ON_COLOR = "#7df9ff";
const OFF_COLOR = "#001018";

export function initOLED(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  let currentScreen = 0;
  const screens = ["pomodoro", "env", "phone", "ai"];
  let autoRotate = true;
  let lastRotate = Date.now();
  const ROTATE_MS = 4000;

  let state = {
    pomo: { phase: "IDLE", remaining: 25 * 60, cycle: 0, totalCycles: 4 },
    env: { temp: 23.5, hum: 55 },
    phone: { onPad: true, grams: 180, alarm: false },
    ai: { lastResponse: "Merhaba! Ben Study Buddy.", scrollOffset: 0 }
  };

  function clear() {
    ctx.fillStyle = OFF_COLOR;
    ctx.fillRect(0, 0, W * SCALE, H * SCALE);
  }

  function px(x, y, w = 1, h = 1) {
    ctx.fillStyle = ON_COLOR;
    ctx.fillRect(x * SCALE, y * SCALE, w * SCALE, h * SCALE);
  }

  function text(str, x, y, size = 1) {
    ctx.fillStyle = ON_COLOR;
    ctx.font = `bold ${size * 8 * SCALE}px "JetBrains Mono", "Courier New", monospace`;
    ctx.textBaseline = "top";
    ctx.fillText(str, x * SCALE, y * SCALE);
  }

  function bigText(str, x, y) {
    ctx.fillStyle = ON_COLOR;
    ctx.font = `bold ${22 * SCALE}px "JetBrains Mono", "Courier New", monospace`;
    ctx.textBaseline = "top";
    ctx.fillText(str, x * SCALE, y * SCALE);
  }

  function rect(x, y, w, h, fill = false) {
    ctx.strokeStyle = ON_COLOR;
    ctx.fillStyle = ON_COLOR;
    ctx.lineWidth = SCALE;
    if (fill) ctx.fillRect(x * SCALE, y * SCALE, w * SCALE, h * SCALE);
    else ctx.strokeRect(x * SCALE + SCALE / 2, y * SCALE + SCALE / 2, w * SCALE - SCALE, h * SCALE - SCALE);
  }

  function line(x1, y1, x2, y2) {
    ctx.strokeStyle = ON_COLOR;
    ctx.lineWidth = SCALE;
    ctx.beginPath();
    ctx.moveTo(x1 * SCALE + SCALE / 2, y1 * SCALE + SCALE / 2);
    ctx.lineTo(x2 * SCALE + SCALE / 2, y2 * SCALE + SCALE / 2);
    ctx.stroke();
  }

  function drawHeader(title) {
    text(title, 2, 2);
    line(0, 11, 128, 11);
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  function drawPomodoro() {
    const { phase, remaining, cycle, totalCycles } = state.pomo;
    drawHeader("POMODORO");

    // Phase label
    let label = "HAZIR";
    if (phase === "WORK") label = "CALISMA";
    if (phase === "BREAK") label = "MOLA";
    if (phase === "PAUSED") label = "DURAKLATILDI";
    text(label, 2, 15);

    // Big timer
    bigText(formatTime(remaining), 14, 26);

    // Cycle dots
    for (let i = 0; i < totalCycles; i++) {
      const x = 2 + i * 10;
      if (i < cycle) {
        rect(x, 56, 6, 6, true);
      } else if (i === cycle && phase !== "IDLE") {
        rect(x, 56, 6, 6, false);
      } else {
        // empty circle approx
        px(x + 2, 57, 2, 1);
        px(x + 2, 61, 2, 1);
        px(x, 58, 1, 3);
        px(x + 5, 58, 1, 3);
      }
    }
    // Wi-Fi icon top-right
    drawWifiIcon(118, 2);
  }

  function drawEnv() {
    drawHeader("ORTAM");
    const { temp, hum } = state.env;
    // Temp
    text("T:", 2, 18);
    bigText(`${temp.toFixed(1)}`, 18, 15);
    text("C", 85, 18);
    // small degree
    px(82, 17, 2, 2);

    // Humidity
    text("H:", 2, 42);
    bigText(`${Math.round(hum)}%`, 18, 38);

    // Status comment
    let comment = "IDEAL";
    if (temp > 28) comment = "SICAK!";
    else if (temp < 18) comment = "SOGUK!";
    else if (hum > 70) comment = "NEMLI";
    else if (hum < 30) comment = "KURU";
    text(comment, 80, 44);
  }

  function drawPhone() {
    drawHeader("TELEFON");
    const { onPad, grams, alarm } = state.phone;

    if (alarm) {
      // Big warning - blink
      const blink = Math.floor(Date.now() / 300) % 2 === 0;
      if (blink) {
        rect(0, 14, 128, 50, false);
      }
      text("! UYARI !", 32, 20);
      text("TELEFON YOK", 24, 32);
      text("CALISMAYA", 28, 44);
      text("DEVAM ET!", 30, 54);
    } else if (onPad) {
      // Phone icon
      rect(52, 20, 24, 34);
      rect(56, 24, 16, 24);
      // small speaker line
      line(60, 21, 68, 21);
      text("PAD'DE", 44, 56);
      text(`${Math.round(grams)}g`, 88, 20);
    } else {
      text("Kaldirildi", 30, 30);
      text(`${Math.round(grams)}g`, 48, 42);
    }
  }

  function drawAI() {
    drawHeader("AI ASISTAN");
    const { lastResponse } = state.ai;

    // Word-wrap lastResponse into max 6 lines of ~20 chars
    const maxWidth = 21;
    const lines = wrapText(lastResponse, maxWidth).slice(0, 5);
    lines.forEach((ln, i) => {
      text(ln, 2, 15 + i * 9);
    });
    // Little AI icon at top-right
    text("[AI]", 104, 2);
  }

  function wrapText(str, maxWidth) {
    const words = str.split(/\s+/);
    const lines = [];
    let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length <= maxWidth) {
        cur = (cur + " " + w).trim();
      } else {
        if (cur) lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function drawWifiIcon(x, y) {
    // Simple wifi icon
    px(x + 3, y, 2, 1);
    px(x + 1, y + 2, 6, 1);
    px(x + 2, y + 4, 4, 1);
    px(x + 3, y + 6, 2, 1);
  }

  function render() {
    clear();
    const name = screens[currentScreen];
    if (name === "pomodoro") drawPomodoro();
    else if (name === "env") drawEnv();
    else if (name === "phone") drawPhone();
    else if (name === "ai") drawAI();

    // Auto-rotate (skip rotating if alarm active — force phone screen)
    if (state.phone.alarm) {
      if (name !== "phone") {
        currentScreen = screens.indexOf("phone");
      }
    } else if (autoRotate && Date.now() - lastRotate > ROTATE_MS) {
      lastRotate = Date.now();
      nextScreen();
    }
  }

  function nextScreen() {
    currentScreen = (currentScreen + 1) % screens.length;
    lastRotate = Date.now();
    updateDots();
  }

  function updateDots() {
    const dots = document.querySelectorAll("#oledScreens .screen-dot");
    dots.forEach((d, i) => {
      d.classList.toggle("active", i === currentScreen);
    });
  }

  // Animation loop
  function loop() {
    render();
    requestAnimationFrame(loop);
  }
  loop();
  updateDots();

  return {
    setPomodoro(phase, remaining, cycle, totalCycles) {
      state.pomo = { phase, remaining, cycle, totalCycles: totalCycles || 4 };
    },
    setEnv(temp, hum) {
      state.env = { temp, hum };
    },
    setPhone(onPad, grams, alarm) {
      state.phone = { onPad, grams, alarm };
      if (alarm) currentScreen = screens.indexOf("phone");
    },
    setAIResponse(text) {
      state.ai.lastResponse = text;
      currentScreen = screens.indexOf("ai");
      lastRotate = Date.now();
      updateDots();
    },
    nextScreen,
    setAutoRotate(on) { autoRotate = on; }
  };
}
