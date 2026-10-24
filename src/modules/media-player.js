// Módulo de Integración y Reproducción con YouTube y Spotify
(function () {
  let currentActiveMedia = null;

  function parseMediaUrlToEmbed(rawUrl) {
    const url = String(rawUrl || '').trim();
    if (!url) return null;

    // 1. Enlaces de Spotify (playlist, album, track, episode, show)
    const spotifyMatch = url.match(
      /open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album|track|episode|show)\/([a-zA-Z0-9]+)/i
    );
    if (spotifyMatch) {
      const type = spotifyMatch[1].toLowerCase();
      const id = spotifyMatch[2];
      return {
        platform: 'spotify',
        embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
        externalUrl: `https://open.spotify.com/${type}/${id}`,
        height: 152
      };
    }

    // 2. Enlaces de YouTube (watch?v=, youtu.be/, live/, embed/, playlist?list=)
    const ytListMatch = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    const ytVideoMatch =
      url.match(/(?:youtube\.com\/(?:watch\?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/) ||
      url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);

    if (ytVideoMatch) {
      const videoId = ytVideoMatch[1];
      return {
        platform: 'youtube',
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`,
        externalUrl: `https://www.youtube.com/watch?v=${videoId}`,
        height: 155
      };
    }

    if (ytListMatch) {
      const listId = ytListMatch[1];
      return {
        platform: 'youtube',
        embedUrl: `https://www.youtube-nocookie.com/embed/videoseries?list=${listId}&autoplay=1`,
        externalUrl: `https://www.youtube.com/playlist?list=${listId}`,
        height: 155
      };
    }

    if (/^https?:\/\//i.test(url)) {
      return {
        platform: 'web',
        embedUrl: null,
        externalUrl: url,
        height: 155
      };
    }

    return null;
  }

  function playEmbeddedMedia(item) {
    const parsed = parseMediaUrlToEmbed(item.url);
    if (!parsed) {
      if (window.UIViews) window.UIViews.showToast('⚠️ Enlace no válido. Pega una URL de YouTube o Spotify.');
      return;
    }

    if (window.soundEngine && window.soundEngine.activeSound !== 'none') {
      window.soundEngine.stopAmbient();
      document.querySelectorAll('.sound-btn').forEach((b) => b.classList.remove('active'));
    }

    currentActiveMedia = {
      title: item.title || '🎵 Ambiente personalizado',
      url: item.url,
      externalUrl: parsed.externalUrl
    };

    if (!parsed.embedUrl) {
      if (window.desktopAPI && window.desktopAPI.openMediaWindow) {
        window.desktopAPI.openMediaWindow({
          url: parsed.externalUrl,
          title: currentActiveMedia.title
        });
        if (window.UIViews) window.UIViews.showToast(`🎵 Abriendo ${currentActiveMedia.title} en reproductor...`);
      }
      return;
    }

    const box = document.getElementById('sidebarMediaEmbedBox');
    const titleEl = document.getElementById('sidebarMediaTitle');
    const holder = document.getElementById('sidebarMediaIframeHolder');

    titleEl.textContent = currentActiveMedia.title;
    holder.innerHTML = `
      <iframe
        src="${parsed.embedUrl}"
        height="${parsed.height}"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
      ></iframe>
    `;
    box.classList.remove('hidden');
  }

  function closeEmbeddedMedia() {
    document.getElementById('sidebarMediaIframeHolder').innerHTML = '';
    document.getElementById('sidebarMediaEmbedBox').classList.add('hidden');
    currentActiveMedia = null;
  }

  function popoutActiveMedia() {
    if (currentActiveMedia && window.desktopAPI && window.desktopAPI.openMediaWindow) {
      const target = {
        url: currentActiveMedia.externalUrl || currentActiveMedia.url,
        title: currentActiveMedia.title
      };
      closeEmbeddedMedia();
      window.desktopAPI.openMediaWindow(target);
    }
  }

  function renderSavedMediaList() {
    const state = window.StateStore.getState();
    const listEl = document.getElementById('savedMediaList');
    if (!listEl) return;
    listEl.innerHTML = '';

    (state.savedMedia || []).forEach((item) => {
      const row = document.createElement('div');
      row.className = 'saved-media-item';
      const badgeIcon =
        item.platform === 'spotify' ? '🟢' : item.platform === 'youtube' ? '🔴' : '🎵';
      row.innerHTML = `
        <div class="saved-media-info" title="Haz clic para reproducir en la barra lateral">
          <span>${badgeIcon}</span>
          <strong>${item.title}</strong>
        </div>
        <div class="saved-media-btns">
          <button type="button" class="btn-primary btn-sm" data-play-media="${item.id}">▶ Escuchar</button>
          <button type="button" class="btn-secondary btn-sm" data-popout-media="${item.id}" title="Abrir en ventana con tu cuenta">↗️</button>
          <button type="button" class="btn-ghost btn-sm" data-del-media="${item.id}" title="Quitar de la lista">✕</button>
        </div>
      `;

      row.querySelector('.saved-media-info').addEventListener('click', () => {
        playEmbeddedMedia(item);
        document.getElementById('modalMedia').classList.add('hidden');
      });
      row.querySelector(`[data-play-media="${item.id}"]`).addEventListener('click', () => {
        playEmbeddedMedia(item);
        document.getElementById('modalMedia').classList.add('hidden');
      });
      row.querySelector(`[data-popout-media="${item.id}"]`).addEventListener('click', () => {
        if (window.desktopAPI && window.desktopAPI.openMediaWindow) {
          window.desktopAPI.openMediaWindow({ url: item.url, title: item.title });
        }
      });
      row.querySelector(`[data-del-media="${item.id}"]`).addEventListener('click', () => {
        state.savedMedia = state.savedMedia.filter((m) => m.id !== item.id);
        window.StateStore.saveAppState();
        renderSavedMediaList();
      });

      listEl.appendChild(row);
    });
  }

  function openMediaModal() {
    renderSavedMediaList();
    document.getElementById('modalMedia').classList.remove('hidden');
  }

  window.MediaPlayer = {
    parseMediaUrlToEmbed,
    playEmbeddedMedia,
    closeEmbeddedMedia,
    popoutActiveMedia,
    renderSavedMediaList,
    openMediaModal
  };
})();
