// Controlador Principal de Eventos (Orquestador Ligero de Raíces)
(function () {
  const { toDateKey } = window.DateUtils;

  async function init() {
    await window.StateStore.loadAppState();
    const state = window.StateStore.getState();

    window.UIViews.renderAll();
    window.FocusTimer.updateTimerUI();

    // Controles de ventana nativa (Electron)
    document.getElementById('btnMin').addEventListener('click', () => {
      if (window.desktopAPI) window.desktopAPI.minimizeWindow();
    });
    document.getElementById('btnMax').addEventListener('click', () => {
      if (window.desktopAPI) window.desktopAPI.maximizeWindow();
    });
    document.getElementById('btnClose').addEventListener('click', () => {
      if (window.desktopAPI) window.desktopAPI.closeWindow();
    });
    document.getElementById('btnPinWindow').addEventListener('click', async (e) => {
      if (window.desktopAPI) {
        const pinned = await window.desktopAPI.toggleAlwaysOnTop();
        e.currentTarget.classList.toggle('active', pinned);
        window.UIViews.showToast(
          pinned ? '📌 Ventana fijada siempre visible' : 'Ventana desanclada'
        );
      }
    });

    // Tema Oscuro / Claro
    document.getElementById('btnThemeToggle').addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      window.StateStore.saveAppState();
      window.UIViews.applyTheme();
    });

    // Pausa Mental Hoy
    document.getElementById('btnMentalPause').addEventListener('click', () => {
      const todayKey = toDateKey(new Date());
      if (state.mentalPauseDates.includes(todayKey)) {
        state.mentalPauseDates = state.mentalPauseDates.filter((d) => d !== todayKey);
        window.UIViews.showToast('🌱 Hoy vuelve a ser Día de Enfoque.');
      } else {
        state.mentalPauseDates.push(todayKey);
        window.UIViews.showToast(
          '🌙 Pausa Mental activada para hoy. Tu árbol y racha están protegidos sin culpa.'
        );
      }
      window.StateStore.saveAppState();
      window.UIViews.renderAll();
    });

    // Navegación entre vistas
    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => window.UIViews.switchView(btn.dataset.view));
    });

    // Previsualización de estados del árbol
    document.querySelectorAll('.preview-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.preview-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        window.UIViews.setPreviewOverride(chip.dataset.preview);
      });
    });

    // Sonidos ambientales sintéticos
    document.querySelectorAll('.sound-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const active = window.soundEngine.toggleAmbient(btn.dataset.sound);
        document.querySelectorAll('.sound-btn').forEach((b) => {
          b.classList.toggle('active', b.dataset.sound === active);
        });
      });
    });

    document.getElementById('soundVolume').addEventListener('input', (e) => {
      window.soundEngine.setVolume(Number(e.target.value) / 100);
    });

    // Selectores del reloj
    document.getElementById('timerSubjectSelect').addEventListener('change', () => {
      window.UIViews.renderTimerSelectors();
    });
    document.getElementById('timerTaskSelect').addEventListener('change', () => {
      window.UIViews.renderActiveTimerSubtasks();
    });

    // Modalidades del reloj (Pomodoro 25, Deep Focus 60, Personalizado)
    document.querySelectorAll('.mode-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        const mins =
          mode === 'custom' ? state.customTimerMinutes || 45 : Number(tab.dataset.minutes);
        window.FocusTimer.setTimerMode(mode, mins);
      });
    });

    document.getElementById('btnApplyCustomMinutes').addEventListener('click', () => {
      const val = Math.max(
        1,
        Math.min(240, Number(document.getElementById('customMinutesInput').value || 45))
      );
      state.customTimerMinutes = val;
      document.getElementById('customModeLabel').textContent = `${val} min`;
      window.StateStore.saveAppState();
      window.FocusTimer.setTimerMode('custom', val);
      window.UIViews.showToast(`✨ Reloj personalizado ajustado a ${val} minutos`);
    });

    // Controles del reloj
    document.getElementById('btnTimerStartPause').addEventListener('click', () => {
      const timer = window.FocusTimer.getTimerState();
      if (timer.isRunning) {
        window.FocusTimer.pauseTimer();
      } else {
        window.FocusTimer.startTimer();
      }
    });

    document.getElementById('btnTimerReset').addEventListener('click', () => {
      window.FocusTimer.resetTimer();
    });

    // Descanso entre sesiones (tipo Pomodoro clásico)
    const breakSelect = document.getElementById('breakMinutesSelect');
    breakSelect.value = String(state.breakMinutes ?? 5);
    if (breakSelect.value !== String(state.breakMinutes ?? 5)) breakSelect.value = '5';
    breakSelect.addEventListener('change', () => {
      state.breakMinutes = Number(breakSelect.value);
      window.StateStore.saveAppState();
      window.UIViews.showToast(
        state.breakMinutes > 0
          ? `☕ Descanso de ${state.breakMinutes} min entre sesiones`
          : 'Descansos desactivados'
      );
    });
    document.getElementById('btnTimerSkipBreak').addEventListener('click', () => {
      window.FocusTimer.skipBreak();
    });

    document.getElementById('btnTimerCompleteEarly').addEventListener('click', () => {
      const timer = window.FocusTimer.getTimerState();
      const elapsedMins = Math.floor((timer.totalSeconds - timer.remainingSeconds) / 60);
      if (elapsedMins >= 1) {
        window.FocusTimer.completeSession(elapsedMins);
      }
    });

    // Subtarea rápida debajo del reloj
    document.getElementById('timerQuickSubtaskForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('timerQuickSubtaskInput');
      const title = input.value.trim();
      const taskId = document.getElementById('timerTaskSelect').value;
      const task = state.tasks.find((t) => t.id === taskId);
      if (!title || !task) return;
      task.subtasks = task.subtasks || [];
      task.subtasks.push({ id: 'sub-' + Date.now(), title, done: false });
      input.value = '';
      window.StateStore.saveAppState();
      window.UIViews.renderAll();
    });

    // Filtros en Vista Materias
    document.querySelectorAll('.filter-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        state.selectedTaskStatusFilter = pill.dataset.filter;
        window.UIViews.renderSubjectsView();
      });
    });

    // Botones abrir modales
    document
      .getElementById('btnNewFolder')
      .addEventListener('click', () => window.UIViews.openFolderModal(null));
    document
      .getElementById('btnNewTask')
      .addEventListener('click', () => window.UIViews.openTaskModal(null));
    document
      .getElementById('btnQuickNewActivity')
      .addEventListener('click', () => window.UIViews.openTaskModal(null));
    document
      .getElementById('btnNewTaskFromCal')
      .addEventListener('click', () => window.UIViews.openTaskModal(null));
    document
      .getElementById('btnLogManualSession')
      .addEventListener('click', window.UIViews.openManualSessionModal);
    document
      .getElementById('btnOpenMediaModal')
      .addEventListener('click', window.MediaPlayer.openMediaModal);

    // Eventos del reproductor de YouTube y Spotify
    document
      .getElementById('btnCloseMediaEmbed')
      .addEventListener('click', window.MediaPlayer.closeEmbeddedMedia);
    document
      .getElementById('btnPopoutMedia')
      .addEventListener('click', window.MediaPlayer.popoutActiveMedia);

    document.getElementById('btnLaunchSpotifyApp').addEventListener('click', () => {
      if (window.desktopAPI && window.desktopAPI.openMediaWindow) {
        window.desktopAPI.openMediaWindow({
          url: 'https://open.spotify.com',
          title: 'Spotify · Ambiente de Estudio'
        });
        document.getElementById('modalMedia').classList.add('hidden');
      }
    });

    document.getElementById('btnLaunchYouTubeApp').addEventListener('click', () => {
      if (window.desktopAPI && window.desktopAPI.openMediaWindow) {
        window.desktopAPI.openMediaWindow({
          url: 'https://www.youtube.com/results?search_query=lofi+hip+hop+study+music',
          title: 'YouTube · Ambiente de Estudio'
        });
        document.getElementById('modalMedia').classList.add('hidden');
      }
    });

    document.getElementById('formCustomMedia').addEventListener('submit', (e) => {
      e.preventDefault();
      const titleInput = document.getElementById('mediaTitleInput');
      const urlInput = document.getElementById('mediaUrlInput');
      const rawUrl = urlInput.value.trim();
      const parsed = window.MediaPlayer.parseMediaUrlToEmbed(rawUrl);

      if (!parsed) {
        window.UIViews.showToast('⚠️ Pega un enlace válido de YouTube o Spotify.');
        return;
      }

      const defaultName =
        parsed.platform === 'spotify'
          ? '🎧 Mi Playlist de Spotify'
          : parsed.platform === 'youtube'
          ? '📺 Mi Ambiente de YouTube'
          : '🎵 Ambiente Personalizado';
      const title = titleInput.value.trim() || defaultName;

      const newItem = {
        id: 'med-' + Date.now(),
        title,
        url: rawUrl,
        platform: parsed.platform
      };

      state.savedMedia = state.savedMedia || [];
      state.savedMedia.unshift(newItem);
      window.StateStore.saveAppState();

      titleInput.value = '';
      urlInput.value = '';
      window.MediaPlayer.renderSavedMediaList();
      window.MediaPlayer.playEmbeddedMedia(newItem);
      document.getElementById('modalMedia').classList.add('hidden');
      window.UIViews.showToast(`🎵 Reproduciendo "${title}"`);
    });

    // Cerrar modales
    document.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.getElementById(btn.dataset.close).classList.add('hidden');
      });
    });

    // Guardar Carpeta (Crear nueva o Editar existente)
    document.getElementById('formFolder').addEventListener('submit', (e) => {
      e.preventDefault();
      const editingId = document.getElementById('folderIdInput').value;
      const name = document.getElementById('folderNameInput').value.trim();
      const icon = document.getElementById('folderIconInput').value;
      const color = document.getElementById('folderColorInput').value;
      if (!name) return;

      if (editingId) {
        const existing = state.folders.find((f) => f.id === editingId);
        if (existing) {
          existing.name = name;
          existing.icon = icon;
          existing.color = color;
          window.UIViews.showToast(`✏️ Carpeta "${name}" actualizada`);
        }
      } else {
        const newFolder = { id: 'fld-' + Date.now(), name, icon, color };
        state.folders.push(newFolder);
        state.selectedFolderFilter = newFolder.id;
        window.UIViews.showToast(`📂 Carpeta "${name}" creada`);
      }

      document.getElementById('modalFolder').classList.add('hidden');
      window.StateStore.saveAppState();
      window.UIViews.renderAll();
    });

    // Guardar Examen / Proyecto (Crear nuevo o Editar existente)
    document.getElementById('formTask').addEventListener('submit', (e) => {
      e.preventDefault();
      const editingTaskId = document.getElementById('taskIdInput').value;
      const folderId = document.getElementById('taskFolderSelect').value;
      const title = document.getElementById('taskTitleInput').value.trim();
      const type = document.getElementById('taskTypeSelect').value;
      const dueDate = document.getElementById('taskDueDateInput').value;
      const rawSubs = document.getElementById('taskSubtasksTextarea').value;

      if (!title) return;
      const lines = rawSubs
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      if (editingTaskId) {
        const existingTask = state.tasks.find((t) => t.id === editingTaskId);
        if (existingTask) {
          existingTask.folderId = folderId;
          existingTask.title = title;
          existingTask.type = type;
          existingTask.dueDate = dueDate;
          const prevSubs = existingTask.subtasks || [];
          existingTask.subtasks = lines.map((line, idx) => {
            const match = prevSubs.find((p) => p.title === line);
            return match || { id: `sub-${Date.now()}-${idx}`, title: line, done: false };
          });
          window.UIViews.showToast(`✏️ "${title}" actualizado`);
        }
        document.getElementById('modalTask').classList.add('hidden');
        window.StateStore.saveAppState();
        window.UIViews.renderAll();
      } else {
        const subtasks = lines.map((line, idx) => ({
          id: `sub-${Date.now()}-${idx}`,
          title: line,
          done: false
        }));
        const newTask = {
          id: 'tsk-' + Date.now(),
          folderId,
          title,
          type,
          dueDate,
          minutesStudied: 0,
          subtasks
        };
        state.tasks.push(newTask);
        document.getElementById('modalTask').classList.add('hidden');
        window.StateStore.saveAppState();
        window.UIViews.renderAll();
        document.getElementById('timerTaskSelect').value = newTask.id;
        window.UIViews.renderActiveTimerSubtasks();
        window.UIViews.showToast(`🎯 "${title}" agendado para el ${dueDate}`);
      }
    });

    // Guardar Sesión Manual
    document.getElementById('formManualSession').addEventListener('submit', (e) => {
      e.preventDefault();
      const taskId = document.getElementById('manualTaskSelect').value;
      const minutes = Number(document.getElementById('manualMinutesInput').value || 25);
      const mode = document.getElementById('manualModeSelect').value;
      const task = state.tasks.find((t) => t.id === taskId);

      window.StateStore.recordStudySession({
        taskId,
        folderId: task ? task.folderId : null,
        minutes,
        mode
      });
      document.getElementById('modalManualSession').classList.add('hidden');
      if (window.soundEngine) window.soundEngine.playCompletionChime();
      window.UIViews.showToast(`🌿 Sesión de ${minutes} min registrada. ¡Tu árbol se nutre!`);
    });

    // Navegación de meses del calendario
    document.getElementById('btnPrevMonth').addEventListener('click', () => {
      window.UIViews.shiftCalendarMonth(-1);
    });
    document.getElementById('btnNextMonth').addEventListener('click', () => {
      window.UIViews.shiftCalendarMonth(1);
    });

    // Inicializar auto-actualizador estilo Discord
    window.UIViews.initAutoUpdaterUI();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
