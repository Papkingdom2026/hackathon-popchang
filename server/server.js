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

// Dynamic QR Code generation endpoint
app.get('/api/qr', async (req, res) => {
  try {
    const host = req.query.host || `http://${LOCAL_IP}:${PORT}`;
    const qrDataUrl = await QRCode.toDataURL(host, {
      margin: 1,
      width: 300,
      color: {
        dark: '#00F0FF',
        light: '#01082d'
      }
    });
    res.json({ url: host, qrDataUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Game State with Dynamic Pacing & Multiplier
const DEFAULT_TARGET = 2026;
let gameState = {
  currentClicks: 0,          // Effective energy points accumulated
  rawClicksTotal: 0,         // Total raw physical finger taps counted
  targetClicks: DEFAULT_TARGET,
  clickMultiplier: 1.0,      // Difficulty: e.g. 0.2x means 5 taps = 1 energy point
  isGameStarted: false,
  startTime: null,
  finishTime: null,
  totalBatchesReceived: 0
};

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

// Socket.IO Handling
let connectedUsers = 0;

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
    onlineUsers: connectedUsers,
    cps
  });

  // Client batch clicks event (sent every 100ms by client)
  socket.on('batch_clicks', (data) => {
    if (gameState.isGameStarted) return; // Ignore if already reached 100%

    const count = parseInt(data?.count, 10);
    if (isNaN(count) || count <= 0) return;

    // Safety clamp (max 100 raw clicks per 100ms batch from a single client)
    const validCount = Math.min(count, 100);

    if (gameState.currentClicks === 0 && !gameState.startTime) {
      gameState.startTime = Date.now();
    }

    gameState.rawClicksTotal += validCount;
    // Apply dynamic multiplier (energy resistance)
    const effectivePoints = validCount * gameState.clickMultiplier;
    gameState.currentClicks = Math.min(gameState.targetClicks, gameState.currentClicks + effectivePoints);
    gameState.totalBatchesReceived++;
    recordClicks(validCount);

    // Check if target reached
    if (gameState.currentClicks >= gameState.targetClicks && !gameState.isGameStarted) {
      gameState.currentClicks = gameState.targetClicks;
      gameState.isGameStarted = true;
      gameState.finishTime = Date.now();
      
      const durationSeconds = gameState.startTime 
        ? ((gameState.finishTime - gameState.startTime) / 1000).toFixed(1) 
        : '0';

      console.log(`🎉 [GAME START TRIGGERED] Target reached in ${durationSeconds}s! Energy: ${gameState.currentClicks}, Raw Taps: ${gameState.rawClicksTotal}`);

      io.emit('game_start', {
        currentClicks: Math.floor(gameState.currentClicks),
        rawClicksTotal: gameState.rawClicksTotal,
        targetClicks: gameState.targetClicks,
        durationSeconds,
        timestamp: Date.now()
      });
    }
  });

  // Admin Controls: Add/Subtract energy points
  socket.on('admin_add_clicks', (data) => {
    const amount = parseInt(data?.amount, 10) || 100;
    gameState.currentClicks = Math.max(0, Math.min(gameState.targetClicks, gameState.currentClicks + amount));
    if (amount > 0) recordClicks(Math.min(amount, 50));

    if (gameState.currentClicks >= gameState.targetClicks && !gameState.isGameStarted) {
      gameState.isGameStarted = true;
      gameState.finishTime = Date.now();
      io.emit('game_start', {
        currentClicks: gameState.currentClicks,
        rawClicksTotal: gameState.rawClicksTotal,
        targetClicks: gameState.targetClicks,
        durationSeconds: '0',
        timestamp: Date.now()
      });
    }
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

  // Admin Controls: Force 100% Start with Dramatic 2.2s Charging Surge
  let forceChargingTimeout = null;
  socket.on('admin_force_start', () => {
    if (gameState.isGameStarted) return;
    if (forceChargingTimeout) {
      clearTimeout(forceChargingTimeout);
      forceChargingTimeout = null;
    }

    const CHARGE_DURATION_MS = 2200;
    console.log(`⚡ [ADMIN] Force 100% dramatic charging surge initiated (${CHARGE_DURATION_MS}ms)...`);

    // Broadcast charging event to projector, player, and admin
    io.emit('game_force_charging', {
      durationMs: CHARGE_DURATION_MS,
      startClicks: gameState.currentClicks,
      targetClicks: gameState.targetClicks
    });

    forceChargingTimeout = setTimeout(() => {
      forceChargingTimeout = null;
      gameState.currentClicks = gameState.targetClicks;
      gameState.isGameStarted = true;
      gameState.finishTime = Date.now();
      recordClicks(500);

      console.log('⚡ [ADMIN] Force 100% fully reached! Triggering GAME START celebration!');
      io.emit('game_start', {
        currentClicks: gameState.currentClicks,
        rawClicksTotal: gameState.rawClicksTotal,
        targetClicks: gameState.targetClicks,
        durationSeconds: 'FORCED',
        timestamp: Date.now()
      });
    }, CHARGE_DURATION_MS);
  });

  // Admin Controls: Reset
  socket.on('admin_reset', () => {
    if (forceChargingTimeout) {
      clearTimeout(forceChargingTimeout);
      forceChargingTimeout = null;
    }
    gameState.currentClicks = 0;
    gameState.rawClicksTotal = 0;
    gameState.isGameStarted = false;
    gameState.startTime = null;
    gameState.finishTime = null;
    clickTimestamps.length = 0;

    console.log('🔄 [ADMIN] Game reset to 0!');
    io.emit('game_reset', {
      currentClicks: 0,
      rawClicksTotal: 0,
      targetClicks: gameState.targetClicks,
      clickMultiplier: gameState.clickMultiplier,
      timestamp: Date.now()
    });
  });

  socket.on('disconnect', () => {
    connectedUsers = Math.max(0, connectedUsers - 1);
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

  io.emit('game_tick', {
    currentClicks: Math.floor(gameState.currentClicks),
    rawClicksTotal: gameState.rawClicksTotal,
    targetClicks: gameState.targetClicks,
    clickMultiplier: gameState.clickMultiplier,
    percentage: parseFloat(percentage.toFixed(1)),
    cps,
    estimatedSecondsLeft,
    onlineUsers: connectedUsers,
    isGameStarted: gameState.isGameStarted
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
