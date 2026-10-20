/**
 * Admin Mission Control Controller
 * Game Programming Hackathon 2026 @PCSHS_PHITSANULOK
 * Handles: Real-time ceremony pacing, click multipliers, target presets, and live interventions
 */

document.addEventListener('DOMContentLoaded', () => {
  const socket = io();

  // Metrics DOM
  const adminOnlineUsers = document.getElementById('adminOnlineUsers');
  const adminClicks = document.getElementById('adminClicks');
  const adminRawClicks = document.getElementById('adminRawClicks');
  const adminTargetDisplay = document.getElementById('adminTargetDisplay');
  const adminPercentage = document.getElementById('adminPercentage');
  const adminETA = document.getElementById('adminETA');
  const adminProgressFill = document.getElementById('adminProgressFill');
  const adminStatusText = document.getElementById('adminStatusText');

  // Pacing Controls DOM
  const badgeMultiplier = document.getElementById('badgeMultiplier');
  const sliderMultiplier = document.getElementById('sliderMultiplier');
  const sliderValueText = document.getElementById('sliderValueText');
  const multiplierHelpText = document.getElementById('multiplierHelpText');
  const inputTarget = document.getElementById('inputTarget');
  const btnSetTarget = document.getElementById('btnSetTarget');

  // Action Buttons DOM
  const btnMinus100 = document.getElementById('btnMinus100');
  const btnAdd100 = document.getElementById('btnAdd100');
  const btnAdd500 = document.getElementById('btnAdd500');
  const btnAdd1000 = document.getElementById('btnAdd1000');
  const btnForceStart = document.getElementById('btnForceStart');
  const btnReset = document.getElementById('btnReset');

  // Event State & Smooth Controls DOM
  const badgeEventStatus = document.getElementById('badgeEventStatus');
  const btnEventStart = document.getElementById('btnEventStart');
  const btnEventStandby = document.getElementById('btnEventStandby');
  const btnToggleFreeze = document.getElementById('btnToggleFreeze');
  const btnGlideMinus5 = document.getElementById('btnGlideMinus5');
  const btnGlideMinus2 = document.getElementById('btnGlideMinus2');
  const btnGlidePlus2 = document.getElementById('btnGlidePlus2');
  const btnGlidePlus5 = document.getElementById('btnGlidePlus5');
  const btnForce67 = document.getElementById('btnForce67');
  const btnAdminPresidentTouch = document.getElementById('btnAdminPresidentTouch');
  const adminLeaderboardList = document.getElementById('adminLeaderboardList');

  // Audio Tests DOM
  const btnTestPop = document.getElementById('btnTestPop');
  const btnTestBGM = document.getElementById('btnTestBGM');
  const btnTestFanfare = document.getElementById('btnTestFanfare');

  // Logs DOM
  const logContainer = document.getElementById('logContainer');

  let currentMultiplier = 1.0;
  let isBGMTesting = false;
  let isSystemFrozen = false;

  function addLog(msg, color = 'text-gray-300') {
    const time = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = color;
    line.textContent = `[${time}] ${msg}`;
    logContainer.appendChild(line);
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  // Update Multiplier UI Helper
  function updateMultiplierDisplay(mult) {
    currentMultiplier = mult;
    sliderMultiplier.value = mult;
    sliderValueText.textContent = `${mult.toFixed(2)}x`;
    
    let label = 'Normal';
    if (mult <= 0.25) label = 'Slow (100+ Users)';
    else if (mult <= 0.75) label = 'Medium (~1 Min)';
    else if (mult > 1.2) label = 'Fast Rush';

    badgeMultiplier.textContent = `${mult.toFixed(2)}x (${label})`;

    // Helper text calculation
    const tapsForTenPoints = Math.round(10 / mult);
    multiplierHelpText.textContent = `💡 ${tapsForTenPoints} Physical Taps = 10 Energy Points (${mult.toFixed(2)}x)`;

    // Update active preset button highlight
    document.querySelectorAll('.btn-preset-mult').forEach(btn => {
      const btnMult = parseFloat(btn.getAttribute('data-mult'));
      if (Math.abs(btnMult - mult) < 0.05) {
        btn.classList.add('bg-[#00f0ff]/25', 'border-[#00f0ff]');
      } else {
        btn.classList.remove('bg-[#00f0ff]/25', 'border-[#00f0ff]');
      }
    });
  }

  // Multiplier Slider Interaction
  sliderMultiplier.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    updateMultiplierDisplay(val);
  });

  sliderMultiplier.addEventListener('change', (e) => {
    const val = parseFloat(e.target.value);
    socket.emit('admin_set_multiplier', { multiplier: val });
    addLog(`⚡ Changed Click Multiplier to ${val.toFixed(2)}x`, 'text-[#ffe600]');
  });

  // Multiplier Preset Buttons
  document.querySelectorAll('.btn-preset-mult').forEach(btn => {
    btn.addEventListener('click', () => {
      const mult = parseFloat(btn.getAttribute('data-mult'));
      updateMultiplierDisplay(mult);
      socket.emit('admin_set_multiplier', { multiplier: mult });
      addLog(`⚡ Pacing Preset selected: ${mult}x`, 'text-[#00f0ff]');
    });
  });

  // Target Preset Buttons
  document.querySelectorAll('.btn-preset-target').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = parseInt(btn.getAttribute('data-target'), 10);
      inputTarget.value = target;
      socket.emit('admin_set_target', { target });
      addLog(`🎯 Target Goal changed to ${target.toLocaleString()} Clicks`, 'text-[#00ff66]');
    });
  });

  // Target Quick Delta Buttons (-1000, -500, +500, +1000)
  document.querySelectorAll('.btn-target-delta').forEach(btn => {
    btn.addEventListener('click', () => {
      const delta = parseInt(btn.getAttribute('data-delta'), 10);
      let cur = parseInt(inputTarget.value, 10) || 2026;
      cur = Math.max(100, cur + delta);
      inputTarget.value = cur;
      socket.emit('admin_set_target', { target: cur });
      addLog(`🎯 Target Adjusted (${delta > 0 ? '+' : ''}${delta.toLocaleString()}): ${cur.toLocaleString()}`, 'text-[#00ff66]');
    });
  });

  // Target Steppers (+/- 100)
  const adminCurrentTargetVal = document.getElementById('adminCurrentTargetVal');
  const btnTargetStepDown = document.getElementById('btnTargetStepDown');
  const btnTargetStepUp = document.getElementById('btnTargetStepUp');

  if (btnTargetStepDown) {
    btnTargetStepDown.addEventListener('click', () => {
      let cur = parseInt(inputTarget.value, 10) || 2026;
      cur = Math.max(100, cur - 100);
      inputTarget.value = cur;
      socket.emit('admin_set_target', { target: cur });
      addLog(`🎯 Target Adjusted (-100): ${cur.toLocaleString()}`, 'text-[#00ff66]');
    });
  }

  if (btnTargetStepUp) {
    btnTargetStepUp.addEventListener('click', () => {
      let cur = parseInt(inputTarget.value, 10) || 2026;
      cur = cur + 100;
      inputTarget.value = cur;
      socket.emit('admin_set_target', { target: cur });
      addLog(`🎯 Target Adjusted (+100): ${cur.toLocaleString()}`, 'text-[#00ff66]');
    });
  }

  // Enter Key support on Target Input
  inputTarget.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      btnSetTarget.click();
    }
  });

  btnSetTarget.addEventListener('click', () => {
    const val = parseInt(inputTarget.value, 10);
    if (!isNaN(val) && val > 0) {
      socket.emit('admin_set_target', { target: val });
      addLog(`🎯 Target Goal updated to ${val.toLocaleString()}`, 'text-[#00ff66]');
    }
  });

  // Energy Modifiers
  btnMinus100.addEventListener('click', () => {
    socket.emit('admin_add_clicks', { amount: -100 });
    addLog('⏸️ Subtracted -100 Energy Points (Pacing Assist)', 'text-red-400');
  });

  btnAdd100.addEventListener('click', () => {
    socket.emit('admin_add_clicks', { amount: 100 });
    addLog('⚡ Added +100 Energy Points', 'text-[#00f0ff]');
  });

  btnAdd500.addEventListener('click', () => {
    socket.emit('admin_add_clicks', { amount: 500 });
    addLog('🔥 Added +500 Energy Points', 'text-[#ff9e1f]');
  });

  btnAdd1000.addEventListener('click', () => {
    socket.emit('admin_add_clicks', { amount: 1000 });
    addLog('🚀 Added +1,000 Energy Points', 'text-[#ffe600]');
  });

  // Event State Controls (Start / Standby)
  if (btnEventStart) {
    btnEventStart.addEventListener('click', () => {
      socket.emit('admin_set_status', { status: 'RUNNING' });
      addLog('🟢 Started Ceremony (Players can tap!)', 'text-[#00ff66] font-bold');
    });
  }

  if (btnEventStandby) {
    btnEventStandby.addEventListener('click', () => {
      socket.emit('admin_set_status', { status: 'STANDBY' });
      addLog('⏸️ Event set to STANDBY (Players waiting)', 'text-[#ffe600]');
    });
  }

  // Smooth Energy Glides (No sudden jumps)
  if (btnGlideMinus5) {
    btnGlideMinus5.addEventListener('click', () => {
      socket.emit('admin_glide_energy', { deltaPercent: -5.0, durationSec: 3.0 });
      addLog('🌊 Gliding -5.0% over 3s...', 'text-red-400');
    });
  }
  if (btnGlideMinus2) {
    btnGlideMinus2.addEventListener('click', () => {
      socket.emit('admin_glide_energy', { deltaPercent: -2.0, durationSec: 2.0 });
      addLog('🌊 Gliding -2.0% over 2s...', 'text-red-400');
    });
  }
  if (btnGlidePlus2) {
    btnGlidePlus2.addEventListener('click', () => {
      socket.emit('admin_glide_energy', { deltaPercent: 2.0, durationSec: 2.0 });
      addLog('🌊 Gliding +2.0% over 2s...', 'text-[#00ff66]');
    });
  }
  if (btnGlidePlus5) {
    btnGlidePlus5.addEventListener('click', () => {
      socket.emit('admin_glide_energy', { deltaPercent: 5.0, durationSec: 3.0 });
      addLog('🌊 Gliding +5.0% over 3s...', 'text-[#ffe600]');
    });
  }

  // Freeze Toggle
  if (btnToggleFreeze) {
    btnToggleFreeze.addEventListener('click', () => {
      socket.emit('admin_toggle_freeze');
    });
  }

  // Stage 67% Plateau & Presidential Touch
  if (btnForce67) {
    btnForce67.addEventListener('click', () => {
      socket.emit('admin_force_67');
      addLog('🔒 Forcing 67% Plateau (President Button Revealed)', 'text-purple-400 font-bold');
    });
  }

  let presidentConfirmTimeout = null;
  if (btnAdminPresidentTouch) {
    btnAdminPresidentTouch.addEventListener('click', () => {
      if (!presidentConfirmTimeout) {
        btnAdminPresidentTouch.innerHTML = '<span>⚠️</span> Click Again to Confirm (Dual Touch)';
        btnAdminPresidentTouch.classList.add('animate-pulse');
        presidentConfirmTimeout = setTimeout(() => {
          btnAdminPresidentTouch.innerHTML = '⚡ Simulate Dual Touch ➔ 100% Surge';
          btnAdminPresidentTouch.classList.remove('animate-pulse');
          presidentConfirmTimeout = null;
        }, 3500);
        return;
      }
      clearTimeout(presidentConfirmTimeout);
      presidentConfirmTimeout = null;
      btnAdminPresidentTouch.innerHTML = '⚡ Simulate Dual Touch ➔ 100% Surge';
      btnAdminPresidentTouch.classList.remove('animate-pulse');
      socket.emit('admin_president_touch');
      addLog('⚡ Presidential Touch Triggered -> Boosting to 100%!', 'text-[#ffe600] font-bold');
    });
  }

  // Force 100% with Inline 2-Click Confirmation
  let forceConfirmTimeout = null;
  btnForceStart.addEventListener('click', () => {
    if (!forceConfirmTimeout) {
      btnForceStart.innerHTML = '<span>⚠️</span> Click Again to Confirm (FORCE 100%)';
      btnForceStart.classList.add('animate-pulse');
      forceConfirmTimeout = setTimeout(() => {
        btnForceStart.innerHTML = '<span>🚀</span> FORCE 100% FINALE (Boom + 10s Whiteout)';
        btnForceStart.classList.remove('animate-pulse');
        forceConfirmTimeout = null;
      }, 3500);
      return;
    }
    clearTimeout(forceConfirmTimeout);
    forceConfirmTimeout = null;
    btnForceStart.innerHTML = '<span>🚀</span> FORCE 100% FINALE (Boom + 10s Whiteout)';
    btnForceStart.classList.remove('animate-pulse');
    socket.emit('admin_force_start');
    addLog('🚀 Admin triggered FORCE 100%!', 'text-[#ffe600] font-bold');
  });

  // Reset with Inline 2-Click Confirmation
  let resetConfirmTimeout = null;
  btnReset.addEventListener('click', () => {
    if (!resetConfirmTimeout) {
      btnReset.innerHTML = '<span>⚠️</span> Click Again to Confirm (Reset to 0)';
      btnReset.classList.add('animate-pulse');
      resetConfirmTimeout = setTimeout(() => {
        btnReset.innerHTML = '<span>🔄</span> RESET GAME (Start From 0)';
        btnReset.classList.remove('animate-pulse');
        resetConfirmTimeout = null;
      }, 3500);
      return;
    }
    clearTimeout(resetConfirmTimeout);
    resetConfirmTimeout = null;
    btnReset.innerHTML = '<span>🔄</span> RESET GAME (Start From 0)';
    btnReset.classList.remove('animate-pulse');
    socket.emit('admin_reset');
    addLog('🔄 Admin reset game state to 0', 'text-gray-400');
  });

  // Audio Testing
  btnTestPop.addEventListener('click', () => {
    window.hackathonAudio.playPop();
    addLog('Sound Test: Pop played', 'text-gray-400');
  });

  btnTestBGM.addEventListener('click', () => {
    if (!isBGMTesting) {
      window.hackathonAudio.init();
      window.hackathonAudio.startBGM();
      btnTestBGM.classList.add('border-[#00ff66]', 'text-[#00ff66]');
      btnTestBGM.textContent = '⏹️ Stop BGM';
      isBGMTesting = true;
      addLog('Audio Test: BGM started', 'text-[#00ff66]');
    } else {
      window.hackathonAudio.stopBGM();
      btnTestBGM.classList.remove('border-[#00ff66]', 'text-[#00ff66]');
      btnTestBGM.textContent = '🎵 Toggle BGM';
      isBGMTesting = false;
      addLog('Audio Test: BGM stopped', 'text-gray-400');
    }
  });

  btnTestFanfare.addEventListener('click', () => {
    window.hackathonAudio.init();
    window.hackathonAudio.playHeavyBassBoom();
    addLog('Audio Test: Climax Boom & Shimmer triggered', 'text-[#ffe600]');
  });

  // Socket Listeners
  socket.on('game_init', (data) => {
    updateDashboard(data);
    if (data.clickMultiplier) updateMultiplierDisplay(data.clickMultiplier);
    addLog(`Connected to Server. Current clicks: ${data.currentClicks}`);
  });

  socket.on('game_tick', (data) => {
    updateDashboard(data);
  });

  socket.on('multiplier_updated', (data) => {
    if (data.clickMultiplier) updateMultiplierDisplay(data.clickMultiplier);
  });

  socket.on('target_updated', (data) => {
    adminTargetDisplay.textContent = data.targetClicks.toLocaleString();
    if (adminCurrentTargetVal) adminCurrentTargetVal.textContent = data.targetClicks.toLocaleString();
    inputTarget.value = data.targetClicks;
  });

  socket.on('game_force_charging', (data) => {
    addLog(`⚡ [OVERDRIVE] Force 100% Charging Surge Initiated (${(data.durationMs/1000).toFixed(1)}s)...`, 'text-[#ffe600] font-bold');
    btnForceStart.innerHTML = '<span>⚡</span> Surging Energy towards 100%...';
    btnForceStart.classList.add('animate-pulse');
  });

  socket.on('game_start', (data) => {
    btnForceStart.innerHTML = '<span>🚀</span> FORCE 100% FINALE (Boom + 10s Whiteout)';
    btnForceStart.classList.remove('animate-pulse');
    updateDashboard(data);
    addLog('🎉 [EVENT] Target reached! GAME START UNLOCKED!', 'text-[#ffe600] font-bold');
  });

  socket.on('game_reset', (data) => {
    btnForceStart.innerHTML = '<span>🚀</span> FORCE 100% FINALE (Boom + 10s Whiteout)';
    btnForceStart.classList.remove('animate-pulse');
    updateDashboard(data);
    addLog('🔄 [EVENT] Game was reset by administrator.', 'text-gray-400');
  });

  function updateDashboard(data) {
    if (!data) return;

    if (data.onlineUsers !== undefined) {
      adminOnlineUsers.textContent = data.onlineUsers;
    }
    if (data.currentClicks !== undefined) {
      adminClicks.textContent = data.currentClicks.toLocaleString();
    }
    if (data.rawClicksTotal !== undefined) {
      adminRawClicks.textContent = data.rawClicksTotal.toLocaleString();
    }
    if (data.targetClicks !== undefined) {
      adminTargetDisplay.textContent = data.targetClicks.toLocaleString();
      if (adminCurrentTargetVal) adminCurrentTargetVal.textContent = data.targetClicks.toLocaleString();
      // Crucial: Only overwrite input if admin is NOT currently typing in it!
      if (document.activeElement !== inputTarget) {
        inputTarget.value = data.targetClicks;
      }
    }
    if (data.percentage !== undefined) {
      const pct = Math.min(100, Math.max(0, data.percentage));
      adminPercentage.textContent = pct.toFixed(1);
      adminProgressFill.style.width = `${pct}%`;
    }

    // Dynamic ETA Display
    if (data.estimatedSecondsLeft !== undefined && data.estimatedSecondsLeft !== null) {
      adminETA.textContent = `~${data.estimatedSecondsLeft} s`;
      adminETA.className = 'text-xl font-orbitron font-bold text-[#00f0ff] mt-1.5';
    } else {
      adminETA.textContent = '-- s';
      adminETA.className = 'text-xl font-orbitron font-bold text-gray-400 mt-1.5';
    }

    if (data.isGameStarted) {
      adminStatusText.textContent = 'FINISHED (WHITE SCREEN CLIMAX)';
      adminStatusText.className = 'px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#ffe600]/20 text-[#ffe600] border border-[#ffe600]/50 animate-pulse';
    } else if (data.percentage > 0) {
      adminStatusText.textContent = 'ACTIVE (ACCUMULATING ENERGY)';
      adminStatusText.className = 'px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50';
    } else {
      adminStatusText.textContent = 'WAITING FOR PLAYERS';
      adminStatusText.className = 'px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/30';
    }

    // Event Status Badge
    if (data.eventStatus && badgeEventStatus) {
      if (data.eventStatus === 'STANDBY') {
        badgeEventStatus.textContent = 'STANDBY';
        badgeEventStatus.className = 'px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#ffe600]/20 text-[#ffe600] border border-[#ffe600]/50 animate-pulse font-mono-tech';
      } else if (data.eventStatus === 'RUNNING') {
        badgeEventStatus.textContent = 'RUNNING';
        badgeEventStatus.className = 'px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/50 font-mono-tech';
      } else if (data.eventStatus === 'PLATEAU_67') {
        badgeEventStatus.textContent = 'STAGE 67% (DUAL TOUCH)';
        badgeEventStatus.className = 'px-2.5 py-0.5 rounded text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/50 animate-pulse font-mono-tech';
      } else if (data.eventStatus === 'FINISHED') {
        badgeEventStatus.textContent = 'FINISHED';
        badgeEventStatus.className = 'px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50 font-mono-tech';
      }
    }

    // Freeze State
    if (data.isFrozen !== undefined && btnToggleFreeze) {
      isSystemFrozen = !!data.isFrozen;
      if (isSystemFrozen) {
        btnToggleFreeze.textContent = '🔥 UNFREEZE';
        btnToggleFreeze.className = 'cyber-btn cyber-btn-pink text-[10px] py-1 px-2 animate-pulse';
      } else {
        btnToggleFreeze.textContent = '❄️ FREEZE';
        btnToggleFreeze.className = 'cyber-btn text-[10px] py-1 px-2 border-cyan-400';
      }
    }

    // Top 20 Leaderboard
    if (data.topPlayers) {
      renderAdminLeaderboard(data.topPlayers);
    }
  }

  function renderAdminLeaderboard(topPlayers) {
    if (!adminLeaderboardList) return;
    if (!topPlayers || topPlayers.length === 0) {
      adminLeaderboardList.innerHTML = '<div class="text-gray-500 text-center py-4 col-span-full">Waiting for player scores...</div>';
      return;
    }
    adminLeaderboardList.innerHTML = '';
    topPlayers.forEach(p => {
      const card = document.createElement('div');
      card.className = 'p-2 rounded bg-black/50 border border-white/10 flex items-center justify-between';
      let rankBadge = `<span class="text-gray-400 font-bold">#${p.rank}</span>`;
      if (p.rank === 1) rankBadge = `<span class="text-[#ffe600] font-black text-sm">🥇 #1</span>`;
      else if (p.rank === 2) rankBadge = `<span class="text-gray-200 font-bold">🥈 #2</span>`;
      else if (p.rank === 3) rankBadge = `<span class="text-amber-500 font-bold">🥉 #3</span>`;

      card.innerHTML = `
        <div class="flex items-center gap-2 overflow-hidden pr-1">
          ${rankBadge}
          <span class="truncate font-sans font-bold text-white text-xs" title="${p.name}">${p.name}</span>
        </div>
        <span class="font-orbitron font-bold text-[#00f0ff] shrink-0 text-xs">${p.clicks.toLocaleString()}</span>
      `;
      adminLeaderboardList.appendChild(card);
    });
  }
});
