/**
 * Seva Tasks — System 2
 * Hamsas claim and complete ashram seva tasks.
 */

(function() {
  const SUPABASE_URL = 'https://gbxksgxezbljwlnlpkpz.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieGtzZ3hlemJsandsbmxwa3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NTE1ODksImV4cCI6MjA2NDMyNzU4OX0.MCZ9NTKCUe8DLwXz8Cy2-Qr-KYPpq-tn376dpjQ6HxM';

  let tasks = [];
  let activeFilter = 'open';
  let container = null;

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function riskBadge(level) {
    if (level === 1) return '<span class="task-risk-badge risk-low">🟢 Anyone</span>';
    if (level === 2) return '<span class="task-risk-badge risk-skilled">🟡 Skilled</span>';
    if (level === 3) return '<span class="task-risk-badge risk-licensed">🔴 Licensed</span>';
    return '';
  }

  function locationBadge(loc) {
    const map = { Remote: 'location-remote', 'On-site': 'location-onsite', Both: 'location-both' };
    const cls = map[loc] || 'location-remote';
    return `<span class="task-location-badge ${cls}">${esc(loc || 'Remote')}</span>`;
  }

  function statusBadge(status) {
    if (status === 'complete') return '<span class="task-status-badge status-complete">✅ Complete</span>';
    if (status === 'claimed') return '<span class="task-status-badge status-claimed">🔒 Claimed</span>';
    return '<span class="task-status-badge status-open">🟦 Open</span>';
  }

  function renderCard(task) {
    const user = SevaAuth.user;
    const isOwner = user && task.claimed_by === user.id;
    const tags = (task.skill_tags || []).map(t => `<span class="task-skill-tag">${esc(t)}</span>`).join('');

    let actionBtn = '';
    if (task.status === 'open') {
      if (!user) {
        actionBtn = `<button class="seva-btn seva-btn-sm seva-btn-outline" onclick="SevaAuth.signIn()">Sign in to Claim</button>`;
      } else {
        actionBtn = `<button class="seva-btn seva-btn-sm seva-btn-primary" onclick="window._sevaTasks.claim('${esc(task.id)}')">Claim Task</button>`;
      }
    } else if (task.status === 'claimed' && isOwner) {
      actionBtn = `<button class="seva-btn seva-btn-sm seva-btn-primary" onclick="window._sevaTasks.complete('${esc(task.id)}')">Mark Complete</button>`;
    }

    const claimedInfo = task.status !== 'open' && task.claimed_by_name
      ? `<p class="task-claimed-by">Claimed by <strong>${esc(task.claimed_by_name)}</strong></p>`
      : '';

    return `
      <div class="seva-card task-card">
        <div class="task-card-header">
          <div class="task-badges">
            ${statusBadge(task.status)}
            ${riskBadge(task.risk_level)}
            ${locationBadge(task.location)}
          </div>
          ${task.category ? `<span class="task-category-badge">${esc(task.category)}</span>` : ''}
        </div>
        <h3 class="task-title">${esc(task.title)}</h3>
        ${task.description ? `<p class="task-desc">${esc(task.description)}</p>` : ''}
        ${tags ? `<div class="task-skill-tags">${tags}</div>` : ''}
        ${claimedInfo}
        ${actionBtn ? `<div class="task-card-footer">${actionBtn}</div>` : ''}
      </div>
    `;
  }

  function getFiltered() {
    const user = SevaAuth.user;
    if (activeFilter === 'open') return tasks.filter(t => t.status === 'open');
    if (activeFilter === 'mine' && user) return tasks.filter(t => t.claimed_by === user.id);
    return tasks;
  }

  function render() {
    if (!container) return;
    const filtered = getFiltered();
    const user = SevaAuth.user;

    container.innerHTML = `
      <div class="seva-section-header">
        <h2>✅ Seva Tasks</h2>
        <p>Claim an ashram task that matches your skills. Every task completed is a blessing.</p>
      </div>

      <div class="tasks-filter-tabs">
        <button class="category-btn ${activeFilter === 'open' ? 'active' : ''}" onclick="window._sevaTasks.setFilter('open')">Open</button>
        <button class="category-btn ${activeFilter === 'all' ? 'active' : ''}" onclick="window._sevaTasks.setFilter('all')">All Tasks</button>
        ${user ? `<button class="category-btn ${activeFilter === 'mine' ? 'active' : ''}" onclick="window._sevaTasks.setFilter('mine')">My Tasks</button>` : ''}
      </div>

      ${filtered.length === 0
        ? `<div class="empty-state"><div class="empty-state-icon">📋</div><p>${activeFilter === 'mine' ? 'You have no tasks yet. Claim one above!' : 'No tasks in this category.'}</p></div>`
        : `<div class="tasks-grid">${filtered.map(renderCard).join('')}</div>`
      }
    `;
  }

  async function loadTasks() {
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/seva_tasks?order=status.asc,created_at.desc`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      if (!resp.ok) return [];
      return await resp.json();
    } catch (e) { return []; }
  }

  async function claimTask(id) {
    const user = SevaAuth.user;
    if (!user) return;
    const name = user.user_metadata?.full_name || user.email || 'Anonymous';
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/seva_tasks?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          status: 'claimed',
          claimed_by: user.id,
          claimed_by_name: name,
          claimed_at: new Date().toISOString()
        })
      });
      if (!resp.ok) { alert('Could not claim task. Please try again.'); return; }
      tasks = await loadTasks();
      render();
    } catch (e) { alert('Error claiming task.'); }
  }

  async function completeTask(id) {
    const user = SevaAuth.user;
    if (!user) return;
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/seva_tasks?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          status: 'complete',
          completed_at: new Date().toISOString()
        })
      });
      if (!resp.ok) { alert('Could not mark complete. Please try again.'); return; }
      tasks = await loadTasks();
      render();
    } catch (e) { alert('Error completing task.'); }
  }

  window._sevaTasks = {
    setFilter(f) { activeFilter = f; render(); },
    claim(id) { claimTask(id); },
    complete(id) { completeTask(id); }
  };

  SevaRegistry.register('tasks', {
    name: 'Seva Tasks',
    emoji: '✅',
    order: 2,
    render() { return `<div id="seva-tasks-container"></div>`; },
    async init() {
      container = document.getElementById('seva-tasks-container');
      tasks = await loadTasks();
      render();
      SevaAuth.onAuthChange(async () => {
        tasks = await loadTasks();
        render();
      });
    },
    destroy() { container = null; }
  });

})();
