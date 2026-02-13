/**
 * Express server for Siddhanath Ashram Sangha.
 * Serves REST API + runs Grammy Telegram bot (long polling or webhook).
 * @module server
 */

require('dotenv').config();

const express = require('express');
const supabase = require('./db');
const { createBot } = require('./telegram-bot');
const mountApiRoutes = require('./routes/api');
const { webhookCallback } = require('grammy');

const PORT = parseInt(process.env.PORT, 10) || 3009;
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = express();

// ─── Middleware ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS — allow all origins
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// ─── Health endpoint ────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'siddhanath-yoga-marathon',
    environment: NODE_ENV,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// ─── YouTube embed proxy (for Chrome extension popup) ───────
app.get('/embed/youtube', (req, res) => {
  const videoId = req.query.v;
  const startTime = parseInt(req.query.t) || 0;
  const endTime = parseInt(req.query.end) || 0;
  if (!videoId || !/^[\w-]+$/.test(videoId)) {
    return res.status(400).send('Invalid video ID');
  }
  let src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&start=${startTime}&rel=0&modestbranding=1`;
  if (endTime) src += `&end=${endTime}`;
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html><html><head><style>*{margin:0;padding:0}body{background:#000;overflow:hidden}iframe{width:100%;height:100vh;border:none}</style></head><body><iframe src="${src}" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe></body></html>`);
});

// ─── Mount API routes ───────────────────────────────────────
mountApiRoutes(app, supabase);

// ─── Create Telegram bot ────────────────────────────────────
const bot = createBot(supabase);

// ─── Start server + bot ─────────────────────────────────────
async function start() {
  try {
    // Verify Supabase connection
    const { error } = await supabase.from('ashram_members').select('id').limit(1);
    if (error && !error.message.includes('does not exist')) {
      console.warn('[SERVER] Supabase check warning:', error.message);
    }
    console.log('[SERVER] Supabase connected');

    if (NODE_ENV === 'production') {
      // ─── Production: Webhook mode ─────────────────────────
      // Grammy webhook handler mounted on Express
      app.use('/webhook/telegram', webhookCallback(bot, 'express'));
      console.log('[BOT] Webhook mode at /webhook/telegram');

    } else {
      // ─── Development: Long polling ────────────────────────
      // Delete any existing webhook first
      await bot.api.deleteWebhook({ drop_pending_updates: true });
      console.log('[BOT] Cleared existing webhook');

      // Start polling (non-blocking)
      bot.start({
        onStart: () => console.log('[BOT] Long polling started'),
        drop_pending_updates: true
      });
    }

    // Start Express
    app.listen(PORT, () => {
      console.log(`[SERVER] Siddhanath Ashram Sangha running on port ${PORT}`);
      console.log(`[SERVER] Environment: ${NODE_ENV}`);
      console.log(`[SERVER] Health: http://localhost:${PORT}/health`);
      console.log(`[SERVER] API:    http://localhost:${PORT}/api/sangha/feed`);
    });

  } catch (err) {
    console.error('[SERVER] Failed to start:', err);
    process.exit(1);
  }
}

// ─── Graceful shutdown ──────────────────────────────────────
process.on('SIGINT', () => {
  console.log('\n[SERVER] Shutting down...');
  bot.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[SERVER] SIGTERM received, shutting down...');
  bot.stop();
  process.exit(0);
});

start();
