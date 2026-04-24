// Schematic-accurate interactive board for Study Buddy
// Matches the EasyEDA schematic: every pin wired point-to-point with orthogonal routing.

const VB_W = 1200, VB_H = 780;

// Wire colors — matching real schematic
const C = {
  VCC5: "#e63946",   // 5V — red
  VCC3: "#ff6b9d",   // 3V3 / VDD — pink
  GND:  "#111111",   // GND — black
  SCL:  "#3ddc97",   // I2C SCL clock — green
  SDA:  "#b48cff",   // I2C SDA data — violet
  I2S_BCLK: "#4ab3ff",  // BCLK — blue
  I2S_WS:   "#ff9f43",  // WS / LRCLK — orange
  I2S_DATA: "#4ae1ff",  // DIN / DOUT — cyan
  GPIO: "#ffcf4a",   // GPIO (button, HX711 data) — yellow
  HX_SCK: "#a8dd6b", // HX711 clock — light green
  HX_DT:  "#5ec2ff", // HX711 data — light blue
  LOAD: "#8b5a3c"    // Load cell excitation/signal — brown
};

// ─── Component positions ──────────────────────────────────────────────────
// MCU at center
const MCU = {
  cx: 600, cy: 380,
  w: 140, h: 220
};
// Pin positions (1..14) — 7 on each side
// Left pins (1-7) at x = MCU.cx - MCU.w/2 = 530
// Right pins (14-8) at x = MCU.cx + MCU.w/2 = 670
function mcuPin(num) {
  // Pin layout: 1..7 down-left, 14..8 down-right
  const topY = MCU.cy - MCU.h/2 + 28;
  const step = 24;
  if (num >= 1 && num <= 7) {
    return { x: MCU.cx - MCU.w/2, y: topY + (num - 1) * step, side: "left", name: mcuPinName(num) };
  } else {
    const i = 14 - num;   // 14→0, 13→1, ... 8→6
    return { x: MCU.cx + MCU.w/2, y: topY + i * step, side: "right", name: mcuPinName(num) };
  }
}
function mcuPinName(n) {
  return ["A0/D0","A1/D1","A2/D2","A3/D3","SDA/D4","SCL/D5","TX/D6",
          "D7/RX","D8/SCK","D9/MISO","D10/MOSI","3V3","GND","5V"][n-1];
}

// BME280 (top-left-center) — 4 pins (Vin, GND, SCL, SDA) at bottom
const BME = { cx: 380, cy: 130, w: 110, h: 60 };
function bmePin(name) {
  const base = BME.cy + BME.h/2;
  const x0 = BME.cx - 30;
  const order = ["Vin", "GND", "SCL", "SDA"];
  const idx = order.indexOf(name);
  return { x: x0 + idx * 20, y: base, side: "down", name };
}

// OLED (top-right-center) — 4 pins (GND, VCC, SCL, SDA) at bottom
const OLED = { cx: 580, cy: 130, w: 120, h: 60 };
function oledPin(name) {
  const base = OLED.cy + OLED.h/2;
  const x0 = OLED.cx - 30;
  const order = ["GND", "VCC", "SCL", "SDA"];
  const idx = order.indexOf(name);
  return { x: x0 + idx * 20, y: base, side: "down", name };
}

// Button (top-far-left)
const BTN = { cx: 210, cy: 170, w: 80, h: 40 };
function btnPin(side) {
  // Two terminals: left (GND) and right (to D6/TX)
  return side === "left"
    ? { x: BTN.cx - BTN.w/2, y: BTN.cy, side: "left", name: "GND" }
    : { x: BTN.cx + BTN.w/2, y: BTN.cy, side: "right", name: "OUT" };
}

// INMP441 microphone (left of MCU)
const MIC = { cx: 300, cy: 430, w: 130, h: 120 };
function micPin(name) {
  // Right-side pins: SCK, WS, L/R  (top to bottom)
  // Left-side pins: SD, VDD, GND
  const right = { "SCK": 0, "WS": 1, "L/R": 2 };
  const left = { "SD": 0, "VDD": 1, "GND": 2 };
  if (name in right) {
    const step = 28;
    return { x: MIC.cx + MIC.w/2, y: MIC.cy - 30 + right[name] * step, side: "right", name };
  } else {
    const step = 28;
    return { x: MIC.cx - MIC.w/2, y: MIC.cy - 30 + left[name] * step, side: "left", name };
  }
}

// HX711 (below MCU-left)
const HX = { cx: 400, cy: 620, w: 120, h: 100 };
function hxPin(name) {
  // Left side: E+ E- A- A+ B- B+ (loadcell side)
  // Right side: GND DT SCK VCC
  const leftPins = ["E+", "E-", "A-", "A+", "B-", "B+"];
  const rightPins = ["GND", "DT", "SCK", "VCC"];
  const step = 14;
  if (leftPins.includes(name)) {
    const i = leftPins.indexOf(name);
    return { x: HX.cx - HX.w/2, y: HX.cy - 38 + i * step, side: "left", name };
  } else {
    const i = rightPins.indexOf(name);
    return { x: HX.cx + HX.w/2, y: HX.cy - 18 + i * 18, side: "right", name };
  }
}

// Loadcell (far left bottom)
const LOADCELL = { cx: 140, cy: 620, w: 80, h: 90 };
function loadcellPin(name) {
  const order = ["E+", "E-", "A-", "A+", "B-", "B+"];
  const i = order.indexOf(name);
  const step = 14;
  return { x: LOADCELL.cx + LOADCELL.w/2, y: LOADCELL.cy - 38 + i * step, side: "right", name };
}

// MAX98357A amp (right of MCU)
const AMP = { cx: 900, cy: 450, w: 130, h: 130 };
function ampPin(name) {
  // Left side: LRCLK, BCLK, DIN, GND, 2.5-5.5V
  // Bottom: SPK-, SPK+
  const leftPins = ["LRCLK", "BCLK", "DIN", "GND", "VIN"];
  if (leftPins.includes(name)) {
    const step = 22;
    const i = leftPins.indexOf(name);
    return { x: AMP.cx - AMP.w/2, y: AMP.cy - 44 + i * step, side: "left", name };
  }
  if (name === "SPK-") return { x: AMP.cx - 20, y: AMP.cy + AMP.h/2, side: "down", name };
  if (name === "SPK+") return { x: AMP.cx + 20, y: AMP.cy + AMP.h/2, side: "down", name };
}

// Speaker
const SPK = { cx: 1030, cy: 650, r: 38 };
function spkPin(name) {
  if (name === "in1") return { x: SPK.cx - 20, y: SPK.cy - SPK.r, side: "up", name };
  if (name === "in2") return { x: SPK.cx + 20, y: SPK.cy - SPK.r, side: "up", name };
}

// ─── Wiring definition ──────────────────────────────────────────────────
// Each wire: { id, from, to, color, bus }
// Routing: auto orthogonal via intermediate waypoints (list of {x,y})

// Connections match EasyEDA schematic SCH_New-Project3_2026-04-24.json exactly.
// Verified: each W~ entry in that JSON is represented here with matching pin assignments.
const WIRES = [
  // ── Power rails ──────────────────────────────────────────────────────
  // 5V (pin 14) → MAX98357A 2.5-5.5V  (JSON: W~670 -335 670 -460 545 -460, red)
  { id: "pwr-amp-vin", color: C.VCC5, bus: "pwr",
    from: mcuPin(14), to: ampPin("VIN"),
    path: [mcuPin(14), {x: 770, y: mcuPin(14).y}, {x: 770, y: ampPin("VIN").y}, ampPin("VIN")] },

  // 3V3 (pin 12) → OLED VCC  (JSON: W~515 -605 515 -540 570 -540 570 -440 545 -440, violet)
  { id: "pwr-oled-vcc", color: C.VCC3, bus: "pwr",
    from: mcuPin(12), to: oledPin("VCC"),
    path: [mcuPin(12), {x: 820, y: mcuPin(12).y}, {x: 820, y: 50}, {x: oledPin("VCC").x, y: 50}, oledPin("VCC")] },
  // 3V3 → BME280 Vin (branches off VCC rail)
  { id: "pwr-bme-vin", color: C.VCC3, bus: "pwr",
    from: oledPin("VCC"), to: bmePin("Vin"),
    path: [{x: oledPin("VCC").x, y: 50}, {x: bmePin("Vin").x, y: 50}, bmePin("Vin")] },
  // 3V3 → INMP441 VDD  (JSON: W~570 -540 215 -540 215 -430 225 -430, violet)
  { id: "pwr-mic-vdd", color: C.VCC3, bus: "pwr",
    from: mcuPin(12), to: micPin("VDD"),
    path: [mcuPin(12), {x: 820, y: mcuPin(12).y}, {x: 820, y: 680}, {x: 215, y: 680}, {x: 215, y: micPin("VDD").y}, micPin("VDD")] },
  // 3V3 → HX711 VCC  (JSON: W~375 -280 570 -280 570 -440, violet)
  { id: "pwr-hx-vcc", color: C.VCC3, bus: "pwr",
    from: mcuPin(12), to: hxPin("VCC"),
    path: [{x: 820, y: mcuPin(12).y}, {x: 820, y: 680}, {x: 540, y: 680}, {x: 540, y: hxPin("VCC").y}, hxPin("VCC")] },

  // ── GND rail (pin 13) — shared via (545,-450) junction ───────────────
  // GND → MAX98357A GND  (JSON: W~545 -450 660 -450 660 -335, black)
  { id: "gnd-amp", color: C.GND, bus: "gnd",
    from: mcuPin(13), to: ampPin("GND"),
    path: [mcuPin(13), {x: 790, y: mcuPin(13).y}, {x: 790, y: ampPin("GND").y}, ampPin("GND")] },
  // GND → OLED GND  (JSON: W~505 -605 505 -535 640 -535 640 -450, black — branches off MAX GND wire at 640,-450)
  { id: "gnd-oled", color: C.GND, bus: "gnd",
    from: mcuPin(13), to: oledPin("GND"),
    path: [{x: 790, y: mcuPin(13).y}, {x: 790, y: 65}, {x: oledPin("GND").x, y: 65}, oledPin("GND")] },
  // GND → BME280 GND  (JSON: W~435 -595 435 -575 505 -575 505 -575, branch off OLED GND)
  { id: "gnd-bme", color: C.GND, bus: "gnd",
    from: oledPin("GND"), to: bmePin("GND"),
    path: [{x: oledPin("GND").x, y: 65}, {x: bmePin("GND").x, y: 65}, bmePin("GND")] },
  // GND → Button U3 pin 1  (JSON: W~305 -585 305 -615 400 -615 400 -575 435 -575, black — branches to BME GND)
  { id: "gnd-btn", color: C.GND, bus: "gnd",
    from: bmePin("GND"), to: btnPin("left"),
    path: [bmePin("GND"), {x: bmePin("GND").x, y: 45}, {x: btnPin("left").x - 10, y: 45}, {x: btnPin("left").x - 10, y: btnPin("left").y}, btnPin("left")] },
  // HX711 GND  (JSON: W~375 -310 585 -310 585 -350, joins common GND at 585,-350 on MCU-side GND rail)
  { id: "gnd-hx", color: C.GND, bus: "gnd",
    from: mcuPin(13), to: hxPin("GND"),
    path: [{x: 790, y: mcuPin(13).y}, {x: 790, y: 720}, {x: hxPin("GND").x + 30, y: 720}, {x: hxPin("GND").x + 30, y: hxPin("GND").y}, hxPin("GND")] },
  // INMP441 L/R → GND  (JSON: W~585 -450 ... 345 -350 345 -410)
  { id: "gnd-mic-lr", color: C.GND, bus: "gnd",
    from: mcuPin(13), to: micPin("L/R"),
    path: [{x: 790, y: mcuPin(13).y}, {x: 790, y: 525}, {x: 450, y: 525}, {x: 450, y: micPin("L/R").y}, micPin("L/R")] },
  // INMP441 GND  (JSON: W~225 -410 225 -380 345 -380 — joins L/R GND at 345,-380)
  { id: "gnd-mic", color: C.GND, bus: "gnd",
    from: micPin("L/R"), to: micPin("GND"),
    path: [micPin("L/R"), {x: 450, y: micPin("L/R").y + 40}, {x: 215, y: micPin("L/R").y + 40}, {x: 215, y: micPin("GND").y}, micPin("GND")] },

  // ── I2C bus (shared between OLED and BME280) ─────────────────────────
  // SDA → OLED (D4, pin 5)  (JSON: W~535 -605 535 -550 400 -550 400 -420 405 -420, magenta)
  { id: "i2c-sda-oled", color: C.SDA, bus: "i2c",
    from: mcuPin(5), to: oledPin("SDA"),
    path: [mcuPin(5), {x: 495, y: mcuPin(5).y}, {x: 495, y: 75}, {x: oledPin("SDA").x, y: 75}, oledPin("SDA")] },
  // SDA branches to BME280 SDA  (JSON: W~455 -595 455 -550 — junction on OLED SDA at y=-550)
  { id: "i2c-sda-bme", color: C.SDA, bus: "i2c",
    from: oledPin("SDA"), to: bmePin("SDA"),
    path: [{x: 495, y: 75}, {x: bmePin("SDA").x, y: 75}, bmePin("SDA")] },
  // SCL → OLED (D5, pin 6)  (JSON: W~525 -605 525 -560 370 -560 370 -410 405 -410, teal)
  { id: "i2c-scl-oled", color: C.SCL, bus: "i2c",
    from: mcuPin(6), to: oledPin("SCL"),
    path: [mcuPin(6), {x: 485, y: mcuPin(6).y}, {x: 485, y: 85}, {x: oledPin("SCL").x, y: 85}, oledPin("SCL")] },
  // SCL branches to BME280 SCL
  { id: "i2c-scl-bme", color: C.SCL, bus: "i2c",
    from: oledPin("SCL"), to: bmePin("SCL"),
    path: [{x: 485, y: 85}, {x: bmePin("SCL").x, y: 85}, bmePin("SCL")] },

  // ── Button U3 → A1/D1 (pin 2) — GPIO interrupt for AI trigger ───────
  // JSON: W~345 -585 390 -585 390 -450 405 -450, yellow #FFFF00
  { id: "gpio-btn", color: C.GPIO, bus: "gpio",
    from: btnPin("right"), to: mcuPin(2),
    path: [btnPin("right"), {x: 420, y: btnPin("right").y}, {x: 420, y: mcuPin(2).y}, mcuPin(2)] },

  // ── INMP441 I2S (recording) to MCU ───────────────────────────────────
  // SCK → A2/D2 (pin 3)  (JSON: W~345 -450 345 -440 405 -440, green #008800)
  { id: "i2s-in-sck", color: C.I2S_BCLK, bus: "i2s-in",
    from: micPin("SCK"), to: mcuPin(3),
    path: [micPin("SCK"), {x: micPin("SCK").x + 30, y: micPin("SCK").y}, {x: micPin("SCK").x + 30, y: mcuPin(3).y}, mcuPin(3)] },
  // WS → A3/D3 (pin 4)  (JSON: W~345 -430 405 -430, purple #993399)
  { id: "i2s-in-ws", color: C.I2S_WS, bus: "i2s-in",
    from: micPin("WS"), to: mcuPin(4),
    path: [micPin("WS"), mcuPin(4)] },
  // SD (data from mic) → TX/D6 (pin 7)  (JSON: W~225 -450 225 -485 360 -485 360 -400 405 -400, olive #CCCC66)
  { id: "i2s-in-sd", color: C.I2S_DATA, bus: "i2s-in",
    from: micPin("SD"), to: mcuPin(7),
    path: [micPin("SD"), {x: micPin("SD").x - 20, y: micPin("SD").y}, {x: micPin("SD").x - 20, y: 260}, {x: 465, y: 260}, {x: 465, y: mcuPin(7).y}, mcuPin(7)] },

  // ── HX711 to MCU ─────────────────────────────────────────────────────
  // DT (data) → A0/D0 (pin 1)  (JSON: W~375 -300 385 -300 385 -460 405 -460, teal #006699)
  { id: "gpio-hx-dt", color: C.HX_DT, bus: "gpio",
    from: hxPin("DT"), to: mcuPin(1),
    path: [hxPin("DT"), {x: 460, y: hxPin("DT").y}, {x: 460, y: mcuPin(1).y}, mcuPin(1)] },
  // SCK (clock) → D10/MOSI (pin 11)  (JSON: W~375 -290 560 -290 560 -430 545 -430, brown #993300)
  { id: "gpio-hx-sck", color: C.HX_SCK, bus: "gpio",
    from: hxPin("SCK"), to: mcuPin(11),
    path: [hxPin("SCK"), {x: 810, y: hxPin("SCK").y}, {x: 810, y: mcuPin(11).y}, mcuPin(11)] },

  // ── Loadcell to HX711 ────────────────────────────────────────────────
  { id: "load-ep", color: C.VCC5, bus: "load",
    from: loadcellPin("E+"), to: hxPin("E+"),
    path: [loadcellPin("E+"), hxPin("E+")] },
  { id: "load-en", color: C.GND, bus: "load",
    from: loadcellPin("E-"), to: hxPin("E-"),
    path: [loadcellPin("E-"), hxPin("E-")] },
  { id: "load-ap", color: "#006800", bus: "load",
    from: loadcellPin("A+"), to: hxPin("A+"),
    path: [loadcellPin("A+"), {x: 230, y: loadcellPin("A+").y}, {x: 230, y: hxPin("A+").y}, hxPin("A+")] },
  { id: "load-an", color: "#bbbbbb", bus: "load",
    from: loadcellPin("A-"), to: hxPin("A-"),
    path: [loadcellPin("A-"), {x: 240, y: loadcellPin("A-").y}, {x: 240, y: hxPin("A-").y}, hxPin("A-")] },

  // ── MAX98357A I2S (playback) to MCU ──────────────────────────────────
  // LRCLK → D7/RX (pin 8)  (JSON: W~610 -335 610 -400 545 -400, navy #000099)
  { id: "i2s-out-lrclk", color: C.I2S_WS, bus: "i2s-out",
    from: ampPin("LRCLK"), to: mcuPin(8),
    path: [ampPin("LRCLK"), {x: ampPin("LRCLK").x, y: 540}, {x: 755, y: 540}, {x: 755, y: mcuPin(8).y}, mcuPin(8)] },
  // BCLK → D8/SCK (pin 9)   (JSON: W~620 -335 620 -410 545 -410, dark green #008800)
  { id: "i2s-out-bclk", color: C.I2S_BCLK, bus: "i2s-out",
    from: ampPin("BCLK"), to: mcuPin(9),
    path: [ampPin("BCLK"), {x: ampPin("BCLK").x, y: 550}, {x: 745, y: 550}, {x: 745, y: mcuPin(9).y}, mcuPin(9)] },
  // DIN → D9/MISO (pin 10)  (JSON: W~630 -335 630 -420 545 -420, teal #009999)
  { id: "i2s-out-din", color: C.I2S_DATA, bus: "i2s-out",
    from: ampPin("DIN"), to: mcuPin(10),
    path: [ampPin("DIN"), {x: ampPin("DIN").x, y: 560}, {x: 735, y: 560}, {x: 735, y: mcuPin(10).y}, mcuPin(10)] },

  // ── Speaker wires ────────────────────────────────────────────────────
  { id: "spk-neg", color: "#555", bus: "spk",
    from: ampPin("SPK-"), to: spkPin("in1"),
    path: [ampPin("SPK-"), {x: ampPin("SPK-").x, y: 605}, {x: spkPin("in1").x, y: 605}, spkPin("in1")] },
  { id: "spk-pos", color: "#e63946", bus: "spk",
    from: ampPin("SPK+"), to: spkPin("in2"),
    path: [ampPin("SPK+"), {x: ampPin("SPK+").x, y: 620}, {x: spkPin("in2").x, y: 620}, spkPin("in2")] }
];

// ─── Render helpers ───────────────────────────────────────────────────────
function pointsToD(points) {
  if (!points.length) return "";
  return "M " + points.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ");
}

function wireSVG(w) {
  const d = pointsToD(w.path);
  return `
    <g class="wire" data-id="${w.id}" data-bus="${w.bus}">
      <path d="${d}" stroke="${w.color}" stroke-width="2.2" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity="0.9"/>
      <path class="wire-flow" d="${d}" stroke="${w.color}" stroke-width="3" fill="none" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="8 12" opacity="0" filter="url(#glow)"/>
    </g>
  `;
}

function pinDot(p, color, labelAbove = false) {
  const label = p.name ? `<text x="${p.x}" y="${p.y + (labelAbove ? -8 : 16)}" text-anchor="middle" fill="#8bb39b" font-family="monospace" font-size="8">${p.name}</text>` : "";
  return `<circle cx="${p.x}" cy="${p.y}" r="2.8" fill="${color}" stroke="#0a120c" stroke-width="0.8"/>${label}`;
}

function drawMCU() {
  const x = MCU.cx - MCU.w/2, y = MCU.cy - MCU.h/2;
  let pins = "";
  for (let i = 1; i <= 14; i++) {
    const p = mcuPin(i);
    const isLeft = p.side === "left";
    const labelX = isLeft ? p.x + 10 : p.x - 10;
    const anchor = isLeft ? "start" : "end";
    const numX = isLeft ? p.x - 14 : p.x + 14;
    pins += `
      <rect x="${p.x - 5}" y="${p.y - 3}" width="10" height="6" fill="#c0c0c0" stroke="#555" stroke-width="0.5"/>
      <text x="${numX}" y="${p.y + 3}" text-anchor="${isLeft ? 'end' : 'start'}" fill="#888" font-family="monospace" font-size="7">${i}</text>
      <text x="${labelX}" y="${p.y + 3}" text-anchor="${anchor}" fill="#cfd" font-family="monospace" font-size="8">${p.name}</text>
      <circle cx="${p.x}" cy="${p.y}" r="1.5" fill="#888"/>
    `;
  }
  return `
    <g id="mcu">
      <rect x="${x - 2}" y="${y - 2}" width="${MCU.w + 4}" height="${MCU.h + 4}" rx="7" fill="#000" opacity="0.5"/>
      <rect x="${x}" y="${y}" width="${MCU.w}" height="${MCU.h}" rx="6" fill="url(#mcuGrad)" stroke="#444" stroke-width="1"/>
      <!-- USB-C -->
      <rect x="${MCU.cx - 24}" y="${y - 14}" width="48" height="14" rx="3" fill="#c0c0c0"/>
      <rect x="${MCU.cx - 20}" y="${y - 10}" width="40" height="6" rx="1" fill="#1a1a1a"/>
      <!-- Shield / SoC -->
      <rect x="${MCU.cx - 45}" y="${MCU.cy - 30}" width="90" height="50" rx="4" fill="#2a2a2a" stroke="#555" stroke-width="0.5"/>
      <text x="${MCU.cx}" y="${MCU.cy - 8}" text-anchor="middle" fill="#aaa" font-family="monospace" font-size="10" font-weight="bold">U1</text>
      <text x="${MCU.cx}" y="${MCU.cy + 6}" text-anchor="middle" fill="#777" font-family="monospace" font-size="8">XIAO ESP32-S3</text>
      <text x="${MCU.cx}" y="${MCU.cy + 18}" text-anchor="middle" fill="#555" font-family="monospace" font-size="6">SEEED STUDIO</text>
      <!-- Status LED -->
      <circle id="mcu-led" cx="${MCU.cx - 40}" cy="${y + 20}" r="3.5" fill="#3ddc97" filter="url(#glow)">
        <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/>
      </circle>
      <!-- Wi-Fi icon -->
      <g transform="translate(${MCU.cx + 38}, ${y + 18})">
        <path d="M 0 0 Q -6 -6 -12 0" stroke="#4ab3ff" stroke-width="1.2" fill="none"/>
        <path d="M 2 3 Q -6 -8 -14 3" stroke="#4ab3ff" stroke-width="1.2" fill="none"/>
        <circle cx="-6" cy="5" r="1.8" fill="#4ab3ff"/>
      </g>
      <!-- Button on the MCU silk (real board has BOOT + RESET) -->
      <rect x="${MCU.cx - 30}" y="${MCU.cy + 40}" width="14" height="14" rx="2" fill="#2a2a2a" stroke="#555"/>
      <rect x="${MCU.cx + 16}" y="${MCU.cy + 40}" width="14" height="14" rx="2" fill="#2a2a2a" stroke="#555"/>
      <circle cx="${MCU.cx - 23}" cy="${MCU.cy + 47}" r="3" fill="#1a1a1a"/>
      <circle cx="${MCU.cx + 23}" cy="${MCU.cy + 47}" r="3" fill="#1a1a1a"/>
      ${pins}
    </g>
  `;
}

function drawBME() {
  const x = BME.cx - BME.w/2, y = BME.cy - BME.h/2;
  let pins = "";
  ["Vin","GND","SCL","SDA"].forEach((n, i) => {
    const p = bmePin(n);
    pins += `
      <rect x="${p.x - 4}" y="${p.y - 6}" width="8" height="10" fill="#c0c0c0" stroke="#555" stroke-width="0.5"/>
      <text x="${p.x}" y="${p.y - 8}" text-anchor="middle" fill="#cfd" font-family="monospace" font-size="7">${n}</text>
      <text x="${p.x}" y="${y - 2}" text-anchor="middle" fill="#888" font-family="monospace" font-size="6">${i+1}</text>
      <circle cx="${p.x}" cy="${p.y}" r="1.8" fill="#888"/>
    `;
  });
  return `
    <g id="bme-module">
      <rect x="${x}" y="${y}" width="${BME.w}" height="${BME.h}" rx="4" fill="url(#moduleGrad)" stroke="#2a4a3a" stroke-width="1"/>
      <text x="${BME.cx}" y="${y + 14}" text-anchor="middle" fill="#6fb08e" font-family="monospace" font-size="8">TEMP_HUM_SENSOR</text>
      <text x="${BME.cx}" y="${y + 26}" text-anchor="middle" fill="#3ddc97" font-family="monospace" font-size="10" font-weight="bold">BME280</text>
      <!-- Sensor chip -->
      <rect x="${BME.cx - 7}" y="${BME.cy + 2}" width="14" height="14" rx="2" fill="#1a1a1a" stroke="#444" stroke-width="0.5"/>
      <circle cx="${BME.cx}" cy="${BME.cy + 9}" r="3" fill="#2a2a2a"/>
      <text id="bme-readout" x="${BME.cx}" y="${y - 8}" text-anchor="middle" fill="#3ddc97" font-family="monospace" font-size="9">23.5°C 55%</text>
      ${pins}
    </g>
  `;
}

function drawOLED() {
  const x = OLED.cx - OLED.w/2, y = OLED.cy - OLED.h/2;
  let pins = "";
  ["GND","VCC","SCL","SDA"].forEach((n, i) => {
    const p = oledPin(n);
    pins += `
      <rect x="${p.x - 4}" y="${p.y - 6}" width="8" height="10" fill="#c0c0c0" stroke="#555" stroke-width="0.5"/>
      <text x="${p.x}" y="${p.y - 8}" text-anchor="middle" fill="#cfd" font-family="monospace" font-size="7">${n}</text>
      <text x="${p.x}" y="${y - 2}" text-anchor="middle" fill="#888" font-family="monospace" font-size="6">${i+3}</text>
      <circle cx="${p.x}" cy="${p.y}" r="1.8" fill="#888"/>
    `;
  });
  return `
    <g id="oled-module">
      <rect x="${x}" y="${y}" width="${OLED.w}" height="${OLED.h}" rx="4" fill="url(#moduleGrad)" stroke="#2a4a3a" stroke-width="1"/>
      <text x="${OLED.cx}" y="${y + 14}" text-anchor="middle" fill="#6fb08e" font-family="monospace" font-size="8">U2 · OLED 0.96"</text>
      <rect x="${OLED.cx - 42}" y="${OLED.cy - 6}" width="84" height="22" rx="2" fill="#001825" stroke="#222" stroke-width="0.5"/>
      <text id="oled-mini-text" x="${OLED.cx}" y="${OLED.cy + 9}" text-anchor="middle" fill="#7df9ff" font-family="monospace" font-size="8">STUDY BUDDY</text>
      ${pins}
    </g>
  `;
}

function drawButton() {
  const x = BTN.cx - BTN.w/2, y = BTN.cy - BTN.h/2;
  const pl = btnPin("left"), pr = btnPin("right");
  return `
    <g id="btn-module" style="cursor: pointer;">
      <title>U3 BUTTON 1 — AI tetikleme (GPIO D6)</title>
      <rect x="${x}" y="${y}" width="${BTN.w}" height="${BTN.h}" rx="4" fill="url(#moduleGrad)" stroke="#2a4a3a" stroke-width="1"/>
      <text x="${BTN.cx}" y="${y - 18}" text-anchor="middle" fill="#6fb08e" font-family="monospace" font-size="7">U3</text>
      <text x="${BTN.cx}" y="${y - 6}" text-anchor="middle" fill="#ffcf4a" font-family="monospace" font-size="9" font-weight="bold">BUTTON 1</text>
      <!-- Button body -->
      <g id="btn-body">
        <rect x="${BTN.cx - 14}" y="${BTN.cy - 10}" width="28" height="20" rx="3" fill="#1a1a1a" stroke="#444" stroke-width="1"/>
        <circle id="btn-cap" cx="${BTN.cx}" cy="${BTN.cy}" r="8" fill="#ff5a5f" stroke="#8a2a2d" stroke-width="1.5">
          <animate attributeName="opacity" values="1;0.85;1" dur="3s" repeatCount="indefinite"/>
        </circle>
        <circle cx="${BTN.cx - 2}" cy="${BTN.cy - 2}" r="2" fill="#ffabad" opacity="0.7"/>
      </g>
      <circle id="btn-halo" cx="${BTN.cx}" cy="${BTN.cy}" r="14" fill="none" stroke="#ff5a5f" stroke-width="2" opacity="0"/>
      <!-- Terminals -->
      ${pinDot(pl, "#888", true)}
      ${pinDot(pr, "#888", true)}
      <text x="${BTN.cx}" y="${y + BTN.h + 22}" text-anchor="middle" fill="#ffcf4a" font-family="monospace" font-size="7">→ D6 · TX</text>
    </g>
  `;
}

function drawMic() {
  const x = MIC.cx - MIC.w/2, y = MIC.cy - MIC.h/2;
  let pins = "";
  [["SD",1,"left"],["VDD",2,"left"],["GND",3,"left"],["SCK",1,"right"],["WS",2,"right"],["L/R",3,"right"]].forEach(([n, num, s]) => {
    const p = micPin(n);
    const isLeft = s === "left";
    const numX = isLeft ? x + 4 : x + MIC.w - 4;
    const labelX = isLeft ? x + 18 : x + MIC.w - 18;
    const anchor = isLeft ? "start" : "end";
    pins += `
      <rect x="${p.x - 4}" y="${p.y - 3}" width="8" height="6" fill="#c0c0c0" stroke="#555" stroke-width="0.5"/>
      <text x="${numX}" y="${p.y + 3}" text-anchor="${isLeft ? 'start' : 'end'}" fill="#888" font-family="monospace" font-size="7">${num}</text>
      <text x="${labelX}" y="${p.y + 3}" text-anchor="${anchor}" fill="#cfd" font-family="monospace" font-size="8">${n}</text>
      <circle cx="${p.x}" cy="${p.y}" r="1.6" fill="#888"/>
    `;
  });
  return `
    <g id="mic-module">
      <rect x="${x}" y="${y}" width="${MIC.w}" height="${MIC.h}" rx="4" fill="url(#moduleGrad)" stroke="#2a4a3a" stroke-width="1"/>
      <text x="${MIC.cx}" y="${y - 14}" text-anchor="middle" fill="#6fb08e" font-family="monospace" font-size="8">INMP1</text>
      <text x="${MIC.cx}" y="${y - 2}" text-anchor="middle" fill="#4ab3ff" font-family="monospace" font-size="9" font-weight="bold">MICROPHONE</text>
      <!-- Mic capsule -->
      <circle cx="${MIC.cx}" cy="${MIC.cy}" r="18" fill="#1a1a1a" stroke="#555"/>
      <circle cx="${MIC.cx}" cy="${MIC.cy}" r="12" fill="#0a0a0a"/>
      <circle cx="${MIC.cx}" cy="${MIC.cy}" r="6" fill="#2a2a2a"/>
      <!-- Active ring -->
      <circle id="mic-active" cx="${MIC.cx}" cy="${MIC.cy}" r="22" fill="none" stroke="#4ab3ff" stroke-width="2" opacity="0" filter="url(#glow)"/>
      <text x="${MIC.cx}" y="${y + MIC.h + 12}" text-anchor="middle" fill="#4ab3ff" font-family="monospace" font-size="7">I2S MEMS · INMP441</text>
      ${pins}
    </g>
  `;
}

function drawHX711() {
  const x = HX.cx - HX.w/2, y = HX.cy - HX.h/2;
  let pins = "";
  ["E+","E-","A-","A+","B-","B+"].forEach((n, i) => {
    const p = hxPin(n);
    pins += `
      <rect x="${p.x - 4}" y="${p.y - 3}" width="8" height="6" fill="#c0c0c0" stroke="#555" stroke-width="0.5"/>
      <text x="${p.x - 10}" y="${p.y + 3}" text-anchor="end" fill="#888" font-family="monospace" font-size="7">${i+1}</text>
      <text x="${p.x + 10}" y="${p.y + 3}" text-anchor="start" fill="#cfd" font-family="monospace" font-size="8">${n}</text>
      <circle cx="${p.x}" cy="${p.y}" r="1.6" fill="#888"/>
    `;
  });
  ["GND","DT","SCK","VCC"].forEach((n, i) => {
    const p = hxPin(n);
    pins += `
      <rect x="${p.x - 4}" y="${p.y - 3}" width="8" height="6" fill="#c0c0c0" stroke="#555" stroke-width="0.5"/>
      <text x="${p.x + 10}" y="${p.y + 3}" text-anchor="start" fill="#888" font-family="monospace" font-size="7">${i+7}</text>
      <text x="${p.x - 10}" y="${p.y + 3}" text-anchor="end" fill="#cfd" font-family="monospace" font-size="8">${n}</text>
      <circle cx="${p.x}" cy="${p.y}" r="1.6" fill="#888"/>
    `;
  });
  return `
    <g id="hx-module">
      <rect x="${x}" y="${y}" width="${HX.w}" height="${HX.h}" rx="4" fill="url(#moduleGrad)" stroke="#2a4a3a" stroke-width="1"/>
      <text x="${HX.cx}" y="${y - 14}" text-anchor="middle" fill="#6fb08e" font-family="monospace" font-size="8">WEIGHT_AMP</text>
      <text x="${HX.cx}" y="${y - 2}" text-anchor="middle" fill="#ffcf4a" font-family="monospace" font-size="9" font-weight="bold">HX711</text>
      <!-- Chip -->
      <rect x="${HX.cx - 16}" y="${HX.cy - 10}" width="32" height="20" rx="2" fill="#1a1a1a" stroke="#444"/>
      <text x="${HX.cx}" y="${HX.cy + 4}" text-anchor="middle" fill="#888" font-family="monospace" font-size="7">HX711</text>
      <text x="${HX.cx}" y="${y + HX.h + 14}" text-anchor="middle" fill="#6fb08e" font-family="monospace" font-size="7">24-bit ADC</text>
      ${pins}
    </g>
  `;
}

function drawLoadcell() {
  const x = LOADCELL.cx - LOADCELL.w/2, y = LOADCELL.cy - LOADCELL.h/2;
  let pins = "";
  ["E+","E-","A-","A+","B-","B+"].forEach((n, i) => {
    const p = loadcellPin(n);
    pins += `
      <rect x="${p.x - 4}" y="${p.y - 3}" width="8" height="6" fill="#c0c0c0" stroke="#555" stroke-width="0.5"/>
      <text x="${p.x - 10}" y="${p.y + 3}" text-anchor="end" fill="#cfd" font-family="monospace" font-size="7">${n}</text>
      <text x="${p.x + 10}" y="${p.y + 3}" text-anchor="start" fill="#888" font-family="monospace" font-size="7">${i+1}</text>
      <circle cx="${p.x}" cy="${p.y}" r="1.4" fill="#888"/>
    `;
  });
  return `
    <g id="loadcell-module">
      <rect x="${x}" y="${y}" width="${LOADCELL.w}" height="${LOADCELL.h}" rx="3" fill="#888" stroke="#555" stroke-width="1"/>
      <rect x="${x+3}" y="${y+3}" width="${LOADCELL.w-6}" height="${LOADCELL.h-6}" rx="2" fill="#999"/>
      <text x="${LOADCELL.cx}" y="${y - 14}" text-anchor="middle" fill="#6fb08e" font-family="monospace" font-size="8">P1</text>
      <text x="${LOADCELL.cx}" y="${y - 2}" text-anchor="middle" fill="#8b5a3c" font-family="monospace" font-size="9" font-weight="bold">Loadcell</text>
      <!-- Holes -->
      <circle cx="${LOADCELL.cx}" cy="${y + 10}" r="3" fill="#333"/>
      <circle cx="${LOADCELL.cx}" cy="${y + LOADCELL.h - 10}" r="3" fill="#333"/>
      <!-- Phone on top (realistic smartphone rendering) -->
      <g id="phone-on-cell" transform="translate(${LOADCELL.cx}, ${y - 60})">
        <!-- Drop shadow -->
        <ellipse cx="0" cy="45" rx="24" ry="3" fill="#000" opacity="0.35"/>
        <!-- Phone body / frame -->
        <rect x="-22" y="-42" width="44" height="84" rx="7" ry="7" fill="#0f0f12" stroke="#2a2a2e" stroke-width="1"/>
        <rect x="-20.5" y="-40.5" width="41" height="81" rx="6" ry="6" fill="none" stroke="#3a3a40" stroke-width="0.5"/>
        <!-- Screen -->
        <rect x="-19" y="-38" width="38" height="76" rx="4" ry="4" fill="#0a1a2a"/>
        <!-- Notch -->
        <rect x="-7" y="-38" width="14" height="4" rx="2" fill="#000"/>
        <circle cx="5" cy="-36" r="1" fill="#1a3a5a"/>
        <!-- Status bar -->
        <text x="-15" y="-30" fill="#9ff" font-family="monospace" font-size="4">09:41</text>
        <rect x="12" y="-33" width="5" height="3" rx="0.5" fill="none" stroke="#9ff" stroke-width="0.4"/>
        <rect x="13" y="-32" width="2.5" height="1" fill="#9ff"/>
        <!-- Wallpaper glow -->
        <circle cx="0" cy="-5" r="14" fill="#1a3d5d" opacity="0.6"/>
        <!-- Lock screen time -->
        <text x="0" y="-8" text-anchor="middle" fill="#e6f4ea" font-family="monospace" font-size="8" font-weight="bold">12:25</text>
        <text x="0" y="0" text-anchor="middle" fill="#7df9ff" font-family="monospace" font-size="3.5">Nisan 24</text>
        <!-- App icons grid -->
        <g opacity="0.9">
          <rect x="-16" y="8" width="7" height="7" rx="1.5" fill="#3ddc97"/>
          <rect x="-7" y="8" width="7" height="7" rx="1.5" fill="#4ab3ff"/>
          <rect x="2" y="8" width="7" height="7" rx="1.5" fill="#ffcf4a"/>
          <rect x="11" y="8" width="7" height="7" rx="1.5" fill="#ff5a5f"/>
          <rect x="-16" y="18" width="7" height="7" rx="1.5" fill="#b48cff"/>
          <rect x="-7" y="18" width="7" height="7" rx="1.5" fill="#ff9f43"/>
          <rect x="2" y="18" width="7" height="7" rx="1.5" fill="#6fb08e"/>
          <rect x="11" y="18" width="7" height="7" rx="1.5" fill="#e63946"/>
        </g>
        <!-- Home indicator -->
        <rect x="-8" y="33" width="16" height="1.5" rx="0.75" fill="#7df9ff" opacity="0.5"/>
        <!-- Side buttons -->
        <rect x="-23" y="-20" width="1" height="8" rx="0.5" fill="#2a2a2e"/>
        <rect x="-23" y="-8" width="1" height="12" rx="0.5" fill="#2a2a2e"/>
        <rect x="22" y="-15" width="1" height="14" rx="0.5" fill="#2a2a2e"/>
      </g>
      <text x="${LOADCELL.cx}" y="${y + LOADCELL.h + 14}" text-anchor="middle" fill="#6fb08e" font-family="monospace" font-size="7">LOAD CELL</text>
      ${pins}
    </g>
  `;
}

function drawAmp() {
  const x = AMP.cx - AMP.w/2, y = AMP.cy - AMP.h/2;
  let pins = "";
  const leftPins = ["LRCLK","BCLK","DIN","GND","VIN"];
  leftPins.forEach(n => {
    const p = ampPin(n);
    pins += `
      <rect x="${p.x - 4}" y="${p.y - 3}" width="8" height="6" fill="#c0c0c0" stroke="#555" stroke-width="0.5"/>
      <text x="${p.x + 10}" y="${p.y + 3}" text-anchor="start" fill="#cfd" font-family="monospace" font-size="8">${n === "VIN" ? "2.5-5.5V" : n}</text>
      <circle cx="${p.x}" cy="${p.y}" r="1.6" fill="#888"/>
    `;
  });
  ["SPK-","SPK+"].forEach(n => {
    const p = ampPin(n);
    pins += `
      <rect x="${p.x - 3}" y="${p.y - 4}" width="6" height="8" fill="#c0c0c0" stroke="#555" stroke-width="0.5"/>
      <text x="${p.x}" y="${p.y + 14}" text-anchor="middle" fill="#cfd" font-family="monospace" font-size="8">${n}</text>
      <circle cx="${p.x}" cy="${p.y}" r="1.6" fill="#888"/>
    `;
  });
  return `
    <g id="amp-module">
      <rect x="${x}" y="${y}" width="${AMP.w}" height="${AMP.h}" rx="4" fill="url(#moduleGrad)" stroke="#2a4a3a" stroke-width="1"/>
      <text x="${AMP.cx}" y="${y - 14}" text-anchor="middle" fill="#6fb08e" font-family="monospace" font-size="8">I2S_AMP</text>
      <text x="${AMP.cx}" y="${y - 2}" text-anchor="middle" fill="#4ab3ff" font-family="monospace" font-size="9" font-weight="bold">MAX98357A</text>
      <!-- Chip -->
      <rect x="${AMP.cx - 18}" y="${AMP.cy - 14}" width="36" height="28" rx="2" fill="#1a1a1a" stroke="#444"/>
      <text x="${AMP.cx}" y="${AMP.cy}" text-anchor="middle" fill="#888" font-family="monospace" font-size="7">MAX</text>
      <text x="${AMP.cx}" y="${AMP.cy + 10}" text-anchor="middle" fill="#888" font-family="monospace" font-size="7">98357A</text>
      <!-- Active ring -->
      <circle id="amp-active" cx="${AMP.cx + 45}" cy="${AMP.cy - 45}" r="4" fill="#4ab3ff" opacity="0" filter="url(#glow)"/>
      ${pins}
    </g>
  `;
}

function drawSpeaker() {
  // Grill dots for realistic speaker mesh
  let grill = "";
  for (let ring = 0; ring < 3; ring++) {
    const rr = 10 + ring * 6;
    const count = 8 + ring * 4;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const gx = SPK.cx + Math.cos(a) * rr;
      const gy = SPK.cy + Math.sin(a) * rr;
      grill += `<circle cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" r="0.9" fill="#000" opacity="0.5"/>`;
    }
  }
  return `
    <g id="speaker-module">
      <text x="${SPK.cx}" y="${SPK.cy - SPK.r - 10}" text-anchor="middle" fill="#6fb08e" font-family="monospace" font-size="8">SP1</text>
      <!-- Outer housing with rim -->
      <circle cx="${SPK.cx}" cy="${SPK.cy}" r="${SPK.r + 3}" fill="#0a0a0a" stroke="#444" stroke-width="1"/>
      <circle cx="${SPK.cx}" cy="${SPK.cy}" r="${SPK.r}" fill="url(#spkGrad)" stroke="#333" stroke-width="0.5"/>
      <!-- Inner basket -->
      <circle cx="${SPK.cx}" cy="${SPK.cy}" r="${SPK.r - 4}" fill="#1a1a1a"/>
      <!-- Cone (paper texture simulation) -->
      <circle cx="${SPK.cx}" cy="${SPK.cy}" r="${SPK.r - 8}" fill="url(#coneGrad)"/>
      <!-- Grill dot pattern -->
      ${grill}
      <!-- Dust cap / center dome -->
      <circle id="speaker-cone" cx="${SPK.cx}" cy="${SPK.cy}" r="7" fill="#0a0a0a" stroke="#444" stroke-width="0.5"/>
      <circle cx="${SPK.cx - 2}" cy="${SPK.cy - 2}" r="2" fill="#333" opacity="0.8"/>
      <!-- Mounting screws -->
      <circle cx="${SPK.cx - SPK.r + 2}" cy="${SPK.cy - SPK.r + 2}" r="1.5" fill="#555"/>
      <circle cx="${SPK.cx + SPK.r - 2}" cy="${SPK.cy - SPK.r + 2}" r="1.5" fill="#555"/>
      <circle cx="${SPK.cx - SPK.r + 2}" cy="${SPK.cy + SPK.r - 2}" r="1.5" fill="#555"/>
      <circle cx="${SPK.cx + SPK.r - 2}" cy="${SPK.cy + SPK.r - 2}" r="1.5" fill="#555"/>
      <!-- Sound waves when playing -->
      <g id="speaker-waves" opacity="0">
        <circle cx="${SPK.cx}" cy="${SPK.cy}" r="${SPK.r + 4}" fill="none" stroke="#4ab3ff" stroke-width="2">
          <animate attributeName="r" from="${SPK.r}" to="${SPK.r + 28}" dur="1s" repeatCount="indefinite"/>
          <animate attributeName="opacity" from="0.9" to="0" dur="1s" repeatCount="indefinite"/>
        </circle>
        <circle cx="${SPK.cx}" cy="${SPK.cy}" r="${SPK.r + 4}" fill="none" stroke="#4ab3ff" stroke-width="2">
          <animate attributeName="r" from="${SPK.r}" to="${SPK.r + 28}" dur="1s" begin="0.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" from="0.9" to="0" dur="1s" begin="0.5s" repeatCount="indefinite"/>
        </circle>
      </g>
      <text x="${SPK.cx}" y="${SPK.cy + SPK.r + 14}" text-anchor="middle" fill="#6fb08e" font-family="monospace" font-size="7">Speaker 8Ω · 1W</text>
    </g>
  `;
}

function junctionDots() {
  // Draw junction dots where wires split (schematic convention)
  const junctions = [
    // BME280 SDA tap → OLED SDA
    { x: bmePin("SDA").x, y: 90 },
    { x: bmePin("SCL").x, y: 95 },
    // 5V rail junctions
    { x: 730, y: 80 },
    { x: 720, y: 65 },
  ];
  return junctions.map(j => `<circle cx="${j.x}" cy="${j.y}" r="2.5" fill="#e63946" stroke="#000" stroke-width="0.5"/>`).join("");
}

// ─── Assembly ─────────────────────────────────────────────────────────────
function buildSVG() {
  const wiresSVG = WIRES.map(wireSVG).join("");
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB_W} ${VB_H}" preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="mcuGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1a1a1a"/>
          <stop offset="100%" stop-color="#0a0a0a"/>
        </linearGradient>
        <linearGradient id="moduleGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1e3a2a"/>
          <stop offset="100%" stop-color="#12241b"/>
        </linearGradient>
        <radialGradient id="spkGrad" cx="0.35" cy="0.3">
          <stop offset="0%" stop-color="#3a3a3a"/>
          <stop offset="100%" stop-color="#111"/>
        </radialGradient>
        <radialGradient id="coneGrad" cx="0.4" cy="0.4">
          <stop offset="0%" stop-color="#555"/>
          <stop offset="70%" stop-color="#2a2a2a"/>
          <stop offset="100%" stop-color="#0a0a0a"/>
        </radialGradient>
      </defs>

      <g id="viewport">
        <!-- WIRES (behind components) -->
        <g id="wires">
          ${wiresSVG}
        </g>

        <!-- Junction dots -->
        <g id="junctions">
          ${junctionDots()}
        </g>

        <!-- Components -->
        ${drawMCU()}
        ${drawBME()}
        ${drawOLED()}
        ${drawButton()}
        ${drawMic()}
        ${drawHX711()}
        ${drawLoadcell()}
        ${drawAmp()}
        ${drawSpeaker()}

        <!-- Title block -->
        <g transform="translate(${VB_W - 280}, ${VB_H - 70})">
          <rect x="0" y="0" width="260" height="60" fill="rgba(0,0,0,0.4)" stroke="#2a4a3a" stroke-width="1" rx="3"/>
          <text x="10" y="16" fill="#6fb08e" font-family="monospace" font-size="9">TITLE: Study Buddy Schematic</text>
          <text x="10" y="30" fill="#8bb39b" font-family="monospace" font-size="8">REV: 1.0 · SHEET: 1/1</text>
          <text x="10" y="44" fill="#8bb39b" font-family="monospace" font-size="8">DATE: 2026-04-24</text>
          <text x="10" y="54" fill="#3ddc97" font-family="monospace" font-size="7">ISU Embedded Systems · Spring 2026</text>
        </g>
      </g>
    </svg>
  `;
}

// ─── Runtime control ──────────────────────────────────────────────────────
export function initBoard(container) {
  container.innerHTML = buildSVG();
  const svg = container.querySelector("svg");
  const viewport = svg.querySelector("#viewport");

  // ─── Zoom & Pan ────────────────────────────────────────────────────────
  let zoom = 1, tx = 0, ty = 0;
  const MIN_ZOOM = 0.5, MAX_ZOOM = 4;

  function applyTransform() {
    viewport.setAttribute("transform", `translate(${tx} ${ty}) scale(${zoom})`);
  }

  // Convert client coordinates to SVG viewBox coordinates
  function clientToSVG(clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    const svgX = ((clientX - rect.left) / rect.width) * VB_W;
    const svgY = ((clientY - rect.top) / rect.height) * VB_H;
    return { x: svgX, y: svgY };
  }

  function zoomAt(clientX, clientY, factor) {
    const pt = clientToSVG(clientX, clientY);
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
    if (newZoom === zoom) return;
    // Keep point under cursor stable: svg = tx + zoom * content
    // content = (svg - tx) / zoom
    // new_tx = svg - newZoom * content
    const contentX = (pt.x - tx) / zoom;
    const contentY = (pt.y - ty) / zoom;
    tx = pt.x - newZoom * contentX;
    ty = pt.y - newZoom * contentY;
    zoom = newZoom;
    applyTransform();
  }

  function resetView() {
    zoom = 1; tx = 0; ty = 0;
    applyTransform();
  }

  // Wheel zoom
  container.addEventListener("wheel", (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    zoomAt(e.clientX, e.clientY, factor);
  }, { passive: false });

  // Drag to pan
  let dragging = false, startX = 0, startY = 0, startTx = 0, startTy = 0;
  container.addEventListener("pointerdown", (e) => {
    // Don't start drag when clicking interactive elements (like the button cap)
    if (e.target.closest("#btn-module")) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    startTx = tx; startTy = ty;
    container.style.cursor = "grabbing";
    container.setPointerCapture(e.pointerId);
  });
  container.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const rect = svg.getBoundingClientRect();
    const sx = VB_W / rect.width, sy = VB_H / rect.height;
    tx = startTx + (e.clientX - startX) * sx;
    ty = startTy + (e.clientY - startY) * sy;
    applyTransform();
  });
  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    container.style.cursor = "";
    try { container.releasePointerCapture(e.pointerId); } catch {}
  }
  container.addEventListener("pointerup", endDrag);
  container.addEventListener("pointercancel", endDrag);
  container.addEventListener("pointerleave", endDrag);

  // Collect flow paths per bus
  const flowsByBus = {};
  svg.querySelectorAll(".wire").forEach(g => {
    const bus = g.dataset.bus;
    const flow = g.querySelector(".wire-flow");
    (flowsByBus[bus] ||= []).push(flow);
  });

  // Animate dash offset continuously for any active flow
  let dashOffset = 0;
  function tickAnim() {
    dashOffset = (dashOffset - 0.6) % 20;
    svg.querySelectorAll(".wire-flow").forEach(p => {
      if (p.style.opacity !== "0") {
        p.style.strokeDashoffset = dashOffset;
      }
    });
    requestAnimationFrame(tickAnim);
  }
  tickAnim();

  function pulseBus(bus, durationMs = 700) {
    const flows = flowsByBus[bus] || [];
    flows.forEach(f => {
      f.style.transition = "opacity 0.15s";
      f.style.opacity = "1";
      clearTimeout(f._pt);
      f._pt = setTimeout(() => {
        f.style.opacity = "0";
      }, durationMs);
    });
  }

  function setBusActive(bus, on) {
    const flows = flowsByBus[bus] || [];
    flows.forEach(f => {
      f.style.transition = "opacity 0.2s";
      f.style.opacity = on ? "1" : "0";
    });
  }

  // Element refs
  const micActive = svg.querySelector("#mic-active");
  const ampActive = svg.querySelector("#amp-active");
  const speakerWaves = svg.querySelector("#speaker-waves");
  const phoneOnCell = svg.querySelector("#phone-on-cell");
  const bmeReadout = svg.querySelector("#bme-readout");
  const oledMiniText = svg.querySelector("#oled-mini-text");
  const mcuLed = svg.querySelector("#mcu-led");
  const btnModule = svg.querySelector("#btn-module");
  const btnCap = svg.querySelector("#btn-cap");
  const btnHalo = svg.querySelector("#btn-halo");

  // Button press
  let onBtnPress = null;
  btnModule.addEventListener("click", () => {
    btnCap.setAttribute("r", "6");
    btnCap.setAttribute("fill", "#c02a2f");
    btnHalo.setAttribute("opacity", "1");
    setTimeout(() => {
      btnCap.setAttribute("r", "8");
      btnCap.setAttribute("fill", "#ff5a5f");
      btnHalo.setAttribute("opacity", "0");
    }, 160);
    pulseBus("gpio", 600);
    if (onBtnPress) onBtnPress();
  });

  // Always-on low level activity on power rails
  setInterval(() => {
    pulseBus("pwr", 500);
  }, 3000);

  return {
    pulseI2C() { pulseBus("i2c", 500); },
    pulseGPIO() { pulseBus("gpio", 400); },
    micListening(on) {
      micActive.setAttribute("opacity", on ? "1" : "0");
      setBusActive("i2s-in", on);
    },
    speakerPlaying(on) {
      ampActive.setAttribute("opacity", on ? "1" : "0");
      speakerWaves.setAttribute("opacity", on ? "1" : "0");
      setBusActive("i2s-out", on);
      setBusActive("spk", on);
    },
    phoneOnPad(on) {
      phoneOnCell.style.transition = "opacity 0.5s, transform 0.5s";
      phoneOnCell.setAttribute("opacity", on ? "1" : "0");
      const y = LOADCELL.cy - LOADCELL.h/2 - (on ? 60 : 140);
      phoneOnCell.setAttribute("transform", `translate(${LOADCELL.cx}, ${y})`);
    },
    hxReading() {
      // pulse the hx711 data wires (two of them are in "gpio" bus)
      const ids = ["gpio-hx-dt", "gpio-hx-sck"];
      ids.forEach(id => {
        const g = svg.querySelector(`.wire[data-id="${id}"] .wire-flow`);
        if (g) {
          g.style.transition = "opacity 0.1s";
          g.style.opacity = "1";
          clearTimeout(g._pt);
          g._pt = setTimeout(() => { g.style.opacity = "0"; }, 200);
        }
      });
    },
    updateBmeReadout(temp, hum) {
      if (bmeReadout) bmeReadout.textContent = `${temp.toFixed(1)}°C ${Math.round(hum)}%`;
      pulseBus("i2c", 400);
    },
    updateOledMini(text) {
      if (oledMiniText) oledMiniText.textContent = text.substring(0, 13).toUpperCase();
      pulseBus("i2c", 400);
    },
    alertPhone(on) {
      mcuLed.setAttribute("fill", on ? "#ff5a5f" : "#3ddc97");
    },
    onButtonPress(handler) { onBtnPress = handler; },
    pressButton() { btnModule.dispatchEvent(new Event("click")); },
    zoomIn() {
      const rect = svg.getBoundingClientRect();
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.25);
    },
    zoomOut() {
      const rect = svg.getBoundingClientRect();
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 1 / 1.25);
    },
    resetView
  };
}
