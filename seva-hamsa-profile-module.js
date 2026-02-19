/**
 * Seva Hamsa Profile — System 1
 * Every initiated Hamsa creates their profile here.
 * Skills, availability, WhatsApp contact, bio.
 * Directory lets Hamsas find each other by skill.
 */

(function() {
  const API_BASE = location.hostname === 'localhost'
    ? 'http://localhost:3009'
    : 'https://siddhanath-ashram-sangha.onrender.com';

  const SKILLS = [
    'Electrical', 'Plumbing', 'Civil Engineering', 'Architecture',
    'Project Management', 'Fundraising', 'Legal', 'Accounting',
    'Graphic Design', 'IT / App Dev', 'Filming / Media', 'Gardening',
    'Painting', 'Event Logistics', 'Sound Engineering', 'Lighting',
    'Insurance / Risk', 'Medical / Health', 'Teaching / Training',
    'Translation / Languages', 'Cooking / Kitchen', 'Transport / Driving',
    'Carpentry', 'Marble / Stonework', 'Landscaping', 'Yoga / Kriya'
  ];

  const COUNTRIES = [
    'India', 'United Kingdom', 'United States', 'Canada', 'Australia',
    'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Switzerland',
    'Ireland', 'Colombia', 'Brazil', 'Mexico', 'South Africa', 'New Zealand',
    'Singapore', 'Japan', 'Other'
  ];

  let currentProfile = null;
  let directory = [];
  let view = 'loading'; // loading | my-profile | directory

  function esc(s) { return SevaUtils ? SevaUtils.escapeHtml(String(s || '')) : String(s || ''); }

  async function loadMyProfile() {
    const user = SevaAuth.user;
    if (!user) return null;
    try {
      const resp = await fetch(`${API_BASE}/api/hamsa/profile/${user.id}`);
      if (!resp.ok) return null;
      return await resp.json();
    } catch (e) { return null; }
  }

  async function saveProfile(data) {
    const user = SevaAuth.user;
    if (!user) return { error: 'Not signed in' };
    try {
      const resp = await fetch(`${API_BASE}/api/hamsa/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, email: user.email, ...data })
      });
      if (!resp.ok) {
        const err = await resp.json();
        return { error: err.error || 'Save failed' };
      }
      return { data: await resp.json() };
    } catch (e) {
      return { error: e.message };
    }
  }

  async function loadDirectory() {
    try {
      const resp = await fetch(`${API_BASE}/api/hamsa/directory`);
      if (!resp.ok) return [];
      return await resp.json();
    } catch (e) { return []; }
  }

  function renderProfileForm(profile) {
    const p = profile || {};
    const selectedSkills = p.skills || [];

    return `
      <div class="hamsa-profile-form">
        <h3 class="section-title">🙏 My Hamsa Profile</h3>
        <p class="section-desc">Your profile helps match your skills to seva opportunities at the ashram.</p>

        <div class="profile-form-grid">
          <div class="form-group">
            <label>Display Name</label>
            <input type="text" id="hp-name" value="${esc(p.name || '')}" placeholder="Your name" maxlength="80">
          </div>

          <div class="form-group">
            <label>Country</label>
            <select id="hp-country">
              <option value="">— Select —</option>
              ${COUNTRIES.map(c => `<option value="${esc(c)}" ${p.country === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label>City</label>
            <input type="text" id="hp-city" value="${esc(p.city || '')}" placeholder="Your city" maxlength="80">
          </div>

          <div class="form-group">
            <label>Hours available per week (remote)</label>
            <input type="number" id="hp-hours" value="${esc(p.hours_per_week || 0)}" min="0" max="40">
          </div>

          <div class="form-group">
            <label>Availability</label>
            <select id="hp-availability">
              <option value="remote" ${p.availability === 'remote' ? 'selected' : ''}>Remote only</option>
              <option value="onsite" ${p.availability === 'onsite' ? 'selected' : ''}>On-site only (ashram visits)</option>
              <option value="both" ${p.availability === 'both' ? 'selected' : ''}>Both remote & on-site</option>
            </select>
          </div>

          <div class="form-group">
            <label>Season preference</label>
            <select id="hp-season">
              <option value="retreat" ${p.season_preference === 'retreat' ? 'selected' : ''}>Retreat season only</option>
              <option value="offseason" ${p.season_preference === 'offseason' ? 'selected' : ''}>Off-season only</option>
              <option value="both" ${p.season_preference === 'both' ? 'selected' : ''}>Both seasons</option>
            </select>
          </div>
        </div>

        <div class="form-group full-width">
          <label>
            <input type="checkbox" id="hp-initiated" ${p.initiated ? 'checked' : ''}> I am initiated (Hamsa)
          </label>
        </div>

        <div class="form-group full-width">
          <label>
            <input type="checkbox" id="hp-supervise" ${p.can_supervise ? 'checked' : ''}> I can supervise / inspect professional work (inspections, not execution)
          </label>
        </div>

        <div class="form-group full-width">
          <label>Skills & Expertise</label>
          <p class="field-hint">Select all that apply. This helps match you to seva tasks.</p>
          <div class="skills-grid">
            ${SKILLS.map(s => `
              <label class="skill-chip ${selectedSkills.includes(s) ? 'selected' : ''}">
                <input type="checkbox" class="hp-skill" value="${esc(s)}" ${selectedSkills.includes(s) ? 'checked' : ''} style="display:none">
                ${esc(s)}
              </label>
            `).join('')}
          </div>
        </div>

        <div class="form-group full-width">
          <label>Certifications (optional)</label>
          <input type="text" id="hp-certs" value="${esc(p.certifications || '')}" placeholder="e.g. Licensed Electrician Ireland, RIBA Architect..." maxlength="200">
        </div>

        <div class="form-group full-width">
          <label>Short Bio (optional)</label>
          <textarea id="hp-bio" rows="3" maxlength="400" placeholder="A few words about yourself and how you'd like to contribute...">${esc(p.bio || '')}</textarea>
        </div>

        <div class="whatsapp-section">
          <h4>📱 WhatsApp Contact</h4>
          <p class="field-hint">Optional. Lets other Hamsas reach out for collaboration or questions.</p>
          <div class="profile-form-grid">
            <div class="form-group">
              <label>Country Code</label>
              <input type="text" id="hp-wa-code" value="${esc(p.whatsapp_country_code || '')}" placeholder="+44" maxlength="6">
            </div>
            <div class="form-group">
              <label>WhatsApp Number</label>
              <input type="text" id="hp-wa-number" value="${esc(p.whatsapp_number || '')}" placeholder="7123456789" maxlength="20">
            </div>
            <div class="form-group">
              <label>Visibility</label>
              <select id="hp-wa-visibility">
                <option value="off" ${p.whatsapp_visibility === 'off' ? 'selected' : ''}>Hidden (off)</option>
                <option value="hamsa_only" ${p.whatsapp_visibility === 'hamsa_only' ? 'selected' : ''}>Hamsas only</option>
                <option value="public" ${p.whatsapp_visibility === 'public' ? 'selected' : ''}>Public</option>
              </select>
            </div>
          </div>
        </div>

        <div class="form-group full-width">
          <label>
            <input type="checkbox" id="hp-available" ${p.available_for_seva !== false ? 'checked' : ''}> Available for seva
          </label>
        </div>

        <div id="hp-save-status" class="save-status"></div>
        <button class="seva-btn seva-btn-primary" id="hp-save-btn">💾 Save Profile</button>
      </div>
    `;
  }

  function renderDirectoryCard(p) {
    const wa = p.whatsapp_number && p.whatsapp_visibility !== 'off'
      ? `<a href="https://wa.me/${(p.whatsapp_country_code || '').replace('+','')}${p.whatsapp_number}" target="_blank" class="wa-link">💬 WhatsApp</a>`
      : '';
    const skills = (p.skills || []).slice(0, 4).map(s => `<span class="skill-tag">${esc(s)}</span>`).join('');
    const more = (p.skills || []).length > 4 ? `<span class="skill-tag skill-more">+${p.skills.length - 4} more</span>` : '';
    const supervisor = p.can_supervise ? '<span class="supervisor-badge">🔍 Supervisor</span>' : '';
    const avatar = p.avatar_url
      ? `<img src="${esc(p.avatar_url)}" alt="${esc(p.name)}" class="dir-avatar" onerror="this.style.display='none'">`
      : `<div class="dir-avatar dir-avatar-placeholder">${esc((p.name || '?')[0]).toUpperCase()}</div>`;

    return `
      <div class="dir-card">
        <div class="dir-card-header">
          ${avatar}
          <div class="dir-card-info">
            <div class="dir-name">${esc(p.name || 'Hamsa')}</div>
            <div class="dir-location">${[p.city, p.country].filter(Boolean).map(esc).join(', ') || ''}</div>
            ${supervisor}
          </div>
          ${wa}
        </div>
        ${p.bio ? `<p class="dir-bio">${esc(p.bio)}</p>` : ''}
        <div class="dir-skills">${skills}${more}</div>
      </div>
    `;
  }

  function render() {
    const user = SevaAuth.user;
    const container = document.getElementById('seva-module-container');
    if (!container) return;

    let html = `<div class="hamsa-profile-module">`;

    // Tab bar
    html += `
      <div class="hamsa-tabs">
        <button class="hamsa-tab ${view === 'my-profile' || view === 'loading' ? 'active' : ''}" onclick="window._hamsaProfile.showMyProfile()">👤 My Profile</button>
        <button class="hamsa-tab ${view === 'directory' ? 'active' : ''}" onclick="window._hamsaProfile.showDirectory()">🌐 Hamsa Directory</button>
      </div>
    `;

    if (view === 'loading') {
      html += `<div class="hamsa-loading">Loading...</div>`;
    } else if (view === 'my-profile') {
      if (!user) {
        html += `
          <div class="hamsa-signin-prompt">
            <p>🙏 Sign in with Google to create your Hamsa profile.</p>
            <button class="seva-btn seva-btn-primary" onclick="SevaAuth.signIn()">Sign in with Google</button>
          </div>
        `;
      } else {
        html += renderProfileForm(currentProfile);
      }
    } else if (view === 'directory') {
      html += `
        <div class="dir-search-bar">
          <input type="text" id="dir-search" placeholder="Search by name or skill..." oninput="window._hamsaProfile.filterDirectory(this.value)">
        </div>
        <div class="dir-grid" id="dir-grid">
          ${directory.length === 0
            ? '<p class="empty-state">No profiles yet. Be the first to create yours!</p>'
            : directory.map(renderDirectoryCard).join('')}
        </div>
      `;
    }

    html += `</div>`;
    container.innerHTML = html;

    if (view === 'my-profile' && user) {
      wireProfileForm();
    }
  }

  function wireProfileForm() {
    // Skill chips toggle
    document.querySelectorAll('.skill-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const cb = chip.querySelector('input[type=checkbox]');
        cb.checked = !cb.checked;
        chip.classList.toggle('selected', cb.checked);
      });
    });

    // Save button
    const saveBtn = document.getElementById('hp-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const status = document.getElementById('hp-save-status');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        status.textContent = '';

        const skills = Array.from(document.querySelectorAll('.hp-skill:checked')).map(cb => cb.value);
        const data = {
          name: document.getElementById('hp-name')?.value?.trim() || '',
          country: document.getElementById('hp-country')?.value || '',
          city: document.getElementById('hp-city')?.value?.trim() || '',
          hours_per_week: parseInt(document.getElementById('hp-hours')?.value) || 0,
          availability: document.getElementById('hp-availability')?.value || 'remote',
          season_preference: document.getElementById('hp-season')?.value || 'both',
          initiated: document.getElementById('hp-initiated')?.checked || false,
          can_supervise: document.getElementById('hp-supervise')?.checked || false,
          skills,
          certifications: document.getElementById('hp-certs')?.value?.trim() || '',
          bio: document.getElementById('hp-bio')?.value?.trim() || '',
          whatsapp_country_code: document.getElementById('hp-wa-code')?.value?.trim() || '',
          whatsapp_number: document.getElementById('hp-wa-number')?.value?.trim() || '',
          whatsapp_visibility: document.getElementById('hp-wa-visibility')?.value || 'off',
          available_for_seva: document.getElementById('hp-available')?.checked !== false,
          avatar_url: SevaAuth.user?.user_metadata?.avatar_url || '',
        };

        if (!data.name) {
          status.textContent = '⚠️ Please enter your name.';
          status.className = 'save-status error';
          saveBtn.disabled = false;
          saveBtn.textContent = '💾 Save Profile';
          return;
        }

        const result = await saveProfile(data);
        if (result.error) {
          status.textContent = '❌ ' + result.error;
          status.className = 'save-status error';
        } else {
          currentProfile = result.data;
          status.textContent = '✅ Profile saved!';
          status.className = 'save-status success';
        }
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Save Profile';
      });
    }
  }

  window._hamsaProfile = {
    async showMyProfile() {
      view = 'loading';
      render();
      currentProfile = await loadMyProfile();
      view = 'my-profile';
      render();
    },
    async showDirectory() {
      view = 'directory';
      directory = await loadDirectory();
      render();
    },
    filterDirectory(q) {
      const term = q.toLowerCase();
      const grid = document.getElementById('dir-grid');
      if (!grid) return;
      const filtered = directory.filter(p =>
        (p.name || '').toLowerCase().includes(term) ||
        (p.skills || []).some(s => s.toLowerCase().includes(term)) ||
        (p.city || '').toLowerCase().includes(term) ||
        (p.country || '').toLowerCase().includes(term)
      );
      grid.innerHTML = filtered.length === 0
        ? '<p class="empty-state">No matches found.</p>'
        : filtered.map(renderDirectoryCard).join('');
    }
  };

  // Register with seva-core
  SevaRegistry.register('hamsa-profile', {
    name: 'Hamsa Profile',
    emoji: '👤',
    order: 5,
    render() {
      return `<div id="hamsa-profile-placeholder"></div>`;
    },
    async init() {
      view = 'loading';
      render();
      currentProfile = await loadMyProfile();
      view = 'my-profile';
      render();
      // Reload on auth change
      SevaAuth.onAuthChange(async (user) => {
        currentProfile = user ? await loadMyProfile() : null;
        render();
      });
    },
    destroy() {}
  });

})();
