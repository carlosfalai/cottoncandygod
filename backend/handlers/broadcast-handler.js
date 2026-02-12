/**
 * Broadcast handlers for satsang announcements, food prayers, and alerts.
 * Manages: /satsang, /food, /prayer commands + location callbacks.
 * @module handlers/broadcast-handler
 */

const { InlineKeyboard } = require('grammy');
const { getFullPrayerText, PRAYER_YOUTUBE_URL, PRAYER_IMAGE_URL } = require('../utils/prayer-text');

/** In-memory state for custom satsang location input */
const satsangState = new Map();

/**
 * Broadcasts an alert message to all sangha members via the ashram_alerts table.
 * Does NOT send individual Telegram messages (the frontend/app polls alerts).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} alert - Alert data
 * @param {string} alert.type - Alert type (satsang, food_prayer, announcement)
 * @param {string} alert.title - Alert title
 * @param {string} alert.message - Alert body
 * @param {string} [alert.created_by] - Member ID who created it
 * @returns {Promise<object|null>} Inserted alert or null
 */
async function createAlert(supabase, alert) {
  const { data, error } = await supabase
    .from('ashram_alerts')
    .insert({
      type: alert.type,
      title: alert.title,
      message: alert.message,
      triggered_by: alert.created_by || null,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('[BROADCAST] Alert insert error:', error.message);
    return null;
  }
  return data;
}

/**
 * Creates a post in the ashram_posts table.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} post
 * @returns {Promise<object|null>}
 */
async function createPost(supabase, post) {
  const { data, error } = await supabase
    .from('ashram_posts')
    .insert({
      member_id: post.member_id,
      type: post.type,
      content: post.content || null,
      photo_url: post.photo_url || null,
      video_url: post.video_url || null,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('[BROADCAST] Post insert error:', error.message);
    return null;
  }
  return data;
}

/**
 * Gets the member record for a telegram user.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} telegramId
 * @returns {Promise<object|null>}
 */
async function getMember(supabase, telegramId) {
  const { data, error } = await supabase
    .from('ashram_members')
    .select('id, name')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (error) {
    console.error('[BROADCAST] Member lookup error:', error.message);
    return null;
  }
  return data;
}

/**
 * Registers all broadcast-related handlers on the bot.
 * @param {import('grammy').Bot} bot - Grammy bot instance
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 */
function registerBroadcastHandlers(bot, supabase) {

  // ─── /satsang — location picker ───────────────────────────
  bot.command('satsang', async (ctx) => {
    try {
      const locationKeyboard = new InlineKeyboard()
        .text('⛺ Tent', 'satsang:Tent')
        .text('☕ Coffee Area', 'satsang:Coffee Area').row()
        .text('🌿 Garden', 'satsang:Garden')
        .text('🏛️ Hall', 'satsang:Hall').row()
        .text('📝 Custom Location', 'satsang:custom');

      await ctx.reply(
        '🕉️ *Satsang Announcement*\n\nWhere is the satsang happening?',
        { parse_mode: 'Markdown', reply_markup: locationKeyboard }
      );
    } catch (err) {
      console.error('[SATSANG] Error:', err);
      await ctx.reply('Could not start satsang announcement. Try again.');
    }
  });

  // ─── Callback for open:satsang from main menu ─────────────
  bot.callbackQuery('open:satsang', async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
      const locationKeyboard = new InlineKeyboard()
        .text('⛺ Tent', 'satsang:Tent')
        .text('☕ Coffee Area', 'satsang:Coffee Area').row()
        .text('🌿 Garden', 'satsang:Garden')
        .text('🏛️ Hall', 'satsang:Hall').row()
        .text('📝 Custom Location', 'satsang:custom');

      await ctx.reply(
        '🕉️ *Satsang Announcement*\n\nWhere is the satsang happening?',
        { parse_mode: 'Markdown', reply_markup: locationKeyboard }
      );
    } catch (err) {
      console.error('[SATSANG] Callback error:', err);
      await ctx.answerCallbackQuery({ text: 'Error.' });
    }
  });

  // ─── Satsang location callback ────────────────────────────
  bot.callbackQuery(/^satsang:(.+)$/, async (ctx) => {
    try {
      const location = ctx.match[1];
      const telegramId = String(ctx.from.id);

      if (location === 'custom') {
        // Ask for custom location text
        satsangState.set(telegramId, { step: 'awaiting_location' });
        await ctx.answerCallbackQuery();
        await ctx.editMessageText(
          '📝 Type the custom satsang location:',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      await ctx.answerCallbackQuery();
      await announceSatsang(ctx, supabase, telegramId, location);

    } catch (err) {
      console.error('[SATSANG] Location callback error:', err);
      await ctx.answerCallbackQuery({ text: 'Error creating satsang.' });
    }
  });

  // ─── Custom satsang location text capture ─────────────────
  bot.on('message:text').filter(
    (ctx) => {
      const telegramId = String(ctx.from.id);
      const state = satsangState.get(telegramId);
      return state && state.step === 'awaiting_location';
    },
    async (ctx) => {
      try {
        const telegramId = String(ctx.from.id);
        const location = ctx.message.text.trim();

        if (location.startsWith('/')) return;
        if (location.length < 1 || location.length > 200) {
          await ctx.reply('Please enter a valid location (1-200 characters).');
          return;
        }

        satsangState.delete(telegramId);
        await announceSatsang(ctx, supabase, telegramId, location);

      } catch (err) {
        console.error('[SATSANG] Custom location error:', err);
        await ctx.reply('Error creating satsang announcement.');
      }
    }
  );

  /**
   * Creates a satsang post and alert.
   * @param {import('grammy').Context} ctx
   * @param {import('@supabase/supabase-js').SupabaseClient} supabase
   * @param {string} telegramId
   * @param {string} location
   */
  async function announceSatsang(ctx, supabase, telegramId, location) {
    const member = await getMember(supabase, telegramId);
    if (!member) {
      await ctx.reply('Please /start first to register.');
      return;
    }

    // Create satsang post
    await createPost(supabase, {
      member_id: member.id,
      type: 'satsang',
      content: `Satsang at ${location}`
    });

    // Create alert
    await createAlert(supabase, {
      type: 'satsang',
      title: '🕉️ Satsang Now!',
      message: `${member.name} invites everyone to satsang at ${location}`,
      created_by: member.id
    });

    await ctx.reply(
      `🕉️ *Satsang Announced!*\n\n` +
      `📍 Location: *${location}*\n` +
      `👤 By: ${member.name}\n\n` +
      `All sangha members have been notified. Hari Om! 🙏`,
      { parse_mode: 'Markdown' }
    );
  }

  // ─── /food — food prayer + alert ──────────────────────────
  bot.command('food', async (ctx) => {
    try {
      await handleFoodPrayer(ctx, supabase);
    } catch (err) {
      console.error('[FOOD] Error:', err);
      await ctx.reply('Could not ring the food bell. Try again.');
    }
  });

  // ─── Callback for open:food from main menu ────────────────
  bot.callbackQuery('open:food', async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
      await handleFoodPrayer(ctx, supabase);
    } catch (err) {
      console.error('[FOOD] Callback error:', err);
      await ctx.answerCallbackQuery({ text: 'Error.' });
    }
  });

  /**
   * Handles the food prayer: creates post, creates alert, sends prayer text.
   * @param {import('grammy').Context} ctx
   * @param {import('@supabase/supabase-js').SupabaseClient} supabase
   */
  async function handleFoodPrayer(ctx, supabase) {
    const telegramId = String(ctx.from.id);
    const member = await getMember(supabase, telegramId);

    if (!member) {
      await ctx.reply('Please /start first to register.');
      return;
    }

    // Create food_prayer post with YouTube video + prayer image
    await createPost(supabase, {
      member_id: member.id,
      type: 'food_prayer',
      content: 'The food bell has been rung! Time for prayer before prasad.',
      photo_url: PRAYER_IMAGE_URL,
      video_url: PRAYER_YOUTUBE_URL
    });

    // Create alert
    await createAlert(supabase, {
      type: 'food_prayer',
      title: '🔔 Food Bell!',
      message: `${member.name} has rung the food bell. Time for Vadani Kaval Gheta before prasad.`,
      created_by: member.id
    });

    // Send prayer text
    await ctx.reply(
      '🔔 *The food bell has been rung!*\n\n' +
      `Rung by: ${member.name}\n\n` +
      'Recite the prayer before prasad:',
      { parse_mode: 'Markdown' }
    );

    await ctx.reply(getFullPrayerText(), { parse_mode: 'Markdown' });
  }

  // ─── /prayer — show prayer text anytime ───────────────────
  bot.command('prayer', async (ctx) => {
    try {
      await ctx.reply(getFullPrayerText(), { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('[PRAYER] Error:', err);
      await ctx.reply('Could not display prayer. Try again.');
    }
  });

  // ─── Callback for open:prayer from main menu ──────────────
  bot.callbackQuery('open:prayer', async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
      await ctx.reply(getFullPrayerText(), { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('[PRAYER] Callback error:', err);
      await ctx.answerCallbackQuery({ text: 'Error.' });
    }
  });
}

module.exports = { registerBroadcastHandlers };
