// Módulo del Reloj de Concentración (Pomodoro 25m, Deep Focus 60m y Personalizado)
(function () {
  const timer = {
    mode: 'pomodoro',
    totalSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    isRunning: false,
    intervalId: null,
    lastTickAt: null
  };

  function getTimerState() {
    return timer;
  }

  function updateTimerUI() {
    const mins = Math.floor(timer.remainingSeconds / 60);
    const secs = timer.remainingSeconds % 60;
    const displayEl = document.getElementById('timerDisplay');
    if (!displayEl) return;
    displayEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const circumference = 2 * Math.PI * 96;
    const progress =
      timer.totalSeconds > 0
        ? (timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds
        : 0;
    const offset = circumference * (1 - progress);
    const ring = document.getElementById('timerRingProgress');
    ring.style.strokeDasharray = `${circumference}`;
    ring.style.strokeDashoffset = `${offset}`;

    const elapsedMinutes = Math.floor((timer.totalSeconds - timer.remainingSeconds) / 60);
    document.getElementById('btnTimerCompleteEarly').disabled = elapsedMinutes < 1;

    const btnStart = document.getElementById('btnTimerStartPause');
    const statusText = document.getElementById('timerStatusText');

    if (timer.isRunning) {
      btnStart.textContent = '⏸ Pausar';
      statusText.textContent = 'Nutriendo tu árbol... Mantén el enfoque 🌱';
    } else if (timer.remainingSeconds < timer.totalSeconds) {
      btnStart.textContent = '▶ Reanudar';
      statusText.textContent = `En pausa (${elapsedMinutes} min acumulados)`;
    } else {
      btnStart.textContent = '▶ Iniciar Enfoque';
      statusText.textContent = 'Listo para enfocar';
    }
  }

  function setTimerMode(mode, minutes) {
    if (timer.isRunning) {
      pauseTimer();
    }
    timer.mode = mode;
    timer.totalSeconds = minutes * 60;
    timer.remainingSeconds = minutes * 60;

    document.querySelectorAll('.mode-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    const customRow = document.getElementById('customMinutesRow');
    customRow.classList.toggle('hidden', mode !== 'custom');

    updateTimerUI();
  }

  function startTimer() {
    if (timer.isRunning) return;
    timer.isRunning = true;
    timer.lastTickAt = Date.now();
    if (window.UIViews) window.UIViews.renderDashboard();

    timer.intervalId = setInterval(() => {
      const now = Date.now();
      const deltaSec = Math.floor((now - timer.lastTickAt) / 1000);
      if (deltaSec >= 1) {
        timer.lastTickAt += deltaSec * 1000;
        timer.remainingSeconds = Math.max(0, timer.remainingSeconds - deltaSec);
        updateTimerUI();

        if (timer.remainingSeconds <= 0) {
          completeSession(Math.round(timer.totalSeconds / 60));
        }
      }
    }, 300);
    updateTimerUI();
  }

  function pauseTimer() {
    timer.isRunning = false;
    if (timer.intervalId) {
      clearInterval(timer.intervalId);
      timer.intervalId = null;
    }
    if (window.UIViews) window.UIViews.renderDashboard();
    updateTimerUI();
  }

  function resetTimer() {
    pauseTimer();
    timer.remainingSeconds = timer.totalSeconds;
    updateTimerUI();
  }

  function completeSession(minutesEarned) {
    pauseTimer();
    timer.remainingSeconds = timer.totalSeconds;
    updateTimerUI();

    const state = window.StateStore.getState();
    const taskId = document.getElementById('timerTaskSelect').value;
    const task = state.tasks.find((t) => t.id === taskId) || state.tasks[0];
    const modeLabel =
      timer.mode === 'pomodoro'
        ? 'Pomodoro'
        : timer.mode === 'deep'
        ? 'Deep Focus'
        : 'Personalizado';

    window.StateStore.recordStudySession({
      taskId: task ? task.id : null,
      folderId: task ? task.folderId : state.folders[0]?.id || null,
      minutes: minutesEarned,
      mode: modeLabel
    });

    if (window.soundEngine) {
      window.soundEngine.playCompletionChime();
    }

    if (window.desktopAPI && window.desktopAPI.sendNotification) {
      window.desktopAPI.sendNotification({
        title: '🌿 ¡Sesión de enfoque completada!',
        body: `Sumaste ${minutesEarned} min a tu Árbol de Constancia.`
      });
    }

    if (window.UIViews) {
      window.UIViews.showToast(`🌳 ¡Excelente! +${minutesEarned} min de estudio. Tu árbol florece.`);
    }
  }

  window.FocusTimer = {
    getTimerState,
    updateTimerUI,
    setTimerMode,
    startTimer,
    pauseTimer,
    resetTimer,
    completeSession
  };
})();
