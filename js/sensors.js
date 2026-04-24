// Sensors: BME280 (temp+hum) and HX711 + Load Cell (phone weight)

const PHONE_WEIGHT = 180;      // grams, typical smartphone
const PHONE_THRESHOLD = 50;    // below this = phone removed
const EMPTY_WEIGHT = 5;        // noise on empty pad

export function initSensors(bus) {
  let state = {
    temp: 23.5,
    hum: 55,
    phoneOnPad: true,
    grams: PHONE_WEIGHT,
    drift: false,
    alarm: false
  };

  const tempSlider = document.getElementById("tempSlider");
  const humSlider = document.getElementById("humSlider");
  const tempOut = document.getElementById("tempOut");
  const humOut = document.getElementById("humOut");
  const driftToggle = document.getElementById("driftToggle");
  const phoneToggle = document.getElementById("phoneToggle");
  const phonePadEl = document.getElementById("phonePad");
  const phoneIconEl = document.getElementById("phoneIcon");
  const padSurface = phonePadEl.querySelector(".pad-surface");
  const hx711ValEl = document.getElementById("hx711Val");

  function emitEnv() {
    bus.emit("sensor:env", { temp: state.temp, hum: state.hum });
    tempOut.textContent = `${state.temp.toFixed(1)} °C`;
    humOut.textContent = `${Math.round(state.hum)} %`;
  }

  function emitPhone() {
    bus.emit("sensor:phone", {
      onPad: state.phoneOnPad,
      grams: state.grams,
      alarm: state.alarm
    });
    hx711ValEl.textContent = `${Math.round(state.grams)} g`;
    hx711ValEl.classList.toggle("alert", state.alarm);
    padSurface.classList.toggle("empty", !state.phoneOnPad);
    phoneIconEl.classList.toggle("gone", !state.phoneOnPad);
  }

  // Slider listeners
  tempSlider.addEventListener("input", (e) => {
    state.temp = parseFloat(e.target.value);
    emitEnv();
  });
  humSlider.addEventListener("input", (e) => {
    state.hum = parseFloat(e.target.value);
    emitEnv();
  });
  driftToggle.addEventListener("change", (e) => {
    state.drift = e.target.checked;
    bus.emit("log", { level: "sensor", text: `BME280 otomatik dalgalanma: ${state.drift ? "AÇIK" : "KAPALI"}` });
  });

  phoneToggle.addEventListener("change", (e) => {
    state.phoneOnPad = e.target.checked;
    state.grams = state.phoneOnPad
      ? PHONE_WEIGHT + (Math.random() - 0.5) * 6
      : EMPTY_WEIGHT + (Math.random() - 0.5) * 2;
    state.alarm = !state.phoneOnPad;
    bus.emit("log", {
      level: state.phoneOnPad ? "info" : "warn",
      text: `HX711: ${Math.round(state.grams)} g — ${state.phoneOnPad ? "telefon pad'de" : "TELEFON KALDIRILDI!"}`
    });
    emitPhone();
    if (state.alarm) bus.emit("alarm:phone-removed");
    else bus.emit("alarm:phone-restored");
  });

  // Drift simulator (2 Hz)
  setInterval(() => {
    if (state.drift) {
      state.temp += (Math.random() - 0.5) * 0.2;
      state.temp = Math.max(15, Math.min(35, state.temp));
      state.hum += (Math.random() - 0.5) * 1.2;
      state.hum = Math.max(20, Math.min(80, state.hum));
      tempSlider.value = state.temp.toFixed(1);
      humSlider.value = Math.round(state.hum);
      emitEnv();
    }
  }, 500);

  // HX711 polling (every 300 ms when phone on pad — simulate small jitter)
  setInterval(() => {
    if (state.phoneOnPad) {
      state.grams = PHONE_WEIGHT + (Math.random() - 0.5) * 6;
    } else {
      state.grams = EMPTY_WEIGHT + (Math.random() - 0.5) * 2;
    }
    hx711ValEl.textContent = `${Math.round(state.grams)} g`;
    bus.emit("sensor:hx711-poll", { grams: state.grams });
  }, 300);

  // BME280 periodic log (every 10s)
  setInterval(() => {
    bus.emit("log", {
      level: "sensor",
      text: `BME280: T=${state.temp.toFixed(1)}°C, H=${Math.round(state.hum)}%`
    });
  }, 10000);

  // Initial emit
  emitEnv();
  emitPhone();

  return {
    getState() { return { ...state }; }
  };
}
