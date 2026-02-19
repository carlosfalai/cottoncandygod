/**
 * Quality Check — System 7
 * Before/after verification for claimed and completed tasks.
 */

(function() {
  const SUPABASE_URL = 'https://gbxksgxezbljwlnlpkpz.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieGtzZ3hlemJsandsbmxwa3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NTE1ODksImV4cCI6MjA2NDMyNzU4OX0.MCZ9NTKCUe8DLwXz8Cy2-Qr-KYPpq-tn376dpjQ6HxM';

  let tasks = [];
  let verifications = {};
  let expandedTask = null;
  let container = null;
  let saving = false;

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function riskInspector(level) {
    if (level === 1) return '<span class="task-risk-badge risk-low">🟢 Anyone can inspect</span>';
    if (level === 2) return '<span class="task-risk-badge risk-skilled">🟡 Skilled supervisor</span>';
    if (level === 3) return '<span class="task-risk-badge risk-licensed">🔴 Professional only</span>';
    return '<span class="task-risk-badge risk-low">🟢 Anyone can inspect</span>';
  }

  function renderVerification(v) {
    return `
      <div class="quality-verification-item">
        <div class="quality-verif-header">
          <strong class="quality-verif-name">${esc(v.hamsa_name || 'A Hamsa')}</strong>
          <span class="quality-verif-role">${esc(v.role || 'verifier')}</span>
        </div>
        ${v.photo_url ? `<a class="quality-photo-link" href="${esc(v.photo_url)}" target="_blank" rel="noopener">📷 View Photo</a>` : ''}
        ${v.contribution ? `<p class="quality-verif-notes">${esc(v.contribution)}</p>` : ''}
      </div>
    `;
  }

  function renderVerifForm(taskId) {
    const user = SevaAuth.user;
    if (!user) {
      return `<p class="quality-signin-prompt"><button class="seva-btn seva-btn-sm seva-btn-outline" onclick="SevaAuth.signIn()">Sign in to verify</button></p>`;
    }
    return `
      <div class="quality-verif-form">
        <div class="form-group">
          <label>Photo URL</label>
          <input type="url" id="qv-photo-${esc(taskId)}" placeholder="Paste a photo link (Imgur, Google Drive, etc.)" maxlength="500">
        </div>
        <div class="form-group">
          <label>Verification Notes</label>
          <textarea id="qv-notes-${esc(taskId)}" rows="2" maxlength="300" placeholder="What did you verify? What condition is the work in?"></textarea>
        </div>
        <div class="quality-verif-actions">
          <button class="seva-btn seva-btn-sm seva-btn-primary" onclick="window._sevaQuality.submitVerif('${esc(taskId)}')">Add Verification</button>
          <button class="seva-btn seva-btn-sm seva-btn-ghost" onclick="window._sevaQuality.toggleExpand('${esc(taskId)}')">Cancel</button>
          <span id="qv-status-${esc(taskId)}" class="save-status"></span>
        </div>
      </div>
    `;
  }

  function renderTaskItem(task) {
    const verifsForTask = verifications[task.id] || [];
    const isExpanded = expandedTask === task.id;
    const statusLabel = task.status === 'complete' ? '✅ Complete' : '🔒 In Progress';

    return `
      <div class="quality-item">
        <div class="quality-item-header" onclick="window._sevaQuality.toggleExpand('${esc(task.id)}')">
          <div class="quality-item-info">
            <h3 class="quality-task-title">${esc(task.title)}</h3>
            <div class="quality-item-badges">
              <span class="task-status-badge ${task.status === 'complete' ? 'status-complete' : 'status-claimed'}">${statusLabel}</span>
              ${riskInspector(task.risk_level)}
              ${verifsForTask.length > 0 ? `<span class="quality-verif-count">${verifsForTask.length} verification${verifsForTask.length === 1 ? '' : 's'}</span>` : ''}
            </div>
          </div>
          <span class="quality-expand-icon">${isExpanded ? '▲' : '▼'}</span>
        </div>

        ${isExpanded ? `
          <div class="quality-item-body">
            ${verifsForTask.length > 0
              ? `<div class="quality-verifs-list">${verifsForTask.map(renderVerification).join('')}</div>`
              : `<p class="quality-no-verifs">No verifications yet for this task.</p>`
            }
            ${renderVerifForm(task.id)}
          </div>
        ` : ''}
      </div>
    `;
  }

  function render() {
    if (!container) return;

    container.innerHTML = `
      <div class="seva-section-header">
        <h2>🔍 Quality Check</h2>
        <p>Verify and document completed seva work. Add photos and notes to confirm tasks are done properly.</p>
      </div>

      ${tasks.length === 0
        ? `<div class="empty-state"><div class="empty-state-icon">🔍</div><p>No active or completed tasks to verify yet.</p></div>`
        : `<div class="quality-list">${tasks.map(renderTaskItem).join('')}</div>`
      }
    `;
  }

  async function loadTasks() {
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/seva_tasks?status=in.("claimed","complete")&order=status.asc,created_at.desc`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      if (!resp.ok) return [];
      return await resp.json();
    } catch (e) { return []; }
  }

  async function loadVerifications(taskIds) {
    if (!taskIds.length) return {};
    try {
      const idList = taskIds.map(id => `"${id}"`).join(',');
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/seva_task_contributors?task_id=in.(${idList})&role=eq.verifier&order=created_at.desc`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      if (!resp.ok) return {};
      const rows = await resp.json();
      const map = {};
      for (const row of rows) {
        if (!map[row.task_id]) map[row.task_id] = [];
        map[row.task_id].push(row);
      }
      return map;
    } catch (e) { return {}; }
  }

  async function submitVerif(taskId) {
    if (saving) return;
    const user = SevaAuth.user;
    if (!user) return;

    const photoUrl = document.getElementById(`qv-photo-${taskId}`)?.value?.trim();
    const notes = document.getElementById(`qv-notes-${taskId}`)?.value?.trim();
    const status = document.getElementById(`qv-status-${taskId}`);

    if (!notes && !photoUrl) {
      if (status) { status.textContent = '⚠️ Add a photo link or notes.'; status.className = 'save-status error'; }
      return;
    }

    saving = true;
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/seva_task_contributors`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          task_id: taskId,
          hamsa_id: user.id,
          hamsa_name: user.user_metadata?.full_name || user.email || 'Anonymous',
          role: 'verifier',
          contribution: notes || null,
          photo_url: photoUrl || null,
          created_at: new Date().toISOString()
        })
      });
      if (!resp.ok) {
        const err = await resp.json();
        if (status) { status.textContent = '❌ ' + (err.message || 'Could not save.'); status.className = 'save-status error'; }
      } else {
        verifications = await loadVerifications(tasks.map(t => t.id));
        render();
        expandedTask = taskId;
        render();
      }
    } catch (e) {
      if (status) { status.textContent = '❌ Error: ' + e.message; status.className = 'save-status error'; }
    } finally {
      saving = false;
    }
  }

  window._sevaQuality = {
    toggleExpand(taskId) {
      expandedTask = expandedTask === taskId ? null : taskId;
      render();
    },
    submitVerif(taskId) { submitVerif(taskId); }
  };

  SevaRegistry.register('quality', {
    name: 'Quality Check',
    emoji: '🔍',
    order: 5,
    render() { return `<div id="seva-quality-container"></div>`; },
    async init() {
      container = document.getElementById('seva-quality-container');
      tasks = await loadTasks();
      verifications = await loadVerifications(tasks.map(t => t.id));
      render();
      SevaAuth.onAuthChange(async () => {
        tasks = await loadTasks();
        verifications = await loadVerifications(tasks.map(t => t.id));
        render();
      });
    },
    destroy() { container = null; expandedTask = null; }
  });

})();
