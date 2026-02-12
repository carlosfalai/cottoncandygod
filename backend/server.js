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
