// Módulo de Estado Global, Persistencia y Algoritmo de Constancia / Salud del Árbol
(function () {
  const STORAGE_KEY = 'raices_constancia_v1';
  const { toDateKey, addDays } = window.DateUtils;

  function createDefaultState() {
    const today = new Date();
    const todayKey = toDateKey(today);

    return {
      theme: 'dark',
      createdAtDate: todayKey,
      focusDaysOfWeek: [1, 2, 3, 4, 5],
      mentalPauseDates: [],
      customTimerMinutes: 45,
      breakMinutes: 5,
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
      sessions: [],
      savedMedia: [
        {
          id: 'med-1',
          title: '🎧 Spotify · Deep Focus',
          url: 'https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ',
          platform: 'spotify'
        },
        {
          id: 'med-2',
          title: '🎹 Spotify · Peaceful Piano',
          url: 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO',
          platform: 'spotify'
        },
        {
          id: 'med-3',
          title: '📺 YouTube · Lofi Hip Hop Radio',
          url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
          platform: 'youtube'
        },
        {
          id: 'med-4',
          title: '🎷 YouTube · Jazz Suave de Estudio',
          url: 'https://www.youtube.com/watch?v=DSGyEsJ17cI',
          platform: 'youtube'
        }
      ]
    };
  }

  let state = createDefaultState();

  function getState() {
    return state;
  }

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
    if (!Array.isArray(loadedState.savedMedia) || loadedState.savedMedia.length === 0) {
      loadedState.savedMedia = createDefaultState().savedMedia;
    }
    return loadedState;
  }

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

  function isDayScheduledForFocus(dateObj) {
    const dateKey = toDateKey(dateObj);
    if (state.mentalPauseDates && state.mentalPauseDates.includes(dateKey)) {
      return false;
    }
    const dow = dateObj.getDay();
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

    let startDateKey = state.createdAtDate || todayKey;
    state.sessions.forEach((s) => {
      if (s.date && s.date < startDateKey) {
        startDateKey = s.date;
      }
    });

    let health = 80;
    for (let i = 10; i >= 1; i--) {
      const d = addDays(today, -i);
      const key = toDateKey(d);
      if (key < startDateKey) continue;

      const mins = getMinutesOnDate(key);
      const scheduled = isDayScheduledForFocus(d);

      if (mins > 0) {
        health = Math.min(100, health + 16);
      } else if (scheduled) {
        health = Math.max(15, health - 24);
      }
    }

    if (todayMinutes > 0) {
      health = Math.min(100, Math.max(68, health + 20));
    }

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
          continue;
        } else {
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
    if (window.UIViews) window.UIViews.renderAll();
  }

  window.StateStore = {
    createDefaultState,
    getState,
    loadAppState,
    saveAppState,
    isDayScheduledForFocus,
    getMinutesOnDate,
    computeConsistencyMetrics,
    recordStudySession
  };
})();
