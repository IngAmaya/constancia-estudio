// Módulo de Interfaz de Usuario (Vistas, Modales, Calendario, Estadísticas y Auto-Actualizador)
(function () {
  const { toDateKey, addDays, formatDeadlineBadge } = window.DateUtils;

  let previewOverride = null;
  let calendarCursor = new Date();

  function setPreviewOverride(val) {
    previewOverride = val;
    renderDashboard();
  }

  function shiftCalendarMonth(delta) {
    calendarCursor = new Date(
      calendarCursor.getFullYear(),
      calendarCursor.getMonth() + delta,
      1
    );
    renderCalendarView();
  }

  function showToast(msg) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3600);
  }

  function applyTheme() {
    const state = window.StateStore.getState();
    document.documentElement.setAttribute('data-theme', state.theme || 'dark');
    const btnTheme = document.getElementById('btnThemeToggle');
    if (btnTheme) btnTheme.textContent = state.theme === 'dark' ? '☀️' : '🌙';
  }

  function switchView(viewId) {
    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === viewId);
    });
    document.querySelectorAll('.view-section').forEach((sec) => {
      sec.classList.toggle('active', sec.id === `view-${viewId}`);
    });
  }

  // --- VISTA 1: BOSQUE Y RELOJ ---
  function renderDashboard() {
    const state = window.StateStore.getState();
    const metrics = window.StateStore.computeConsistencyMetrics();
    const timer = window.FocusTimer.getTimerState();
    const todayKey = toDateKey(new Date());
    const isManualPauseToday = state.mentalPauseDates.includes(todayKey);

    const btnPause = document.getElementById('btnMentalPause');
    const lblPause = document.getElementById('mentalPauseLabel');
    if (metrics.isTodayRest) {
      btnPause.classList.add('rest-active');
      btnPause.title = isManualPauseToday
        ? 'Pausa Mental activa hoy. Haz clic para volver a enfocar.'
        : 'Hoy es tu día de descanso programado. Haz clic para activar una Pausa Mental.';
      lblPause.textContent = isManualPauseToday ? 'Pausa mental' : 'Descanso hoy';
    } else {
      btnPause.classList.remove('rest-active');
      btnPause.title =
        'Activar Pausa Mental hoy (protege tu árbol y tu racha sin culpa)';
      lblPause.textContent = 'Enfoque hoy';
    }

    document.getElementById('sidebarStreak').textContent = metrics.streak;
    document.getElementById('sidebarHealthFill').style.width = `${metrics.health}%`;
    document.getElementById('sidebarHealthPct').textContent = `${metrics.health}%`;

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

    renderWeekdaysSelector();
    renderTimerSelectors();
  }

  function renderWeekdaysSelector() {
    const state = window.StateStore.getState();
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
        window.StateStore.saveAppState();
        renderAll();
      });
      container.appendChild(btn);
    });
  }

  function isTaskCompleted(task) {
    if (typeof task.completed === 'boolean') return task.completed;
    const totalSubs = (task.subtasks || []).length;
    const doneSubs = (task.subtasks || []).filter((s) => s.done).length;
    return totalSubs > 0 && doneSubs === totalSubs;
  }

  function isTaskDeleted(task) {
    return task.deleted === true;
  }

  // Actividades "vivas": ni en la Papelera ni completadas (las que se ven dentro de su materia)
  function isTaskActive(task) {
    return !isTaskDeleted(task) && !isTaskCompleted(task);
  }

  // Si la materia de origen fue eliminada, la actividad se reasigna a la primera materia disponible
  function ensureValidFolder(task) {
    const state = window.StateStore.getState();
    if (!state.folders.some((f) => f.id === task.folderId) && state.folders.length > 0) {
      task.folderId = state.folders[0].id;
    }
  }

  // Ventana de confirmación propia (dentro de la app) que devuelve una Promesa<boolean>
  function confirmDialog({ title, message, confirmText = 'Confirmar' }) {
    return new Promise((resolve) => {
      const modal = document.getElementById('modalConfirm');
      const btnOk = document.getElementById('btnConfirmOk');
      const btnCancel = document.getElementById('btnConfirmCancel');
      document.getElementById('confirmTitle').textContent = title;
      document.getElementById('confirmMessage').textContent = message;
      btnOk.textContent = confirmText;
      modal.classList.remove('hidden');

      const finish = (result) => {
        modal.classList.add('hidden');
        btnOk.onclick = null;
        btnCancel.onclick = null;
        resolve(result);
      };
      btnOk.onclick = () => finish(true);
      btnCancel.onclick = () => finish(false);
    });
  }

  function moveTaskToTrash(task) {
    task.deleted = true;
    task.deletedAt = Date.now();
    window.StateStore.saveAppState();
    renderAll();
    showToast(`🗑️ "${task.title}" movida a la Papelera. Puedes restaurarla cuando quieras.`);
  }

  function restoreTaskFromTrash(task) {
    ensureValidFolder(task);
    task.deleted = false;
    delete task.deletedAt;
    window.StateStore.saveAppState();
    renderAll();
    showToast(
      isTaskCompleted(task)
        ? `♻️ "${task.title}" restaurada en Completadas`
        : `♻️ "${task.title}" restaurada en su materia`
    );
  }

  async function purgeTask(task) {
    const ok = await confirmDialog({
      title: '🗑️ Eliminar definitivamente',
      message: `"${task.title}" se borrará para siempre y no podrás recuperarla. ¿Continuar?`,
      confirmText: 'Eliminar para siempre'
    });
    if (!ok) return;
    const state = window.StateStore.getState();
    state.tasks = state.tasks.filter((t) => t.id !== task.id);
    window.StateStore.saveAppState();
    renderAll();
    showToast('Actividad eliminada definitivamente.');
  }

  async function emptyTrash() {
    const state = window.StateStore.getState();
    const count = state.tasks.filter(isTaskDeleted).length;
    if (count === 0) return;
    const ok = await confirmDialog({
      title: '🗑️ Vaciar la Papelera',
      message: `Se eliminarán definitivamente ${count} actividad(es). Esta acción no se puede deshacer.`,
      confirmText: 'Vaciar Papelera'
    });
    if (!ok) return;
    state.tasks = state.tasks.filter((t) => !isTaskDeleted(t));
    window.StateStore.saveAppState();
    renderAll();
    showToast('Papelera vaciada.');
  }

  function renderTimerSelectors() {
    const state = window.StateStore.getState();
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
    // Solo actividades pendientes (las completadas y las de la Papelera no se enfocan)
    const filteredTasks = state.tasks.filter(
      (t) => (activeFolderId === 'all' || t.folderId === activeFolderId) && isTaskActive(t)
    );

    taskSelect.innerHTML = '';
    if (filteredTasks.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Sin actividades pendientes (crea una con "+ Nueva entrega")';
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
    const state = window.StateStore.getState();
    const taskId = document.getElementById('timerTaskSelect').value;
    const task = state.tasks.find((t) => t.id === taskId);
    const listEl = document.getElementById('timerSubtasksList');
    const titleEl = document.getElementById('activeTaskTitleLabel');
    const deadlineEl = document.getElementById('activeTaskDeadlineBadge');

    if (!task) {
      titleEl.textContent = '📌 Sin actividad seleccionada';
      deadlineEl.textContent = '';
      deadlineEl.className = 'deadline-pill';
      listEl.innerHTML =
        '<div style="font-size:12px;color:var(--text-muted);">Crea o selecciona un examen/proyecto para ver su temario aquí.</div>';
      return;
    }

    titleEl.textContent = `📌 Temario: ${task.title}`;
    const badge = formatDeadlineBadge(task.dueDate);
    deadlineEl.textContent = badge.text;
    deadlineEl.className = `deadline-pill ${badge.cls}`;

    listEl.innerHTML = '';
    if (!task.subtasks || task.subtasks.length === 0) {
      listEl.innerHTML =
        '<div style="font-size:12px;color:var(--text-muted);">Aún no hay temas desglosados. Añade el primero abajo.</div>';
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
        task.completed = task.subtasks.length > 0 && task.subtasks.every((s) => s.done);
        if (sub.done && window.soundEngine) {
          window.soundEngine.playWaterSparkle();
        }
        if (task.completed) {
          showToast(`✅ "${task.title}" completada. La encontrarás en la carpeta Completadas.`);
        }
        window.StateStore.saveAppState();
        renderAll();
      });
      row.querySelector('.subtask-del-btn').addEventListener('click', () => {
        task.subtasks = task.subtasks.filter((s) => s.id !== sub.id);
        window.StateStore.saveAppState();
        renderAll();
      });
      listEl.appendChild(row);
    });
  }

  // --- VISTA 2: CARPETAS DE MATERIA Y EXÁMENES ---
  function renderSubjectsView() {
    const state = window.StateStore.getState();
    const foldersGrid = document.getElementById('foldersGrid');
    foldersGrid.innerHTML = '';

    const allTotalMins = state.sessions.reduce((acc, s) => acc + Number(s.minutes || 0), 0);
    const activeTasksCount = state.tasks.filter(isTaskActive).length;
    const allCard = document.createElement('div');
    allCard.className = `folder-chip-card ${state.selectedFolderFilter === 'all' ? 'active' : ''}`;
    allCard.innerHTML = `
      <div class="folder-chip-top">
        <span class="folder-icon-badge">🗂️</span>
      </div>
      <div class="folder-name">Todas las Materias</div>
      <div class="folder-meta">${activeTasksCount} pendientes · ${(allTotalMins / 60).toFixed(1)} h</div>
    `;
    allCard.addEventListener('click', () => {
      state.selectedFolderFilter = 'all';
      renderSubjectsView();
    });
    foldersGrid.appendChild(allCard);

    state.folders.forEach((folder) => {
      const folderTasks = state.tasks.filter((t) => t.folderId === folder.id && isTaskActive(t));
      const folderMins = state.sessions
        .filter((s) => s.folderId === folder.id)
        .reduce((acc, s) => acc + Number(s.minutes || 0), 0);

      const card = document.createElement('div');
      card.className = `folder-chip-card ${state.selectedFolderFilter === folder.id ? 'active' : ''}`;
      card.style.borderTop = `3px solid ${folder.color}`;
      card.innerHTML = `
        <div class="folder-chip-top">
          <span class="folder-icon-badge">${folder.icon}</span>
          <div class="folder-chip-actions">
            <button class="folder-edit-btn" title="Editar nombre, icono o color de la carpeta">✏️</button>
            <button class="folder-delete-btn" title="Eliminar carpeta">✕</button>
          </div>
        </div>
        <div class="folder-name">${folder.name}</div>
        <div class="folder-meta">${folderTasks.length} entregas · ${(folderMins / 60).toFixed(1)} h</div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.folder-delete-btn') || e.target.closest('.folder-edit-btn')) return;
        state.selectedFolderFilter = folder.id;
        renderSubjectsView();
      });

      card.querySelector('.folder-edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openFolderModal(folder);
      });

      card.querySelector('.folder-delete-btn').addEventListener('click', () => {
        if (state.folders.length <= 1) {
          showToast('Debes conservar al menos una carpeta de materia.');
          return;
        }
        state.folders = state.folders.filter((f) => f.id !== folder.id);
        // Las pendientes de esta materia van a la Papelera (recuperables); las completadas se conservan
        state.tasks.forEach((t) => {
          if (t.folderId === folder.id && isTaskActive(t)) {
            t.deleted = true;
            t.deletedAt = Date.now();
          }
        });
        if (state.selectedFolderFilter === folder.id) {
          state.selectedFolderFilter = 'all';
        }
        window.StateStore.saveAppState();
        renderAll();
      });

      foldersGrid.appendChild(card);
    });

    // Carpetas especiales del sistema: Completadas y Papelera (no editables ni eliminables)
    const completedCount = state.tasks.filter((t) => !isTaskDeleted(t) && isTaskCompleted(t)).length;
    const trashCount = state.tasks.filter(isTaskDeleted).length;
    [
      { id: 'completed', icon: '✅', name: 'Completadas', meta: `${completedCount} entregas`, color: '#34d399' },
      { id: 'trash', icon: '🗑️', name: 'Papelera', meta: `${trashCount} por confirmar`, color: '#f87171' }
    ].forEach((special) => {
      const sCard = document.createElement('div');
      sCard.className = `folder-chip-card special-folder ${state.selectedFolderFilter === special.id ? 'active' : ''}`;
      sCard.dataset.specialFolder = special.id;
      sCard.style.borderTop = `3px solid ${special.color}`;
      sCard.innerHTML = `
        <div class="folder-chip-top">
          <span class="folder-icon-badge">${special.icon}</span>
        </div>
        <div class="folder-name">${special.name}</div>
        <div class="folder-meta">${special.meta}</div>
      `;
      sCard.addEventListener('click', () => {
        state.selectedFolderFilter = special.id;
        renderSubjectsView();
      });
      foldersGrid.appendChild(sCard);
    });

    const currentFolder = state.folders.find((f) => f.id === state.selectedFolderFilter);
    document.getElementById('currentFolderHeading').textContent =
      state.selectedFolderFilter === 'completed'
        ? '✅ Completadas'
        : state.selectedFolderFilter === 'trash'
        ? '🗑️ Papelera'
        : currentFolder
        ? `${currentFolder.icon} ${currentFolder.name}`
        : '🗂️ Todas las materias';

    const tasksGrid = document.getElementById('tasksGrid');
    tasksGrid.innerHTML = '';

    if (state.selectedFolderFilter === 'trash') {
      renderTrashView(tasksGrid);
      return;
    }

    const viewingCompleted = state.selectedFolderFilter === 'completed';
    let visibleTasks = state.tasks.filter((t) => {
      if (isTaskDeleted(t)) return false;
      if (viewingCompleted) return isTaskCompleted(t);
      if (isTaskCompleted(t)) return false;
      return state.selectedFolderFilter === 'all' || t.folderId === state.selectedFolderFilter;
    });

    visibleTasks.sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));

    if (visibleTasks.length === 0) {
      tasksGrid.innerHTML = viewingCompleted
        ? `
        <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 32px;">
          <p style="color: var(--text-secondary);">Aún no has completado ninguna entrega. Cuando lo hagas, aparecerá aquí 🌱</p>
        </div>
      `
        : `
        <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 32px;">
          <p style="color: var(--text-secondary); margin-bottom: 12px;">No hay exámenes ni proyectos pendientes en esta vista.</p>
          <button class="btn-primary" id="btnEmptyCreateTask">+ Crear Examen o Proyecto</button>
        </div>
      `;
      const btnEmpty = document.getElementById('btnEmptyCreateTask');
      if (btnEmpty) btnEmpty.addEventListener('click', () => openTaskModal(null));
      return;
    }

    visibleTasks.forEach((task) => {
      const folder = state.folders.find((f) => f.id === task.folderId) || {
        name: 'General',
        icon: '📘',
        color: '#34d399'
      };
      const completed = isTaskCompleted(task);
      const badge = completed
        ? { text: '✅ Completada', cls: 'deadline-calm' }
        : formatDeadlineBadge(task.dueDate);
      const totalSubs = (task.subtasks || []).length;
      const doneSubs = (task.subtasks || []).filter((s) => s.done).length;
      const pct = completed
        ? 100
        : totalSubs > 0
        ? Math.round((doneSubs / totalSubs) * 100)
        : 0;

      const card = document.createElement('div');
      card.className = 'task-card';
      if (completed) card.style.opacity = '0.82';
      card.innerHTML = `
        <div class="task-card-top">
          <span class="subject-tag" style="background: ${folder.color}22; color: ${folder.color}; border: 1px solid ${folder.color}55;">
            ${folder.icon} ${folder.name}
          </span>
          <span class="deadline-pill ${badge.cls}">${badge.text}</span>
        </div>

        <div class="task-title-row">
          <div class="task-title" style="${completed ? 'text-decoration:line-through;color:var(--text-secondary);' : ''}">${task.title}</div>
          <span class="task-type-badge">${task.type}</span>
        </div>

        <div class="progress-row">
          <div class="progress-labels">
            <span>${totalSubs > 0 ? `Progreso del temario (${doneSubs}/${totalSubs})` : completed ? 'Entrega finalizada' : 'Actividad en curso'}</span>
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
          <button class="btn-primary btn-sm" data-focus-task="${task.id}">🎯 Concentrarme</button>
          <div style="display:flex;gap:6px;">
            <button class="btn-secondary btn-sm" data-toggle-complete="${task.id}" title="${completed ? 'Reabrir como pendiente' : 'Marcar entrega como completada'}">
              ${completed ? '↩️ Reabrir' : '✅ Completar'}
            </button>
            <button class="btn-ghost btn-sm" data-edit-task="${task.id}" title="Editar actividad">✏️</button>
            <button class="btn-ghost btn-sm" data-delete-task="${task.id}" title="Eliminar">✕</button>
          </div>
        </div>
      `;

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
          const allNowDone =
            task.subtasks.length > 0 && task.subtasks.every((s) => s.done);
          task.completed = allNowDone;
          if (sub.done && window.soundEngine) window.soundEngine.playWaterSparkle();
          window.StateStore.saveAppState();
          renderAll();
        });
        sRow.querySelector('.subtask-del-btn').addEventListener('click', () => {
          task.subtasks = task.subtasks.filter((x) => x.id !== sub.id);
          window.StateStore.saveAppState();
          renderAll();
        });
        subContainer.appendChild(sRow);
      });

      card.querySelector(`[data-add-subtask="${task.id}"]`).addEventListener('submit', (e) => {
        e.preventDefault();
        const input = e.target.querySelector('input');
        const text = input.value.trim();
        if (!text) return;
        task.subtasks = task.subtasks || [];
        task.subtasks.push({ id: 'sub-' + Date.now(), title: text, done: false });
        task.completed = false;
        input.value = '';
        window.StateStore.saveAppState();
        renderAll();
      });

      card.querySelector(`[data-focus-task="${task.id}"]`).addEventListener('click', () => {
        switchView('dashboard');
        document.getElementById('timerSubjectSelect').value = task.folderId;
        renderTimerSelectors();
        document.getElementById('timerTaskSelect').value = task.id;
        renderActiveTimerSubtasks();
        showToast(`🎯 Reloj listo para: ${task.title}`);
      });

      card.querySelector(`[data-toggle-complete="${task.id}"]`).addEventListener('click', () => {
        const nextCompleted = !isTaskCompleted(task);
        task.completed = nextCompleted;
        if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
          task.subtasks.forEach((s) => {
            s.done = nextCompleted;
          });
        }
        if (nextCompleted && window.soundEngine) {
          window.soundEngine.playWaterSparkle();
        }
        if (!nextCompleted) ensureValidFolder(task);
        window.StateStore.saveAppState();
        renderAll();
        showToast(
          nextCompleted
            ? `✅ ¡"${task.title}" completada! Se movió a la carpeta Completadas`
            : `↩️ "${task.title}" reabierta y devuelta a su materia`
        );
      });

      card.querySelector(`[data-edit-task="${task.id}"]`).addEventListener('click', () => {
        openTaskModal(task);
      });

      card.querySelector(`[data-delete-task="${task.id}"]`).addEventListener('click', () => {
        moveTaskToTrash(task);
      });

      tasksGrid.appendChild(card);
    });
  }

  // Contenedor de Papelera: restaurar o eliminar definitivamente (con confirmación)
  function renderTrashView(tasksGrid) {
    const state = window.StateStore.getState();
    const trashed = state.tasks
      .filter(isTaskDeleted)
      .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));

    if (trashed.length === 0) {
      tasksGrid.innerHTML = `
        <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 32px;">
          <p style="color: var(--text-secondary);">La Papelera está vacía 🌿</p>
        </div>
      `;
      return;
    }

    const banner = document.createElement('div');
    banner.className = 'card trash-banner';
    banner.style.gridColumn = '1 / -1';
    banner.innerHTML = `
      <span style="font-size:13px;color:var(--text-secondary);">
        ${trashed.length} actividad(es) en la Papelera. Solo se borran para siempre cuando tú lo confirmes.
      </span>
      <button class="btn-secondary btn-sm btn-danger-outline" id="btnEmptyTrash">🗑️ Vaciar Papelera</button>
    `;
    banner.querySelector('#btnEmptyTrash').addEventListener('click', emptyTrash);
    tasksGrid.appendChild(banner);

    trashed.forEach((task) => {
      const folder = state.folders.find((f) => f.id === task.folderId);
      const originLabel = isTaskCompleted(task)
        ? '✅ Completada'
        : folder
        ? `${folder.icon} ${folder.name}`
        : '📘 Materia eliminada';
      const when = task.deletedAt ? new Date(task.deletedAt).toLocaleDateString() : '';

      const card = document.createElement('div');
      card.className = 'task-card trash-card';
      card.innerHTML = `
        <div class="task-card-top">
          <span class="subject-tag">${originLabel}</span>
          <span class="deadline-pill deadline-calm">${when ? 'Eliminada ' + when : 'Eliminada'}</span>
        </div>
        <div class="task-title-row">
          <div class="task-title" style="color:var(--text-secondary);">${task.title}</div>
          <span class="task-type-badge">${task.type}</span>
        </div>
        <div class="task-card-actions">
          <button class="btn-primary btn-sm" data-restore-task="${task.id}">♻️ Restaurar</button>
          <button class="btn-secondary btn-sm btn-danger-outline" data-purge-task="${task.id}">🗑️ Eliminar definitivamente</button>
        </div>
      `;
      card.querySelector(`[data-restore-task="${task.id}"]`).addEventListener('click', () => {
        restoreTaskFromTrash(task);
      });
      card.querySelector(`[data-purge-task="${task.id}"]`).addEventListener('click', () => {
        purgeTask(task);
      });
      tasksGrid.appendChild(card);
    });
  }

  // --- VISTA 3: CALENDARIO Y PRÓXIMAS FECHAS ---
  function renderCalendarView() {
    const state = window.StateStore.getState();
    const timeline = document.getElementById('upcomingTimeline');
    timeline.innerHTML = '';

    const sorted = state.tasks.filter((t) => !isTaskDeleted(t)).sort((a, b) => {
      const aDone = isTaskCompleted(a) ? 1 : 0;
      const bDone = isTaskCompleted(b) ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
    });
    if (sorted.length === 0) {
      timeline.innerHTML =
        '<div style="font-size:13px;color:var(--text-muted);">No hay fechas agendadas todavía.</div>';
    } else {
      sorted.forEach((task) => {
        const folder = state.folders.find((f) => f.id === task.folderId) || {
          icon: '📘',
          name: 'Materia',
          color: '#34d399'
        };
        const completed = isTaskCompleted(task);
        const badge = completed
          ? { text: '✅ Completada', cls: 'deadline-calm' }
          : formatDeadlineBadge(task.dueDate);
        const item = document.createElement('div');
        item.className = 'timeline-item';
        if (completed) item.style.opacity = '0.72';
        item.innerHTML = `
          <div>
            <div style="font-weight:700;font-size:14px;${completed ? 'text-decoration:line-through;color:var(--text-secondary);' : ''}">${folder.icon} ${task.title}</div>
            <div style="font-size:12px;color:var(--text-secondary);">${folder.name} · ${task.type} · Fecha: ${task.dueDate}</div>
          </div>
          <span class="deadline-pill ${badge.cls}">${badge.text}</span>
        `;
        timeline.appendChild(item);
      });
    }

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
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayKey = toDateKey(new Date());

    for (let i = 0; i < startOffset; i++) {
      grid.appendChild(document.createElement('div'));
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(year, month, day);
      const cellKey = toDateKey(cellDate);
      const mins = window.StateStore.getMinutesOnDate(cellKey);
      const examsOnDay = state.tasks.filter((t) => !isTaskDeleted(t) && t.dueDate === cellKey);
      const isRest = !window.StateStore.isDayScheduledForFocus(cellDate);

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

  // --- VISTA 4: ESTADÍSTICAS E HISTORIAL ---
  function renderStatsView() {
    const state = window.StateStore.getState();
    const metrics = window.StateStore.computeConsistencyMetrics();
    const totalMins = state.sessions.reduce((acc, s) => acc + Number(s.minutes || 0), 0);
    const completedSubs = state.tasks.reduce(
      (acc, t) => acc + (t.subtasks || []).filter((s) => s.done).length,
      0
    );

    document.getElementById('statTotalHours').textContent = `${(totalMins / 60).toFixed(1)} h`;
    document.getElementById('statStreak').textContent = `${metrics.streak} días`;
    document.getElementById('statTotalSessions').textContent = `${state.sessions.length}`;
    document.getElementById('statCompletedSubtasks').textContent = `${completedSubs}`;

    const chart = document.getElementById('weeklyBarChart');
    chart.innerHTML = '';
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const daysData = [];
    let maxMins = 60;

    for (let i = 6; i >= 0; i--) {
      const d = addDays(new Date(), -i);
      const key = toDateKey(d);
      const mins = window.StateStore.getMinutesOnDate(key);
      if (mins > maxMins) maxMins = mins;
      daysData.push({
        label: dayNames[d.getDay()],
        mins,
        isRest: !window.StateStore.isDayScheduledForFocus(d)
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

    const historyList = document.getElementById('sessionsHistoryList');
    historyList.innerHTML = '';
    if (state.sessions.length === 0) {
      historyList.innerHTML =
        '<div style="font-size:13px;color:var(--text-muted);">Aún no hay sesiones registradas.</div>';
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

  // --- MODALES DE CREACIÓN Y EDICIÓN ---
  function openFolderModal(folder = null) {
    const form = document.getElementById('formFolder');
    form.reset();
    const titleEl = document.getElementById('modalFolderTitle');
    const idInput = document.getElementById('folderIdInput');
    const nameInput = document.getElementById('folderNameInput');
    const iconInput = document.getElementById('folderIconInput');
    const colorInput = document.getElementById('folderColorInput');

    if (folder && folder.id) {
      titleEl.textContent = '✏️ Editar Carpeta de Materia';
      idInput.value = folder.id;
      nameInput.value = folder.name || '';
      iconInput.value = folder.icon || '📘';
      colorInput.value = folder.color || '#34d399';
    } else {
      titleEl.textContent = 'Nueva Carpeta de Materia';
      idInput.value = '';
      colorInput.value = '#34d399';
    }
    document.getElementById('modalFolder').classList.remove('hidden');
  }

  function openTaskModal(task = null) {
    const state = window.StateStore.getState();
    const select = document.getElementById('taskFolderSelect');
    select.innerHTML = '';
    state.folders.forEach((f) => {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = `${f.icon} ${f.name}`;
      select.appendChild(opt);
    });

    const heading = document.getElementById('modalTaskHeading');
    const idInput = document.getElementById('taskIdInput');
    const titleInput = document.getElementById('taskTitleInput');
    const typeSelect = document.getElementById('taskTypeSelect');
    const dueInput = document.getElementById('taskDueDateInput');
    const subsTextarea = document.getElementById('taskSubtasksTextarea');

    if (task && task.id) {
      heading.textContent = '✏️ Editar Examen o Proyecto';
      idInput.value = task.id;
      select.value = task.folderId;
      titleInput.value = task.title || '';
      typeSelect.value = task.type || 'Examen';
      dueInput.value = task.dueDate || toDateKey(addDays(new Date(), 7));
      subsTextarea.value = (task.subtasks || []).map((s) => s.title).join('\n');
    } else {
      heading.textContent = 'Nuevo Examen o Proyecto';
      idInput.value = '';
      if (state.folders.some((f) => f.id === state.selectedFolderFilter)) {
        select.value = state.selectedFolderFilter;
      }
      titleInput.value = '';
      typeSelect.value = 'Examen';
      dueInput.value = toDateKey(addDays(new Date(), 7));
      subsTextarea.value = '';
    }
    document.getElementById('modalTask').classList.remove('hidden');
  }

  function openManualSessionModal() {
    const state = window.StateStore.getState();
    const select = document.getElementById('manualTaskSelect');
    select.innerHTML = '';
    state.tasks.filter((t) => !isTaskDeleted(t)).forEach((t) => {
      const f = state.folders.find((x) => x.id === t.folderId);
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${f ? f.icon : '📌'} ${t.title}`;
      select.appendChild(opt);
    });
    document.getElementById('modalManualSession').classList.remove('hidden');
  }

  // --- AUTO-ACTUALIZADOR ESTILO DISCORD ---
  function initAutoUpdaterUI() {
    if (!window.desktopAPI || !window.desktopAPI.checkForUpdates) return;

    const versionBadge = document.getElementById('appVersionBadge');
    const btnUpdateBanner = document.getElementById('btnUpdateBanner');
    const updateBannerText = document.getElementById('updateBannerText');
    const btnCheckUpdates = document.getElementById('btnCheckUpdates');

    let updateState = 'idle';
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
        showToast(
          `🚀 Actualización v${pendingRelease.latestVersion} lista. Haz clic en el botón verde superior para reiniciar.`
        );
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
        showToast(
          `🌱 ¡Nueva versión v${info.latestVersion} encontrada! Descargando en segundo plano...`
        );
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

    setTimeout(() => checkUpdates(true), 2500);
    setInterval(() => checkUpdates(true), 30 * 60 * 1000);
  }

  window.UIViews = {
    showToast,
    applyTheme,
    switchView,
    setPreviewOverride,
    shiftCalendarMonth,
    renderDashboard,
    renderWeekdaysSelector,
    renderTimerSelectors,
    renderActiveTimerSubtasks,
    renderSubjectsView,
    renderCalendarView,
    renderStatsView,
    renderAll,
    openFolderModal,
    openTaskModal,
    openManualSessionModal,
    initAutoUpdaterUI
  };
})();
