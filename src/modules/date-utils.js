// Módulo de utilidades de fechas y cuenta regresiva
(function () {
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

  window.DateUtils = {
    toDateKey,
    addDays,
    daysBetweenTodayAnd,
    formatDeadlineBadge
  };
})();
