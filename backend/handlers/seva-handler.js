/**
 * Seva (selfless service) handlers for check-in/check-out tracking.
 * Manages: /seva command, check-in, check-out, history.
 * @module handlers/seva-handler
 */

const { InlineKeyboard } = require('grammy');
const SEVA_TYPES = require('../utils/seva-types');

/**
 * Formats a duration in minutes into a human-readable string.
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration (e.g. "2h 15m")
 */
function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Registers all seva-related handlers on the bot.
 * @param {import('grammy').Bot} bot - Grammy bot instance
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 */
function registerSevaHandlers(bot, supabase) {

  // ─── /seva command — show seva grid ────────────────────────
  bot.command('seva', async (ctx) => {
    try {
      await showSevaMenu(ctx);
    } catch (err) {
      console.error('[SEVA] Menu error:', err);
      await ctx.reply('Could not load seva menu. Try again.');
    }
  });

  // ─── Callback for open:seva from main menu ────────────────
  bot.callbackQuery('open:seva', async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
      await showSevaMenu(ctx);
    } catch (err) {
      console.error('[SEVA] Open callback error:', err);
      await ctx.answerCallbackQuery({ text: 'Error loading seva menu.' });
    }
  });

  /**
   * Shows the seva type selection grid.
   * @param {import('grammy').Context} ctx
   */
  async function showSevaMenu(ctx) {
    const keyboard = new InlineKeyboard();

    // Build 2-column grid
    for (let i = 0; i < SEVA_TYPES.length; i += 2) {
      const a = SEVA_TYPES[i];
      keyboard.text(`${a.emoji} ${a.name.split('(')[0].trim()}`, `seva:${a.id}`);

      if (i + 1 < SEVA_TYPES.length) {
        const b = SEVA_TYPES[i + 1];
        keyboard.text(`${b.emoji} ${b.name.split('(')[0].trim()}`, `seva:${b.id}`);
      }
      keyboard.row();
    }

    // History button
    keyboard.text('📜 Seva History', 'seva:history');

    await ctx.reply(
      '🪔 *Seva Check-in / Check-out*\n\n' +
      'Select a seva type to check in or check out:',
      { parse_mode: 'Markdown', reply_markup: keyboard }
    );
  }

  // ─── Seva type callback — check in or out ─────────────────
  bot.callbackQuery(/^seva:(?!history)(.+)$/, async (ctx) => {
    try {
      const sevaId = ctx.match[1];
      const telegramId = String(ctx.from.id);
      const sevaType = SEVA_TYPES.find(s => s.id === sevaId);

      if (!sevaType) {
        await ctx.answerCallbackQuery({ text: 'Unknown seva type.' });
        return;
      }

      // Get member
      const { data: member, error: memberErr } = await supabase
        .from('ashram_members')
        .select('id, name')
        .eq('telegram_id', telegramId)
        .maybeSingle();

      if (memberErr || !member) {
        await ctx.answerCallbackQuery({ text: 'Please /start first to register.' });
        return;
      }

      // Check for active seva of this type
      const { data: activeSeva, error: activeErr } = await supabase
        .from('ashram_seva')
        .select('*')
        .eq('member_id', member.id)
        .eq('seva_type', sevaId)
        .is('checked_out_at', null)
        .maybeSingle();

      if (activeErr) {
        console.error('[SEVA] Active check error:', activeErr.message);
        await ctx.answerCallbackQuery({ text: 'Database error. Try again.' });
        return;
      }

      if (activeSeva) {
        // Already checked in — offer checkout
        const confirmKeyboard = new InlineKeyboard()
          .text('✅ Yes, Check Out', `seva_out:${sevaId}`)
          .text('❌ Cancel', 'seva:cancel');

        await ctx.answerCallbackQuery();
        await ctx.editMessageText(
          `${sevaType.emoji} You are currently checked into *${sevaType.name}*.\n\n` +
          `Checked in at: \`${activeSeva.checked_in_at.substring(0, 19)}\`\n\n` +
          `Check out now?`,
          { parse_mode: 'Markdown', reply_markup: confirmKeyboard }
        );
        return;
      }

      // Not checked in — create new seva record
      const { error: insertErr } = await supabase
        .from('ashram_seva')
        .insert({
          member_id: member.id,
          seva_type: sevaId,
          checked_in_at: new Date().toISOString()
        });

      if (insertErr) {
        console.error('[SEVA] Check-in error:', insertErr.message);
        await ctx.answerCallbackQuery({ text: 'Check-in failed. Try again.' });
        return;
      }

      await ctx.answerCallbackQuery({ text: `Checked in to ${sevaType.name}!` });
      await ctx.editMessageText(
        `${sevaType.emoji} *Checked in to ${sevaType.name}!*\n\n` +
        `Hari Om, ${member.name}. Your seva has begun.\n` +
        `Use /seva to check out when you are done.`,
        { parse_mode: 'Markdown' }
      );

    } catch (err) {
      console.error('[SEVA] Check-in/out error:', err);
      await ctx.answerCallbackQuery({ text: 'An error occurred.' });
    }
  });

  // ─── Seva checkout confirmation ───────────────────────────
  bot.callbackQuery(/^seva_out:(.+)$/, async (ctx) => {
    try {
      const sevaId = ctx.match[1];
      const telegramId = String(ctx.from.id);
      const sevaType = SEVA_TYPES.find(s => s.id === sevaId);

      // Get member
      const { data: member } = await supabase
        .from('ashram_members')
        .select('id, name')
        .eq('telegram_id', telegramId)
        .maybeSingle();

      if (!member) {
        await ctx.answerCallbackQuery({ text: 'Member not found.' });
        return;
      }

      // Find active seva
      const { data: activeSeva } = await supabase
        .from('ashram_seva')
        .select('*')
        .eq('member_id', member.id)
        .eq('seva_type', sevaId)
        .is('checked_out_at', null)
        .maybeSingle();

      if (!activeSeva) {
        await ctx.answerCallbackQuery({ text: 'No active seva found.' });
        return;
      }

      const now = new Date();
      const checkedIn = new Date(activeSeva.checked_in_at);
      const durationMs = now - checkedIn;
      const durationMinutes = Math.round(durationMs / 60000);

      // Update record with checkout
      const { error: updateErr } = await supabase
        .from('ashram_seva')
        .update({
          checked_out_at: now.toISOString(),
          duration_minutes: durationMinutes
        })
        .eq('id', activeSeva.id);

      if (updateErr) {
        console.error('[SEVA] Checkout error:', updateErr.message);
        await ctx.answerCallbackQuery({ text: 'Checkout failed. Try again.' });
        return;
      }

      await ctx.answerCallbackQuery({ text: 'Checked out!' });
      await ctx.editMessageText(
        `✅ *Checked out of ${sevaType.emoji} ${sevaType.name}*\n\n` +
        `Duration: *${formatDuration(durationMinutes)}*\n` +
        `Thank you for your seva, ${member.name}! 🙏`,
        { parse_mode: 'Markdown' }
      );

    } catch (err) {
      console.error('[SEVA] Checkout error:', err);
      await ctx.answerCallbackQuery({ text: 'An error occurred.' });
    }
  });

  // ─── Cancel callback ─────────────────────────────────────
  bot.callbackQuery('seva:cancel', async (ctx) => {
    try {
      await ctx.answerCallbackQuery({ text: 'Cancelled.' });
      await ctx.editMessageText('Seva action cancelled. Use /seva to try again.');
    } catch (err) {
      console.error('[SEVA] Cancel error:', err);
    }
  });

  // ─── Seva history ─────────────────────────────────────────
  bot.callbackQuery('seva:history', async (ctx) => {
    try {
      const telegramId = String(ctx.from.id);

      const { data: member } = await supabase
        .from('ashram_members')
        .select('id, name')
        .eq('telegram_id', telegramId)
        .maybeSingle();

      if (!member) {
        await ctx.answerCallbackQuery({ text: 'Please /start first.' });
        return;
      }

      const { data: records, error } = await supabase
        .from('ashram_seva')
        .select('*')
        .eq('member_id', member.id)
        .order('checked_in_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('[SEVA] History error:', error.message);
        await ctx.answerCallbackQuery({ text: 'Could not load history.' });
        return;
      }

      if (!records || records.length === 0) {
        await ctx.answerCallbackQuery();
        await ctx.editMessageText(
          '📜 *Seva History*\n\nNo seva records yet. Start serving with /seva!',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const lines = records.map((r, i) => {
        const type = SEVA_TYPES.find(s => s.id === r.seva_type);
        const emoji = type ? type.emoji : '🪔';
        const name = type ? type.name.split('(')[0].trim() : r.seva_type;
        const date = r.checked_in_at.substring(0, 10);
        const duration = r.duration_minutes
          ? formatDuration(r.duration_minutes)
          : '⏳ active';
        return `${i + 1}. ${emoji} ${name} — ${date} — ${duration}`;
      });

      await ctx.answerCallbackQuery();
      await ctx.editMessageText(
        `📜 *Seva History for ${member.name}*\n\n` +
        lines.join('\n'),
        { parse_mode: 'Markdown' }
      );

    } catch (err) {
      console.error('[SEVA] History error:', err);
      await ctx.answerCallbackQuery({ text: 'An error occurred.' });
    }
  });
}

module.exports = { registerSevaHandlers };
