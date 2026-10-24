// Lógica principal de Raíces · Estudio & Constancia
(function () {
  const STORAGE_KEY = 'raices_constancia_v1';

  // Utilidades de fechas locales YYYY-MM-DD
  function toDateKey(dateObj = new Date()) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function addDays(dateObj, days) {
    const copy = new Date(dateObj);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  function daysBetweenTodayAnd(dateStr) {
    if (!dateStr) return 999;
    const today = new Date(toDateKey(new Date()) + 'T00:00:00');
    const target = new Date(dateStr + 'T00:00:00');
    return Math.round((target - today) / (1000 * 60 * 60 * 24));
  }

  function formatDeadlineBadge(dateStr) {
    const diff = daysBetweenTodayAnd(dateStr);
    if (diff < 0) return { text: `Hace ${Math.abs(diff)} d`, cls: 'deadline-urgent' };
    if (diff === 0) return { text: '¡Es Hoy!', cls: 'deadline-urgent' };
    if (diff === 1) return { text: '¡Mañana!', cls: 'deadline-urgent' };
    if (diff <= 4) return { text: `En ${diff} días`, cls: 'deadline-soon' };
    return { text: `En ${diff} días (${dateStr})`, cls: 'deadline-calm' };
  }

  // Datos iniciales de bienvenida (sin sesiones previas: la racha empieza en 0)
  function createDefaultState() {
    const today = new Date();
    const todayKey = toDateKey(today);

    return {
      theme: 'dark',
      createdAtDate: todayKey,
      // Días de enfoque (1=Lunes ... 5=Viernes enfocando; 6=Sábado, 0=Domingo descanso sin culpa)
      focusDaysOfWeek: [1, 2, 3, 4, 5],
      // Días específicos marcados manualmente como Pausa Mental (YYYY-MM-DD)
      mentalPauseDates: [],
      customTimerMinutes: 45,
      selectedFolderFilter: 'all',
      selectedTaskStatusFilter: 'all',
      folders: [
        { id: 'fld-1', name: 'Materias Exactas', icon: '📐', color: '#34d399' },
        { id: 'fld-2', name: 'Proyectos de Carrera', icon: '💻', color: '#60a5fa' },
        { id: 'fld-3', name: 'Lecturas y Ensayos', icon: '🏛️', color: '#fbbf24' }
      ],
      tasks: [
        {
          id: 'tsk-1',
          folderId: 'fld-1',
          title: 'Examen Parcial · Unidad 2 (Ejemplo)',
          type: 'Examen',
          dueDate: toDateKey(addDays(today, 4)),
          minutesStudied: 0,
          subtasks: [
            { id: 'sub-1', title: 'Repasar apuntes y fórmulas clave', done: false },
            { id: 'sub-2', title: 'Resolver guía de ejercicios prácticos', done: false },
            { id: 'sub-3', title: 'Hacer autoevaluación cronometrada', done: false }
          ]
        },
        {
          id: 'tsk-2',
          folderId: 'fld-2',
          title: 'Entrega de Proyecto Integrador (Ejemplo)',
          type: 'Proyecto',
          dueDate: toDateKey(addDays(today, 9)),
          minutesStudied: 0,
          subtasks: [
            { id: 'sub-4', title: 'Definir estructura y objetivos', done: false },
            { id: 'sub-5', title: 'Desarrollar prototipo funcional', done: false },
            { id: 'sub-6', title: 'Preparar diapositivas de presentación', done: false }
          ]
        }
      ],
      sessions: []
    };
  }

  let state = createDefaultState();
  let previewOverride = null; // null = automático real
  let calendarCursor = new Date();

  // Estado del Temporizador
  let timer = {
    mode: 'pomodoro', // 'pomodoro' | 'deep' | 'custom'
    totalSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    isRunning: false,
    intervalId: null,
    lastTickAt: null
  };

  // Limpia las sesiones de demostración (ses-1, ses-2) si provenían de la plantilla inicial
  function cleanDemoSessionsIfNeeded(loadedState) {
    if (!loadedState) return loadedState;
    const hadDemoSessions =
      Array.isArray(loadedState.sessions) &&
      loadedState.sessions.some((s) => s.id === 'ses-1' || s.id === 'ses-2');

    if (hadDemoSessions) {
      loadedState.sessions = loadedState.sessions.filter(
        (s) => s.id !== 'ses-1' && s.id !== 'ses-2'
      );
      if (loadedState.sessions.length === 0 && Array.isArray(loadedState.tasks)) {
        loadedState.tasks.forEach((t) => {
          if (t.id === 'tsk-1' || t.id === 'tsk-2') {
            t.minutesStudied = 0;
          }
        });
      }
    }
    if (!loadedState.createdAtDate) {
      loadedState.createdAtDate = toDateKey(new Date());
    }
    return loadedState;
  }

  // Carga y Guardado Persistente
  async function loadAppState() {
    try {
      if (window.desktopAPI && window.desktopAPI.loadData) {
        const diskData = await window.desktopAPI.loadData();
        if (diskData && diskData.folders) {
          state = cleanDemoSessionsIfNeeded(Object.assign(createDefaultState(), diskData));
          await saveAppState();
          return;
        }
      }
      const localRaw = localStorage.getItem(STORAGE_KEY);
      if (localRaw) {
        state = cleanDemoSessionsIfNeeded(Object.assign(createDefaultState(), JSON.parse(localRaw)));
        await saveAppState();
      }
    } catch (e) {
      console.error('Error loading state:', e);
    }
  }

  async function saveAppState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (window.desktopAPI && window.desktopAPI.saveData) {
        await window.desktopAPI.saveData(state);
      }
    } catch (e) {
      console.error('Error saving state:', e);
    }
  }

  function showToast(msg) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3600);
  }

  // Cálculo de Salud del Árbol y Racha Saludable (respetando días de descanso)
  function isDayScheduledForFocus(dateObj) {
    const dateKey = toDateKey(dateObj);
    if (state.mentalPauseDates && state.mentalPauseDates.includes(dateKey)) {
      return false;
    }
    const dow = dateObj.getDay(); // 0=Dom ... 6=Sab
    return state.focusDaysOfWeek.includes(dow);
  }

  function getMinutesOnDate(dateKey) {
    return state.sessions
      .filter((s) => s.date === dateKey)
      .reduce((acc, s) => acc + Number(s.minutes || 0), 0);
  }

  function computeConsistencyMetrics() {
    const today = new Date();
    const todayKey = toDateKey(today);
    const todayMinutes = getMinutesOnDate(todayKey);
    const isTodayRest = !isDayScheduledForFocus(today);

    // Determinar desde qué fecha empezó el usuario a usar la app
    let startDateKey = state.createdAtDate || todayKey;
    state.sessions.forEach((s) => {
      if (s.date && s.date < startDateKey) {
        startDateKey = s.date;
      }
    });

    // Evaluar salud en los últimos 10 días (solo contando desde que inició la app)
    let health = 80;
    for (let i = 10; i >= 1; i--) {
      const d = addDays(today, -i);
      const key = toDateKey(d);
      if (key < startDateKey) continue; // No penalizar días previos a instalar/usar la app

      const mins = getMinutesOnDate(key);
      const scheduled = isDayScheduledForFocus(d);

      if (mins > 0) {
        health = Math.min(100, health + 16);
      } else if (scheduled) {
        // Día de enfoque sin sesión: el árbol pierde humedad
        health = Math.max(15, health - 24);
      }
      // Si era día de descanso (no agendado), la salud NO baja
    }

    if (todayMinutes > 0) {
      // Si el árbol estaba marchito, estudiar hoy lo revive al menos a 68%
      health = Math.min(100, Math.max(68, health + 20));
    }

    // Calcular racha saludable (se construye a medida que usas la aplicación)
    let streak = 0;
    if (state.sessions.length > 0) {
      for (let i = 0; i < 60; i++) {
        const d = addDays(today, -i);
        const key = toDateKey(d);
        if (key < startDateKey) break;

        const mins = getMinutesOnDate(key);
        const scheduled = isDayScheduledForFocus(d);

        if (mins > 0) {
          streak++;
        } else if (!scheduled) {
          // Día de descanso: no rompe la racha
          continue;
        } else {
          // Si es hoy y aún no estudia, no rompe la racha de ayer todavía
          if (i === 0) continue;
          break;
        }
      }
    }

    return {
      health: Math.round(health),
      streak,
      todayMinutes,
      isTodayRest
    };
  }

  // Renderizado del Tema y Barra Superior
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme || 'dark');
    const btnTheme = document.getElementById('btnThemeToggle');
    btnTheme.textContent = state.theme === 'dark' ? '☀️' : '🌙';
  }

  // Renderizado de la Vista 1: Bosque y Reloj
  function renderDashboard() {
    const metrics = computeConsistencyMetrics();
    const todayKey = toDateKey(new Date());
    const isManualPauseToday = state.mentalPauseDates.includes(todayKey);

    // Botón de pausa mental en barra superior
    const btnPause = document.getElementById('btnMentalPause');
    const lblPause = document.getElementById('mentalPauseLabel');
    if (metrics.isTodayRest) {
      btnPause.classList.add('rest-active');
      lblPause.textContent = isManualPauseToday
        ? 'Hoy: Pausa Mental Activa (Click para enfocar)'
        : 'Hoy: Día de Descanso Programado';
    } else {
      btnPause.classList.remove('rest-active');
      lblPause.textContent = 'Hoy: Día de Enfoque (Click para Pausa Mental)';
    }

    // Sidebar indicadores
    document.getElementById('sidebarStreak').textContent = metrics.streak;
    document.getElementById('sidebarHealthFill').style.width = `${metrics.health}%`;
    document.getElementById('sidebarHealthPct').textContent = `${metrics.health}%`;

    // Árbol de Constancia SVG
    const treeStateInfo = window.TreeRenderer.getTreeStateInfo(
      metrics.health,
      metrics.isTodayRest && metrics.todayMinutes === 0,
      previewOverride === 'auto' ? null : previewOverride
    );

    const badge = document.getElementById('treeStateBadge');
    badge.textContent = treeStateInfo.label;
    badge.className = `state-badge ${treeStateInfo.badgeClass}`;

    document.getElementById('treeHealthLabel').textContent = `${metrics.health}%`;
    document.getElementById('todayMinutesLabel').textContent = `${metrics.todayMinutes} min`;
    document.getElementById('treeStateMessage').textContent = treeStateInfo.message;

    const svgHolder = document.getElementById('treeSvgHolder');
    svgHolder.innerHTML = window.TreeRenderer.renderSVG(treeStateInfo, timer.isRunning);

    // Renderizar selector de Días de Enfoque Semanal (Lun a Dom)
    renderWeekdaysSelector();

    // Poblar selectores del Reloj
    renderTimerSelectors();
  }

  function renderWeekdaysSelector() {
    const container = document.getElementById('weekDaysSelector');
    const daysOrder = [
      { dow: 1, short: 'Lun' },
      { dow: 2, short: 'Mar' },
      { dow: 3, short: 'Mié' },
      { dow: 4, short: 'Jue' },
      { dow: 5, short: 'Vie' },
      { dow: 6, short: 'Sáb' },
      { dow: 0, short: 'Dom' }
    ];

    container.innerHTML = '';
    daysOrder.forEach((d) => {
      const isFocus = state.focusDaysOfWeek.includes(d.dow);
      const btn = document.createElement('button');
      btn.className = `day-toggle ${isFocus ? 'focus-day' : 'rest-day'}`;
      btn.title = isFocus
        ? `${d.short}: Día de Enfoque (click para convertir en Día de Descanso)`
        : `${d.short}: Día de Descanso Protegido (click para activar enfoque)`;
      btn.innerHTML = `
        <span class="day-short">${d.short}</span>
        <span class="day-mode-icon">${isFocus ? '🌱' : '🌙'}</span>
      `;
      btn.addEventListener('click', () => {
        if (isFocus) {
          if (state.focusDaysOfWeek.length <= 1) {
            showToast('Elige al menos 1 día de enfoque a la semana 🌱');
            return;
          }
          state.focusDaysOfWeek = state.focusDaysOfWeek.filter((x) => x !== d.dow);
        } else {
          state.focusDaysOfWeek.push(d.dow);
        }
        saveAppState();
        renderAll();
      });
      container.appendChild(btn);
    });
  }

  function renderTimerSelectors() {
    const subjSelect = document.getElementById('timerSubjectSelect');
    const taskSelect = document.getElementById('timerTaskSelect');

    const prevFolderId = subjSelect.value;
    const prevTaskId = taskSelect.value;

    subjSelect.innerHTML = '<option value="all">Todas las carpetas de materia</option>';
    state.folders.forEach((f) => {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = `${f.icon} ${f.name}`;
      subjSelect.appendChild(opt);
    });

    if (prevFolderId && (prevFolderId === 'all' || state.folders.some((f) => f.id === prevFolderId))) {
      subjSelect.value = prevFolderId;
    }

    const activeFolderId = subjSelect.value;
    const filteredTasks = state.tasks.filter(
      (t) => activeFolderId === 'all' || t.folderId === activeFolderId
    );

    taskSelect.innerHTML = '';
    if (filteredTasks.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Sin actividades (crea una con "+ Nueva entrega")';
      taskSelect.appendChild(opt);
    } else {
      filteredTasks.forEach((t) => {
        const folder = state.folders.find((f) => f.id === t.folderId);
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `${folder ? folder.icon : '📌'} ${t.title} (${t.type})`;
        taskSelect.appendChild(opt);
      });
      if (prevTaskId && filteredTasks.some((t) => t.id === prevTaskId)) {
        taskSelect.value = prevTaskId;
      }
    }

    renderActiveTimerSubtasks();
  }

  function renderActiveTimerSubtasks() {
    const taskId = document.getElementById('timerTaskSelect').value;
    const task = state.tasks.find((t) => t.id === taskId);
    const listEl = document.getElementById('timerSubtasksList');
    const titleEl = document.getElementById('activeTaskTitleLabel');
    const deadlineEl = document.getElementById('activeTaskDeadlineBadge');

    if (!task) {
      titleEl.textContent = '📌 Sin actividad seleccionada';
      deadlineEl.textContent = '';
      deadlineEl.className = 'deadline-pill';
      listEl.innerHTML = '<div style="font-size:12px;color:var(--text-muted);">Crea o selecciona un examen/proyecto para ver su temario aquí.</div>';
      return;
    }

    titleEl.textContent = `📌 Temario: ${task.title}`;
    const badge = formatDeadlineBadge(task.dueDate);
    deadlineEl.textContent = badge.text;
    deadlineEl.className = `deadline-pill ${badge.cls}`;

    listEl.innerHTML = '';
    if (!task.subtasks || task.subtasks.length === 0) {
      listEl.innerHTML = '<div style="font-size:12px;color:var(--text-muted);">Aún no hay temas desglosados. Añade el primero abajo.</div>';
      return;
    }

    task.subtasks.forEach((sub) => {
      const row = document.createElement('div');
      row.className = `subtask-row ${sub.done ? 'done' : ''}`;
      row.innerHTML = `
        <input type="checkbox" ${sub.done ? 'checked' : ''} />
        <span>${sub.title}</span>
        <button class="subtask-del-btn" title="Eliminar tema">✕</button>
      `;
      row.querySelector('input').addEventListener('change', (e) => {
        sub.done = e.target.checked;
        if (sub.done && window.soundEngine) {
          window.soundEngine.playWaterSparkle();
        }
        saveAppState();
        renderAll();
      });
      row.querySelector('.subtask-del-btn').addEventListener('click', () => {
        task.subtasks = task.subtasks.filter((s) => s.id !== sub.id);
        saveAppState();
        renderAll();
      });
      listEl.appendChild(row);
    });
  }

  // Lógica del Reloj (Pomodoro, Deep Focus, Personalizado)
  function updateTimerUI() {
    const mins = Math.floor(timer.remainingSeconds / 60);
    const secs = timer.remainingSeconds % 60;
    document.getElementById('timerDisplay').textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const circumference = 2 * Math.PI * 96; // 603.18
    const progress = timer.totalSeconds > 0
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
    renderDashboard(); // Para mostrar gotas de nutrición en el árbol

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
    renderDashboard();
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

    const taskId = document.getElementById('timerTaskSelect').value;
    const task = state.tasks.find((t) => t.id === taskId) || state.tasks[0];
    const modeLabel =
      timer.mode === 'pomodoro'
        ? 'Pomodoro'
        : timer.mode === 'deep'
        ? 'Deep Focus'
        : 'Personalizado';

    recordStudySession({
      taskId: task ? task.id : null,
      folderId: task ? task.folderId : (state.folders[0]?.id || null),
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

    showToast(`🌳 ¡Excelente! +${minutesEarned} min de estudio. Tu árbol florece.`);
  }

  function recordStudySession({ taskId, folderId, minutes, mode }) {
    const mins = Math.max(1, Number(minutes || 0));
    const task = state.tasks.find((t) => t.id === taskId);
    if (task) {
      task.minutesStudied = (Number(task.minutesStudied) || 0) + mins;
    }

    state.sessions.unshift({
      id: 'ses-' + Date.now(),
      taskId: task ? task.id : null,
      folderId: task ? task.folderId : folderId,
      date: toDateKey(new Date()),
      minutes: mins,
      mode: mode || 'Pomodoro',
      timestamp: Date.now()
    });

    saveAppState();
    renderAll();
  }

  // Renderizado de la Vista 2: Carpetas de Materia y Exámenes
  function renderSubjectsView() {
    const foldersGrid = document.getElementById('foldersGrid');
    foldersGrid.innerHTML = '';

    // Tarjeta "Todas las materias"
    const allTotalMins = state.sessions.reduce((acc, s) => acc + Number(s.minutes || 0), 0);
    const allCard = document.createElement('div');
    allCard.className = `folder-chip-card ${state.selectedFolderFilter === 'all' ? 'active' : ''}`;
    allCard.innerHTML = `
      <div class="folder-chip-top">
        <span class="folder-icon-badge">🗂️</span>
      </div>
      <div class="folder-name">Todas las Materias</div>
      <div class="folder-meta">${state.tasks.length} entregas · ${(allTotalMins / 60).toFixed(1)} h</div>
    `;
    allCard.addEventListener('click', () => {
      state.selectedFolderFilter = 'all';
      renderSubjectsView();
    });
    foldersGrid.appendChild(allCard);

    state.folders.forEach((folder) => {
      const folderTasks = state.tasks.filter((t) => t.folderId === folder.id);
      const folderMins = state.sessions
        .filter((s) => s.folderId === folder.id)
        .reduce((acc, s) => acc + Number(s.minutes || 0), 0);

      const card = document.createElement('div');
      card.className = `folder-chip-card ${state.selectedFolderFilter === folder.id ? 'active' : ''}`;
      card.style.borderTop = `3px solid ${folder.color}`;
      card.innerHTML = `
        <div class="folder-chip-top">
          <span class="folder-icon-badge">${folder.icon}</span>
          <button class="folder-delete-btn" title="Eliminar carpeta">✕</button>
        </div>
        <div class="folder-name">${folder.name}</div>
        <div class="folder-meta">${folderTasks.length} entregas · ${(folderMins / 60).toFixed(1)} h</div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.folder-delete-btn')) return;
        state.selectedFolderFilter = folder.id;
        renderSubjectsView();
      });

      card.querySelector('.folder-delete-btn').addEventListener('click', () => {
        if (state.folders.length <= 1) {
          showToast('Debes conservar al menos una carpeta de materia.');
          return;
        }
        state.folders = state.folders.filter((f) => f.id !== folder.id);
        state.tasks = state.tasks.filter((t) => t.folderId !== folder.id);
        if (state.selectedFolderFilter === folder.id) {
          state.selectedFolderFilter = 'all';
        }
        saveAppState();
        renderAll();
      });

      foldersGrid.appendChild(card);
    });

    // Encabezado de carpeta actual
    const currentFolder = state.folders.find((f) => f.id === state.selectedFolderFilter);
    document.getElementById('currentFolderHeading').textContent = currentFolder
      ? `${currentFolder.icon} ${currentFolder.name}`
      : '🗂️ Todas las materias';

    // Filtrar y ordenar exámenes / proyectos por fecha
    const tasksGrid = document.getElementById('tasksGrid');
    tasksGrid.innerHTML = '';

    let visibleTasks = state.tasks.filter((t) => {
      if (state.selectedFolderFilter !== 'all' && t.folderId !== state.selectedFolderFilter) {
        return false;
      }
      const totalSubs = (t.subtasks || []).length;
      const doneSubs = (t.subtasks || []).filter((s) => s.done).length;
      const isCompleted = totalSubs > 0 && doneSubs === totalSubs;

      if (state.selectedTaskStatusFilter === 'pending') return !isCompleted;
      if (state.selectedTaskStatusFilter === 'completed') return isCompleted;
      return true;
    });

    visibleTasks.sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));

    if (visibleTasks.length === 0) {
      tasksGrid.innerHTML = `
        <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 32px;">
          <p style="color: var(--text-secondary); margin-bottom: 12px;">No hay exámenes ni proyectos en esta vista.</p>
          <button class="btn-primary" id="btnEmptyCreateTask">+ Crear Examen o Proyecto</button>
        </div>
      `;
      const btnEmpty = document.getElementById('btnEmptyCreateTask');
      if (btnEmpty) btnEmpty.addEventListener('click', () => openTaskModal());
      return;
    }

    visibleTasks.forEach((task) => {
      const folder = state.folders.find((f) => f.id === task.folderId) || {
        name: 'General',
        icon: '📘',
        color: '#34d399'
      };
      const badge = formatDeadlineBadge(task.dueDate);
      const totalSubs = (task.subtasks || []).length;
      const doneSubs = (task.subtasks || []).filter((s) => s.done).length;
      const pct = totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : 0;

      const card = document.createElement('div');
      card.className = 'task-card';
      card.innerHTML = `
        <div class="task-card-top">
          <span class="subject-tag" style="background: ${folder.color}22; color: ${folder.color}; border: 1px solid ${folder.color}55;">
            ${folder.icon} ${folder.name}
          </span>
          <span class="deadline-pill ${badge.cls}">${badge.text}</span>
        </div>

        <div class="task-title-row">
          <div class="task-title">${task.title}</div>
          <span class="task-type-badge">${task.type}</span>
        </div>

        <div class="progress-row">
          <div class="progress-labels">
            <span>Progreso del temario (${doneSubs}/${totalSubs})</span>
            <strong>${pct}% · ${task.minutesStudied || 0} min enfocados</strong>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${pct}%"></div>
          </div>
        </div>

        <div class="subtasks-mini-list" data-task-subtasks="${task.id}"></div>

        <form class="quick-subtask-form" data-add-subtask="${task.id}">
          <input type="text" placeholder="Añadir tema o punto a estudiar..." required />
          <button type="submit" class="btn-secondary btn-sm">+</button>
        </form>

        <div class="task-card-actions">
          <button class="btn-primary btn-sm" data-focus-task="${task.id}">🎯 Concentrarme en esto</button>
          <button class="btn-ghost btn-sm" data-delete-task="${task.id}">Eliminar</button>
        </div>
      `;

      // Renderizar subtareas de la tarjeta
      const subContainer = card.querySelector(`[data-task-subtasks="${task.id}"]`);
      (task.subtasks || []).forEach((sub) => {
        const sRow = document.createElement('div');
        sRow.className = `subtask-row ${sub.done ? 'done' : ''}`;
        sRow.innerHTML = `
          <input type="checkbox" ${sub.done ? 'checked' : ''} />
          <span>${sub.title}</span>
          <button class="subtask-del-btn">✕</button>
        `;
        sRow.querySelector('input').addEventListener('change', (e) => {
          sub.done = e.target.checked;
          if (sub.done && window.soundEngine) window.soundEngine.playWaterSparkle();
          saveAppState();
          renderAll();
        });
        sRow.querySelector('.subtask-del-btn').addEventListener('click', () => {
          task.subtasks = task.subtasks.filter((x) => x.id !== sub.id);
          saveAppState();
          renderAll();
        });
        subContainer.appendChild(sRow);
      });

      // Añadir subtarea desde la tarjeta
      card.querySelector(`[data-add-subtask="${task.id}"]`).addEventListener('submit', (e) => {
        e.preventDefault();
        const input = e.target.querySelector('input');
        const text = input.value.trim();
        if (!text) return;
        task.subtasks = task.subtasks || [];
        task.subtasks.push({ id: 'sub-' + Date.now(), title: text, done: false });
        input.value = '';
        saveAppState();
        renderAll();
      });

      // Botón "Concentrarme en esto" -> lleva al Reloj con esta tarea elegida
      card.querySelector(`[data-focus-task="${task.id}"]`).addEventListener('click', () => {
        switchView('dashboard');
        document.getElementById('timerSubjectSelect').value = task.folderId;
        renderTimerSelectors();
        document.getElementById('timerTaskSelect').value = task.id;
        renderActiveTimerSubtasks();
        showToast(`🎯 Reloj listo para: ${task.title}`);
      });

      // Eliminar tarea
      card.querySelector(`[data-delete-task="${task.id}"]`).addEventListener('click', () => {
        state.tasks = state.tasks.filter((t) => t.id !== task.id);
        saveAppState();
        renderAll();
      });

      tasksGrid.appendChild(card);
    });
  }

  // Renderizado de la Vista 3: Calendario y Próximas Fechas
  function renderCalendarView() {
    const timeline = document.getElementById('upcomingTimeline');
    timeline.innerHTML = '';

    const sorted = [...state.tasks].sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
    if (sorted.length === 0) {
      timeline.innerHTML = '<div style="font-size:13px;color:var(--text-muted);">No hay fechas agendadas todavía.</div>';
    } else {
      sorted.forEach((task) => {
        const folder = state.folders.find((f) => f.id === task.folderId) || { icon: '📘', name: 'Materia', color: '#34d399' };
        const badge = formatDeadlineBadge(task.dueDate);
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.innerHTML = `
          <div>
            <div style="font-weight:700;font-size:14px;">${folder.icon} ${task.title}</div>
            <div style="font-size:12px;color:var(--text-secondary);">${folder.name} · ${task.type} · Fecha: ${task.dueDate}</div>
          </div>
          <span class="deadline-pill ${badge.cls}">${badge.text}</span>
        `;
        timeline.appendChild(item);
      });
    }

    // Calendario mensual
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    document.getElementById('calMonthTitle').textContent = `${monthNames[month]} ${year}`;

    const grid = document.getElementById('calendarDaysGrid');
    grid.innerHTML = '';

    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // Lunes = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayKey = toDateKey(new Date());

    for (let i = 0; i < startOffset; i++) {
      const empty = document.createElement('div');
      grid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(year, month, day);
      const cellKey = toDateKey(cellDate);
      const mins = getMinutesOnDate(cellKey);
      const examsOnDay = state.tasks.filter((t) => t.dueDate === cellKey);
      const isRest = !isDayScheduledForFocus(cellDate);

      const cell = document.createElement('div');
      cell.className = `cal-day-cell ${cellKey === todayKey ? 'today' : ''} ${isRest ? 'rest-cell' : ''}`;

      let badgesHtml = '';
      if (mins > 0) {
        badgesHtml += `<span class="cal-mini-pill" style="background:rgba(52,211,153,0.2);color:#34d399;">🌱 ${mins}m</span>`;
      } else if (isRest) {
        badgesHtml += `<span class="cal-mini-pill" style="background:rgba(129,140,248,0.18);color:#a5b4fc;">🌙 Libre</span>`;
      }
      examsOnDay.forEach((ex) => {
        badgesHtml += `<span class="cal-mini-pill" style="background:rgba(251,191,36,0.22);color:#fbbf24;" title="${ex.title}">🎯 ${ex.title}</span>`;
      });

      cell.innerHTML = `
        <div style="font-weight:700;">${day}</div>
        <div class="cal-badges">${badgesHtml}</div>
      `;
      grid.appendChild(cell);
    }
  }

  // Renderizado de la Vista 4: Estadísticas e Historial
  function renderStatsView() {
    const metrics = computeConsistencyMetrics();
    const totalMins = state.sessions.reduce((acc, s) => acc + Number(s.minutes || 0), 0);
    const completedSubs = state.tasks.reduce(
      (acc, t) => acc + (t.subtasks || []).filter((s) => s.done).length,
      0
    );

    document.getElementById('statTotalHours').textContent = `${(totalMins / 60).toFixed(1)} h`;
    document.getElementById('statStreak').textContent = `${metrics.streak} días`;
    document.getElementById('statTotalSessions').textContent = `${state.sessions.length}`;
    document.getElementById('statCompletedSubtasks').textContent = `${completedSubs}`;

    // Gráfico de barras últimos 7 días
    const chart = document.getElementById('weeklyBarChart');
    chart.innerHTML = '';
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const daysData = [];
    let maxMins = 60;

    for (let i = 6; i >= 0; i--) {
      const d = addDays(new Date(), -i);
      const key = toDateKey(d);
      const mins = getMinutesOnDate(key);
      if (mins > maxMins) maxMins = mins;
      daysData.push({
        label: dayNames[d.getDay()],
        mins,
        isRest: !isDayScheduledForFocus(d)
      });
    }

    daysData.forEach((item) => {
      const heightPct = Math.round((item.mins / maxMins) * 100);
      const col = document.createElement('div');
      col.className = 'bar-col';
      col.innerHTML = `
        <span class="bar-val">${item.mins > 0 ? item.mins + 'm' : item.isRest ? '🌙' : '0m'}</span>
        <div class="bar-track">
          <div class="bar-fill" style="height: ${heightPct}%"></div>
        </div>
        <span class="bar-label">${item.label}</span>
      `;
      chart.appendChild(col);
    });

    // Distribución por Materia
    const distList = document.getElementById('subjectDistributionList');
    distList.innerHTML = '';
    state.folders.forEach((folder) => {
      const fMins = state.sessions
        .filter((s) => s.folderId === folder.id)
        .reduce((acc, s) => acc + Number(s.minutes || 0), 0);
      const pct = totalMins > 0 ? Math.round((fMins / totalMins) * 100) : 0;

      const row = document.createElement('div');
      row.className = 'dist-item';
      row.innerHTML = `
        <div class="dist-top">
          <span>${folder.icon} <strong>${folder.name}</strong></span>
          <span>${fMins} min (${pct}%)</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${pct}%; background: ${folder.color};"></div>
        </div>
      `;
      distList.appendChild(row);
    });

    // Historial de sesiones
    const historyList = document.getElementById('sessionsHistoryList');
    historyList.innerHTML = '';
    if (state.sessions.length === 0) {
      historyList.innerHTML = '<div style="font-size:13px;color:var(--text-muted);">Aún no hay sesiones registradas.</div>';
    } else {
      state.sessions.slice(0, 30).forEach((s) => {
        const task = state.tasks.find((t) => t.id === s.taskId);
        const folder = state.folders.find((f) => f.id === s.folderId);
        const row = document.createElement('div');
        row.className = 'history-row';
        row.innerHTML = `
          <div>
            <strong>${task ? task.title : 'Estudio General'}</strong>
            <div style="font-size:11.5px;color:var(--text-secondary);">
              ${folder ? folder.icon + ' ' + folder.name : ''} · Modalidad: ${s.mode}
            </div>
          </div>
          <div style="text-align:right;">
            <strong style="color:var(--accent-primary);">+${s.minutes} min</strong>
            <div style="font-size:11px;color:var(--text-muted);">${s.date}</div>
          </div>
        `;
        historyList.appendChild(row);
      });
    }
  }

  function renderAll() {
    applyTheme();
    renderDashboard();
    renderSubjectsView();
    renderCalendarView();
    renderStatsView();
  }

  // Navegación entre vistas
  function switchView(viewId) {
    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === viewId);
    });
    document.querySelectorAll('.view-section').forEach((sec) => {
      sec.classList.toggle('active', sec.id === `view-${viewId}`);
    });
  }

  // Apertura de Modales
  function openFolderModal() {
    document.getElementById('formFolder').reset();
    document.getElementById('modalFolder').classList.remove('hidden');
  }

  function openTaskModal() {
    const select = document.getElementById('taskFolderSelect');
    select.innerHTML = '';
    state.folders.forEach((f) => {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = `${f.icon} ${f.name}`;
      select.appendChild(opt);
    });
    if (state.selectedFolderFilter !== 'all') {
      select.value = state.selectedFolderFilter;
    }
    document.getElementById('taskTitleInput').value = '';
    document.getElementById('taskDueDateInput').value = toDateKey(addDays(new Date(), 7));
    document.getElementById('taskSubtasksTextarea').value = '';
    document.getElementById('modalTask').classList.remove('hidden');
  }

  function openManualSessionModal() {
    const select = document.getElementById('manualTaskSelect');
    select.innerHTML = '';
    state.tasks.forEach((t) => {
      const f = state.folders.find((x) => x.id === t.folderId);
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${f ? f.icon : '📌'} ${t.title}`;
      select.appendChild(opt);
    });
    document.getElementById('modalManualSession').classList.remove('hidden');
  }

  // Inicialización de Eventos
  async function init() {
    await loadAppState();
    renderAll();
    updateTimerUI();

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
        showToast(pinned ? '📌 Ventana fijada siempre visible' : 'Ventana desanclada');
      }
    });

    // Botón Tema
    document.getElementById('btnThemeToggle').addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      saveAppState();
      applyTheme();
    });

    // Botón Pausa Mental Hoy
    document.getElementById('btnMentalPause').addEventListener('click', () => {
      const todayKey = toDateKey(new Date());
      if (state.mentalPauseDates.includes(todayKey)) {
        state.mentalPauseDates = state.mentalPauseDates.filter((d) => d !== todayKey);
        showToast('🌱 Hoy vuelve a ser Día de Enfoque.');
      } else {
        state.mentalPauseDates.push(todayKey);
        showToast('🌙 Pausa Mental activada para hoy. Tu árbol y racha están protegidos sin culpa.');
      }
      saveAppState();
      renderAll();
    });

    // Navegación lateral
    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    // Previsualización de estados del árbol
    document.querySelectorAll('.preview-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.preview-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        previewOverride = chip.dataset.preview;
        renderDashboard();
      });
    });

    // Sonidos ambientales
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
      renderTimerSelectors();
    });
    document.getElementById('timerTaskSelect').addEventListener('change', () => {
      renderActiveTimerSubtasks();
    });

    // Modalidades del reloj (Pomodoro 25, Deep Focus 60, Personalizado)
    document.querySelectorAll('.mode-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        const mins = mode === 'custom' ? state.customTimerMinutes || 45 : Number(tab.dataset.minutes);
        setTimerMode(mode, mins);
      });
    });

    document.getElementById('btnApplyCustomMinutes').addEventListener('click', () => {
      const val = Math.max(1, Math.min(240, Number(document.getElementById('customMinutesInput').value || 45)));
      state.customTimerMinutes = val;
      document.getElementById('customModeLabel').textContent = `${val} min`;
      saveAppState();
      setTimerMode('custom', val);
      showToast(`✨ Reloj personalizado ajustado a ${val} minutos`);
    });

    // Controles del reloj
    document.getElementById('btnTimerStartPause').addEventListener('click', () => {
      if (timer.isRunning) {
        pauseTimer();
      } else {
        startTimer();
      }
    });

    document.getElementById('btnTimerReset').addEventListener('click', () => {
      resetTimer();
    });

    document.getElementById('btnTimerCompleteEarly').addEventListener('click', () => {
      const elapsedMins = Math.floor((timer.totalSeconds - timer.remainingSeconds) / 60);
      if (elapsedMins >= 1) {
        completeSession(elapsedMins);
      }
    });

    // Añadir subtarea rápida debajo del reloj
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
      saveAppState();
      renderAll();
    });

    // Filtros en Vista Materias
    document.querySelectorAll('.filter-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        state.selectedTaskStatusFilter = pill.dataset.filter;
        renderSubjectsView();
      });
    });

    // Botones abrir modales
    document.getElementById('btnNewFolder').addEventListener('click', openFolderModal);
    document.getElementById('btnNewTask').addEventListener('click', openTaskModal);
    document.getElementById('btnQuickNewActivity').addEventListener('click', openTaskModal);
    document.getElementById('btnNewTaskFromCal').addEventListener('click', openTaskModal);
    document.getElementById('btnLogManualSession').addEventListener('click', openManualSessionModal);

    // Cerrar modales
    document.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.getElementById(btn.dataset.close).classList.add('hidden');
      });
    });

    // Guardar Carpeta
    document.getElementById('formFolder').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('folderNameInput').value.trim();
      const icon = document.getElementById('folderIconInput').value;
      const color = document.getElementById('folderColorInput').value;
      if (!name) return;

      const newFolder = { id: 'fld-' + Date.now(), name, icon, color };
      state.folders.push(newFolder);
      state.selectedFolderFilter = newFolder.id;
      document.getElementById('modalFolder').classList.add('hidden');
      saveAppState();
      renderAll();
      showToast(`📂 Carpeta "${name}" creada`);
    });

    // Guardar Examen / Proyecto
    document.getElementById('formTask').addEventListener('submit', (e) => {
      e.preventDefault();
      const folderId = document.getElementById('taskFolderSelect').value;
      const title = document.getElementById('taskTitleInput').value.trim();
      const type = document.getElementById('taskTypeSelect').value;
      const dueDate = document.getElementById('taskDueDateInput').value;
      const rawSubs = document.getElementById('taskSubtasksTextarea').value;

      if (!title) return;
      const subtasks = rawSubs
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((line, idx) => ({ id: `sub-${Date.now()}-${idx}`, title: line, done: false }));

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
      saveAppState();
      renderAll();
      document.getElementById('timerTaskSelect').value = newTask.id;
      renderActiveTimerSubtasks();
      showToast(`🎯 "${title}" agendado para el ${dueDate}`);
    });

    // Guardar Sesión Manual
    document.getElementById('formManualSession').addEventListener('submit', (e) => {
      e.preventDefault();
      const taskId = document.getElementById('manualTaskSelect').value;
      const minutes = Number(document.getElementById('manualMinutesInput').value || 25);
      const mode = document.getElementById('manualModeSelect').value;
      const task = state.tasks.find((t) => t.id === taskId);

      recordStudySession({
        taskId,
        folderId: task ? task.folderId : null,
        minutes,
        mode
      });
      document.getElementById('modalManualSession').classList.add('hidden');
      if (window.soundEngine) window.soundEngine.playCompletionChime();
      showToast(`🌿 Sesión de ${minutes} min registrada. ¡Tu árbol se nutre!`);
    });

    // Navegación de meses del calendario
    document.getElementById('btnPrevMonth').addEventListener('click', () => {
      calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
      renderCalendarView();
    });
    document.getElementById('btnNextMonth').addEventListener('click', () => {
      calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
      renderCalendarView();
    });

    // --- Sistema de Actualizaciones Automáticas (Estilo Discord) ---
    initAutoUpdaterUI();
  }

  function initAutoUpdaterUI() {
    if (!window.desktopAPI || !window.desktopAPI.checkForUpdates) return;

    const versionBadge = document.getElementById('appVersionBadge');
    const btnUpdateBanner = document.getElementById('btnUpdateBanner');
    const updateBannerText = document.getElementById('updateBannerText');
    const btnCheckUpdates = document.getElementById('btnCheckUpdates');

    let updateState = 'idle'; // 'idle' | 'available' | 'downloading' | 'ready'
    let pendingRelease = null;

    window.desktopAPI.getVersion().then((v) => {
      if (v && versionBadge) versionBadge.textContent = `v${v}`;
    });

    window.desktopAPI.onUpdateProgress((progress) => {
      if (updateState === 'downloading') {
        btnUpdateBanner.classList.remove('hidden');
        updateBannerText.textContent = `Descargando v${pendingRelease?.latestVersion || ''} (${progress.percent}%)`;
      }
    });

    async function triggerDownloadAndPrepare() {
      if (!pendingRelease || !pendingRelease.downloadUrl) return;
      updateState = 'downloading';
      btnUpdateBanner.classList.remove('hidden');
      updateBannerText.textContent = `Descargando v${pendingRelease.latestVersion} (0%)...`;

      const res = await window.desktopAPI.downloadUpdate({
        downloadUrl: pendingRelease.downloadUrl,
        assetName: pendingRelease.assetName
      });

      if (res && res.ok) {
        updateState = 'ready';
        btnUpdateBanner.classList.add('ready-to-restart');
        btnUpdateBanner.innerHTML = `✨ <span id="updateBannerText">v${pendingRelease.latestVersion} lista · Reiniciar para actualizar</span>`;
        if (window.soundEngine) window.soundEngine.playWaterSparkle();
        showToast(`🚀 Actualización v${pendingRelease.latestVersion} lista. Haz clic en el botón verde superior para reiniciar.`);
      } else {
        updateState = 'available';
        updateBannerText.textContent = `Reintentar actualización v${pendingRelease.latestVersion}`;
        showToast('⚠️ No se pudo completar la descarga de la actualización.');
      }
    }

    async function checkUpdates(silent = true) {
      if (updateState === 'downloading' || updateState === 'ready') return;
      if (!silent) showToast('🔄 Buscando actualizaciones en GitHub...');

      const info = await window.desktopAPI.checkForUpdates();
      if (!info || !info.ok) {
        if (!silent) showToast('No se pudo conectar con GitHub Releases.');
        return;
      }

      if (info.updateAvailable) {
        pendingRelease = info;
        updateState = 'available';
        btnUpdateBanner.classList.remove('hidden');
        updateBannerText.textContent = `Nueva v${info.latestVersion} · Descargando...`;
        showToast(`🌱 ¡Nueva versión v${info.latestVersion} encontrada! Descargando en segundo plano...`);
        // Al estilo Discord: descarga automáticamente en segundo plano y avisa cuando está lista para reiniciar
        triggerDownloadAndPrepare();
      } else if (!silent) {
        showToast(`✓ Ya tienes la última versión instalada (v${info.currentVersion}).`);
      }
    }

    btnUpdateBanner.addEventListener('click', () => {
      if (updateState === 'ready') {
        showToast('⏳ Reiniciando y aplicando actualización...');
        window.desktopAPI.installAndRestart();
      } else if (updateState === 'available') {
        triggerDownloadAndPrepare();
      }
    });

    if (btnCheckUpdates) {
      btnCheckUpdates.addEventListener('click', () => checkUpdates(false));
    }

    // Buscar actualizaciones automáticamente al iniciar la app y cada 30 minutos
    setTimeout(() => checkUpdates(true), 2500);
    setInterval(() => checkUpdates(true), 30 * 60 * 1000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
