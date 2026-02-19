/**
 * Seva Organizer — System 6
 * Post help requests for upcoming retreats.
 */

(function() {
  const SUPABASE_URL = 'https://gbxksgxezbljwlnlpkpz.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieGtzZ3hlemJsandsbmxwa3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NTE1ODksImV4cCI6MjA2NDMyNzU4OX0.MCZ9NTKCUe8DLwXz8Cy2-Qr-KYPpq-tn376dpjQ6HxM';

  let requests = [];
  let showForm = false;
  let container = null;
  let saving = false;

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return dateStr; }
  }

  function renderHelpCard(req) {
    return `
      <div class="seva-card help-card">
        <div class="help-card-header">
          <div>
            <h3 class="help-retreat-name">${esc(req.retreat_name)}</h3>
            <p class="help-organizer">Organized by <strong>${esc(req.organizer_name)}</strong></p>
          </div>
          <span class="help-date-badge">📅 ${esc(formatDate(req.retreat_date))}</span>
        </div>
        <p class="help-role">${esc(req.role_description)}</p>
        <div class="help-card-footer">
          <span class="help-count-badge">👥 ${esc(req.helpers_needed)} helper${req.helpers_needed === 1 ? '' : 's'} needed</span>
        </div>
      </div>
    `;
  }

  function renderForm() {
    const user = SevaAuth.user;
    if (!user) {
      return `<div class="empty-state"><p>Please <button class="seva-btn seva-btn-sm seva-btn-primary" onclick="SevaAuth.signIn()">sign in</button> to post a help request.</p></div>`;
    }
    return `
      <div class="seva-card help-form-card">
        <h3 class="section-title">🤝 Request Help for a Retreat</h3>
        <div class="profile-form-grid">
          <div class="form-group">
            <label>Your Name</label>
            <input type="text" id="org-name" placeholder="Organizer name" maxlength="80">
          </div>
          <div class="form-group">
            <label>Retreat Name</label>
            <input type="text" id="org-retreat" placeholder="e.g. Summer Kriya Retreat 2025" maxlength="120">
          </div>
          <div class="form-group">
            <label>Retreat Date</label>
            <input type="date" id="org-date">
          </div>
          <div class="form-group">
            <label>Helpers Needed</label>
            <input type="number" id="org-count" value="2" min="1" max="50">
          </div>
        </div>
        <div class="form-group">
          <label>What role do you need help with?</label>
          <textarea id="org-role" rows="3" maxlength="400" placeholder="e.g. Kitchen seva volunteers — cooking and serving lunch for 60 guests across 3 days..."></textarea>
        </div>
        <div class="help-form-actions">
          <button class="seva-btn seva-btn-primary" id="org-save-btn" onclick="window._sevaOrganizer.save()">Post Request</button>
          <button class="seva-btn seva-btn-ghost" onclick="window._sevaOrganizer.toggleForm()">Cancel</button>
          <span id="org-status" class="save-status"></span>
        </div>
      </div>
    `;
  }

  function render() {
    if (!container) return;

    container.innerHTML = `
      <div class="seva-section-header">
        <h2>🤝 Need Help</h2>
        <p>Organizers: post your retreat help requests. Hamsas: find opportunities to serve.</p>
      </div>

      <div class="help-header-actions">
        ${!showForm ? `<button class="seva-btn seva-btn-primary" onclick="window._sevaOrganizer.toggleForm()">+ Request Help</button>` : ''}
      </div>

      ${showForm ? renderForm() : ''}

      ${requests.length === 0
        ? `<div class="empty-state"><div class="empty-state-icon">🤲</div><p>No help requests yet. Post one to rally the sangha!</p></div>`
        : `<div class="help-requests">${requests.map(renderHelpCard).join('')}</div>`
      }
    `;
  }

  async function loadRequests() {
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/seva_help_requests?status=eq.open&order=retreat_date.asc`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      if (!resp.ok) return [];
      return await resp.json();
    } catch (e) { return []; }
  }

  async function saveRequest() {
    if (saving) return;
    const user = SevaAuth.user;
    if (!user) return;

    const orgName = document.getElementById('org-name')?.value?.trim();
    const retreat = document.getElementById('org-retreat')?.value?.trim();
    const date = document.getElementById('org-date')?.value;
    const count = parseInt(document.getElementById('org-count')?.value) || 2;
    const role = document.getElementById('org-role')?.value?.trim();
    const status = document.getElementById('org-status');

    if (!orgName || !retreat || !date || !role) {
      if (status) { status.textContent = '⚠️ Please fill in all fields.'; status.className = 'save-status error'; }
      return;
    }

    saving = true;
    const btn = document.getElementById('org-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Posting...'; }

    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/seva_help_requests`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          organizer_name: orgName,
          retreat_name: retreat,
          retreat_date: date,
          helpers_needed: count,
          role_description: role,
          status: 'open',
          hamsa_id: user.id,
          created_at: new Date().toISOString()
        })
      });
      if (!resp.ok) {
        const err = await resp.json();
        if (status) { status.textContent = '❌ ' + (err.message || 'Could not post request.'); status.className = 'save-status error'; }
      } else {
        showForm = false;
        requests = await loadRequests();
        render();
      }
    } catch (e) {
      if (status) { status.textContent = '❌ Error: ' + e.message; status.className = 'save-status error'; }
    } finally {
      saving = false;
      const btn2 = document.getElementById('org-save-btn');
      if (btn2) { btn2.disabled = false; btn2.textContent = 'Post Request'; }
    }
  }

  window._sevaOrganizer = {
    toggleForm() { showForm = !showForm; render(); },
    save() { saveRequest(); }
  };

  SevaRegistry.register('organizer', {
    name: 'Need Help',
    emoji: '🤝',
    order: 4,
    render() { return `<div id="seva-organizer-container"></div>`; },
    async init() {
      container = document.getElementById('seva-organizer-container');
      requests = await loadRequests();
      render();
      SevaAuth.onAuthChange(async () => {
        requests = await loadRequests();
        render();
      });
    },
    destroy() { container = null; showForm = false; }
  });

})();
