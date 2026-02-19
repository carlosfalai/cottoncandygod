/**
 * Seva Credits — System 5
 * Thank-you cards for every completed ashram task.
 */

(function() {
  const SUPABASE_URL = 'https://gbxksgxezbljwlnlpkpz.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieGtzZ3hlemJsandsbmxwa3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NTE1ODksImV4cCI6MjA2NDMyNzU4OX0.MCZ9NTKCUe8DLwXz8Cy2-Qr-KYPpq-tn376dpjQ6HxM';

  let container = null;

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return ''; }
  }

  function renderCard(task) {
    return `
      <div class="thankyou-card seva-card">
        <div class="thankyou-glow">🌟</div>
        <h3 class="thankyou-task-title">${esc(task.title)}</h3>
        ${task.completed_at ? `<p class="thankyou-date">Completed ${esc(formatDate(task.completed_at))}</p>` : ''}
        <p class="thankyou-who">
          <strong>${esc(task.claimed_by_name || 'A devoted Hamsa')}</strong>
        </p>
        <p class="thankyou-message">Their seva has blessed the ashram. 🙏</p>
      </div>
    `;
  }

  async function loadCompleted() {
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/seva_tasks?status=eq.complete&order=completed_at.desc`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      if (!resp.ok) return [];
      return await resp.json();
    } catch (e) { return []; }
  }

  async function render() {
    if (!container) return;

    container.innerHTML = `
      <div class="seva-section-header">
        <h2>🌟 Seva Credits</h2>
        <p>Honoring every Hamsa who has completed a seva task for the ashram.</p>
      </div>
      <div class="thankyou-loading">Loading completed sevas...</div>
    `;

    const tasks = await loadCompleted();

    if (!container) return; // module may have been destroyed

    if (tasks.length === 0) {
      container.innerHTML = `
        <div class="seva-section-header">
          <h2>🌟 Seva Credits</h2>
          <p>Honoring every Hamsa who has completed a seva task for the ashram.</p>
        </div>
        <div class="empty-state">
          <div class="empty-state-icon">🌱</div>
          <p>No completed tasks yet. Be the first to complete a seva!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="seva-section-header">
        <h2>🌟 Seva Credits</h2>
        <p>${tasks.length} seva${tasks.length === 1 ? '' : 's'} completed — each one a blessing to the ashram.</p>
      </div>
      <div class="thankyou-grid">
        ${tasks.map(renderCard).join('')}
      </div>
    `;
  }

  SevaRegistry.register('thankyou', {
    name: 'Seva Credits',
    emoji: '🌟',
    order: 8,
    render() { return `<div id="seva-thankyou-container"></div>`; },
    async init() {
      container = document.getElementById('seva-thankyou-container');
      await render();
    },
    destroy() { container = null; }
  });

})();
