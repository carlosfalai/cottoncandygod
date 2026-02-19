/**
 * Seva Ride Share — Travel Calendar
 * Coordinate travel: Ashram ↔ Airport or Ashram ↔ Pune city.
 * Shows a monthly calendar. Click a date to post or see rides.
 */

(function() {
  const SUPABASE_URL = 'https://gbxksgxezbljwlnlpkpz.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieGtzZ3hlemJsandsbmxwa3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NTE1ODksImV4cCI6MjA2NDMyNzU4OX0.MCZ9NTKCUe8DLwXz8Cy2-Qr-KYPpq-tn376dpjQ6HxM';

  const ROUTES = [
    'Ashram → Pune Airport',
    'Pune Airport → Ashram',
    'Ashram → Pune City',
    'Pune City → Ashram',
    'Ashram → Mumbai Airport',
    'Mumbai Airport → Ashram',
    'Other'
  ];

  let rides = [];
  let currentYear = new Date().getFullYear();
  let currentMonth = new Date().getMonth();
  let selectedDate = null;
  let showForm = false;

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function toDateStr(y, m, d) {
    return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  function fmtDate(ds) {
    if (!ds) return '';
    const d = new Date(ds + 'T12:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  async function loadRides() {
    try {
      const firstDay = toDateStr(currentYear, currentMonth, 1);
      const lastDay = toDateStr(currentYear, currentMonth + 1, 0);
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/seva_rides?departure_date=gte.${firstDay}&departure_date=lte.${lastDay}&order=departure_date.asc,departure_time.asc`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
      );
      if (!resp.ok) return;
      rides = await resp.json();
    } catch (e) { rides = []; }
  }

  function ridesOnDate(ds) {
    return rides.filter(r => r.departure_date === ds);
  }

  function renderCalendar() {
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const daysOfWeek = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    const firstDow = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();
    const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

    let cells = '';
    // Empty cells before first day
    for (let i = 0; i < firstDow; i++) cells += `<div class="rs-day rs-day-empty"></div>`;
    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = toDateStr(currentYear, currentMonth, d);
      const dayRides = ridesOnDate(ds);
      const isToday = ds === todayStr;
      const isSelected = ds === selectedDate;
      const isPast = ds < todayStr;
      cells += `
        <div class="rs-day ${isToday ? 'rs-today' : ''} ${isSelected ? 'rs-selected' : ''} ${isPast ? 'rs-past' : ''} ${dayRides.length ? 'rs-has-rides' : ''}"
             onclick="window._rideshare.selectDate('${ds}')">
          <span class="rs-day-num">${d}</span>
          ${dayRides.length ? `<span class="rs-ride-dot">${dayRides.length}</span>` : ''}
        </div>`;
    }

    return `
      <div class="rs-calendar">
        <div class="rs-cal-header">
          <button class="seva-btn seva-btn-ghost seva-btn-sm" onclick="window._rideshare.prevMonth()">←</button>
          <h3 class="rs-month-title">${monthNames[currentMonth]} ${currentYear}</h3>
          <button class="seva-btn seva-btn-ghost seva-btn-sm" onclick="window._rideshare.nextMonth()">→</button>
        </div>
        <div class="rs-cal-grid">
          ${daysOfWeek.map(d => `<div class="rs-dow">${d}</div>`).join('')}
          ${cells}
        </div>
      </div>`;
  }

  function renderDayPanel() {
    if (!selectedDate) return '';
    const dayRides = ridesOnDate(selectedDate);

    return `
      <div class="rs-day-panel">
        <div class="rs-day-panel-header">
          <h4>🗓️ ${fmtDate(selectedDate)}</h4>
          <button class="seva-btn seva-btn-primary seva-btn-sm" onclick="window._rideshare.toggleForm()">
            ${showForm ? '✕ Cancel' : '+ Post a Ride'}
          </button>
        </div>

        ${showForm ? renderForm() : ''}

        ${dayRides.length === 0 && !showForm
          ? '<p class="empty-state" style="padding:16px 0">No rides posted for this date yet.</p>'
          : dayRides.map(renderRideRow).join('')}
      </div>`;
  }

  function renderRideRow(r) {
    const wa = r.whatsapp
      ? `<a class="wa-link" href="https://wa.me/${r.whatsapp.replace(/\D/g,'')}" target="_blank" rel="noopener">💬 WhatsApp</a>`
      : '';
    return `
      <div class="rs-ride-row">
        <div class="rs-ride-main">
          <span class="rs-route-tag">${esc(r.route)}</span>
          <span class="rs-ride-time">${esc(r.departure_time || '')} ${r.return_time ? '→ ' + esc(r.return_time) : ''}</span>
          <span class="rs-ride-name">👤 ${esc(r.driver_name)}</span>
          ${r.seats_available ? `<span class="rs-seats">🪑 ${esc(r.seats_available)} seats</span>` : ''}
        </div>
        ${r.notes ? `<p class="rs-ride-notes">${esc(r.notes)}</p>` : ''}
        <div class="rs-ride-actions">${wa}</div>
      </div>`;
  }

  function renderForm() {
    return `
      <div class="rs-form seva-card" style="margin-bottom:16px">
        <h5 style="margin-bottom:12px;font-size:0.875rem;font-weight:700">Post your travel for ${fmtDate(selectedDate)}</h5>
        <div class="profile-form-grid">
          <!-- Name auto-filled from profile -->
          <div class="form-group">
            <label>Route</label>
            <select id="rs-route">
              ${ROUTES.map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Departure Time</label>
            <input type="time" id="rs-time">
          </div>
          <div class="form-group">
            <label>Seats Available</label>
            <input type="number" id="rs-seats" placeholder="0 = need a ride" min="0" max="8" value="0">
          </div>
          <!-- WhatsApp auto-loaded from profile -->
          <div class="form-group">
            <label>Notes</label>
            <input type="text" id="rs-notes" placeholder="Flight number, meeting point..." maxlength="200">
          </div>
        </div>
        <div id="rs-status" class="save-status"></div>
        <button class="seva-btn seva-btn-primary" id="rs-submit" onclick="window._rideshare.submitRide()">Post Ride</button>
      </div>`;
  }

  async function render() {
    const c = document.getElementById('seva-module-container');
    if (!c) return;
    c.innerHTML = `
      <div class="rs-module">
        <div class="rs-header">
          <h2 class="infra-main-title">🚗 Travel Coordination</h2>
          <p class="infra-main-desc">Coordinate rides to and from the ashram. Post your travel date or find someone going your way.</p>
        </div>
        <div class="rs-layout">
          ${renderCalendar()}
          <div class="rs-side">${renderDayPanel()}</div>
        </div>
      </div>`;
  }

  window._rideshare = {
    async selectDate(ds) {
      selectedDate = ds;
      showForm = false;
      await render();
    },
    toggleForm() {
      showForm = !showForm;
      render();
    },
    async prevMonth() {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      selectedDate = null; showForm = false;
      await loadRides(); render();
    },
    async nextMonth() {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      selectedDate = null; showForm = false;
      await loadRides(); render();
    },
    async submitRide() {
      const user = SevaAuth.user;
      if (!user) { alert('Please sign in first.'); return; }

      // Name + WhatsApp from profile
      const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Hamsa';
      let whatsapp = null;
      try {
        const sb2 = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY);
        if (sb2) {
          const { data: prof } = await sb2.from('hamsa_profiles').select('whatsapp_number,whatsapp_country_code').eq('id', user.id).single();
          if (prof?.whatsapp_number) whatsapp = (prof.whatsapp_country_code || '') + prof.whatsapp_number;
        }
      } catch(e) {}
      const route = document.getElementById('rs-route')?.value;
      const time = document.getElementById('rs-time')?.value;
      const seats = document.getElementById('rs-seats')?.value;
      const notes = document.getElementById('rs-notes')?.value?.trim();
      const statusEl = document.getElementById('rs-status');
      const btn = document.getElementById('rs-submit');

      if (!route) {
        statusEl.textContent = '⚠️ Route is required.';
        statusEl.className = 'save-status error';
        return;
      }

      btn.disabled = true; btn.textContent = 'Posting...'; statusEl.textContent = '';

      try {
        const sb = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY);
        if (!sb) throw new Error('Supabase not loaded');
        const { error } = await sb.from('seva_rides').insert({
          driver_name: name,
          route,
          departure_date: selectedDate,
          departure_time: time || null,
          seats_available: parseInt(seats) || 0,
          whatsapp: whatsapp || null,
          notes: notes || null,
          hamsa_id: user.id
        });
        if (error) throw new Error(error.message);
        await loadRides();
        showForm = false;
        await render();
      } catch (e) {
        statusEl.textContent = '❌ ' + e.message;
        statusEl.className = 'save-status error';
        btn.disabled = false; btn.textContent = 'Post Ride';
      }
    }
  };

  SevaRegistry.register('rideshare', {
    name: 'Ride Share',
    emoji: '🚗',
    order: 7,
    render() { return '<div class="seva-empty-state">Loading travel calendar...</div>'; },
    async init() { await loadRides(); await render(); },
    destroy() {}
  });

})();
