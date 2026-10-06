/**
 * Minimalist Mobile Player Controller
 * Game Programming Hackathon 2026 @PCSHS_PHITSANULOK
 * Handles: PopCat tap, Game-Dev ambient particle canvas, energy flash, secret target
 */

document.addEventListener('DOMContentLoaded', () => {
  const socket = io();

  // DOM Elements
  const tapArea = document.getElementById('tapArea');
  const imgClosed = document.getElementById('imgClosed');
  const imgOpen = document.getElementById('imgOpen');
  const particleContainer = document.getElementById('particleContainer');
  const tapEnergyFlash = document.getElementById('tapEnergyFlash');
  const myClicksEl = document.getElementById('myClicks');
  const myCPSEl = document.getElementById('myCPS');
  const headerPercentEl = document.getElementById('headerPercent');
  const retroBar = document.getElementById('retroBar');
  const onlineCountEl = document.getElementById('onlineCount');
  const gameStartModal = document.getElementById('gameStartModal');
  const modalFinalClicks = document.getElementById('modalFinalClicks');
  const btnAudioToggle = document.getElementById('btnAudioToggle');

  // Build Retro Segmented Progress Bar (24 segments)
  const TOTAL_SEGMENTS = 24;
  const segments = [];
  if (retroBar) {
    retroBar.innerHTML = '';
    for (let i = 0; i < TOTAL_SEGMENTS; i++) {
      const seg = document.createElement('div');
      seg.className = 'retro-segment';
      retroBar.appendChild(seg);
      segments.push(seg);
    }
  }

  function updateRetroSegments(percentage) {
    const activeCount = Math.round((percentage / 100) * TOTAL_SEGMENTS);
    segments.forEach((seg, idx) => {
      if (idx < activeCount) {
        seg.classList.add('active');
      } else {
        seg.classList.remove('active');
      }
    });
  }

  // =========================================================================
  // =========================================================================
  // Game Dev Ambient Background (Lightweight, Zero CPU hog)
  // =========================================================================
  const bgCanvas = document.getElementById('codeBgCanvas');
  const bgCtx = bgCanvas ? bgCanvas.getContext('2d') : null;
  let codeParticles = [];

  function resizeBgCanvas() {
    if (!bgCanvas) return;
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
    codeParticles = [];
    const count = 10; // Light count for mobile 60fps
    for (let i = 0; i < count; i++) {
      codeParticles.push({
        x: Math.random() * bgCanvas.width,
        y: Math.random() * bgCanvas.height,
        radius: Math.random() * 2 + 1,
        speed: Math.random() * 0.3 + 0.1,
        alpha: Math.random() * 0.3 + 0.1,
        color: Math.random() > 0.5 ? '#00f0ff' : '#1c75ff'
      });
    }
  }
  window.addEventListener('resize', resizeBgCanvas);
  resizeBgCanvas();

  function renderBgParticles() {
    if (!bgCtx) return;
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    for (const p of codeParticles) {
      bgCtx.beginPath();
      bgCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      bgCtx.fillStyle = p.color;
      bgCtx.globalAlpha = p.alpha;
      bgCtx.fill();

      p.y -= p.speed;
      if (p.y < -10) {
        p.y = bgCanvas.height + 10;
        p.x = Math.random() * bgCanvas.width;
      }
    }
    requestAnimationFrame(renderBgParticles);
  }
  renderBgParticles();

  // State Variables
  let personalTotalClicks = 0;
  let pendingBatchClicks = 0;
  let closeMouthTimeout = null;
  let isGameUnlocked = false;

  // Personal CPS tracking
  const personalClickHistory = [];

  function recordPersonalClick() {
    const now = Date.now();
    personalClickHistory.push(now);
  }

  setInterval(() => {
    const now = Date.now();
    const oneSecAgo = now - 1000;
    while (personalClickHistory.length > 0 && personalClickHistory[0] < oneSecAgo) {
      personalClickHistory.shift();
    }
    myCPSEl.textContent = personalClickHistory.length;
  }, 250);

  // Audio Toggle
  btnAudioToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isMuted = window.hackathonAudio.toggleMute();
    btnAudioToggle.textContent = isMuted ? '🔇' : '🔊';
    btnAudioToggle.classList.toggle('text-gray-400', isMuted);
    btnAudioToggle.classList.toggle('text-[#00f0ff]', !isMuted);
  });

  // Client Batching to Server every 100ms
  const BATCH_INTERVAL_MS = 100;
  setInterval(() => {
    if (pendingBatchClicks > 0 && socket.connected) {
      socket.emit('batch_clicks', { count: pendingBatchClicks });
      pendingBatchClicks = 0;
    }
  }, BATCH_INTERVAL_MS);

  // Floating Particle (+1) - Capped to 3 max to prevent DOM clutter
  function createParticle(x, y) {
    if (particleContainer.childElementCount > 3) return;
    const particle = document.createElement('div');
    particle.className = 'floating-particle';
    particle.textContent = '+1';
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particleContainer.appendChild(particle);
    setTimeout(() => {
      particle.remove();
    }, 600);
  }

  // =========================================================================
  // High-Performance 60FPS Canvas Water Droplets (Zero DOM Overhead / No Glow)
  // =========================================================================
  const waterCanvas = document.getElementById('waterCanvas');
  const waterCtx = waterCanvas ? waterCanvas.getContext('2d') : null;
  const activeDrops = [];
  let waterAnimId = null;
  let cachedTapRect = null;

  function updateTapRect() {
    if (tapArea) {
      cachedTapRect = tapArea.getBoundingClientRect();
    }
  }

  function resizeWaterCanvas() {
    if (!waterCanvas) return;
    waterCanvas.width = window.innerWidth;
    waterCanvas.height = window.innerHeight;
    updateTapRect();
  }
  window.addEventListener('resize', resizeWaterCanvas);
  window.addEventListener('scroll', updateTapRect, { passive: true });
  resizeWaterCanvas();

  // Draw clean, realistic water teardrop on canvas (Zero blur / zero glow)
  function drawTeardrop(ctx, x, y, size, vx, vy) {
    ctx.save();
    ctx.translate(x, y);
    // Align droplet angle with travel direction
    const angle = Math.atan2(vy, vx) + Math.PI / 2;
    ctx.rotate(angle);

    // Droplet Outer Body (Rich Azure Water Blue)
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.35); // Pointed tip
    ctx.bezierCurveTo(size * 0.85, -size * 0.2, size * 0.95, size * 0.85, 0, size * 1.15); // Round bulb
    ctx.bezierCurveTo(-size * 0.95, size * 0.85, -size * 0.85, -size * 0.2, 0, -size * 1.35);
    ctx.closePath();
    ctx.fillStyle = '#0284c7';
    ctx.fill();

    // Inner Water Layer (Bright Cyan/Sky Blue)
    ctx.beginPath();
    ctx.arc(0, size * 0.35, size * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();

    // Specular Gloss Highlight (Crisp White Spot)
    ctx.beginPath();
    ctx.ellipse(-size * 0.25, size * 0.25, size * 0.2, size * 0.35, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  }

  function loopWaterCanvas() {
    if (!waterCtx || activeDrops.length === 0) {
      if (waterCtx) waterCtx.clearRect(0, 0, waterCanvas.width, waterCanvas.height);
      waterAnimId = null;
      return;
    }

    waterCtx.clearRect(0, 0, waterCanvas.width, waterCanvas.height);

    for (let i = activeDrops.length - 1; i >= 0; i--) {
      const p = activeDrops[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.life++;

      if (p.isSplash) {
        // Simple fast splash circle
        waterCtx.beginPath();
        waterCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        waterCtx.fillStyle = '#7dd3fc';
        waterCtx.globalAlpha = Math.max(0, 1 - p.life / p.maxLife);
        waterCtx.fill();
        waterCtx.globalAlpha = 1;
      } else {
        // Flying teardrop water droplet
        drawTeardrop(waterCtx, p.x, p.y, p.size, p.vx, p.vy);
      }

      if (p.life >= p.maxLife || p.y > waterCanvas.height) {
        // Spawn 2 tiny splash beads on drop finish
        if (!p.isSplash && activeDrops.length < 32) {
          for (let s = 0; s < 2; s++) {
            activeDrops.push({
              x: p.x,
              y: p.y,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 3,
              gravity: 0.3,
              size: 2.2,
              life: 0,
              maxLife: 8,
              isSplash: true
            });
          }
        }
        activeDrops.splice(i, 1);
      }
    }

    waterAnimId = requestAnimationFrame(loopWaterCanvas);
  }

  function shootTrunkWater() {
    if (!cachedTapRect) updateTapRect();
    if (!cachedTapRect) return;

    // Hard cap active particles to guarantee solid 60 FPS on any phone
    if (activeDrops.length > 28) return;

    const originX = cachedTapRect.left + cachedTapRect.width * 0.645;
    const originY = cachedTapRect.top + cachedTapRect.height * 0.465;

    const count = 2 + Math.floor(Math.random() * 2); // 2 to 3 drops per tap
    for (let i = 0; i < count; i++) {
      activeDrops.push({
        x: originX + (Math.random() * 8 - 4),
        y: originY + (Math.random() * 6 - 3),
        vx: (Math.random() * 4.2 + 1.2) * (Math.random() > 0.3 ? 1 : -0.7),
        vy: -(Math.random() * 7 + 10),
        gravity: 0.72,
        size: Math.random() * 3 + 8, // 8px - 11px
        life: 0,
        maxLife: 30 + Math.floor(Math.random() * 8),
        isSplash: false
      });
    }

    if (!waterAnimId) {
      waterAnimId = requestAnimationFrame(loopWaterCanvas);
    }
  }

  // Primary Click / Tap Handler (Zero Layout Thrashing & Low Latency)
  function handleTap(x, y) {
    if (isGameUnlocked) return;

    // 1. Audio pop SFX
    window.hackathonAudio.playPop();

    // 2. Increment Counters
    personalTotalClicks++;
    pendingBatchClicks++;
    recordPersonalClick();
    myClicksEl.textContent = personalTotalClicks.toLocaleString();

    // 3. Tactile Feedback (Haptic Vibration)
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch (e) {}
    }

    // 4. Mascot State Transition (Mouth Open)
    imgClosed.classList.add('hidden');
    imgOpen.classList.remove('hidden');
    tapArea.classList.add('active-tap');

    // 5. Fast Canvas Water Droplets & Floating +1
    shootTrunkWater();
    createParticle(x, y);

    // 6. Reset mouth state after 75ms
    if (closeMouthTimeout) clearTimeout(closeMouthTimeout);
    closeMouthTimeout = setTimeout(() => {
      imgOpen.classList.add('hidden');
      imgClosed.classList.remove('hidden');
      tapArea.classList.remove('active-tap');
    }, 75);
  }

  // Touch Event Listeners (Support Multi-touch)
  tapArea.addEventListener('touchstart', (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      handleTap(touch.clientX, touch.clientY);
    }
  }, { passive: false });

  // Mouse fallback for testing on Desktop
  tapArea.addEventListener('mousedown', (e) => {
    e.preventDefault();
    handleTap(e.clientX, e.clientY);
  });

  // Socket.IO Events
  let isForceSurging = false;

  socket.on('game_init', (data) => {
    updateHUD(data);
  });

  socket.on('game_tick', (data) => {
    if (!isForceSurging) {
      updateHUD(data);
    }
  });

  socket.on('game_force_charging', (data) => {
    isForceSurging = true;
    const duration = data.durationMs || 2200;

    // Play rising charge synth
    window.hackathonAudio.playChargingRiser(duration / 1000);

    // Haptic buzz sequence
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([80, 40, 120, 40, 180, 40, 250]);
      } catch (e) {}
    }

    // Open mascot mouth and spray continuous water droplets during surge
    imgClosed.classList.add('hidden');
    imgOpen.classList.remove('hidden');
    shootTrunkWater();
    const sprayInterval = setInterval(() => {
      if (!isForceSurging) {
        clearInterval(sprayInterval);
        return;
      }
      shootTrunkWater();
    }, 260);

    // Smoothly surge mobile progress bar to 100%
    const startVal = parseFloat(headerPercentEl.textContent) || 0;
    const startTime = performance.now();
    function surgeStep(now) {
      if (!isForceSurging) return;
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const cur = startVal + (100 - startVal) * Math.pow(progress, 1.3);
      headerPercentEl.textContent = `${cur.toFixed(1)}%`;
      updateRetroSegments(cur);
      if (progress < 1) {
        requestAnimationFrame(surgeStep);
      }
    }
    requestAnimationFrame(surgeStep);
  });

  function updateHUD(data) {
    if (!data) return;

    // Only display percentage, do NOT reveal target number 2026!
    if (data.percentage !== undefined) {
      const pct = Math.min(100, Math.max(0, data.percentage));
      headerPercentEl.textContent = `${pct.toFixed(1)}%`;
      updateRetroSegments(pct);
    }
    if (data.onlineUsers !== undefined) {
      onlineCountEl.textContent = data.onlineUsers;
    }

    if (data.isGameStarted && !isGameUnlocked) {
      triggerGameStart();
    }
  }

  socket.on('game_start', (data) => {
    isForceSurging = false;
    triggerGameStart();
  });

  function triggerGameStart() {
    isGameUnlocked = true;
    modalFinalClicks.textContent = personalTotalClicks.toLocaleString();
    gameStartModal.classList.remove('hidden');

    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([100, 50, 100, 50, 200]);
      } catch (e) {}
    }
  }

  socket.on('game_reset', (data) => {
    isGameUnlocked = false;
    isForceSurging = false;
    gameStartModal.classList.add('hidden');
    personalTotalClicks = 0;
    myClicksEl.textContent = '0';
    updateHUD(data);
  });
});
