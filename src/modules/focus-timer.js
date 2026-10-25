// Módulo del Reloj de Concentración (Pomodoro 25m, Deep Focus 60m y Personalizado)
(function () {
  const timer = {
    mode: 'pomodoro',
    phase: 'focus', // 'focus' | 'break'
    focusMinutes: 25,
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
    const onBreak = timer.phase === 'break';
    const btnEarly = document.getElementById('btnTimerCompleteEarly');
    btnEarly.disabled = onBreak || elapsedMinutes < 1;
    btnEarly.classList.toggle('hidden', onBreak);

    const btnStart = document.getElementById('btnTimerStartPause');
    const statusText = document.getElementById('timerStatusText');
    const skipBtn = document.getElementById('btnTimerSkipBreak');
    const timerCard = document.querySelector('.timer-card');
    if (timerCard) timerCard.classList.toggle('on-break', onBreak);
    if (skipBtn) skipBtn.classList.toggle('hidden', !onBreak);

    if (onBreak) {
      if (timer.isRunning) {
        btnStart.textContent = '⏸ Pausar descanso';
        statusText.textContent = 'Descansa, estira y respira ☕';
      } else {
        btnStart.textContent = '▶ Iniciar descanso';
        statusText.textContent = 'Descanso en pausa';
      }
    } else if (timer.isRunning) {
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
    timer.phase = 'focus';
    timer.focusMinutes = minutes;
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
          if (timer.phase === 'break') {
            finishBreak();
          } else {
            completeSession(Math.round(timer.totalSeconds / 60), { withBreak: true });
          }
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

  function getBreakMinutes() {
    const state = window.StateStore.getState();
    return Math.max(0, Number(state.breakMinutes) || 0);
  }

  // Inicia la fase de descanso (corre automáticamente tras completar un enfoque)
  function startBreak(minutes) {
    timer.phase = 'break';
    timer.totalSeconds = minutes * 60;
    timer.remainingSeconds = minutes * 60;
    updateTimerUI();
    startTimer();
  }

  // Vuelve a la fase de enfoque con la duración elegida (sin iniciarla sola)
  function returnToFocus() {
    pauseTimer();
    timer.phase = 'focus';
    timer.totalSeconds = timer.focusMinutes * 60;
    timer.remainingSeconds = timer.totalSeconds;
    updateTimerUI();
  }

  function finishBreak() {
    returnToFocus();
    if (window.soundEngine) window.soundEngine.playCompletionChime();
    if (window.desktopAPI && window.desktopAPI.sendNotification) {
      window.desktopAPI.sendNotification({
        title: '☕ ¡Descanso terminado!',
        body: 'Cuando estés listo, inicia tu siguiente sesión de enfoque.'
      });
    }
    if (window.UIViews) {
      window.UIViews.showToast('🌱 Descanso terminado. Inicia tu siguiente sesión cuando quieras.');
    }
  }

  function skipBreak() {
    if (timer.phase !== 'break') return;
    returnToFocus();
    if (window.UIViews) window.UIViews.showToast('⏭ Descanso omitido. ¡Listo para enfocar!');
  }

  function completeSession(minutesEarned, options = {}) {
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

    // Descanso automático entre sesiones (si el usuario eligió uno)
    const breakMins = getBreakMinutes();
    if (options.withBreak && breakMins > 0) {
      startBreak(breakMins);
      if (window.UIViews) {
        window.UIViews.showToast(`☕ Descanso de ${breakMins} min. ¡Te lo ganaste!`);
      }
    }
  }

  window.FocusTimer = {
    getTimerState,
    updateTimerUI,
    setTimerMode,
    startTimer,
    pauseTimer,
    resetTimer,
    completeSession,
    skipBreak
  };
})();
