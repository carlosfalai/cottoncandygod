/**
 * Grammy Telegram bot factory for Siddhanath Ashram Sangha.
 * Creates and configures the bot with all handlers.
 * @module telegram-bot
 */

const { Bot } = require('grammy');
const { registerStartHandlers } = require('./handlers/start-handler');
const { registerSevaHandlers } = require('./handlers/seva-handler');
const { registerBroadcastHandlers } = require('./handlers/broadcast-handler');
const { registerPostHandlers } = require('./handlers/post-handler');

/**
 * Creates and configures a Grammy bot with all handlers.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @returns {import('grammy').Bot} Configured bot instance
 */
function createBot(supabase) {
  const token = process.env.SIDDHANATH_TELEGRAM_TOKEN;

  if (!token) {
    console.error('[BOT] Missing SIDDHANATH_TELEGRAM_TOKEN');
    process.exit(1);
  }

  const bot = new Bot(token);

  // ─── Global error handler ─────────────────────────────────
  bot.catch((err) => {
    const ctx = err.ctx;
    const e = err.error;

    console.error(`[BOT] Error while handling update ${ctx.update.update_id}:`);

    if (e instanceof Error) {
      console.error('[BOT]', e.message);
      console.error('[BOT] Stack:', e.stack);
    } else {
      console.error('[BOT] Unknown error:', e);
    }

    // Try to notify user
    try {
      ctx.reply('An internal error occurred. Please try again.').catch(() => {});
    } catch (_) {
      // Ignore reply failure
    }
  });

  // ─── Register all handlers ────────────────────────────────
  // Order matters: start/onboarding first, then specific features.
  // The text filters in start-handler and post-handler use .filter()
  // so they only trigger for the correct onboarding/post states.

  registerStartHandlers(bot, supabase);
  registerSevaHandlers(bot, supabase);
  registerBroadcastHandlers(bot, supabase);
  registerPostHandlers(bot, supabase);

  console.log('[BOT] All handlers registered');

  return bot;
}

module.exports = { createBot };
