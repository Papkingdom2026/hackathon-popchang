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

  // NEW: Leaderboard, Floating Names, 67% Overlay, and Presidential Touch Elements
  const floatingNamesCanvas = document.getElementById('floatingNamesCanvas');
  const giant67Overlay = document.getElementById('giant67Overlay');
  const presidentTouchArea = document.getElementById('presidentTouchArea');
  const btnPresidentTouch = document.getElementById('btnPresidentTouch');
  const leaderboardPanel = document.getElementById('leaderboardPanel');
  const leaderboardList = document.getElementById('leaderboardList');
  const btnToggleLeaderboard = document.getElementById('btnToggleLeaderboard');
  const btnCloseLeaderboard = document.getElementById('btnCloseLeaderboard');
  const standbyLobbyOverlay = document.getElementById('standbyLobbyOverlay');
  const standbyPlayersContainer = document.getElementById('standbyPlayersContainer');
  const lobbyConnectedCount = document.getElementById('lobbyConnectedCount');
  const energyStatusMain = document.getElementById('energyStatusMain');

  let isAudioStarted = false;
  let isGameUnlocked = false;
  let isLeaderboardOpen = false;
  let currentPercentageVal = 0;
  let finaleTimers = [];
  let stage67TriggeredLocal = false;
  let presidentRevealedLocal = false;

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
  // 1. Audio Control (Autoplay Policy compliance & dynamic SFX - silent early stage)
  // =========================================================================
  btnStartAudio.addEventListener('click', () => {
    if (!isAudioStarted) {
      window.hackathonAudio.init();
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
  // 2. Dynamic QR Code generation for projector (Crisp B&W)
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

  if (btnToggleLeaderboard && leaderboardPanel) {
    btnToggleLeaderboard.addEventListener('click', () => {
      leaderboardPanel.classList.toggle('hidden');
    });
  }

  if (btnCloseLeaderboard && leaderboardPanel) {
    btnCloseLeaderboard.addEventListener('click', () => {
      leaderboardPanel.classList.add('hidden');
    });
  }

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

  // Floating Names Background Canvas Engine (Loopless Thai Font)
  const namesCanvas = document.getElementById('floatingNamesCanvas');
  const namesCtx = namesCanvas ? namesCanvas.getContext('2d') : null;
  const floatingNameTokens = [];
  const processedTappers = new Set();

  function resizeNamesCanvas() {
    if (!namesCanvas) return;
    namesCanvas.width = window.innerWidth;
    namesCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeNamesCanvas);
  resizeNamesCanvas();

  function spawnFloatingName(text) {
    if (!namesCanvas || !text) return;
    if (floatingNameTokens.length > 30) floatingNameTokens.shift();

    const colors = ['#00f0ff', '#ffe600', '#ff9e1f', '#00ff66', '#ffffff'];
    floatingNameTokens.push({
      text,
      x: Math.random() * (namesCanvas.width - 240) + 30,
      y: namesCanvas.height + 20,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -(Math.random() * 1.5 + 1.2),
      alpha: 0.95,
      size: Math.random() * 4 + 14,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }

  function renderFloatingNames() {
    if (!namesCtx) return;
    namesCtx.clearRect(0, 0, namesCanvas.width, namesCanvas.height);

    for (let i = floatingNameTokens.length - 1; i >= 0; i--) {
      const item = floatingNameTokens[i];
      item.x += item.vx;
      item.y += item.vy;
      item.alpha -= 0.0035;

      if (item.alpha <= 0 || item.y < -30) {
        floatingNameTokens.splice(i, 1);
        continue;
      }

      namesCtx.save();
      namesCtx.font = `bold ${item.size}px 'Chakra Petch', sans-serif`;
      namesCtx.fillStyle = item.color;
      namesCtx.globalAlpha = Math.max(0, item.alpha);
      namesCtx.shadowColor = item.color;
      namesCtx.shadowBlur = 8;
      namesCtx.fillText(item.text, item.x, item.y);
      namesCtx.restore();
    }
    requestAnimationFrame(renderFloatingNames);
  }
  renderFloatingNames();

  // Leaderboard & 67% Controller
  function toggleLeaderboard(forceState) {
    isLeaderboardOpen = typeof forceState === 'boolean' ? forceState : !isLeaderboardOpen;
    if (isLeaderboardOpen) {
      leaderboardPanel.classList.remove('hidden');
      if (btnToggleLeaderboard) {
        btnToggleLeaderboard.classList.add('bg-[#ffe600]/25', 'border-[#ffe600]', 'text-[#ffe600]');
      }
    } else {
      leaderboardPanel.classList.add('hidden');
      if (btnToggleLeaderboard) {
        btnToggleLeaderboard.classList.remove('bg-[#ffe600]/25', 'border-[#ffe600]', 'text-[#ffe600]');
      }
    }
  }

  if (btnToggleLeaderboard) {
    btnToggleLeaderboard.addEventListener('click', () => {
      toggleLeaderboard();
    });
  }

  if (btnCloseLeaderboard) {
    btnCloseLeaderboard.addEventListener('click', () => {
      toggleLeaderboard(false);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // Standby Lobby: Displays Connected Players Inside Art Stage Before Start
  function renderStandbyLobby(playersList) {
    if (!standbyPlayersContainer) return;
    if (!playersList || playersList.length === 0) {
      standbyPlayersContainer.innerHTML = `
        <div class="text-xs font-mono-tech text-gray-500 py-6 animate-pulse">
          รอผู้เล่นสแกน QR Code เพื่อเชื่อมต่อ...
        </div>
      `;
      if (lobbyConnectedCount) lobbyConnectedCount.textContent = '0';
      return;
    }

    if (lobbyConnectedCount) {
      lobbyConnectedCount.textContent = playersList.length;
    }

    let html = '';
    playersList.forEach((p) => {
      html += `
        <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00f0ff]/10 border border-[#00f0ff]/40 shadow-[0_0_12px_rgba(0,240,255,0.2)] text-xs text-white font-prompt transform hover:scale-105 transition-all">
          <span class="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse"></span>
          <span class="font-medium text-gray-100">${escapeHtml(p.name)}</span>
        </div>
      `;
    });
    standbyPlayersContainer.innerHTML = html;
  }

  function renderLeaderboard(playersList) {
    if (!leaderboardList) return;
    if (!playersList || playersList.length === 0) {
      leaderboardList.innerHTML = `
        <div class="text-center text-xs text-gray-400 font-mono-tech py-6">
          กำลังรอผู้เข้าร่วมส่งพลังงาน...
        </div>
      `;
      return;
    }

    let html = '';
    playersList.forEach((p, idx) => {
      const rank = p.rank || (idx + 1);
      let rankBadge = '';
      let rankClass = '';
      let nameClass = '';
      let scoreClass = '';

      if (rank === 1) {
        rankBadge = '👑 1';
        rankClass = 'border-[#ffe600]/50 bg-[#ffe600]/15 shadow-[0_0_12px_rgba(255,230,0,0.3)]';
        nameClass = 'text-sm font-black text-[#ffe600] neon-glow-yellow';
        scoreClass = 'text-sm font-black text-[#ffe600] font-orbitron';
      } else if (rank === 2) {
        rankBadge = '🥈 2';
        rankClass = 'border-gray-300/40 bg-gray-400/10';
        nameClass = 'text-xs font-bold text-gray-200';
        scoreClass = 'text-xs font-bold text-gray-200 font-orbitron';
      } else if (rank === 3) {
        rankBadge = '🥉 3';
        rankClass = 'border-[#ff9e1f]/40 bg-[#ff9e1f]/10';
        nameClass = 'text-xs font-bold text-[#ff9e1f]';
        scoreClass = 'text-xs font-bold text-[#ff9e1f] font-orbitron';
      } else if (rank <= 10) {
        rankBadge = `#${rank}`;
        rankClass = 'border-[#00f0ff]/25 bg-[#00f0ff]/5';
        nameClass = 'text-xs text-gray-200 font-medium';
        scoreClass = 'text-xs text-[#00f0ff] font-orbitron font-bold';
      } else {
        rankBadge = `#${rank}`;
        rankClass = 'border-gray-800 bg-black/25';
        nameClass = 'text-[11px] text-gray-400';
        scoreClass = 'text-[10px] text-gray-400 font-orbitron';
      }

      html += `
        <div class="flex items-center justify-between px-2.5 py-1.5 rounded-lg border ${rankClass} transition-all">
          <div class="flex items-center gap-2 overflow-hidden pr-2">
            <span class="w-7 text-center font-orbitron font-bold shrink-0">${rankBadge}</span>
            <span class="truncate ${nameClass}">${escapeHtml(p.name)}</span>
          </div>
          <span class="${scoreClass} shrink-0">${p.clicks.toLocaleString()}</span>
        </div>
      `;
    });

    leaderboardList.innerHTML = html;
  }

  function triggerGiant67() {
    if (stage67TriggeredLocal) return;
    stage67TriggeredLocal = true;
    console.log('⚡ Giant 67 activated on background for 5 seconds');
    giant67Overlay.classList.remove('opacity-0');
    giant67Overlay.classList.add('opacity-100');

    setTimeout(() => {
      giant67Overlay.classList.remove('opacity-100');
      giant67Overlay.classList.add('opacity-0');
    }, 5000); // 5 seconds
  }

  function checkPresidentButton(percentage) {
    if (percentage >= 67.4 && !presidentRevealedLocal && !isGameUnlocked) {
      presidentRevealedLocal = true;
      console.log('👑 [PRESIDENT BUTTON REVEALED] Playing alert sound...');
      window.hackathonAudio.playPresidentAlert();

      presidentTouchArea.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-2', 'scale-95');
      presidentTouchArea.classList.add('opacity-100', 'pointer-events-auto', 'translate-y-0', 'scale-100');
    }
  }

  if (btnPresidentTouch) {
    btnPresidentTouch.addEventListener('click', () => {
      if (isGameUnlocked) return;
      btnPresidentTouch.classList.add('scale-95');
      setTimeout(() => btnPresidentTouch.classList.remove('scale-95'), 200);
      socket.emit('president_touch');
    });
  }

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

    // 67% Plateau & Presidential Button Checks
    if (percentage >= 67.0 || data.stage67Triggered) {
      triggerGiant67();
    }
    if (percentage >= 67.4 || data.stage67Triggered) {
      checkPresidentButton(percentage);
    }

    // Standby Lobby Visibility Control (Shows connected players in center box before start)
    if (standbyLobbyOverlay) {
      if (data.eventStatus === 'STANDBY' && percentage < 0.5 && !data.isGameStarted) {
        standbyLobbyOverlay.classList.remove('opacity-0', 'pointer-events-none');
        standbyLobbyOverlay.classList.add('opacity-100');
      } else {
        standbyLobbyOverlay.classList.remove('opacity-100');
        standbyLobbyOverlay.classList.add('opacity-0', 'pointer-events-none');
      }
    }

    if (data.connectedPlayers) {
      renderStandbyLobby(data.connectedPlayers);
    }

    if (energyStatusMain) {
      if (data.eventStatus === 'STANDBY') {
        energyStatusMain.textContent = 'STANDBY MODE';
        energyStatusMain.className = 'font-orbitron text-lg lg:text-xl font-bold text-[#ffe600] animate-pulse';
      } else if (data.eventStatus === 'PLATEAU_67') {
        energyStatusMain.textContent = 'STAGE 67% (AWAITING TOUCH)';
        energyStatusMain.className = 'font-orbitron text-lg lg:text-xl font-bold text-[#ffe600] neon-glow-yellow animate-pulse';
      } else if (data.isGameStarted) {
        energyStatusMain.textContent = 'CEREMONY UNLOCKED 100%';
        energyStatusMain.className = 'font-orbitron text-lg lg:text-xl font-bold text-[#00ff66]';
      } else {
        energyStatusMain.textContent = 'SYSTEM CHARGING';
        energyStatusMain.className = 'font-orbitron text-lg lg:text-xl font-bold text-[#00f0ff]';
      }
    }

    // Leaderboard Update
    if (data.topPlayers) {
      renderLeaderboard(data.topPlayers);
    }

    // Floating Names Update
    if (data.recentTappers && data.recentTappers.length > 0) {
      data.recentTappers.forEach(t => {
        if (!processedTappers.has(t.id)) {
          processedTappers.add(t.id);
          spawnFloatingName(t.name);
          if (processedTappers.size > 80) {
            const first = processedTappers.values().next().value;
            processedTappers.delete(first);
          }
        }
      });
    }

    // Dynamic Subtext status
    if (percentage < 25) {
      energyStatusSubtext.textContent = '⚡ TRANSMITTING HACKER ENERGY... TAP TO CHARGE ⚡';
      energyStatusSubtext.className = 'text-xs font-mono-tech tracking-wider text-[#00f0ff] uppercase px-4 py-1 rounded-full bg-[#00f0ff]/10 border border-[#00f0ff]/30';
    } else if (percentage < 50) {
      energyStatusSubtext.textContent = '🔋 POWER ACCELERATING... SENSORS SYNCHRONIZED 🔋';
      energyStatusSubtext.className = 'text-xs font-mono-tech tracking-wider text-[#00ff66] uppercase px-4 py-1 rounded-full bg-[#00ff66]/10 border border-[#00ff66]/30';
    } else if (percentage < 67) {
      energyStatusSubtext.textContent = '🔥 HIGH VOLTAGE! SYSTEM OVERCLOCKING! 🔥';
      energyStatusSubtext.className = 'text-xs font-mono-tech tracking-wider text-[#ff9e1f] uppercase px-4 py-1 rounded-full bg-[#ff9e1f]/15 border border-[#ff9e1f]/40 animate-pulse';
    } else if (percentage < 70) {
      energyStatusSubtext.textContent = '✋ STAGE 67% REACHED : AWAITING PRESIDENTIAL OVERDRIVE ✋';
      energyStatusSubtext.className = 'text-xs font-mono-tech tracking-wider text-[#ffe600] uppercase px-4 py-1 rounded-full bg-[#ffe600]/20 border border-[#ffe600]/50 animate-pulse font-bold';
    } else if (percentage < 100) {
      energyStatusSubtext.textContent = '⚡ CRITICAL OVERDRIVE! MAXIMUM ENERGY SURGE INCOMING! ⚡';
      energyStatusSubtext.className = 'text-xs font-mono-tech tracking-wider text-[#ff007f] uppercase px-4 py-1 rounded-full bg-[#ff007f]/20 border border-[#ff007f]/50 animate-pulse font-bold';
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
  // 7. Grand Finale Trigger (Direct Fireworks + 10s Whiteout, No GAME START modal)
  // =========================================================================
  function clearFinaleTimers() {
    finaleTimers.forEach(id => clearTimeout(id));
    finaleTimers = [];
  }

  function triggerGameStartFinale(data) {
    if (isGameUnlocked) return;
    isGameUnlocked = true;

    console.log('🚀 100% REACHED! DIRECT FIREWORKS & WHITEOUT LAUNCHED!');
    clearFinaleTimers();

    // 1. Single heavy booming sub-bass hit (NO brass fanfare)
    window.hackathonAudio.playHeavyBassBoom();

    // 2. Sub-bass physical vibration impact
    screenBody.classList.add('screen-shake');
    const tShake = setTimeout(() => {
      screenBody.classList.remove('screen-shake');
    }, 900);
    finaleTimers.push(tShake);

    // 3. Hide presidential button and update label
    if (presidentTouchArea) {
      presidentTouchArea.classList.add('opacity-0', 'pointer-events-none');
    }
    energyStatusSubtext.textContent = '✦ CAPACITY 100% UNLOCKED ✦ CEREMONY ACTIVATED ✦';
    energyStatusSubtext.className = 'text-xs font-mono-tech tracking-wider text-[#ffe600] uppercase px-4 py-1 rounded-full bg-[#ffe600]/25 border border-[#ffe600] animate-pulse font-bold shadow-[0_0_20px_#ffe600]';

    // 4. Explode Confetti / Fireworks immediately
    createConfettiExplosion();

    // 5. Directly transition into pure full-screen whiteout (NO GAME START MODAL as requested!)
    const tWhiteIn = setTimeout(() => {
      whiteOutOverlay.classList.remove('opacity-0', 'pointer-events-none');
      whiteOutOverlay.classList.add('opacity-100', 'whiteout-visible');
      whiteOutOverlay.style.opacity = '1';
      whiteOutOverlay.style.pointerEvents = 'auto';

      // Hold pure white screen for 10 seconds ("ค้างไว้ 10 วิเลย แล้วก็มาหน้าปกติ")
      const tWhiteHold = setTimeout(() => {
        whiteOutOverlay.classList.remove('opacity-100', 'whiteout-visible');
        whiteOutOverlay.classList.add('opacity-0', 'pointer-events-none');
        whiteOutOverlay.style.opacity = '0';
        whiteOutOverlay.style.pointerEvents = 'none';

        // Stop confetti
        setTimeout(() => {
          if (confettiAnimationId) {
            cancelAnimationFrame(confettiAnimationId);
            confettiAnimationId = null;
            const ctx = confettiCanvas.getContext('2d');
            ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
            confettiCanvas.classList.add('hidden');
          }
        }, 1200);

      }, 10000); // 10.0 seconds white screen hold!
      finaleTimers.push(tWhiteHold);

    }, 600); // Brief moment celebrating then pure whiteout
    finaleTimers.push(tWhiteIn);
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

  socket.on('stage_67_reached', () => {
    triggerGiant67();
  });

  socket.on('game_force_charging', (data) => {
    isForceSurging = true;
    const duration = data.durationMs || 2500;

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
    stage67TriggeredLocal = false;
    presidentRevealedLocal = false;

    // Reset overlay & presidential button states
    if (presidentTouchArea) {
      presidentTouchArea.classList.add('opacity-0', 'pointer-events-none', 'translate-y-2', 'scale-95');
      presidentTouchArea.classList.remove('opacity-100', 'pointer-events-auto', 'translate-y-0', 'scale-100');
    }
    if (giant67Overlay) {
      giant67Overlay.classList.remove('opacity-100');
      giant67Overlay.classList.add('opacity-0');
    }

    gameStartOverlay.classList.add('hidden');
    gameStartOverlay.style.opacity = '1';
    gameStartOverlay.style.pointerEvents = 'none';

    whiteOutOverlay.classList.remove('opacity-100', 'whiteout-visible');
    whiteOutOverlay.classList.add('opacity-0', 'pointer-events-none');
    whiteOutOverlay.style.opacity = '0';
    whiteOutOverlay.style.pointerEvents = 'none';
    doorSplitStage.classList.remove('door-open-active');
    doorSplitStage.classList.add('hidden');
    doorWhiteLight.classList.remove('door-white-flare');

    confettiCanvas.classList.add('hidden');
    if (confettiAnimationId) {
      cancelAnimationFrame(confettiAnimationId);
      confettiAnimationId = null;
    }
    confettiParticles.length = 0;
    floatingNameTokens.length = 0;
    processedTappers.clear();
    updateDisplay(data);

    if (isAudioStarted) {
      window.hackathonAudio.startBGM();
    }
  });

  socket.on('player_registered', (data) => {
    if (data.connectedPlayers) {
      renderStandbyLobby(data.connectedPlayers);
    }
    if (data.topPlayers) {
      renderLeaderboard(data.topPlayers);
    }
    if (data.player && data.player.name) {
      spawnFloatingName(data.player.name);
    }
  });
});
