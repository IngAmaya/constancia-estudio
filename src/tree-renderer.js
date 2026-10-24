// Renderizador visual del Árbol de Constancia (SVG Dinámico + Estados emocionales y de salud)
window.TreeRenderer = {
  getTreeStateInfo(health, isRestDay, previewOverride = null) {
    const mode = previewOverride || (isRestDay ? 'rest' : this.healthToState(health));

    const states = {
      bloom: {
        id: 'bloom',
        label: 'Floreciente',
        badgeClass: 'state-bloom',
        message: '¡Tu constancia está dando frutos! El árbol rebosa de vida y flores.',
        skyGradient: ['#132a23', '#1e4235'],
        auraColor: 'rgba(110, 231, 183, 0.22)',
        trunkColor: '#6b4c3b',
        leafPrimary: '#34d399',
        leafSecondary: '#10b981',
        leafAccent: '#6ee7b7',
        groundColor: '#1f3a2e',
        showBlossoms: true,
        showFireflies: true,
        showFallingLeaves: false,
        canopyScale: 1
      },
      healthy: {
        id: 'healthy',
        label: 'Sano y Activo',
        badgeClass: 'state-healthy',
        message: 'Tus raíces están firmes. Una sesión hoy mantendrá tu árbol radiante.',
        skyGradient: ['#162621', '#213830'],
        auraColor: 'rgba(74, 222, 128, 0.14)',
        trunkColor: '#694b3c',
        leafPrimary: '#2fb37d',
        leafSecondary: '#238c62',
        leafAccent: '#52cfa0',
        groundColor: '#1d3329',
        showBlossoms: false,
        showFireflies: true,
        showFallingLeaves: false,
        canopyScale: 0.95
      },
      thirsty: {
        id: 'thirsty',
        label: 'Sediento (1 día pendiente)',
        badgeClass: 'state-thirsty',
        message: 'Las hojas empiezan a tornarse ámbar. Dedica 25 min hoy para devolverle su verdor.',
        skyGradient: ['#282119', '#382c1e'],
        auraColor: 'rgba(245, 158, 11, 0.15)',
        trunkColor: '#5c4338',
        leafPrimary: '#d97706',
        leafSecondary: '#b45309',
        leafAccent: '#f59e0b',
        groundColor: '#2d251b',
        showBlossoms: false,
        showFireflies: false,
        showFallingLeaves: true,
        canopyScale: 0.86
      },
      wilted: {
        id: 'wilted',
        label: 'Marchito · Listo para renacer',
        badgeClass: 'state-wilted',
        message: 'Ha pasado tiempo sin riego en días de enfoque, pero las raíces siguen vivas. ¡Una sesión hoy lo hará brotar de nuevo!',
        skyGradient: ['#231d1e', '#2f2628'],
        auraColor: 'rgba(156, 163, 175, 0.08)',
        trunkColor: '#4b3b34',
        leafPrimary: '#785a46',
        leafSecondary: '#5c4435',
        leafAccent: '#94725b',
        groundColor: '#26201d',
        showBlossoms: false,
        showFireflies: false,
        showFallingLeaves: true,
        canopyScale: 0.55
      },
      rest: {
        id: 'rest',
        label: 'Día de Descanso Protegido',
        badgeClass: 'state-rest',
        message: 'Hoy es tu día de descanso programado. Tu árbol duerme bajo las estrellas sin perder salud. Descansar también es avanzar.',
        skyGradient: ['#131829', '#1f2742'],
        auraColor: 'rgba(165, 180, 252, 0.20)',
        trunkColor: '#5a453c',
        leafPrimary: '#389e83',
        leafSecondary: '#297a66',
        leafAccent: '#818cf8',
        groundColor: '#192236',
        showBlossoms: false,
        showFireflies: true,
        showFallingLeaves: false,
        canopyScale: 0.96
      }
    };

    return states[mode] || states.healthy;
  },

  healthToState(health) {
    if (health >= 85) return 'bloom';
    if (health >= 60) return 'healthy';
    if (health >= 35) return 'thirsty';
    return 'wilted';
  },

  renderSVG(stateInfo, isTimerRunning = false) {
    const isWilted = stateInfo.id === 'wilted';
    const isRest = stateInfo.id === 'rest';
    const isThirsty = stateInfo.id === 'thirsty';

    const starsMarkup = isRest
      ? `
        <g class="stars-group">
          <circle cx="70" cy="55" r="1.5" fill="#e0e7ff" opacity="0.8" />
          <circle cx="130" cy="38" r="2" fill="#c7d2fe" opacity="0.9" />
          <circle cx="290" cy="45" r="1.5" fill="#e0e7ff" opacity="0.7" />
          <circle cx="340" cy="80" r="1.8" fill="#c7d2fe" opacity="0.85" />
          <circle cx="85" cy="115" r="1.2" fill="#e0e7ff" opacity="0.6" />
          <!-- Luna Creciente -->
          <path d="M310 42 A22 22 0 1 0 335 72 A17 17 0 1 1 310 42 Z" fill="#fef08a" opacity="0.92" />
        </g>
      `
      : '';

    const focusRainMarkup = isTimerRunning
      ? `
        <g class="nourish-droplets">
          <circle cx="170" cy="70" r="3" fill="#6ee7b7" class="droplet d1" />
          <circle cx="205" cy="55" r="3.5" fill="#34d399" class="droplet d2" />
          <circle cx="235" cy="72" r="3" fill="#a7f3d0" class="droplet d3" />
        </g>
      `
      : '';

    const canopyMarkup = isWilted
      ? `
        <!-- Copa marchita con pocos brotes esperando riego -->
        <g class="tree-canopy wilted-canopy">
          <ellipse cx="145" cy="148" rx="22" ry="13" fill="${stateInfo.leafSecondary}" opacity="0.55" />
          <ellipse cx="255" cy="145" rx="20" ry="12" fill="${stateInfo.leafPrimary}" opacity="0.55" />
          <ellipse cx="200" cy="112" rx="26" ry="15" fill="${stateInfo.leafPrimary}" opacity="0.6" />
          <!-- Pequeño brote verde de esperanza -->
          <path d="M200 96 C203 86, 214 86, 212 95 C210 100, 202 99, 200 96 Z" fill="#34d399" />
        </g>
      `
      : `
        <!-- Copa frondosa animada -->
        <g class="tree-canopy sway-slow">
          <circle cx="145" cy="150" r="44" fill="${stateInfo.leafSecondary}" />
          <circle cx="255" cy="148" r="44" fill="${stateInfo.leafSecondary}" />
          <circle cx="170" cy="112" r="48" fill="${stateInfo.leafPrimary}" />
          <circle cx="232" cy="114" r="46" fill="${stateInfo.leafPrimary}" />
          <circle cx="200" cy="92" r="52" fill="${stateInfo.leafAccent}" opacity="0.88" />
          <circle cx="135" cy="135" r="32" fill="${stateInfo.leafPrimary}" opacity="0.9" />
          <circle cx="265" cy="135" r="32" fill="${stateInfo.leafPrimary}" opacity="0.9" />
          <ellipse cx="200" cy="145" rx="68" ry="36" fill="${stateInfo.leafPrimary}" />
        </g>
      `;

    const blossomsMarkup = stateInfo.showBlossoms
      ? `
        <g class="tree-blossoms sway-slow">
          <!-- Flores rosadas y frutos dorados de constancia -->
          <circle cx="162" cy="95" r="6" fill="#fda4af" />
          <circle cx="162" cy="95" r="2.5" fill="#fef08a" />
          <circle cx="228" cy="84" r="6.5" fill="#fda4af" />
          <circle cx="228" cy="84" r="2.5" fill="#fef08a" />
          <circle cx="195" cy="126" r="6" fill="#fda4af" />
          <circle cx="195" cy="126" r="2.5" fill="#fef08a" />
          <circle cx="140" cy="138" r="5.5" fill="#fbcfe8" />
          <circle cx="255" cy="130" r="6" fill="#fda4af" />
          <circle cx="255" cy="130" r="2.5" fill="#fef08a" />
          <circle cx="182" cy="68" r="5" fill="#fbcfe8" />
        </g>
      `
      : '';

    const fallingLeavesMarkup = stateInfo.showFallingLeaves
      ? `
        <g class="falling-leaves">
          <ellipse cx="130" cy="215" rx="6" ry="3" transform="rotate(-25 130 215)" fill="#d97706" class="leaf-fall lf1" />
          <ellipse cx="262" cy="205" rx="6" ry="3" transform="rotate(30 262 205)" fill="#b45309" class="leaf-fall lf2" />
          <!-- Hojas secas en el suelo -->
          <ellipse cx="145" cy="276" rx="7" ry="3" fill="#b45309" opacity="0.8" />
          <ellipse cx="162" cy="281" rx="6" ry="2.5" fill="#92400e" opacity="0.75" />
          <ellipse cx="248" cy="278" rx="7" ry="3" fill="#b45309" opacity="0.8" />
          <ellipse cx="230" cy="283" rx="6" ry="2.5" fill="#78350f" opacity="0.7" />
        </g>
      `
      : '';

    const firefliesMarkup = stateInfo.showFireflies
      ? `
        <g class="fireflies">
          <circle cx="115" cy="160" r="3" fill="#fde047" class="firefly ff1" />
          <circle cx="285" cy="145" r="2.8" fill="#fef08a" class="firefly ff2" />
          <circle cx="155" cy="70" r="2.5" fill="#a7f3d0" class="firefly ff3" />
          <circle cx="248" cy="188" r="3.2" fill="#fde047" class="firefly ff4" />
        </g>
      `
      : '';

    const lanternMarkup = isRest
      ? `
        <!-- Farolillo cálido colgando de la rama en modo descanso -->
        <g class="cozy-lantern">
          <line x1="246" y1="168" x2="246" y2="195" stroke="#9ca3af" stroke-width="1.5" />
          <rect x="240" y="195" width="12" height="16" rx="4" fill="#fbbf24" stroke="#78350f" stroke-width="1.5" />
          <circle cx="246" cy="203" r="14" fill="rgba(251, 191, 36, 0.25)" />
        </g>
      `
      : '';

    return `
      <svg viewBox="0 0 400 310" class="tree-svg ${isTimerRunning ? 'timer-active-svg' : ''}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${stateInfo.skyGradient[0]}" />
            <stop offset="100%" stop-color="${stateInfo.skyGradient[1]}" />
          </linearGradient>
          <radialGradient id="auraGrad" cx="50%" cy="45%" r="48%">
            <stop offset="0%" stop-color="${stateInfo.auraColor}" />
            <stop offset="100%" stop-color="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>

        <!-- Fondo de cielo -->
        <rect x="0" y="0" width="400" height="310" rx="18" fill="url(#skyGrad)" />

        <!-- Aura de energía -->
        <circle cx="200" cy="140" r="135" fill="url(#auraGrad)" class="aura-pulse" />

        ${starsMarkup}

        <!-- Colinas lejanas -->
        <path d="M0 265 Q105 235 220 262 T400 255 L400 310 L0 310 Z" fill="${stateInfo.groundColor}" opacity="0.55" />

        <!-- Suelo e isla del árbol -->
        <ellipse cx="200" cy="278" rx="145" ry="24" fill="${stateInfo.groundColor}" />
        <ellipse cx="200" cy="275" rx="110" ry="15" fill="${isWilted || isThirsty ? '#3b2f26' : '#264637'}" />

        <!-- Raíces y tronco orgánico -->
        <g class="tree-trunk">
          <!-- Raíces -->
          <path d="M188 265 Q165 278 145 278" stroke="${stateInfo.trunkColor}" stroke-width="7" stroke-linecap="round" fill="none" />
          <path d="M212 265 Q235 278 258 277" stroke="${stateInfo.trunkColor}" stroke-width="7" stroke-linecap="round" fill="none" />
          <path d="M200 267 Q200 280 185 283" stroke="${stateInfo.trunkColor}" stroke-width="5" stroke-linecap="round" fill="none" />

          <!-- Tronco principal -->
          <path d="M184 270 Q190 215 188 165 L212 165 Q210 215 216 270 Z" fill="${stateInfo.trunkColor}" />

          <!-- Ramas principales -->
          <path d="M194 185 Q165 162 142 146" stroke="${stateInfo.trunkColor}" stroke-width="10" stroke-linecap="round" fill="none" />
          <path d="M206 182 Q235 160 256 145" stroke="${stateInfo.trunkColor}" stroke-width="10" stroke-linecap="round" fill="none" />
          <path d="M198 170 Q182 135 170 112" stroke="${stateInfo.trunkColor}" stroke-width="8" stroke-linecap="round" fill="none" />
          <path d="M203 170 Q218 135 230 114" stroke="${stateInfo.trunkColor}" stroke-width="8" stroke-linecap="round" fill="none" />
          <path d="M200 165 L200 105" stroke="${stateInfo.trunkColor}" stroke-width="7" stroke-linecap="round" fill="none" />
        </g>

        ${canopyMarkup}
        ${blossomsMarkup}
        ${lanternMarkup}
        ${fallingLeavesMarkup}
        ${firefliesMarkup}
        ${focusRainMarkup}
      </svg>
    `;
  }
};
