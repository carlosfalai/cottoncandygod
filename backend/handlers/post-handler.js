/**
 * Post handlers for photo uploads and typed posts (meditation/training).
 * Manages: photo messages, /post command, text capture for posts.
 * @module handlers/post-handler
 */

const { InlineKeyboard } = require('grammy');

/** In-memory state for pending posts keyed by telegram_id */
const pendingPosts = new Map();

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
    console.error('[POST] Member lookup error:', error.message);
    return null;
  }
  return data;
}

/**
 * Downloads a file from Telegram and uploads it to Supabase Storage.
 * @param {import('grammy').Bot} bot - Bot instance (for file API)
 * @param {string} fileId - Telegram file ID
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} memberId - Member UUID for path namespacing
 * @returns {Promise<string|null>} Public URL of uploaded file, or null
 */
async function uploadPhotoToStorage(bot, fileId, supabase, memberId) {
  try {
    // Get file info from Telegram
    const file = await bot.api.getFile(fileId);
    const filePath = file.file_path;

    if (!filePath) {
      console.error('[POST] No file_path from Telegram');
      return null;
    }

    // Download from Telegram
    const token = bot.token;
    const downloadUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

    const response = await fetch(downloadUrl);
    if (!response.ok) {
      console.error('[POST] Download failed:', response.status);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine extension
    const ext = filePath.split('.').pop() || 'jpg';
    const fileName = `${memberId}/${Date.now()}.${ext}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('ashram-photos')
      .upload(fileName, buffer, {
        contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        upsert: false
      });

    if (error) {
      console.error('[POST] Storage upload error:', error.message);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('ashram-photos')
      .getPublicUrl(data.path);

    return urlData.publicUrl;

  } catch (err) {
    console.error('[POST] Upload error:', err);
    return null;
  }
}

/**
 * Registers all post-related handlers on the bot.
 * @param {import('grammy').Bot} bot - Grammy bot instance
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 */
function registerPostHandlers(bot, supabase) {

  // ─── Photo handler ────────────────────────────────────────
  bot.on('message:photo', async (ctx) => {
    try {
      const telegramId = String(ctx.from.id);
      const member = await getMember(supabase, telegramId);

      if (!member) {
        await ctx.reply('Please /start first to register before posting photos.');
        return;
      }

      // Get the largest photo (last in the array)
      const photos = ctx.message.photo;
      const largestPhoto = photos[photos.length - 1];

      await ctx.reply('📸 Uploading your photo...');

      // Upload to Supabase Storage
      const publicUrl = await uploadPhotoToStorage(
        bot, largestPhoto.file_id, supabase, member.id
      );

      if (!publicUrl) {
        await ctx.reply('Failed to upload photo. Please try again.');
        return;
      }

      // Create post with image
      const caption = ctx.message.caption || '';
      const { data: post, error } = await supabase
        .from('ashram_posts')
        .insert({
          member_id: member.id,
          type: 'photo',
          content: caption || null,
          photo_url: publicUrl,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('[POST] Photo post insert error:', error.message);
        await ctx.reply('Photo uploaded but failed to create post. Try again.');
        return;
      }

      await ctx.reply(
        `📸 *Photo posted!*\n\n` +
        `By: ${member.name}\n` +
        (caption ? `Caption: _${caption}_\n` : '') +
        `\nYour photo is now visible to the sangha. 🙏`,
        { parse_mode: 'Markdown' }
      );

    } catch (err) {
      console.error('[POST] Photo handler error:', err);
      await ctx.reply('An error occurred while processing your photo.');
    }
  });

  // ─── /post command — type picker ──────────────────────────
  bot.command('post', async (ctx) => {
    try {
      await showPostMenu(ctx);
    } catch (err) {
      console.error('[POST] Menu error:', err);
      await ctx.reply('Could not show post menu. Try again.');
    }
  });

  // ─── Callback for open:post from main menu ────────────────
  bot.callbackQuery('open:post', async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
      await showPostMenu(ctx);
    } catch (err) {
      console.error('[POST] Open callback error:', err);
      await ctx.answerCallbackQuery({ text: 'Error.' });
    }
  });

  /**
   * Shows the post type selection keyboard.
   * @param {import('grammy').Context} ctx
   */
  async function showPostMenu(ctx) {
    const keyboard = new InlineKeyboard()
      .text('🧘 Meditation', 'post_type:meditation')
      .text('💪 Training', 'post_type:training');

    await ctx.reply(
      '📝 *New Post*\n\nWhat type of post?',
      { parse_mode: 'Markdown', reply_markup: keyboard }
    );
  }

  // ─── Post type selection callback ─────────────────────────
  bot.callbackQuery(/^post_type:(meditation|training)$/, async (ctx) => {
    try {
      const postType = ctx.match[1];
      const telegramId = String(ctx.from.id);

      pendingPosts.set(telegramId, { step: 'awaiting_text', type: postType });

      const emoji = postType === 'meditation' ? '🧘' : '💪';
      await ctx.answerCallbackQuery();
      await ctx.editMessageText(
        `${emoji} *${postType.charAt(0).toUpperCase() + postType.slice(1)} Post*\n\n` +
        `Type your message now:`,
        { parse_mode: 'Markdown' }
      );

    } catch (err) {
      console.error('[POST] Type selection error:', err);
      await ctx.answerCallbackQuery({ text: 'Error.' });
    }
  });

  // ─── Text capture for pending posts ───────────────────────
  bot.on('message:text').filter(
    (ctx) => {
      const telegramId = String(ctx.from.id);
      const state = pendingPosts.get(telegramId);
      return state && state.step === 'awaiting_text';
    },
    async (ctx) => {
      try {
        const telegramId = String(ctx.from.id);
        const state = pendingPosts.get(telegramId);
        const text = ctx.message.text.trim();

        if (text.startsWith('/')) return;
        if (text.length < 1 || text.length > 2000) {
          await ctx.reply('Please keep your post between 1 and 2000 characters.');
          return;
        }

        const member = await getMember(supabase, telegramId);
        if (!member) {
          pendingPosts.delete(telegramId);
          await ctx.reply('Please /start first to register.');
          return;
        }

        // Create post
        const { data: post, error } = await supabase
          .from('ashram_posts')
          .insert({
            member_id: member.id,
            type: state.type,
            content: text,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        // Clear pending state
        pendingPosts.delete(telegramId);

        if (error) {
          console.error('[POST] Text post insert error:', error.message);
          await ctx.reply('Failed to create post. Try again.');
          return;
        }

        const emoji = state.type === 'meditation' ? '🧘' : '💪';
        await ctx.reply(
          `${emoji} *${state.type.charAt(0).toUpperCase() + state.type.slice(1)} post created!*\n\n` +
          `By: ${member.name}\n` +
          `"${text.length > 100 ? text.substring(0, 100) + '...' : text}"\n\n` +
          `Your post is now visible to the sangha. 🙏`,
          { parse_mode: 'Markdown' }
        );

      } catch (err) {
        console.error('[POST] Text capture error:', err);
        pendingPosts.delete(String(ctx.from.id));
        await ctx.reply('Error creating post. Try /post again.');
      }
    }
  );
}

module.exports = { registerPostHandlers };
