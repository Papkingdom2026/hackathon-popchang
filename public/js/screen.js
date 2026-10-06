/**
 * Display View (Projector) Controller
 * Game Programming Hackathon 2026 @PCSHS_PHITSANULOK
 * Handles: Liquid Wave Fill on Transparent Artwork, Retro Segmented Bar, Web Audio dynamic BGM & Fanfare, Confetti Cannon
 */

document.addEventListener('DOMContentLoaded', () => {
  const socket = io();

  // DOM Elements
  const screenBody = document.getElementById('screenBody');
  const liquidWrapper = document.getElementById('liquidWrapper');
  const liquidBubbles = document.getElementById('liquidBubbles');
  const centerPercentage = document.getElementById('centerPercentage');
  const portalGlow = document.getElementById('portalGlow');
  const energyStatusSubtext = document.getElementById('energyStatusSubtext');

  const screenPercentage = document.getElementById('screenPercentage');
  const screenCPS = document.getElementById('screenCPS');
  const screenOnlineUsers = document.getElementById('screenOnlineUsers');
  const screenRetroBar = document.getElementById('screenRetroBar');

  const btnStartAudio = document.getElementById('btnStartAudio');
  const audioIcon = document.getElementById('audioIcon');
  const audioStatusText = document.getElementById('audioStatusText');

  const btnToggleQR = document.getElementById('btnToggleQR');
  const qrModal = document.getElementById('qrModal');
  const qrImg = document.getElementById('qrImg');
  const qrUrlText = document.getElementById('qrUrlText');

  const gameStartOverlay = document.getElementById('gameStartOverlay');
  const finalDurationEl = document.getElementById('finalDuration');
  const flashEffect = document.getElementById('flashEffect');
  const confettiCanvas = document.getElementById('confettiCanvas');
  const doorSplitStage = document.getElementById('doorSplitStage');
  const doorWhiteLight = document.getElementById('doorWhiteLight');
  const whiteOutOverlay = document.getElementById('whiteOutOverlay');

  let isAudioStarted = false;
  let isGameUnlocked = false;
  let currentPercentageVal = 0;
  let finaleTimers = [];

  // Build Retro Segmented Bar (36 segments on projector screen)
  const TOTAL_SCREEN_SEGMENTS = 36;
  const screenSegments = [];
  if (screenRetroBar) {
    screenRetroBar.innerHTML = '';
    for (let i = 0; i < TOTAL_SCREEN_SEGMENTS; i++) {
      const seg = document.createElement('div');
      seg.className = 'retro-segment';
      screenRetroBar.appendChild(seg);
      screenSegments.push(seg);
    }
  }

  function updateScreenSegments(percentage) {
    const activeCount = Math.round((percentage / 100) * TOTAL_SCREEN_SEGMENTS);
    screenSegments.forEach((seg, idx) => {
      if (idx < activeCount) {
        seg.classList.add('active');
      } else {
        seg.classList.remove('active');
      }
    });
  }

  // =========================================================================
  // 1. Audio Control (Autoplay Policy compliance & dynamic BGM)
  // =========================================================================
  btnStartAudio.addEventListener('click', () => {
    if (!isAudioStarted) {
      window.hackathonAudio.init();
      window.hackathonAudio.startBGM();
      isAudioStarted = true;
      audioIcon.textContent = '🔊';
      audioStatusText.textContent = 'AUDIO ACTIVE';
      btnStartAudio.classList.remove('cyber-btn-yellow');
      btnStartAudio.classList.add('bg-[#00ff66]/20', 'border-[#00ff66]', 'text-[#00ff66]');
    } else {
      const isMuted = window.hackathonAudio.toggleMute();
      audioIcon.textContent = isMuted ? '🔇' : '🔊';
      audioStatusText.textContent = isMuted ? 'AUDIO MUTED' : 'AUDIO ACTIVE';
    }
  });

  // =========================================================================
  // 2. Dynamic QR Code generation for projector
  // =========================================================================
  async function loadQRCode() {
    try {
      const origin = window.location.origin;
      const res = await fetch(`/api/qr?host=${encodeURIComponent(origin)}`);
      const data = await res.json();
      if (data && data.qrDataUrl) {
        qrImg.src = data.qrDataUrl;
        qrUrlText.textContent = data.url;
      }
    } catch (e) {
      console.warn('QR code fetch failed, using fallback', e);
    }
  }
  loadQRCode();

  btnToggleQR.addEventListener('click', () => {
    qrModal.classList.toggle('hidden');
  });

  // =========================================================================
  // 3. Ambient Starfield Background Canvas
  // =========================================================================
  const ambientCanvas = document.getElementById('ambientCanvas');
  const ambientCtx = ambientCanvas.getContext('2d');
  let stars = [];

  function resizeAmbientCanvas() {
    ambientCanvas.width = window.innerWidth;
    ambientCanvas.height = window.innerHeight;
    stars = [];
    const count = Math.floor((ambientCanvas.width * ambientCanvas.height) / 10000);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * ambientCanvas.width,
        y: Math.random() * ambientCanvas.height,
        radius: Math.random() * 1.8 + 0.5,
        alpha: Math.random() * 0.7 + 0.2,
        speed: Math.random() * 0.3 + 0.1,
        color: Math.random() > 0.6 ? '#00f0ff' : (Math.random() > 0.4 ? '#ff9e1f' : '#ffffff')
      });
    }
  }
  window.addEventListener('resize', resizeAmbientCanvas);
  resizeAmbientCanvas();

  function renderStars() {
    ambientCtx.clearRect(0, 0, ambientCanvas.width, ambientCanvas.height);
    for (const star of stars) {
      ambientCtx.beginPath();
      ambientCtx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ambientCtx.fillStyle = star.color;
      ambientCtx.globalAlpha = star.alpha;
      ambientCtx.shadowBlur = 6;
      ambientCtx.shadowColor = star.color;
      ambientCtx.fill();

      star.y -= star.speed;
      if (star.y < 0) {
        star.y = ambientCanvas.height;
        star.x = Math.random() * ambientCanvas.width;
      }
    }
    requestAnimationFrame(renderStars);
  }
  renderStars();

  // =========================================================================
  // 4. Liquid Bubbles Generator
  // =========================================================================
  function spawnBubble() {
    if (currentPercentageVal <= 0 || isGameUnlocked) return;
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    const size = Math.random() * 10 + 4;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = `${Math.random() * 92 + 4}%`;
    bubble.style.animationDuration = `${Math.random() * 2 + 1.6}s`;
    liquidBubbles.appendChild(bubble);

    setTimeout(() => {
      bubble.remove();
    }, 3500);
  }
  setInterval(spawnBubble, 380);

  // =========================================================================
  // 5. Update State & Liquid Wave Fill
  // =========================================================================
  function updateDisplay(data) {
    if (!data) return;

    const percentage = Math.min(100, Math.max(0, data.percentage || 0));
    const cps = data.cps || 0;
    const online = data.onlineUsers || 1;

    currentPercentageVal = percentage;

    // Numbers & Bars (Target clicks 2026 is kept secret)
    screenPercentage.textContent = percentage.toFixed(1);
    centerPercentage.textContent = `${percentage.toFixed(1)}%`;
    screenCPS.textContent = cps.toLocaleString();
    screenOnlineUsers.textContent = online;

    // Liquid Wave Height fill (0% -> 100%) on the transparent artwork
    liquidWrapper.style.height = `${percentage}%`;
    updateScreenSegments(percentage);

    // Dynamic Ambient Portal Glow based on charge
    const glowOpacity = (percentage / 100) * 0.75 + 0.2;
    portalGlow.style.opacity = glowOpacity;

    // Dynamic BGM Volume Modulation (Fade out between 85% and 99%)
    if (isAudioStarted) {
      window.hackathonAudio.updateBGMByPercentage(percentage);
    }

    // Dynamic Subtext status
    if (percentage < 25) {
      energyStatusSubtext.textContent = '⚡ TRANSMITTING HACKER ENERGY... TAP TO CHARGE ⚡';
      energyStatusSubtext.className = 'text-xs font-mono-tech tracking-wider text-[#00f0ff] uppercase px-4 py-1 rounded-full bg-[#00f0ff]/10 border border-[#00f0ff]/30';
    } else if (percentage < 50) {
      energyStatusSubtext.textContent = '🔋 POWER ACCELERATING... SENSORS SYNCHRONIZED 🔋';
      energyStatusSubtext.className = 'text-xs font-mono-tech tracking-wider text-[#00ff66] uppercase px-4 py-1 rounded-full bg-[#00ff66]/10 border border-[#00ff66]/30';
    } else if (percentage < 85) {
      energyStatusSubtext.textContent = '🔥 HIGH VOLTAGE! SYSTEM OVERCLOCKING! 🔥';
      energyStatusSubtext.className = 'text-xs font-mono-tech tracking-wider text-[#ff9e1f] uppercase px-4 py-1 rounded-full bg-[#ff9e1f]/15 border border-[#ff9e1f]/40 animate-pulse';
    } else if (percentage < 100) {
      energyStatusSubtext.textContent = '⚠️ CRITICAL CAPACITANCE REACHED! FINAL SURGE INCOMING! ⚠️';
      energyStatusSubtext.className = 'text-xs font-mono-tech tracking-wider text-[#ffe600] uppercase px-4 py-1 rounded-full bg-[#ffe600]/20 border border-[#ffe600]/50 animate-pulse font-bold';
    }

    if (data.isGameStarted && !isGameUnlocked) {
      triggerGameStartFinale(data);
    }
  }

  // =========================================================================
  // 6. Confetti Particle Cannon (Pure Canvas)
  // =========================================================================
  let confettiAnimationId = null;
  const confettiParticles = [];
  const confettiColors = ['#00f0ff', '#1c75ff', '#ff9e1f', '#ffe600', '#00ff66', '#ffffff', '#9d00ff'];

  function createConfettiExplosion() {
    confettiCanvas.classList.remove('hidden');
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    const ctx = confettiCanvas.getContext('2d');

    const totalParticles = 260;
    for (let i = 0; i < totalParticles; i++) {
      confettiParticles.push({
        x: confettiCanvas.width / 2 + (Math.random() * 240 - 120),
        y: confettiCanvas.height / 2 + (Math.random() * 120 - 60),
        vx: (Math.random() - 0.5) * 24,
        vy: (Math.random() - 0.7) * 26,
        size: Math.random() * 8 + 4,
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
        gravity: 0.35,
        drag: 0.985,
        alpha: 1
      });
    }

    function renderConfetti() {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      for (let i = confettiParticles.length - 1; i >= 0; i--) {
        const p = confettiParticles[i];
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
        ctx.restore();

        if (p.y > confettiCanvas.height) {
          p.y = -20;
          p.x = Math.random() * confettiCanvas.width;
          p.vy = Math.random() * 3 + 2;
          p.vx = (Math.random() - 0.5) * 4;
        }
      }
      confettiAnimationId = requestAnimationFrame(renderConfetti);
    }

    renderConfetti();
  }

  // =========================================================================
  // 7. Grand Finale Trigger (100% Reached: Cinematic Ceremony Progression)
  // =========================================================================
  function clearFinaleTimers() {
    finaleTimers.forEach(id => clearTimeout(id));
    finaleTimers = [];
  }

  function triggerGameStartFinale(data) {
    if (isGameUnlocked) return;
    isGameUnlocked = true;

    console.log('🚀 GAME START GRAND FINALE LAUNCHED!');
    clearFinaleTimers();

    // --- PHASE 1 (0.0s): 100% Impact & Heavy Bass Boom ---
    // Single heavy booming sub-bass hit (NO brass fanfare)
    window.hackathonAudio.playHeavyBassBoom();

    // Sub-bass physical vibration impact
    screenBody.classList.add('screen-shake');
    const tShake = setTimeout(() => {
      screenBody.classList.remove('screen-shake');
    }, 900);
    finaleTimers.push(tShake);

    // Keep 100% banner visible clearly for ~1.8 seconds ("ค้างหน้า 100 เปอเซ็นไว้สักเกือบ 2 วิ ให้เห็นชื่องานก่อน")
    energyStatusSubtext.textContent = '✦ CAPACITY 100% UNLOCKED ✦ CEREMONY ACTIVATED ✦';
    energyStatusSubtext.className = 'text-xs font-mono-tech tracking-wider text-[#ffe600] uppercase px-4 py-1 rounded-full bg-[#ffe600]/25 border border-[#ffe600] animate-pulse font-bold shadow-[0_0_20px_#ffe600]';

    // --- PHASE 2 (~1.8s): "GAME START!" Popup for exactly 2 seconds ---
    const tGameStart = setTimeout(() => {
      finalDurationEl.textContent = data?.durationSeconds ? `${data.durationSeconds}s` : 'CLEAR!';

      // Digital 8-bit game start power-up chime
      window.hackathonAudio.playDigitalGameChime();

      gameStartOverlay.classList.remove('hidden');
      gameStartOverlay.style.opacity = '1';
      gameStartOverlay.style.pointerEvents = 'auto';

      createConfettiExplosion();

      // --- PHASE 3 (~3.8s, after 2 seconds): Disappear "GAME START!" and reveal banner again ---
      const tHideGameStart = setTimeout(() => {
        gameStartOverlay.style.opacity = '0';
        const tFadeHide = setTimeout(() => {
          gameStartOverlay.classList.add('hidden');
        }, 400);
        finaleTimers.push(tFadeHide);

        // --- PHASE 4 (~4.2s): Door Split Animation & Cosmic Warp Whoosh ---
        const tDoorOpen = setTimeout(() => {
          // Play pneumatic door opening release + cosmic warp sound effect
          window.hackathonAudio.playDoorWarpWhoosh();

          // Prepare split doors & bright white light core
          doorSplitStage.classList.remove('hidden');
          doorWhiteLight.classList.add('door-white-flare');

          // Part the doors into 2 sides (left & right)
          requestAnimationFrame(() => {
            doorSplitStage.classList.add('door-open-active');
          });

          // Zoom into white light -> Fullscreen pure white overlay
          const tWhiteIn = setTimeout(() => {
            whiteOutOverlay.classList.add('whiteout-visible');

            // --- PHASE 5: Hold pure white screen for 10 seconds ("ค้างไว้ 10 วิเลย แล้วก็มาหน้าปกติ") ---
            const tWhiteHold = setTimeout(() => {
              // Fade white overlay back to normal screen
              whiteOutOverlay.classList.remove('whiteout-visible');

              // Reset split door panels and restore normal stage
              const tResetDoors = setTimeout(() => {
                doorSplitStage.classList.remove('door-open-active');
                doorSplitStage.classList.add('hidden');
                doorWhiteLight.classList.remove('door-white-flare');
                gameStartOverlay.style.opacity = '1';

                // Stop confetti animation
                if (confettiAnimationId) {
                  cancelAnimationFrame(confettiAnimationId);
                  confettiAnimationId = null;
                  const ctx = confettiCanvas.getContext('2d');
                  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
                  confettiCanvas.classList.add('hidden');
                }
              }, 1200);
              finaleTimers.push(tResetDoors);

            }, 10000); // Hold for 10 seconds!
            finaleTimers.push(tWhiteHold);

          }, 850); // Timing into white zoom
          finaleTimers.push(tWhiteIn);

        }, 400); // Brief moment viewing the banner before doors part
        finaleTimers.push(tDoorOpen);

      }, 2000); // Exactly 2 seconds showing "GAME START!"
      finaleTimers.push(tHideGameStart);

    }, 1800); // Hold 100% banner for ~1.8s first
    finaleTimers.push(tGameStart);
  }

  // =========================================================================
  // 8. Socket.IO Listeners
  // =========================================================================
  let isForceSurging = false;

  socket.on('game_init', (data) => {
    updateDisplay(data);
  });

  socket.on('game_tick', (data) => {
    if (!isForceSurging) {
      updateDisplay(data);
    }
  });

  socket.on('game_force_charging', (data) => {
    isForceSurging = true;
    const duration = data.durationMs || 2200;

    // 1. Play dramatic rising riser synthesizer sweep
    if (isAudioStarted) {
      window.hackathonAudio.playChargingRiser(duration / 1000);
    }

    // 2. Add suspenseful screen vibration/tremor effect
    screenBody.classList.add('charging-vibration');

    // 3. Dynamic subtext & neon alert
    energyStatusSubtext.textContent = '⚡ CRITICAL OVERDRIVE! MAXIMUM ENERGY SURGE INCOMING! ⚡';
    energyStatusSubtext.className = 'text-xs font-mono-tech tracking-wider text-[#ffe600] uppercase px-4 py-1 rounded-full bg-[#ffe600]/25 border border-[#ffe600] animate-pulse font-bold shadow-[0_0_25px_#ffe600]';

    // 4. Smooth liquid wave surge transition
    liquidWrapper.style.transition = `height ${duration}ms cubic-bezier(0.15, 0.85, 0.35, 1)`;
    liquidWrapper.style.height = '100%';

    // 5. Interpolate percentage and retro conduit segments over duration
    const startVal = currentPercentageVal || 0;
    const startTime = performance.now();

    function stepSurge(now) {
      if (!isForceSurging) return;
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = Math.pow(progress, 1.25);
      const cur = startVal + (100 - startVal) * ease;

      screenPercentage.textContent = cur.toFixed(1);
      centerPercentage.textContent = `${cur.toFixed(1)}%`;
      updateScreenSegments(cur);

      const glowOpacity = (cur / 100) * 0.75 + 0.2;
      portalGlow.style.opacity = glowOpacity;

      if (progress < 1) {
        requestAnimationFrame(stepSurge);
      }
    }
    requestAnimationFrame(stepSurge);
  });

  socket.on('game_start', (data) => {
    isForceSurging = false;
    screenBody.classList.remove('charging-vibration');
    liquidWrapper.style.transition = '';
    updateDisplay(data);
    triggerGameStartFinale(data);
  });

  socket.on('game_reset', (data) => {
    clearFinaleTimers();
    isForceSurging = false;
    screenBody.classList.remove('charging-vibration');
    liquidWrapper.style.transition = '';
    isGameUnlocked = false;

    // Reset overlay & door states
    gameStartOverlay.classList.add('hidden');
    gameStartOverlay.style.opacity = '1';
    gameStartOverlay.style.pointerEvents = 'none';

    whiteOutOverlay.classList.remove('whiteout-visible');
    doorSplitStage.classList.remove('door-open-active');
    doorSplitStage.classList.add('hidden');
    doorWhiteLight.classList.remove('door-white-flare');

    confettiCanvas.classList.add('hidden');
    if (confettiAnimationId) {
      cancelAnimationFrame(confettiAnimationId);
      confettiAnimationId = null;
    }
    confettiParticles.length = 0;
    updateDisplay(data);

    if (isAudioStarted) {
      window.hackathonAudio.startBGM();
    }
  });
});
