/**
 * Seva Ride Share — System 3
 * Coordinate travel to the ashram.
 */

(function() {
  const SUPABASE_URL = 'https://gbxksgxezbljwlnlpkpz.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieGtzZ3hlemJsandsbmxwa3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NTE1ODksImV4cCI6MjA2NDMyNzU4OX0.MCZ9NTKCUe8DLwXz8Cy2-Qr-KYPpq-tn376dpjQ6HxM';

  let rides = [];
  let showForm = false;
  let container = null;
  let saving = false;

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return dateStr; }
  }

  function renderRideCard(ride) {
    const wa = ride.whatsapp
      ? `<a class="wa-link" href="https://wa.me/${ride.whatsapp.replace(/\D/g,'')}" target="_blank" rel="noopener">📱 WhatsApp</a>`
      : '';

    return `
      <div class="seva-card ride-card">
        <div class="ride-card-header">
          <div>
            <h3 class="ride-from">${esc(ride.from_city)}, ${esc(ride.from_country)}</h3>
            <p class="ride-date">📅 ${formatDate(ride.departure_date)}</p>
          </div>
          <div class="ride-seats">
            <span class="ride-seats-num">${esc(ride.seats_available)}</span>
            <span class="ride-seats-label">seat${ride.seats_available === 1 ? '' : 's'}</span>
          </div>
        </div>
        <p class="ride-driver">🪷 ${esc(ride.driver_name)}</p>
        ${ride.notes ? `<p class="ride-notes">${esc(ride.notes)}</p>` : ''}
        ${wa ? `<div class="ride-card-footer">${wa}</div>` : ''}
      </div>
    `;
  }

  function renderForm() {
    const user = SevaAuth.user;
    if (!user) {
      return `<div class="empty-state"><p>Please <button class="seva-btn seva-btn-sm seva-btn-primary" onclick="SevaAuth.signIn()">sign in</button> to offer a ride.</p></div>`;
    }
    return `
      <div class="seva-card ride-form-card">
        <h3 class="section-title">🚗 Offer a Ride to the Ashram</h3>
        <div class="profile-form-grid">
          <div class="form-group">
            <label>Your Name</label>
            <input type="text" id="rs-name" placeholder="Your display name" maxlength="80">
          </div>
          <div class="form-group">
            <label>Departing From (City)</label>
            <input type="text" id="rs-city" placeholder="e.g. Mumbai" maxlength="80">
          </div>
          <div class="form-group">
            <label>Country</label>
            <input type="text" id="rs-country" placeholder="e.g. India" maxlength="80">
          </div>
          <div class="form-group">
            <label>Departure Date</label>
            <input type="date" id="rs-date">
          </div>
          <div class="form-group">
            <label>Seats Available</label>
            <input type="number" id="rs-seats" value="1" min="1" max="8">
          </div>
          <div class="form-group">
            <label>WhatsApp Number (optional)</label>
            <input type="text" id="rs-wa" placeholder="+91 98765 43210" maxlength="30">
          </div>
        </div>
        <div class="form-group">
          <label>Notes (optional)</label>
          <textarea id="rs-notes" rows="2" maxlength="300" placeholder="Route, stops, vehicle type..."></textarea>
        </div>
        <div class="ride-form-actions">
          <button class="seva-btn seva-btn-primary" id="rs-save-btn" onclick="window._sevaRideshare.save()">Post Ride</button>
          <button class="seva-btn seva-btn-ghost" onclick="window._sevaRideshare.toggleForm()">Cancel</button>
          <span id="rs-status" class="save-status"></span>
        </div>
      </div>
    `;
  }

  function render() {
    if (!container) return;
    const user = SevaAuth.user;

    container.innerHTML = `
      <div class="seva-section-header">
        <h2>🚗 Ride Share</h2>
        <p>Coordinate travel to the ashram. Offer a seat or find a fellow Hamsa travelling your way.</p>
      </div>

      <div class="rides-header-actions">
        ${!showForm ? `<button class="seva-btn seva-btn-primary" onclick="window._sevaRideshare.toggleForm()">+ Offer a Ride</button>` : ''}
      </div>

      ${showForm ? renderForm() : ''}

      ${rides.length === 0
        ? `<div class="empty-state"><div class="empty-state-icon">🚌</div><p>No rides posted yet. Be the first to offer a seat!</p></div>`
        : `<div class="rides-grid">${rides.map(renderRideCard).join('')}</div>`
      }
    `;
  }

  async function loadRides() {
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/seva_rides?order=departure_date.asc`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      if (!resp.ok) return [];
      return await resp.json();
    } catch (e) { return []; }
  }

  async function saveRide() {
    if (saving) return;
    const user = SevaAuth.user;
    if (!user) return;

    const name = document.getElementById('rs-name')?.value?.trim();
    const city = document.getElementById('rs-city')?.value?.trim();
    const country = document.getElementById('rs-country')?.value?.trim();
    const date = document.getElementById('rs-date')?.value;
    const seats = parseInt(document.getElementById('rs-seats')?.value) || 1;
    const wa = document.getElementById('rs-wa')?.value?.trim();
    const notes = document.getElementById('rs-notes')?.value?.trim();
    const status = document.getElementById('rs-status');

    if (!name || !city || !country || !date) {
      if (status) { status.textContent = '⚠️ Please fill in name, city, country and date.'; status.className = 'save-status error'; }
      return;
    }

    saving = true;
    const btn = document.getElementById('rs-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Posting...'; }

    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/seva_rides`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          driver_name: name,
          from_city: city,
          from_country: country,
          departure_date: date,
          seats_available: seats,
          whatsapp: wa || null,
          notes: notes || null,
          hamsa_id: user.id,
          created_at: new Date().toISOString()
        })
      });
      if (!resp.ok) {
        const err = await resp.json();
        if (status) { status.textContent = '❌ Could not post. ' + (err.message || ''); status.className = 'save-status error'; }
      } else {
        showForm = false;
        rides = await loadRides();
        render();
      }
    } catch (e) {
      if (status) { status.textContent = '❌ Error: ' + e.message; status.className = 'save-status error'; }
    } finally {
      saving = false;
      const btn2 = document.getElementById('rs-save-btn');
      if (btn2) { btn2.disabled = false; btn2.textContent = 'Post Ride'; }
    }
  }

  window._sevaRideshare = {
    toggleForm() { showForm = !showForm; render(); },
    save() { saveRide(); }
  };

  SevaRegistry.register('rideshare', {
    name: 'Ride Share',
    emoji: '🚗',
    order: 7,
    render() { return `<div id="seva-rideshare-container"></div>`; },
    async init() {
      container = document.getElementById('seva-rideshare-container');
      rides = await loadRides();
      render();
      SevaAuth.onAuthChange(async () => {
        rides = await loadRides();
        render();
      });
    },
    destroy() { container = null; showForm = false; }
  });

})();
