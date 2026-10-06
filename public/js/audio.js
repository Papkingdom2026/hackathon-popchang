/**
 * Zero-Config Web Audio API Engine
 * For Game Programming Hackathon 2026 @PCSHS_PHITSANULOK
 * Generates all SFX, Retro BGM, and Victory Fanfare programmatically.
 */

class HackathonAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isBGMPlaying = false;
    this.bgmGainNode = null;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.currentPercentage = 0;
  }

  // Initialize or resume AudioContext safely upon user interaction
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Toggle Mute
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.bgmGainNode) {
      this.bgmGainNode.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  /* =========================================================================
   * 1. POP SOUND (For Rapid Taps - PopCat style)
   * Short, crisp, bubbly pitch drop with slight random variation
   * ========================================================================= */
  playPop() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Slight random pitch for lively tactile feedback
    const baseFreq = 780 + (Math.random() * 120 - 60);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Frequency sweep: start high, drop sharply down
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.07);

    // Envelope: instant punch, exponential decay in 70ms
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    // Optional second harmonic ping for punchiness
    const pingOsc = this.ctx.createOscillator();
    const pingGain = this.ctx.createGain();
    pingOsc.type = 'triangle';
    pingOsc.frequency.setValueAtTime(baseFreq * 1.5, t);
    pingOsc.frequency.exponentialRampToValueAtTime(300, t + 0.04);
    pingGain.gain.setValueAtTime(0.15, t);
    pingGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    pingOsc.connect(pingGain);
    pingGain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);

    pingOsc.start(t);
    pingOsc.stop(t + 0.05);
  }

  /* =========================================================================
   * 2. MELLOW BASS & WATER DROPLET CHIMES BGM
   * Non-intrusive, warm ambient pulse with delicate water droplet pings
   * Fades out from 40%, ultra-quiet from 55%, complete silence by 90%!
   * ========================================================================= */
  startBGM() {
    if (this.isBGMPlaying) return;
    this.init();
    if (!this.ctx) return;

    this.isBGMPlaying = true;
    this.bgmGainNode = this.ctx.createGain();
    this.bgmGainNode.gain.setValueAtTime(this.isMuted ? 0 : 0.26, this.ctx.currentTime);
    this.bgmGainNode.connect(this.ctx.destination);

    // Warm pentatonic water droplet chime frequencies (D4, F4, G4, A4, C5, D5, E5)
    const dropletNotes = [293.66, 349.23, 392.00, 440.00, 523.25, 587.33, 659.25];
    // Gentle deep sub-bass progression (D2 73.4Hz, F2 87.3Hz, G2 98.0Hz, A2 110.0Hz)
    const bassNotes = [73.42, 73.42, 87.31, 98.00];

    const stepDuration = 0.22; // ~136 BPM 8th notes, calm pulse
    this.bgmStep = 0;

    const playStep = () => {
      if (!this.isBGMPlaying || !this.ctx) return;

      const t = this.ctx.currentTime;
      const step = this.bgmStep % 16;

      // 1. Warm Mellow Bass on beats 0, 4, 8, 12
      if (step % 4 === 0) {
        const bassFreq = bassNotes[(step / 4) % bassNotes.length];
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        const bassFilter = this.ctx.createBiquadFilter();

        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(bassFreq, t);

        bassFilter.type = 'lowpass';
        bassFilter.frequency.setValueAtTime(240, t);

        bassGain.gain.setValueAtTime(0.35, t);
        bassGain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 3.6);

        bassOsc.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(this.bgmGainNode);

        bassOsc.start(t);
        bassOsc.stop(t + stepDuration * 4);
      }

      // 2. Delicate Water Droplet / Crystal Chime Ping (Occasional, subtle)
      const chimeChance = [0, 2, 5, 7, 8, 10, 13, 15];
      if (chimeChance.includes(step)) {
        const chimeFreq = dropletNotes[step % dropletNotes.length];
        const chimeOsc = this.ctx.createOscillator();
        const chimeGain = this.ctx.createGain();

        chimeOsc.type = 'sine';
        chimeOsc.frequency.setValueAtTime(chimeFreq, t);

        // Water droplet ping envelope: instant attack, sweet resonant ping decay
        chimeGain.gain.setValueAtTime(0.12, t);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

        chimeOsc.connect(chimeGain);
        chimeGain.connect(this.bgmGainNode);

        chimeOsc.start(t);
        chimeOsc.stop(t + 0.38);
      }

      this.bgmStep++;
      this.bgmTimer = setTimeout(playStep, stepDuration * 1000);
    };

    playStep();
  }

  // Volume Fading Curve requested by user:
  // "ค่อยๆ ลดลงตั้งแต่ 40% เริ่มเงียบเบาสุดๆตั้งแต่ 55% ไป พอถึง 90% เงียบเลย"
  updateBGMByPercentage(percentage) {
    this.currentPercentage = percentage;
    if (!this.bgmGainNode || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    if (percentage >= 100) {
      this.stopBGM();
      return;
    }

    if (percentage >= 90) {
      // 90% - 100%: Complete silence for breathless suspense!
      this.bgmGainNode.gain.setTargetAtTime(0, t, 0.1);
    } else if (percentage >= 55) {
      // 55% - 90%: Whisper-quiet background suspense (0.04 -> 0.00)
      const p = (percentage - 55) / 35; // 0 to 1
      const vol = Math.max(0.002, 0.04 * (1 - p));
      this.bgmGainNode.gain.setTargetAtTime(vol, t, 0.15);
    } else if (percentage >= 40) {
      // 40% - 55%: Smooth fade down (0.26 -> 0.04)
      const p = (percentage - 40) / 15; // 0 to 1
      const vol = 0.26 - (0.22 * p);
      this.bgmGainNode.gain.setTargetAtTime(vol, t, 0.15);
    } else {
      // 0% - 40%: Normal mellow volume
      this.bgmGainNode.gain.setTargetAtTime(0.26, t, 0.2);
    }
  }

  stopBGM() {
    this.isBGMPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (this.bgmGainNode && this.ctx) {
      this.bgmGainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  /* =========================================================================
   * 3. HEAVY BASS BOOM (100% Impact)
   * Single heavy, booming deep bass hit with sub-bass rumble (NO brass fanfare)
   * ========================================================================= */
  playHeavyBassBoom() {
    this.stopBGM();
    this.init();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;

    // 1. Sharp Click / Transient Punch (Top attack)
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(320, t);
    clickOsc.frequency.exponentialRampToValueAtTime(45, t + 0.08);
    clickGain.gain.setValueAtTime(0.9, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    clickOsc.connect(clickGain);
    clickGain.connect(this.ctx.destination);
    clickOsc.start(t);
    clickOsc.stop(t + 0.09);

    // 2. Heavy Sub-Bass Boom (65Hz -> 24Hz booming drop with resonance)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(75, t);
    subOsc.frequency.exponentialRampToValueAtTime(24, t + 1.8);

    subGain.gain.setValueAtTime(1.0, t);
    subGain.gain.setTargetAtTime(0.6, t + 0.15, 0.4);
    subGain.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(t);
    subOsc.stop(t + 2.6);

    // 3. Deep resonant low rumble body
    const rumbleOsc = this.ctx.createOscillator();
    const rumbleGain = this.ctx.createGain();
    const rumbleFilter = this.ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.setValueAtTime(120, t);

    rumbleOsc.type = 'triangle';
    rumbleOsc.frequency.setValueAtTime(48, t);
    rumbleOsc.frequency.linearRampToValueAtTime(28, t + 2.2);

    rumbleGain.gain.setValueAtTime(0.5, t);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, t + 2.2);

    rumbleOsc.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(this.ctx.destination);
    rumbleOsc.start(t);
    rumbleOsc.stop(t + 2.3);
  }

  // Alias for backward compatibility
  playGameStart() {
    this.playHeavyBassBoom();
  }

  /* =========================================================================
   * 3.1 DIGITAL GAME START CHIME (When GAME START popup appears)
   * Crisp 8-bit cyber power-up arpeggio
   * ========================================================================= */
  playDigitalGameChime() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const chimeNotes = [
      { freq: 523.25, time: 0.00, dur: 0.12 }, // C5
      { freq: 659.25, time: 0.09, dur: 0.12 }, // E5
      { freq: 783.99, time: 0.18, dur: 0.14 }, // G5
      { freq: 1046.50, time: 0.27, dur: 0.35 }, // C6
      { freq: 1318.51, time: 0.38, dur: 0.55 }, // E6
    ];

    chimeNotes.forEach((n) => {
      const noteTime = t + n.time;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(n.freq, noteTime);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.22, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + n.dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(noteTime);
      osc.stop(noteTime + n.dur + 0.05);
    });
  }

  /* =========================================================================
   * 3.2 DOOR OPENING & WARP WHOOSH EFFECT (When stage splits into white light)
   * Pneumatic sci-fi door release + ethereal cosmic warp whoosh
   * ========================================================================= */
  playDoorWarpWhoosh() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Pneumatic Air Release / Door Whoosh (Filtered White Noise)
    const bufferSize = this.ctx.sampleRate * 2.2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(3.5, t);
    filter.frequency.setValueAtTime(250, t);
    filter.frequency.exponentialRampToValueAtTime(2200, t + 1.2);
    filter.frequency.exponentialRampToValueAtTime(350, t + 2.1);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.05, t);
    noiseGain.gain.linearRampToValueAtTime(0.4, t + 0.5);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 2.2);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noiseSource.start(t);

    // 2. Cosmic Warp Resonator Tone (Ascending sweep into blinding light)
    const warpOsc = this.ctx.createOscillator();
    const warpGain = this.ctx.createGain();
    warpOsc.type = 'sine';
    warpOsc.frequency.setValueAtTime(65, t);
    warpOsc.frequency.exponentialRampToValueAtTime(540, t + 1.5);
    warpOsc.frequency.exponentialRampToValueAtTime(1080, t + 2.0);

    warpGain.gain.setValueAtTime(0.02, t);
    warpGain.gain.linearRampToValueAtTime(0.35, t + 1.2);
    warpGain.gain.exponentialRampToValueAtTime(0.001, t + 2.3);

    warpOsc.connect(warpGain);
    warpGain.connect(this.ctx.destination);
    warpOsc.start(t);
    warpOsc.stop(t + 2.4);
  }

  /* =========================================================================
   * 4. CHARGING RISER SOUND (For Force 100% Dramatic Overclock Surge)
   * Rising synthesizer power sweep building suspense over durationSec
   * ========================================================================= */
  playChargingRiser(durationSec = 2.2) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    this.stopBGM();
    const t = this.ctx.currentTime;

    // Rising saw/square synth charging pitch (70Hz -> 920Hz)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(70, t);
    osc.frequency.exponentialRampToValueAtTime(920, t + durationSec);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, t);
    filter.frequency.exponentialRampToValueAtTime(4500, t + durationSec);
    filter.Q.setValueAtTime(6, t);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.linearRampToValueAtTime(0.45, t + durationSec);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + durationSec + 0.05);

    // High-speed pulsating turbine whirring
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(90, t);
    subOsc.frequency.exponentialRampToValueAtTime(440, t + durationSec);

    subGain.gain.setValueAtTime(0.25, t);
    subGain.gain.linearRampToValueAtTime(0.5, t + durationSec);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);

    subOsc.start(t);
    subOsc.stop(t + durationSec + 0.05);
  }
}

// Global instance ready to use
window.hackathonAudio = new HackathonAudioEngine();
