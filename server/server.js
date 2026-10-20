const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const QRCode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Helper to find local IPv4 address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const LOCAL_IP = getLocalIpAddress();

// Serve static assets from public folder with UTF-8 support
app.use(express.static(path.join(__dirname, '../public')));

// Specific view shortcuts
app.get('/screen', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/screen.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// System info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    localIp: LOCAL_IP,
    port: PORT,
    mobileUrl: `http://${LOCAL_IP}:${PORT}`,
    screenUrl: `http://${LOCAL_IP}:${PORT}/screen.html`,
    adminUrl: `http://${LOCAL_IP}:${PORT}/admin.html`
  });
});

// Dynamic QR Code generation endpoint (Pure Black & White with Clean Margin)
app.get('/api/qr', async (req, res) => {
  try {
    const host = req.query.host || `http://${LOCAL_IP}:${PORT}`;
    const qrDataUrl = await QRCode.toDataURL(host, {
      margin: 2,
      width: 340,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    res.json({ url: host, qrDataUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REST Endpoints for Admin Direct Remote Overrides
app.get('/api/admin/force100', (req, res) => {
  performForce100();
  res.json({ ok: true, message: 'FORCE 100% triggered' });
});

app.get('/api/admin/reset', (req, res) => {
  performReset();
  res.json({ ok: true, message: 'Game reset to 0' });
});

// Game State with Dynamic Pacing, 67% Plateau, Leaderboard & Presidential Touch
const DEFAULT_TARGET = 2026;
let gameState = {
  currentClicks: 0,          // Effective energy points accumulated
  rawClicksTotal: 0,         // Total raw physical finger taps counted
  targetClicks: DEFAULT_TARGET,
  clickMultiplier: 1.0,      // Difficulty: e.g. 0.2x means 5 taps = 1 energy point
  isGameStarted: false,      // 100% reached
  eventStatus: 'STANDBY',    // 'STANDBY' | 'RUNNING' | 'PAUSED' | 'PLATEAU_67' | 'FINISHED'
  isFrozen: false,           // Admin freeze progress
  stage67Triggered: false,   // True once 67.0% has been hit
  presidentTriggered: false, // True once President touched button
  startTime: null,
  finishTime: null,
  totalBatchesReceived: 0
};

// Persistent Players and Leaderboard map
// key: playerId -> { id, name: string, clicks: number, socketId: string, isOnline: boolean, lastActive: number }
const players = new Map();
const recentTappers = [];

// CPS (Clicks Per Second) tracking over recent 1000ms window
const clickTimestamps = [];

function recordClicks(count) {
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    clickTimestamps.push(now);
  }
}

function calculateCPS() {
  const now = Date.now();
  const oneSecondAgo = now - 1000;
  while (clickTimestamps.length > 0 && clickTimestamps[0] < oneSecondAgo) {
    clickTimestamps.shift();
  }
  return clickTimestamps.length;
}

function getTopPlayers() {
  const now = Date.now();
  return Array.from(players.values())
    .filter(p => p.name && p.name !== 'ผู้เข้าร่วม' && p.name !== 'Hacker Agent' && (p.isOnline || (now - p.lastActive < 60000)))
    .sort((a, b) => {
      if (b.clicks !== a.clicks) return b.clicks - a.clicks;
      return (b.lastActive || 0) - (a.lastActive || 0);
    })
    .slice(0, 20)
    .map((p, idx) => ({
      rank: idx + 1,
      name: p.name,
      clicks: p.clicks
    }));
}

function getConnectedPlayers() {
  return Array.from(players.values())
    .filter(p => p.name && p.name !== 'ผู้เข้าร่วม' && p.name !== 'Hacker Agent' && p.isOnline)
    .slice(-40)
    .map(p => ({
      id: p.id,
      name: p.name,
      clicks: p.clicks
    }));
}

// Socket.IO Handling
let connectedUsers = 0;
let forceChargingTimeout = null;
let activeGlideInterval = null;

// Presidential Touch / Dual Screen Touch Event (Module-level)
function triggerPresidentialSurge(force = false) {
  if (!force && (gameState.isGameStarted || gameState.presidentTriggered)) return;
  gameState.presidentTriggered = true;
  gameState.isFrozen = false;
  gameState.eventStatus = 'RUNNING';

  const CHARGE_DURATION_MS = 2500;
  console.log(`⚡ [PRESIDENT TOUCH] Dual touch activated! Surging from 67% to 100% (${CHARGE_DURATION_MS}ms)...`);

  io.emit('game_force_charging', {
    durationMs: CHARGE_DURATION_MS,
    startClicks: gameState.currentClicks,
    targetClicks: gameState.targetClicks
  });

  if (forceChargingTimeout) clearTimeout(forceChargingTimeout);
  forceChargingTimeout = setTimeout(() => {
    forceChargingTimeout = null;
    gameState.currentClicks = gameState.targetClicks;
    gameState.isGameStarted = true;
    gameState.eventStatus = 'FINISHED';
    gameState.finishTime = Date.now();
    recordClicks(500);

    const durationSeconds = gameState.startTime 
      ? ((gameState.finishTime - gameState.startTime) / 1000).toFixed(1) 
      : '0';

    console.log(`🎉 [100% UNLOCKED] President touch complete! Finished in ${durationSeconds}s!`);
    io.emit('game_start', {
      currentClicks: gameState.currentClicks,
      rawClicksTotal: gameState.rawClicksTotal,
      targetClicks: gameState.targetClicks,
      durationSeconds,
      timestamp: Date.now()
    });
  }, CHARGE_DURATION_MS);
}

function performForce100() {
  console.log('🚀 [FORCE 100%] Executing instant 100% finale and whiteout...');
  gameState.isGameStarted = false;
  gameState.presidentTriggered = false;
  io.emit('game_force_start_trigger');
  triggerPresidentialSurge(true);
}

function performReset() {
  console.log('🔄 [RESET] Resetting game state to 0...');
  if (forceChargingTimeout) {
    clearTimeout(forceChargingTimeout);
    forceChargingTimeout = null;
  }
  if (activeGlideInterval) {
    clearInterval(activeGlideInterval);
    activeGlideInterval = null;
  }
  gameState.currentClicks = 0;
  gameState.rawClicksTotal = 0;
  gameState.isGameStarted = false;
  gameState.eventStatus = 'STANDBY';
  gameState.isFrozen = false;
  gameState.stage67Triggered = false;
  gameState.presidentTriggered = false;
  gameState.startTime = null;
  gameState.finishTime = null;
  clickTimestamps.length = 0;
  players.clear();
  recentTappers.length = 0;

  io.emit('game_reset', {
    currentClicks: 0,
    targetClicks: gameState.targetClicks,
    percentage: 0,
    eventStatus: 'STANDBY',
    connectedPlayers: [],
    topPlayers: []
  });
}

io.on('connection', (socket) => {
  connectedUsers++;

  const cps = calculateCPS();
  const percentage = Math.min(100, (gameState.currentClicks / gameState.targetClicks) * 100);

  // Send initial state immediately to new client
  socket.emit('game_init', {
    currentClicks: Math.floor(gameState.currentClicks),
    rawClicksTotal: gameState.rawClicksTotal,
    targetClicks: gameState.targetClicks,
    clickMultiplier: gameState.clickMultiplier,
    percentage: parseFloat(percentage.toFixed(1)),
    isGameStarted: gameState.isGameStarted,
    eventStatus: gameState.eventStatus,
    isFrozen: gameState.isFrozen,
    stage67Triggered: gameState.stage67Triggered,
    presidentTriggered: gameState.presidentTriggered,
    onlineUsers: connectedUsers,
    cps,
    topPlayers: getTopPlayers(),
    connectedPlayers: getConnectedPlayers()
  });

  // Client updates player nickname and persistent playerId
  socket.on('set_player_name', (data) => {
    const rawName = (data?.name || '').trim().slice(0, 35);
    const playerId = (data?.playerId || socket.id).trim();
    socket.playerId = playerId;

    let player = players.get(playerId);
    if (player) {
      if (rawName) player.name = rawName;
      player.socketId = socket.id;
      player.isOnline = true;
      player.lastActive = Date.now();
    } else {
      player = {
        id: playerId,
        name: rawName || 'Hacker Agent',
        clicks: 0,
        socketId: socket.id,
        isOnline: true,
        lastActive: Date.now()
      };
      players.set(playerId, player);
    }

    // Send back previous personal clicks so player can resume score!
    socket.emit('player_restored', { clicks: player.clicks, name: player.name });

    // Broadcast live to Screen Lobby so new player's name pops up immediately!
    io.emit('player_registered', {
      player: { id: player.id, name: player.name, clicks: player.clicks },
      connectedPlayers: getConnectedPlayers(),
      topPlayers: getTopPlayers()
    });
  });

  // Client batch clicks event (sent every 100ms by client)
  socket.on('batch_clicks', (data) => {
    if (gameState.eventStatus === 'STANDBY' || gameState.eventStatus === 'PAUSED') return;

    const count = parseInt(data?.count, 10);
    if (isNaN(count) || count <= 0) return;

    // Safety clamp (max 100 raw clicks per 100ms batch from a single client)
    const validCount = Math.min(count, 100);

    // Track Player in Leaderboard by persistent playerId
    const playerId = (data?.playerId || socket.playerId || socket.id).trim();
    const rawPlayerName = (data?.playerName || '').trim().slice(0, 35);
    let player = players.get(playerId);
    if (!player) {
      player = { id: playerId, name: rawPlayerName || 'Hacker Agent', clicks: 0, socketId: socket.id, isOnline: true, lastActive: Date.now() };
      players.set(playerId, player);
    } else {
      if (rawPlayerName && player.name !== rawPlayerName) player.name = rawPlayerName;
      player.isOnline = true;
      player.socketId = socket.id;
    }
    player.clicks += validCount;
    player.lastActive = Date.now();

    // Add to recent tappers queue for floating names background
    if (player.name && player.name !== 'ผู้เข้าร่วม' && player.name !== 'Hacker Agent') {
      recentTappers.push({
        id: Math.random().toString(36).substring(2, 7),
        name: player.name,
        time: Date.now()
      });
      if (recentTappers.length > 25) {
        recentTappers.shift();
      }
    }

    if (gameState.currentClicks === 0 && !gameState.startTime) {
      gameState.startTime = Date.now();
    }

    gameState.rawClicksTotal += validCount;
    gameState.totalBatchesReceived++;
    recordClicks(validCount);

    // If ceremony is already unlocked (100%):
    // Allow players to continue playing and ranking on the leaderboard for fun!
    if (gameState.isGameStarted) {
      return;
    }

    // Dynamic 67.5% Plateau Control Logic (Strict lock at 67.5% until President touches)
    const currentPct = (gameState.currentClicks / gameState.targetClicks) * 100;
    const cap67_5 = gameState.targetClicks * 0.675;

    // If President has NOT triggered yet:
    if (!gameState.presidentTriggered) {
      if (currentPct >= 67.5) {
        // We are at or above 67.5%: Enter 67% Plateau and freeze progress!
        gameState.currentClicks = cap67_5;
        gameState.eventStatus = 'PLATEAU_67';
        if (!gameState.stage67Triggered) {
          gameState.stage67Triggered = true;
          console.log('🔒 [STAGE 67%] 67.5% reached! Triggering floating 67 numbers and locking energy.');
          io.emit('stage_67_reached', { timestamp: Date.now() });
        }
        // Between 67.5% and 100%, user tapping does NOT increase energy, prompting focus on stage!
      } else {
        // Below 67.5%: Normal advancement, capped strictly at 67.5%
        if (!gameState.isFrozen) {
          const effectivePoints = validCount * gameState.clickMultiplier;
          if (gameState.currentClicks + effectivePoints >= cap67_5) {
            gameState.currentClicks = cap67_5;
            gameState.eventStatus = 'PLATEAU_67';
            if (!gameState.stage67Triggered) {
              gameState.stage67Triggered = true;
              console.log('🔒 [STAGE 67%] 67.5% reached! Triggering floating 67 numbers and locking energy.');
              io.emit('stage_67_reached', { timestamp: Date.now() });
            }
          } else {
            gameState.currentClicks += effectivePoints;
          }
        }
      }
    }
  });

  // Trigger from Main Screen touchscreen
  socket.on('president_touch', () => {
    triggerPresidentialSurge(true);
  });

  // Trigger from Admin remote override
  socket.on('admin_president_touch', () => {
    triggerPresidentialSurge(true);
  });

  // Admin Controls: Direct Emergency Click Adjust (+/- 100, 500, 1000)
  socket.on('admin_add_clicks', (data) => {
    const amount = parseInt(data?.amount, 10);
    if (!isNaN(amount)) {
      gameState.currentClicks = Math.max(0, Math.min(gameState.targetClicks, gameState.currentClicks + amount));
      console.log(`⚡ [ADMIN] Direct click adjust: ${amount > 0 ? '+' : ''}${amount} -> Current: ${gameState.currentClicks}`);
      if (gameState.currentClicks >= gameState.targetClicks && !gameState.isGameStarted) {
        triggerPresidentialSurge(true);
      }
    }
  });

  // Admin Controls: Force 100% Start (Instant Climax)
  socket.on('admin_force_start', () => {
    performForce100();
  });

  // Admin Controls: Start / Pause Event
  socket.on('admin_set_status', (data) => {
    const status = data?.status; // 'STANDBY', 'RUNNING', 'PAUSED'
    if (['STANDBY', 'RUNNING', 'PAUSED'].includes(status)) {
      gameState.eventStatus = status;
      if (status === 'RUNNING' && !gameState.startTime) {
        gameState.startTime = Date.now();
      }
      console.log(`📡 [ADMIN] Event status set to: ${status}`);
      io.emit('event_status_changed', { eventStatus: gameState.eventStatus });
    }
  });

  // Admin Controls: Freeze Progress Toggle (Stop % from moving while users tap)
  socket.on('admin_toggle_freeze', () => {
    gameState.isFrozen = !gameState.isFrozen;
    console.log(`❄️ [ADMIN] Freeze progress: ${gameState.isFrozen}`);
    io.emit('freeze_status', { isFrozen: gameState.isFrozen });
  });

  // Admin Controls: Smooth Glide Energy (Adjust % smoothly over 2-3s without sudden jumps)
  socket.on('admin_glide_energy', (data) => {
    const deltaPercent = parseFloat(data?.deltaPercent) || 0;
    const durationMs = parseInt(data?.durationMs, 10) || 2500;
    if (deltaPercent === 0) return;

    if (activeGlideInterval) {
      clearInterval(activeGlideInterval);
      activeGlideInterval = null;
    }

    const startClicks = gameState.currentClicks;
    const deltaClicks = (deltaPercent / 100) * gameState.targetClicks;
    const targetClicksVal = Math.max(0, Math.min(gameState.targetClicks, startClicks + deltaClicks));
    const startTime = Date.now();

    console.log(`🌊 [ADMIN] Gliding energy by ${deltaPercent > 0 ? '+' : ''}${deltaPercent}% over ${durationMs}ms...`);

    activeGlideInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI);
      gameState.currentClicks = startClicks + (targetClicksVal - startClicks) * ease;

      if (progress >= 1) {
        clearInterval(activeGlideInterval);
        activeGlideInterval = null;
        gameState.currentClicks = targetClicksVal;
      }
    }, 40);
  });

  // Admin Controls: Force 67% Plateau (For testing or rehearsal)
  socket.on('admin_force_67', () => {
    if (gameState.isGameStarted) return;
    gameState.currentClicks = gameState.targetClicks * 0.675;
    gameState.eventStatus = 'PLATEAU_67';
    gameState.stage67Triggered = true;
    gameState.presidentTriggered = false;
    console.log('🔒 [ADMIN] Forced directly to 67.5% Presidential Stage!');
    io.emit('stage_67_reached', { timestamp: Date.now() });
  });

  // Admin Controls: Change Click Multiplier in Real-Time
  socket.on('admin_set_multiplier', (data) => {
    const mult = parseFloat(data?.multiplier);
    if (!isNaN(mult) && mult > 0) {
      gameState.clickMultiplier = Math.max(0.01, Math.min(10.0, mult));
      console.log(`⚡ [ADMIN] Click Multiplier updated to: ${gameState.clickMultiplier}x`);
      io.emit('multiplier_updated', { clickMultiplier: gameState.clickMultiplier });
    }
  });

  // Admin Controls: Change Target Clicks in Real-Time
  socket.on('admin_set_target', (data) => {
    const newTarget = parseInt(data?.target, 10);
    if (!isNaN(newTarget) && newTarget > 0) {
      gameState.targetClicks = newTarget;
      console.log(`🎯 [ADMIN] Target clicks updated to: ${newTarget}`);
      io.emit('target_updated', { targetClicks: newTarget });
    }
  });

  // Admin Controls: Reset
  socket.on('admin_reset', () => {
    performReset();
  });

  socket.on('disconnect', () => {
    connectedUsers = Math.max(0, connectedUsers - 1);
    if (socket.playerId && players.has(socket.playerId)) {
      const p = players.get(socket.playerId);
      p.isOnline = false;
      p.lastActive = Date.now();
    }
  });
});

// Periodic broadcast loop (every 100ms) to sync all 100+ clients seamlessly
const BROADCAST_INTERVAL_MS = 100;

setInterval(() => {
  const cps = calculateCPS();
  const percentage = Math.min(100, (gameState.currentClicks / gameState.targetClicks) * 100);

  // Calculate dynamic ETA (estimated seconds remaining)
  let estimatedSecondsLeft = null;
  const effectivePointsPerSec = cps * gameState.clickMultiplier;
  if (effectivePointsPerSec > 0 && !gameState.isGameStarted) {
    const remainingPoints = gameState.targetClicks - gameState.currentClicks;
    estimatedSecondsLeft = Math.max(0, Math.round(remainingPoints / effectivePointsPerSec));
  }

  // Top 20 Leaderboard
  const topPlayers = getTopPlayers();

  io.emit('game_tick', {
    currentClicks: Math.floor(gameState.currentClicks),
    rawClicksTotal: gameState.rawClicksTotal,
    targetClicks: gameState.targetClicks,
    clickMultiplier: gameState.clickMultiplier,
    percentage: parseFloat(percentage.toFixed(1)),
    cps,
    estimatedSecondsLeft,
    onlineUsers: connectedUsers,
    isGameStarted: gameState.isGameStarted,
    eventStatus: gameState.eventStatus,
    isFrozen: gameState.isFrozen,
    stage67Triggered: gameState.stage67Triggered,
    presidentTriggered: gameState.presidentTriggered,
    topPlayers,
    connectedPlayers: getConnectedPlayers(),
    recentTappers: recentTappers.slice(-10)
  });
}, BROADCAST_INTERVAL_MS);

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n=============================================================');
  console.log('🚀 GAME PROGRAMMING HACKATHON 2026 @PCSHS_PHITSANULOK');
  console.log('⚡ REAL-TIME INTERACTIVE OPENING CEREMONY SYSTEM RUNNING!');
  console.log('=============================================================');
  console.log(`📱 Mobile Player View : http://localhost:${PORT}`);
  console.log(`📱 Mobile on Wi-Fi    : http://${LOCAL_IP}:${PORT}`);
  console.log(`🖥️  Projector Screen   : http://localhost:${PORT}/screen.html`);
  console.log(`🛠️  Admin Dashboard    : http://localhost:${PORT}/admin.html`);
  console.log('=============================================================\n');
});
