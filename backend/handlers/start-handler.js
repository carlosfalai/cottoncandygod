/**
 * Start and onboarding handlers for the Siddhanath Ashram Sangha bot.
 * Manages: /start, /time, /mode, name capture, mode selection.
 * @module handlers/start-handler
 */

const { InlineKeyboard } = require('grammy');

/** In-memory onboarding state keyed by telegram_id */
const onboardingState = new Map();

/**
 * Builds the main menu inline keyboard shown after onboarding.
 * @returns {InlineKeyboard}
 */
function mainMenuKeyboard() {
  return new InlineKeyboard()
    .text('🪔 Seva Check-in', 'open:seva')
    .text('📸 Post Photo', 'open:post').row()
    .text('🍽️ Food Prayer', 'open:food')
    .text('🕉️ Satsang', 'open:satsang').row()
    .text('🙏 Prayer Text', 'open:prayer')
    .text('🕐 Ashram Time', 'open:time');
}

/**
 * Registers all start/onboarding handlers on the bot.
 * @param {import('grammy').Bot} bot - Grammy bot instance
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 */
function registerStartHandlers(bot, supabase) {

  // ─── /start ───────────────────────────────────────────────
  bot.command('start', async (ctx) => {
    try {
      const telegramId = String(ctx.from.id);

      // Check if member already exists
      const { data: member, error } = await supabase
        .from('ashram_members')
        .select('*')
        .eq('telegram_id', telegramId)
        .maybeSingle();

      if (error) {
        console.error('[START] DB error:', error.message);
        await ctx.reply('Something went wrong. Please try again.');
        return;
      }

      if (member) {
        // Existing member - welcome back
        const modeEmoji = member.mode === 'physical' ? '🏕️' : '🌐';
        await ctx.reply(
          `🙏 Hari Om, *${member.name}*!\n\n` +
          `Welcome back to the Siddhanath Ashram Sangha.\n` +
          `Mode: ${modeEmoji} ${member.mode === 'physical' ? 'Physical (at ashram)' : 'Remote (online)'}\n\n` +
          `What would you like to do?`,
          { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard() }
        );
        return;
      }

      // New member - start onboarding
      onboardingState.set(telegramId, { step: 'awaiting_name' });

      await ctx.reply(
        '🙏 *Hari Om! Welcome to the Siddhanath Ashram Sangha.*\n\n' +
        'This bot connects ashram residents and remote devotees.\n\n' +
        'What is your name? (spiritual or given name)',
        { parse_mode: 'Markdown' }
      );

    } catch (err) {
      console.error('[START] Error:', err);
      await ctx.reply('An error occurred. Please try /start again.');
    }
  });

  // ─── Name capture (text during onboarding) ───────────────
  bot.on('message:text').filter(
    (ctx) => {
      const telegramId = String(ctx.from.id);
      const state = onboardingState.get(telegramId);
      return state && state.step === 'awaiting_name';
    },
    async (ctx) => {
      try {
        const telegramId = String(ctx.from.id);
        const name = ctx.message.text.trim();

        if (name.length < 1 || name.length > 100) {
          await ctx.reply('Please enter a valid name (1-100 characters).');
          return;
        }

        // If message looks like a command, ignore
        if (name.startsWith('/')) return;

        // Store name in onboarding state and ask for mode
        onboardingState.set(telegramId, { step: 'awaiting_mode', name });

        const modeKeyboard = new InlineKeyboard()
          .text('🏕️ Physical (at the ashram)', 'mode:physical').row()
          .text('🌐 Remote (online devotee)', 'mode:remote');

        await ctx.reply(
          `Namaste, *${name}*! 🙏\n\nAre you physically at the ashram or joining remotely?`,
          { parse_mode: 'Markdown', reply_markup: modeKeyboard }
        );

      } catch (err) {
        console.error('[START] Name capture error:', err);
        await ctx.reply('Something went wrong. Please try /start again.');
      }
    }
  );

  // ─── Mode selection callbacks ─────────────────────────────
  bot.callbackQuery(/^mode:(physical|remote)$/, async (ctx) => {
    try {
      const telegramId = String(ctx.from.id);
      const mode = ctx.match[1];
      const state = onboardingState.get(telegramId);

      if (!state || !state.name) {
        await ctx.answerCallbackQuery({ text: 'Session expired. Use /start again.' });
        return;
      }

      // Insert new member
      const { data: member, error } = await supabase
        .from('ashram_members')
        .insert({
          telegram_id: telegramId,
          name: state.name,
          mode: mode,
          joined_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('[START] Insert error:', error.message);
        await ctx.answerCallbackQuery({ text: 'Registration failed. Try /start again.' });
        return;
      }

      // Clear onboarding state
      onboardingState.delete(telegramId);

      const modeEmoji = mode === 'physical' ? '🏕️' : '🌐';
      await ctx.answerCallbackQuery({ text: 'Welcome to the Sangha!' });
      await ctx.editMessageText(
        `✅ *Welcome to the Sangha, ${state.name}!*\n\n` +
        `Mode: ${modeEmoji} ${mode === 'physical' ? 'Physical (at ashram)' : 'Remote (online)'}\n\n` +
        `You are now part of the Siddhanath Ashram community.\n` +
        `Use the menu below to get started:`,
        { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard() }
      );

    } catch (err) {
      console.error('[START] Mode selection error:', err);
      await ctx.answerCallbackQuery({ text: 'Error occurred. Try /start.' });
    }
  });

  // ─── /time ────────────────────────────────────────────────
  bot.command('time', async (ctx) => {
    try {
      const now = new Date();

      // IST is UTC+5:30
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(now.getTime() + istOffset);
      const istStr = istDate.toISOString().replace('T', ' ').substring(0, 19);

      const utcStr = now.toISOString().replace('T', ' ').substring(0, 19);

      await ctx.reply(
        '🕐 *Ashram Time*\n\n' +
        `🇮🇳 IST: \`${istStr}\`\n` +
        `🌍 UTC: \`${utcStr}\``,
        { parse_mode: 'Markdown' }
      );

    } catch (err) {
      console.error('[TIME] Error:', err);
      await ctx.reply('Could not fetch time. Try again.');
    }
  });

  // ─── Callback for open:time ───────────────────────────────
  bot.callbackQuery('open:time', async (ctx) => {
    try {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(now.getTime() + istOffset);
      const istStr = istDate.toISOString().replace('T', ' ').substring(0, 19);
      const utcStr = now.toISOString().replace('T', ' ').substring(0, 19);

      await ctx.answerCallbackQuery();
      await ctx.reply(
        '🕐 *Ashram Time*\n\n' +
        `🇮🇳 IST: \`${istStr}\`\n` +
        `🌍 UTC: \`${utcStr}\``,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error('[TIME] Callback error:', err);
      await ctx.answerCallbackQuery({ text: 'Error fetching time.' });
    }
  });

  // ─── /mode ────────────────────────────────────────────────
  bot.command('mode', async (ctx) => {
    try {
      const telegramId = String(ctx.from.id);

      const { data: member, error } = await supabase
        .from('ashram_members')
        .select('id, mode')
        .eq('telegram_id', telegramId)
        .maybeSingle();

      if (error || !member) {
        await ctx.reply('You need to /start first to register.');
        return;
      }

      const newMode = member.mode === 'physical' ? 'remote' : 'physical';

      const { error: updateError } = await supabase
        .from('ashram_members')
        .update({ mode: newMode })
        .eq('id', member.id);

      if (updateError) {
        console.error('[MODE] Update error:', updateError.message);
        await ctx.reply('Failed to switch mode. Try again.');
        return;
      }

      const emoji = newMode === 'physical' ? '🏕️' : '🌐';
      await ctx.reply(
        `${emoji} Mode switched to *${newMode === 'physical' ? 'Physical (at ashram)' : 'Remote (online)'}*`,
        { parse_mode: 'Markdown' }
      );

    } catch (err) {
      console.error('[MODE] Error:', err);
      await ctx.reply('Could not switch mode. Try again.');
    }
  });
}

module.exports = { registerStartHandlers };
