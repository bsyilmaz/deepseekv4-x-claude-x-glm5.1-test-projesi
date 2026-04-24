// Pomodoro state machine
// States: IDLE -> WORK (25 min) -> BREAK (5 min) -> WORK ... cycles through 4 work sessions

const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;
const TOTAL_CYCLES = 4;

export function initPomodoro(bus) {
  let state = {
    phase: "IDLE",   // IDLE | WORK | BREAK | PAUSED
    previousPhase: "IDLE",
    remaining: WORK_SECONDS,
    cycle: 0,
    speedMultiplier: 1,
    startedAt: null,
    lastTick: null
  };

  let intervalId = null;

  function emit(event, data = {}) {
    bus.emit(event, { ...data, state: snapshot() });
  }

  function snapshot() {
    return {
      phase: state.phase,
      remaining: state.remaining,
      cycle: state.cycle,
      totalCycles: TOTAL_CYCLES,
      speedMultiplier: state.speedMultiplier
    };
  }

  function tick() {
    const now = performance.now();
    const dt = (now - state.lastTick) / 1000 * state.speedMultiplier;
    state.lastTick = now;

    if (state.phase === "WORK" || state.phase === "BREAK") {
      state.remaining -= dt;
      if (state.remaining <= 0) {
        // Phase transition
        if (state.phase === "WORK") {
          state.cycle += 1;
          if (state.cycle >= TOTAL_CYCLES) {
            // Completed all cycles
            state.phase = "IDLE";
            state.remaining = WORK_SECONDS;
            state.cycle = 0;
            emit("pomo:complete");
            stopInterval();
          } else {
            state.previousPhase = "WORK";
            state.phase = "BREAK";
            state.remaining = BREAK_SECONDS;
            emit("pomo:phase-change", { from: "WORK", to: "BREAK" });
          }
        } else {
          state.previousPhase = "BREAK";
          state.phase = "WORK";
          state.remaining = WORK_SECONDS;
          emit("pomo:phase-change", { from: "BREAK", to: "WORK" });
        }
      }
      emit("pomo:tick");
    }
  }

  function startInterval() {
    if (intervalId) return;
    state.lastTick = performance.now();
    intervalId = setInterval(tick, 200);
  }

  function stopInterval() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  return {
    start() {
      if (state.phase === "IDLE") {
        state.phase = "WORK";
        state.remaining = WORK_SECONDS;
        state.cycle = 0;
        state.startedAt = Date.now();
        emit("pomo:start", { phase: "WORK" });
      } else if (state.phase === "PAUSED") {
        state.phase = state.previousPhase;
        emit("pomo:resume");
      }
      startInterval();
    },
    pause() {
      if (state.phase === "WORK" || state.phase === "BREAK") {
        state.previousPhase = state.phase;
        state.phase = "PAUSED";
        stopInterval();
        emit("pomo:pause");
      }
    },
    reset() {
      stopInterval();
      state = {
        phase: "IDLE",
        previousPhase: "IDLE",
        remaining: WORK_SECONDS,
        cycle: 0,
        speedMultiplier: state.speedMultiplier,
        startedAt: null,
        lastTick: null
      };
      emit("pomo:reset");
    },
    toggleSpeed() {
      state.speedMultiplier = state.speedMultiplier === 1 ? 10 : 1;
      emit("pomo:speed", { speedMultiplier: state.speedMultiplier });
      return state.speedMultiplier;
    },
    setSpeed(mult) {
      state.speedMultiplier = mult;
      emit("pomo:speed", { speedMultiplier: mult });
    },
    getState() { return snapshot(); }
  };
}
