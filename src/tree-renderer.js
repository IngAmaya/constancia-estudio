// Renderizador visual del Árbol de Constancia · Edición Navidad (SVG Dinámico + Estados emocionales y de salud)
window.TreeRenderer = {
  getTreeStateInfo(health, isRestDay, previewOverride = null) {
    const mode = previewOverride || (isRestDay ? 'rest' : this.healthToState(health));

    const states = {
      bloom: {
        id: 'bloom',
        label: 'Navidad Radiante',
        badgeClass: 'state-bloom',
        message: '¡Tu constancia ilumina la Navidad! Tu pino brilla con estrella, luces y regalos.',
        skyGradient: ['#0b1d1b', '#173830'],
        auraColor: 'rgba(251, 191, 36, 0.24)',
        trunkColor: '#6b4226',
        leafPrimary: '#16a34a',
        leafSecondary: '#15803d',
        leafAccent: '#22c55e',
        groundColor: '#1b352c',
        snowColor: '#eef6f8',
        showOrnaments: true,
        showLights: true,
        showStar: true,
        showGifts: true,
        showSnow: true,
        showFallingNeedles: false
      },
      healthy: {
        id: 'healthy',
        label: 'Pino Sano y Festivo',
        badgeClass: 'state-healthy',
        message: 'Tus raíces están firmes bajo la nieve. Una sesión hoy mantendrá las luces encendidas.',
        skyGradient: ['#0f1f1c', '#1b352d'],
        auraColor: 'rgba(52, 211, 153, 0.16)',
        trunkColor: '#69432a',
        leafPrimary: '#15803d',
        leafSecondary: '#166534',
        leafAccent: '#22c55e',
        groundColor: '#1a3028',
        snowColor: '#e2eef2',
        showOrnaments: true,
        showLights: false,
        showStar: true,
        showGifts: true,
        showSnow: true,
        showFallingNeedles: false
      },
      thirsty: {
        id: 'thirsty',
        label: 'Pino Apagado (1 día pendiente)',
        badgeClass: 'state-thirsty',
        message: 'Las luces de tu árbol se atenúan y las ramas pierden vigor. Dedica 25 min hoy para encenderlo.',
        skyGradient: ['#231d18', '#33281d'],
        auraColor: 'rgba(245, 158, 11, 0.14)',
        trunkColor: '#5c3d2e',
        leafPrimary: '#85642d',
        leafSecondary: '#6b4f21',
        leafAccent: '#a17a36',
        groundColor: '#29221a',
        snowColor: '#cbd5e1',
        showOrnaments: false,
        showLights: false,
        showStar: false,
        showGifts: false,
        showSnow: false,
        showFallingNeedles: true
      },
      wilted: {
        id: 'wilted',
        label: 'Marchito · Listo para renacer',
        badgeClass: 'state-wilted',
        message: 'El frío apagó las ramas, pero las raíces siguen vivas. ¡Una sesión hoy encenderá de nuevo tu Navidad!',
        skyGradient: ['#1f1a1b', '#2b2325'],
        auraColor: 'rgba(156, 163, 175, 0.08)',
        trunkColor: '#4b372e',
        leafPrimary: '#635042',
        leafSecondary: '#4c3d32',
        leafAccent: '#786252',
        groundColor: '#241e1c',
        snowColor: '#94a3b8',
        showOrnaments: false,
        showLights: false,
        showStar: false,
        showGifts: false,
        showSnow: false,
        showFallingNeedles: true
      },
      rest: {
        id: 'rest',
        label: 'Noche de Paz (Descanso)',
        badgeClass: 'state-rest',
        message: 'Hoy es tu día de descanso programado. Tu árbol descansa en Nochebuena sin perder salud.',
        skyGradient: ['#0d1326', '#182344'],
        auraColor: 'rgba(253, 224, 71, 0.18)',
        trunkColor: '#5a3d2e',
        leafPrimary: '#15803d',
        leafSecondary: '#14532d',
        leafAccent: '#34d399',
        groundColor: '#162038',
        snowColor: '#e0e7ff',
        showOrnaments: true,
        showLights: true,
        showStar: true,
        showGifts: true,
        showSnow: true,
        showFallingNeedles: false
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

    const starsAndMoonMarkup = isRest
      ? `
        <g class="stars-group">
          <circle cx="65" cy="52" r="1.6" fill="#e0e7ff" opacity="0.85" />
          <circle cx="125" cy="36" r="2" fill="#fef08a" opacity="0.9" />
          <circle cx="285" cy="44" r="1.5" fill="#e0e7ff" opacity="0.75" />
          <circle cx="342" cy="82" r="1.8" fill="#c7d2fe" opacity="0.85" />
          <circle cx="88" cy="112" r="1.3" fill="#e0e7ff" opacity="0.65" />
          <!-- Luna Creciente de Nochebuena -->
          <path d="M312 40 A21 21 0 1 0 336 69 A16 16 0 1 1 312 40 Z" fill="#fef08a" opacity="0.95" />
        </g>
      `
      : `
        <g class="stars-group">
          <circle cx="72" cy="48" r="1.3" fill="#fef9c3" opacity="0.55" />
          <circle cx="328" cy="54" r="1.5" fill="#fef9c3" opacity="0.6" />
          <circle cx="288" cy="34" r="1.1" fill="#e2e8f0" opacity="0.45" />
          <circle cx="115" cy="75" r="1.1" fill="#e2e8f0" opacity="0.4" />
        </g>
      `;

    const snowMarkup = stateInfo.showSnow
      ? `
        <g class="snow-particles">
          <circle cx="85" cy="90" r="2.2" fill="#ffffff" opacity="0.75" class="firefly ff1" />
          <circle cx="145" cy="58" r="1.8" fill="#ffffff" opacity="0.65" class="firefly ff2" />
          <circle cx="268" cy="72" r="2.4" fill="#ffffff" opacity="0.8" class="firefly ff3" />
          <circle cx="315" cy="148" r="2" fill="#ffffff" opacity="0.6" class="firefly ff4" />
          <circle cx="108" cy="185" r="2.1" fill="#ffffff" opacity="0.7" class="firefly ff2" />
          <circle cx="290" cy="198" r="1.7" fill="#ffffff" opacity="0.6" class="firefly ff1" />
        </g>
      `
      : '';

    const focusMagicMarkup = isTimerRunning
      ? `
        <g class="nourish-droplets">
          <circle cx="170" cy="68" r="3.2" fill="#fde047" class="droplet d1" />
          <circle cx="202" cy="48" r="3.5" fill="#6ee7b7" class="droplet d2" />
          <circle cx="234" cy="70" r="3" fill="#fca5a5" class="droplet d3" />
        </g>
      `
      : '';

    const canopyMarkup = isWilted
      ? `
        <!-- Pino marchito con pocas ramas secas y un brote verde navideño -->
        <g class="tree-canopy wilted-canopy">
          <path d="M200 104 L165 162 L235 162 Z" fill="${stateInfo.leafSecondary}" opacity="0.58" />
          <path d="M200 138 L142 208 L258 208 Z" fill="${stateInfo.leafPrimary}" opacity="0.52" />
          <path d="M200 174 L126 238 L274 238 Z" fill="${stateInfo.leafSecondary}" opacity="0.48" />
          <!-- Pequeño brote verde de esperanza en la punta -->
          <path d="M200 98 C203 87, 214 87, 211 97 C209 102, 202 101, 200 98 Z" fill="#22c55e" />
        </g>
      `
      : `
        <!-- Pino navideño frondoso por niveles -->
        <g class="tree-canopy sway-slow">
          <!-- Nivel inferior -->
          <path d="M200 132 L114 236 Q155 244 200 238 Q245 244 286 236 Z" fill="${stateInfo.leafSecondary}" />
          <!-- Nivel medio-bajo -->
          <path d="M200 100 L128 194 Q165 202 200 196 Q235 202 272 194 Z" fill="${stateInfo.leafPrimary}" />
          <!-- Nivel medio-alto -->
          <path d="M200 72 L144 150 Q172 157 200 152 Q228 157 256 150 Z" fill="${stateInfo.leafSecondary}" />
          <!-- Nivel superior -->
          <path d="M200 48 L163 108 Q182 114 200 110 Q218 114 237 108 Z" fill="${stateInfo.leafAccent}" />

          ${
            stateInfo.showSnow
              ? `
            <!-- Toques suaves de nieve en las puntas de las ramas -->
            <path d="M200 48 L187 69 Q194 72 200 69 Q206 72 213 69 Z" fill="#ffffff" opacity="0.88" />
            <path d="M144 150 Q154 146 164 152 L152 153 Z" fill="#ffffff" opacity="0.72" />
            <path d="M256 150 Q246 146 236 152 L248 153 Z" fill="#ffffff" opacity="0.72" />
            <path d="M114 236 Q128 230 140 238 L124 239 Z" fill="#ffffff" opacity="0.75" />
            <path d="M286 236 Q272 230 260 238 L276 239 Z" fill="#ffffff" opacity="0.75" />
          `
              : ''
          }
        </g>
      `;

    const starMarkup = stateInfo.showStar
      ? `
        <!-- Estrella navideña en la cima -->
        <g class="christmas-star sway-slow">
          <circle cx="200" cy="44" r="14" fill="rgba(250, 204, 21, 0.25)" class="aura-pulse" />
          <polygon
            points="200,29 204.2,38.5 214.5,39.5 206.8,46.2 209,56.2 200,51 191,56.2 193.2,46.2 185.5,39.5 195.8,38.5"
            fill="#fbbf24"
            stroke="#fef08a"
            stroke-width="1"
          />
        </g>
      `
      : '';

    const ornamentsMarkup = stateInfo.showOrnaments
      ? `
        <!-- Esferas y guirnaldas navideñas -->
        <g class="tree-ornaments sway-slow">
          <!-- Guirnaldas -->
          <path d="M174 102 Q200 116 226 102" stroke="#fbbf24" stroke-width="2" fill="none" opacity="0.85" />
          <path d="M150 146 Q200 166 250 146" stroke="#f87171" stroke-width="2.2" fill="none" opacity="0.85" />
          <path d="M132 190 Q200 215 268 190" stroke="#fbbf24" stroke-width="2.2" fill="none" opacity="0.85" />

          <!-- Esferas rojas, doradas y menta -->
          <circle cx="185" cy="92" r="4.5" fill="#ef4444" />
          <circle cx="215" cy="96" r="4" fill="#fbbf24" />
          <circle cx="168" cy="136" r="5" fill="#fbbf24" />
          <circle cx="202" cy="128" r="5.2" fill="#ef4444" />
          <circle cx="232" cy="138" r="4.8" fill="#5eead4" />
          <circle cx="152" cy="178" r="5.5" fill="#ef4444" />
          <circle cx="188" cy="172" r="5" fill="#5eead4" />
          <circle cx="222" cy="176" r="5.5" fill="#fbbf24" />
          <circle cx="250" cy="182" r="4.8" fill="#ef4444" />
          <circle cx="142" cy="222" r="5.8" fill="#fbbf24" />
          <circle cx="178" cy="216" r="5.5" fill="#ef4444" />
          <circle cx="218" cy="220" r="5.8" fill="#5eead4" />
          <circle cx="258" cy="222" r="5.5" fill="#ef4444" />
        </g>
      `
      : '';

    const lightsMarkup = stateInfo.showLights
      ? `
        <!-- Luces cálidas parpadeantes -->
        <g class="tree-lights sway-slow">
          <circle cx="195" cy="76" r="2.6" fill="#fef08a" class="xmas-light l1" />
          <circle cx="210" cy="114" r="2.8" fill="#fca5a5" class="xmas-light l2" />
          <circle cx="178" cy="152" r="2.8" fill="#fef08a" class="xmas-light l3" />
          <circle cx="228" cy="156" r="2.6" fill="#6ee7b7" class="xmas-light l1" />
          <circle cx="162" cy="198" r="3" fill="#fef08a" class="xmas-light l2" />
          <circle cx="204" cy="198" r="3" fill="#fca5a5" class="xmas-light l3" />
          <circle cx="242" cy="202" r="2.8" fill="#fef08a" class="xmas-light l1" />
          <circle cx="160" cy="230" r="2.6" fill="#6ee7b7" class="xmas-light l3" />
          <circle cx="238" cy="230" r="2.8" fill="#fef08a" class="xmas-light l2" />
        </g>
      `
      : '';

    const giftsMarkup = stateInfo.showGifts
      ? `
        <!-- Regalos navideños bajo el árbol -->
        <g class="xmas-gifts">
          <!-- Regalo rojo izquierdo -->
          <rect x="138" y="253" width="26" height="20" rx="3" fill="#dc2626" />
          <rect x="149" y="253" width="4" height="20" fill="#fbbf24" />
          <rect x="138" y="261" width="26" height="4" fill="#fbbf24" />
          <path d="M151 253 Q145 247 148 253 Q157 247 151 253 Z" fill="#fbbf24" />

          <!-- Regalo dorado derecho -->
          <rect x="234" y="256" width="24" height="18" rx="3" fill="#0f766e" />
          <rect x="244" y="256" width="4" height="18" fill="#f87171" />
          <rect x="234" y="263" width="24" height="4" fill="#f87171" />

          <!-- Regalo pequeño -->
          <rect x="214" y="262" width="16" height="13" rx="2.5" fill="#d97706" />
          <rect x="220" y="262" width="3" height="13" fill="#fef3c7" />
        </g>
      `
      : '';

    const fallingNeedlesMarkup = stateInfo.showFallingNeedles
      ? `
        <g class="falling-leaves">
          <ellipse cx="130" cy="215" rx="6" ry="2.2" transform="rotate(-25 130 215)" fill="#b45309" class="leaf-fall lf1" />
          <ellipse cx="262" cy="205" rx="6" ry="2.2" transform="rotate(30 262 205)" fill="#92400e" class="leaf-fall lf2" />
          <ellipse cx="152" cy="274" rx="7" ry="2.5" fill="#92400e" opacity="0.75" />
          <ellipse cx="246" cy="276" rx="7" ry="2.5" fill="#78350f" opacity="0.75" />
        </g>
      `
      : '';

    const lanternMarkup = isRest
      ? `
        <!-- Farolillo cálido navideño en modo descanso -->
        <g class="cozy-lantern">
          <line x1="258" y1="224" x2="258" y2="242" stroke="#cbd5e1" stroke-width="1.4" />
          <rect x="252" y="242" width="12" height="15" rx="3.5" fill="#fbbf24" stroke="#78350f" stroke-width="1.4" />
          <circle cx="258" cy="249" r="14" fill="rgba(251, 191, 36, 0.25)" />
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

        <!-- Cielo invernal -->
        <rect x="0" y="0" width="400" height="310" rx="18" fill="url(#skyGrad)" />

        <!-- Aura navideña -->
        <circle cx="200" cy="140" r="135" fill="url(#auraGrad)" class="aura-pulse" />

        ${starsAndMoonMarkup}

        <!-- Colinas nevadas lejanas -->
        <path d="M0 264 Q105 236 220 260 T400 254 L400 310 L0 310 Z" fill="${stateInfo.groundColor}" opacity="0.65" />

        <!-- Suelo e isla invernal -->
        <ellipse cx="200" cy="278" rx="145" ry="24" fill="${stateInfo.groundColor}" />
        <ellipse cx="200" cy="274" rx="115" ry="16" fill="${isWilted || isThirsty ? '#3b2f26' : stateInfo.snowColor}" opacity="${isWilted || isThirsty ? '0.85' : '0.9'}" />

        <!-- Tronco del pino -->
        <g class="tree-trunk">
          <rect x="188" y="232" width="24" height="40" rx="4" fill="${stateInfo.trunkColor}" />
        </g>

        ${canopyMarkup}
        ${ornamentsMarkup}
        ${lightsMarkup}
        ${starMarkup}
        ${giftsMarkup}
        ${lanternMarkup}
        ${fallingNeedlesMarkup}
        ${snowMarkup}
        ${focusMagicMarkup}
      </svg>
    `;
  }
};
