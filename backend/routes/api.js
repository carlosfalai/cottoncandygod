/**
 * REST API routes for the Sangha web/app frontend.
 * Feed, alerts, reactions, comments, seva tracking, registration.
 * @module routes/api
 */

/**
 * Mounts all API routes onto the Express app.
 * @param {import('express').Application} app - Express app
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 */
function mountApiRoutes(app, supabase) {

  // ─── GET /api/sangha/feed ─────────────────────────────────
  // Returns posts with member info, reaction count, comment count.
  app.get('/api/sangha/feed', async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const offset = parseInt(req.query.offset) || 0;

      // Fetch posts with member join
      const { data: posts, error } = await supabase
        .from('ashram_posts')
        .select(`
          id,
          type,
          content,
          photo_url,
          video_url,
          created_at,
          member_id,
          ashram_members!inner(id, name, mode)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('[API] Feed error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch feed' });
      }

      // For each post, get reaction count and comment count
      const enriched = await Promise.all(posts.map(async (post) => {
        // Reaction count
        const { count: reactionCount } = await supabase
          .from('ashram_reactions')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        // Comment count
        const { count: commentCount } = await supabase
          .from('ashram_comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        return {
          id: post.id,
          type: post.type,
          content: post.content,
          photo_url: post.photo_url,
          video_url: post.video_url,
          created_at: post.created_at,
          member: post.ashram_members,
          reaction_count: reactionCount || 0,
          comment_count: commentCount || 0
        };
      }));

      res.json({ posts: enriched, count: enriched.length });

    } catch (err) {
      console.error('[API] Feed error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── GET /api/sangha/alerts ───────────────────────────────
  // Returns last 10 alerts.
  app.get('/api/sangha/alerts', async (req, res) => {
    try {
      const { data: alerts, error } = await supabase
        .from('ashram_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('[API] Alerts error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch alerts' });
      }

      res.json({ alerts: alerts || [] });

    } catch (err) {
      console.error('[API] Alerts error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── POST /api/sangha/react ───────────────────────────────
  // Upsert a reaction (one reaction per member per post).
  app.post('/api/sangha/react', async (req, res) => {
    try {
      const { member_id, post_id, type } = req.body;

      if (!member_id || !post_id) {
        return res.status(400).json({ error: 'member_id and post_id required' });
      }

      const reactionValue = type || 'heart';

      // Upsert: one reaction per member per post
      const { data, error } = await supabase
        .from('ashram_reactions')
        .upsert(
          {
            member_id,
            post_id,
            type: reactionValue,
            created_at: new Date().toISOString()
          },
          { onConflict: 'member_id,post_id' }
        )
        .select()
        .single();

      if (error) {
        console.error('[API] React error:', error.message);
        return res.status(500).json({ error: 'Failed to save reaction' });
      }

      res.json({ reaction: data });

    } catch (err) {
      console.error('[API] React error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── DELETE /api/sangha/react ─────────────────────────────
  // Remove a reaction.
  app.delete('/api/sangha/react', async (req, res) => {
    try {
      const { member_id, post_id } = req.body;

      if (!member_id || !post_id) {
        return res.status(400).json({ error: 'member_id and post_id required' });
      }

      const { error } = await supabase
        .from('ashram_reactions')
        .delete()
        .eq('member_id', member_id)
        .eq('post_id', post_id);

      if (error) {
        console.error('[API] Remove reaction error:', error.message);
        return res.status(500).json({ error: 'Failed to remove reaction' });
      }

      res.json({ removed: true });

    } catch (err) {
      console.error('[API] Remove reaction error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── POST /api/sangha/comment ─────────────────────────────
  // Add a comment to a post.
  app.post('/api/sangha/comment', async (req, res) => {
    try {
      const { member_id, post_id, content } = req.body;

      if (!member_id || !post_id || !content) {
        return res.status(400).json({ error: 'member_id, post_id, and content required' });
      }

      if (content.length > 2000) {
        return res.status(400).json({ error: 'Comment too long (max 2000 chars)' });
      }

      const { data, error } = await supabase
        .from('ashram_comments')
        .insert({
          member_id,
          post_id,
          content: content.trim(),
          created_at: new Date().toISOString()
        })
        .select(`
          id,
          content,
          created_at,
          ashram_members!inner(id, name)
        `)
        .single();

      if (error) {
        console.error('[API] Comment error:', error.message);
        return res.status(500).json({ error: 'Failed to add comment' });
      }

      res.json({ comment: data });

    } catch (err) {
      console.error('[API] Comment error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── GET /api/sangha/comments/:postId ─────────────────────
  // Get comments for a post.
  app.get('/api/sangha/comments/:postId', async (req, res) => {
    try {
      const { postId } = req.params;

      const { data: comments, error } = await supabase
        .from('ashram_comments')
        .select(`
          id,
          content,
          created_at,
          ashram_members!inner(id, name)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[API] Comments error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch comments' });
      }

      res.json({ comments: comments || [] });

    } catch (err) {
      console.error('[API] Comments error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── GET /api/sangha/seva/today ───────────────────────────
  // Get today's seva activity.
  app.get('/api/sangha/seva/today', async (req, res) => {
    try {
      // Start of today UTC
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      const { data: sevaRecords, error } = await supabase
        .from('ashram_seva')
        .select(`
          id,
          seva_type,
          checked_in_at,
          checked_out_at,
          duration_minutes,
          ashram_members!inner(id, name, mode)
        `)
        .gte('checked_in_at', todayStart.toISOString())
        .order('checked_in_at', { ascending: false });

      if (error) {
        console.error('[API] Seva today error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch seva data' });
      }

      // Calculate totals by type
      const byType = {};
      for (const record of (sevaRecords || [])) {
        if (!byType[record.seva_type]) {
          byType[record.seva_type] = {
            type: record.seva_type,
            total_minutes: 0,
            active_count: 0,
            completed_count: 0,
            members: []
          };
        }
        const group = byType[record.seva_type];
        if (record.checked_out_at) {
          group.completed_count++;
          group.total_minutes += record.duration_minutes || 0;
        } else {
          group.active_count++;
        }
        group.members.push({
          name: record.ashram_members.name,
          checked_in_at: record.checked_in_at,
          checked_out_at: record.checked_out_at,
          duration_minutes: record.duration_minutes
        });
      }

      res.json({
        date: todayStart.toISOString().substring(0, 10),
        records: sevaRecords || [],
        summary: Object.values(byType)
      });

    } catch (err) {
      console.error('[API] Seva today error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── POST /api/sangha/register ────────────────────────────
  // Register a member from the web app (no Telegram required).
  app.post('/api/sangha/register', async (req, res) => {
    try {
      const { name, mode, telegram_id } = req.body;

      if (!name || !mode) {
        return res.status(400).json({ error: 'name and mode required' });
      }

      if (!['physical', 'remote'].includes(mode)) {
        return res.status(400).json({ error: 'mode must be physical or remote' });
      }

      // Check for existing member by telegram_id if provided
      if (telegram_id) {
        const { data: existing } = await supabase
          .from('ashram_members')
          .select('id')
          .eq('telegram_id', String(telegram_id))
          .maybeSingle();

        if (existing) {
          return res.status(409).json({ error: 'Member already registered with this Telegram ID' });
        }
      }

      const { data: member, error } = await supabase
        .from('ashram_members')
        .insert({
          name: name.trim(),
          mode,
          telegram_id: telegram_id ? String(telegram_id) : null,
          joined_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('[API] Register error:', error.message);
        return res.status(500).json({ error: 'Failed to register member' });
      }

      res.status(201).json({ member });

    } catch (err) {
      console.error('[API] Register error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}

module.exports = mountApiRoutes;
