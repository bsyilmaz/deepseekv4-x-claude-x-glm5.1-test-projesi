// Web Audio tones for Study Buddy (simulates MAX98357A output)

let ctx = null;
let masterGain = null;

function ensureContext() {
  if (ctx) return ctx;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.15;
  masterGain.connect(ctx.destination);
  return ctx;
}

async function resumeIfSuspended() {
  if (!ctx) ensureContext();
  if (ctx.state === "suspended") {
    try { await ctx.resume(); } catch (e) { /* ignore */ }
  }
}

function blip(freq, duration, type = "sine", startGain = 0.5, decay = true) {
  ensureContext();
  resumeIfSuspended();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(startGain, ctx.currentTime);
  if (decay) {
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  }
  osc.connect(gain).connect(masterGain);
  osc.start();
  osc.stop(ctx.currentTime + duration + 0.05);
}

function sequence(notes) {
  ensureContext();
  let t = ctx.currentTime;
  notes.forEach(({ freq, dur, type = "sine", gain = 0.5 }) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(masterGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    t += dur;
  });
}

export const Audio = {
  startTone() {
    sequence([
      { freq: 660, dur: 0.12, type: "triangle" },
      { freq: 880, dur: 0.2, type: "triangle" }
    ]);
  },
  endTone() {
    sequence([
      { freq: 660, dur: 0.15, type: "triangle" },
      { freq: 440, dur: 0.3, type: "triangle" }
    ]);
  },
  breakTone() {
    sequence([
      { freq: 523, dur: 0.12, type: "sine" },
      { freq: 659, dur: 0.12, type: "sine" },
      { freq: 784, dur: 0.25, type: "sine" }
    ]);
  },
  alarmBuzzer() {
    // Phone-removed alarm — 3 quick beeps
    ensureContext();
    resumeIfSuspended();
    const startAt = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(880, startAt + i * 0.22);
      osc.frequency.linearRampToValueAtTime(220, startAt + i * 0.22 + 0.18);
      g.gain.setValueAtTime(0.4, startAt + i * 0.22);
      g.gain.exponentialRampToValueAtTime(0.001, startAt + i * 0.22 + 0.18);
      osc.connect(g).connect(masterGain);
      osc.start(startAt + i * 0.22);
      osc.stop(startAt + i * 0.22 + 0.2);
    }
  },
  aiBeep() {
    blip(1800, 0.08, "sine", 0.3);
  },
  buttonPress() {
    blip(1200, 0.06, "square", 0.2);
  },
  init() {
    // Unlock on first user gesture
    const unlock = () => {
      ensureContext();
      resumeIfSuspended();
      document.removeEventListener("click", unlock);
      document.removeEventListener("keydown", unlock);
    };
    document.addEventListener("click", unlock, { once: true });
    document.addEventListener("keydown", unlock, { once: true });
  }
};
