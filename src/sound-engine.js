// Motor de audio ambiental y alarmas suaves (100% offline con Web Audio API)
class CozySoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.volume = 0.45;
    this.activeSound = 'none'; // 'none' | 'rain' | 'brown' | 'zen'
    this.nodes = [];
    this.intervals = [];
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.08);
    }
  }

  stopAmbient() {
    this.intervals.forEach((id) => clearInterval(id));
    this.intervals = [];
    this.nodes.forEach((node) => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) {}
    });
    this.nodes = [];
    this.activeSound = 'none';
  }

  toggleAmbient(type) {
    if (this.activeSound === type || type === 'none') {
      this.stopAmbient();
      return 'none';
    }
    this.stopAmbient();
    this.initContext();
    this.activeSound = type;

    if (type === 'rain') {
      this.startRain();
    } else if (type === 'brown') {
      this.startBrownNoise();
    } else if (type === 'zen') {
      this.startZenPad();
    }
    return this.activeSound;
  }

  startRain() {
    // Pink/rain noise buffer with gentle low-pass filter
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.035;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1150;

    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 180;

    const rainGain = this.ctx.createGain();
    rainGain.gain.value = 0.85;

    whiteNoise.connect(filter);
    filter.connect(highpass);
    highpass.connect(rainGain);
    rainGain.connect(this.masterGain);

    whiteNoise.start(0);
    this.nodes.push(whiteNoise, filter, highpass, rainGain);
  }

  startBrownNoise() {
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 0.18;
    }

    const brownNoise = this.ctx.createBufferSource();
    brownNoise.buffer = noiseBuffer;
    brownNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 480;

    brownNoise.connect(filter);
    filter.connect(this.masterGain);
    brownNoise.start(0);
    this.nodes.push(brownNoise, filter);
  }

  startZenPad() {
    // Warm harmonic drone (F3, A3, C4, E4, G4)
    const freqs = [174.61, 220.0, 261.63, 329.63, 392.0];
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = f;

      gain.gain.value = 0.055 / (idx * 0.35 + 1);

      lfo.type = 'sine';
      lfo.frequency.value = 0.08 + idx * 0.03;
      lfoGain.gain.value = gain.gain.value * 0.45;

      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 600;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      lfo.start();
      this.nodes.push(osc, lfo, gain, lfoGain, filter);
    });
  }

  playCompletionChime() {
    this.initContext();
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.22);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.22);
      gain.gain.exponentialRampToValueAtTime(0.22, now + idx * 0.22 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.22 + 2.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.22);
      osc.stop(now + idx * 0.22 + 2.5);
    });
  }

  playWaterSparkle() {
    this.initContext();
    const now = this.ctx.currentTime;
    const notes = [587.33, 880.0]; // D5, A5
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.09, now + idx * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 0.55);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.6);
    });
  }
}

window.soundEngine = new CozySoundEngine();
