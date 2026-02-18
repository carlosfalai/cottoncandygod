/**
 * Seva Sangha — Community Feed with Real-Time Posts
 * Posts, reactions, comments via Supabase real-time + backend API.
 */

(function() {
  const API_BASE = location.hostname === 'localhost'
    ? 'http://localhost:3009'
    : 'https://siddhanath-ashram-sangha.onrender.com';

  let feed = [];
  let alerts = [];
  let sanghaUser = loadUser();

  function loadUser() {
    try {
      const saved = localStorage.getItem('seva-sangha-user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  }

  function saveUser() {
    localStorage.setItem('seva-sangha-user', JSON.stringify(sanghaUser));
  }

  function esc(s) { return SevaUtils ? SevaUtils.escapeHtml(s) : s; }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  async function loadFeed() {
    try {
      const resp = await fetch(`${API_BASE}/api/sangha/feed`);
      if (!resp.ok) throw new Error('Feed failed');
      const data = await resp.json();
      feed = data.posts || [];
      rerender();
    } catch (e) {
      console.warn('[Sangha] Feed load failed:', e.message);
    }
  }

  function renderPost(post) {
    const member = post.member || {};
    const icon = member.mode === 'physical' ? '🏕️' : '🌐';
    const typeEmojis = { photo: '📸', meditation: '🧘', training: '💪', satsang: '🕉️', food_prayer: '🔔', broadcast: '📣' };
    const typeEmoji = typeEmojis[post.type] || '📝';

    return `
      <div class="seva-card sangha-post">
        <div class="post-header">
          <span class="post-author">${icon} ${esc(member.name || 'Sangha Member')}</span>
          <span class="post-time">${timeAgo(post.created_at)}</span>
        </div>
        <div class="post-type">${typeEmoji} ${esc(String(post.type || '').replace('_', ' '))}</div>
        ${post.content ? `<div class="post-content">${esc(post.content)}</div>` : ''}
        ${post.photo_url && /^https?:\/\//.test(post.photo_url)
          ? `<img src="${esc(post.photo_url)}" class="post-photo" alt="Photo" loading="lazy">`
          : ''}
        <div class="post-actions">
          <button class="react-btn" data-sangha-react="${post.id}" data-type="heart">❤️ ${post.reaction_count || 0}</button>
          <button class="react-btn" data-sangha-react="${post.id}" data-type="prayer">🙏</button>
          <button class="react-btn" data-sangha-comment="${post.id}">💬 ${post.comment_count || 0}</button>
          <button class="react-btn" data-sangha-share="${encodeURIComponent(post.content || 'Hari Om from the Ashram!')}">📲 Share</button>
        </div>
      </div>
    `;
  }

  function render() {
    return `
      <div class="seva-sangha-module">
        <div class="seva-section-header">
          <div>
            <h2>Ashram Sangha</h2>
            <p>Community feed — what's happening at the ashram and among Hamsas</p>
          </div>
          ${!sanghaUser ? `
            <button class="seva-btn" id="sangha-join-btn">Join the Sangha</button>
          ` : `
            <span class="sangha-user-badge">
              ${sanghaUser.mode === 'physical' ? '🏕️' : '🌐'} ${esc(sanghaUser.name || '')}
            </span>
          `}
        </div>

        <div id="sangha-feed-container">
          ${feed.length === 0
            ? '<div class="seva-empty-state">No posts yet. Join the sangha via Telegram @siddhanath_ashram_bot</div>'
            : feed.map(renderPost).join('')
          }
        </div>
      </div>

      <style>
        .sangha-user-badge {
          padding: 6px 14px; background: var(--surface);
          border: 1px solid var(--primary); border-radius: 20px;
          font-size: 0.85rem; color: var(--primary); font-weight: 500;
        }
        .post-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 8px;
        }
        .post-author { font-weight: 600; font-size: 0.9rem; }
        .post-time { font-size: 0.8rem; color: var(--text-light); }
        .post-type {
          display: inline-block; padding: 2px 10px; background: rgba(17,119,67,0.08);
          border-radius: 12px; font-size: 0.8rem; margin-bottom: 10px; text-transform: capitalize;
        }
        .post-content { font-size: 0.95rem; line-height: 1.6; margin-bottom: 10px; }
        .post-photo {
          width: 100%; max-height: 400px; object-fit: cover;
          border-radius: 8px; margin-bottom: 10px;
        }
        .post-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .react-btn {
          padding: 4px 12px; border: 1px solid var(--border);
          border-radius: 16px; background: white; cursor: pointer;
          font-size: 0.8rem; transition: all 0.2s;
        }
        .react-btn:hover { background: var(--surface); }
      </style>
    `;
  }

  function rerender() {
    const container = document.getElementById('sangha-feed-container');
    if (container) {
      container.innerHTML = feed.length === 0
        ? '<div class="seva-empty-state">No posts yet.</div>'
        : feed.map(renderPost).join('');
    }
  }

  async function register() {
    const name = prompt('Enter your name (spiritual or given):');
    if (!name) return;
    const mode = confirm('Are you physically at the ashram?\n\nOK = Physical\nCancel = Remote') ? 'physical' : 'remote';

    try {
      const resp = await fetch(`${API_BASE}/api/sangha/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mode })
      });
      if (!resp.ok) throw new Error('Registration failed');
      const data = await resp.json();
      sanghaUser = { id: data.member.id, name: data.member.name, mode: data.member.mode };
      saveUser();
      // Re-activate module to refresh UI
      if (window._sevaCore) window._sevaCore.activateModule('sangha');
    } catch (e) {
      alert('Registration failed. Try again.');
    }
  }

  async function react(postId, type) {
    if (!sanghaUser) { alert('Join the sangha first.'); return; }
    try {
      await fetch(`${API_BASE}/api/sangha/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: sanghaUser.id, post_id: postId, type })
      });
      loadFeed();
    } catch (e) { console.error('[Sangha] React error:', e); }
  }

  async function comment(postId) {
    if (!sanghaUser) { alert('Join the sangha first.'); return; }
    const content = prompt('Your comment:');
    if (!content) return;
    try {
      await fetch(`${API_BASE}/api/sangha/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: sanghaUser.id, post_id: postId, content })
      });
      loadFeed();
    } catch (e) { console.error('[Sangha] Comment error:', e); }
  }

  function initListeners() {
    loadFeed();

    const joinBtn = document.getElementById('sangha-join-btn');
    if (joinBtn) joinBtn.addEventListener('click', register);

    document.getElementById('seva-module-container')?.addEventListener('click', (e) => {
      const reactBtn = e.target.closest('[data-sangha-react]');
      if (reactBtn) {
        react(reactBtn.dataset.sanghaReact, reactBtn.dataset.type);
        return;
      }
      const commentBtn = e.target.closest('[data-sangha-comment]');
      if (commentBtn) {
        comment(commentBtn.dataset.sanghaComment);
        return;
      }
      const shareBtn = e.target.closest('[data-sangha-share]');
      if (shareBtn) {
        const text = decodeURIComponent(shareBtn.dataset.sanghaShare);
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      }
    });
  }

  if (window.SevaRegistry) {
    SevaRegistry.register('sangha', {
      name: 'Sangha Feed',
      emoji: '🙏',
      order: 20,
      render,
      init: initListeners,
    });
  }
})();
