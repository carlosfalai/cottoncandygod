/**
 * Seva Sayings — 4,941 Sacred Quotes from Gurunath's Teachings
 * Self-contained module that plugs into seva-core via SevaRegistry.
 */

(function() {
  let sayingsData = null;
  let favorites = [];
  let allSayings = [];
  let displayCount = 20;

  function loadFavorites() {
    try {
      const saved = localStorage.getItem('seva-sayings-favorites');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  }

  function saveFavorites() {
    localStorage.setItem('seva-sayings-favorites', JSON.stringify(favorites));
  }

  async function fetchData() {
    if (sayingsData) return;
    try {
      // Load from same folder (deployed) or seva-sayings folder (dev)
      let resp = await fetch('./timestamped_sacred_sayings.json');
      if (!resp.ok) resp = await fetch('../seva-sayings/data.json');
      if (!resp.ok) throw new Error('Could not load sayings data');
      sayingsData = await resp.json();

      // Flatten all sayings into a single array
      allSayings = [];
      Object.entries(sayingsData.categories || {}).forEach(([category, items]) => {
        items.forEach(s => allSayings.push({ ...s, category }));
      });
      console.log(`[Seva Sayings] Loaded ${allSayings.length} sayings`);
    } catch (e) {
      console.error('[Seva Sayings] Failed to load data:', e);
    }
  }

  function getCategories() {
    return Object.keys(sayingsData?.categories || {});
  }

  function escapeHtml(str) {
    return SevaUtils ? SevaUtils.escapeHtml(str) : str;
  }

  function renderCard(saying) {
    const isFav = favorites.includes(saying.quote);
    return `
      <div class="seva-card saying-card">
        <blockquote class="saying-quote">"${escapeHtml(saying.quote)}"</blockquote>
        <div class="saying-meta">
          <div>
            <strong>${escapeHtml(saying.theme || 'Sacred Teaching')}</strong>
            <br><small>${escapeHtml(saying.videoTitle || "Gurunath's Teachings")}</small>
            <br><span class="seva-badge seva-badge-pending">${escapeHtml(saying.category)}</span>
          </div>
          <button class="fav-btn ${isFav ? 'favorited' : ''}" data-fav-quote="${escapeHtml(saying.quote)}">
            ${isFav ? '❤️' : '🤍'}
          </button>
        </div>
      </div>
    `;
  }

  function render() {
    const categories = getCategories();
    return `
      <div class="seva-sayings-module">
        <div class="seva-section-header">
          <div>
            <h2>Sacred Sayings</h2>
            <p>${allSayings.length.toLocaleString()} quotes from Gurunath's teachings</p>
          </div>
        </div>

        <div class="sayings-controls">
          <input type="text" id="sayings-search" placeholder="Search sacred sayings..." class="sayings-search-input">
          <select id="sayings-category" class="sayings-category-select">
            <option value="">All Categories</option>
            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
          <button class="seva-btn-outline seva-btn" id="sayings-show-favs">Show Favorites (${favorites.length})</button>
        </div>

        <div id="sayings-grid" class="sayings-grid">
          ${allSayings.slice(0, displayCount).map(renderCard).join('')}
        </div>

        ${allSayings.length > displayCount ? `
          <div class="sayings-load-more">
            <button class="seva-btn" id="sayings-load-more">Load More (showing ${Math.min(displayCount, allSayings.length)} of ${allSayings.length})</button>
          </div>
        ` : ''}
      </div>

      <style>
        .sayings-controls {
          display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;
        }
        .sayings-search-input {
          flex: 1; min-width: 200px; padding: 10px 16px;
          border: 1px solid var(--border); border-radius: 8px;
          font-size: 0.95rem; background: white;
        }
        .sayings-search-input:focus { outline: none; border-color: var(--primary); }
        .sayings-category-select {
          padding: 10px 16px; border: 1px solid var(--border);
          border-radius: 8px; font-size: 0.9rem; background: white;
        }
        .sayings-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }
        .saying-quote {
          font-style: italic; font-size: 1rem; line-height: 1.6;
          color: var(--text-dark); margin-bottom: 12px;
          border-left: 3px solid var(--primary); padding-left: 12px;
        }
        .saying-meta {
          display: flex; justify-content: space-between; align-items: flex-start;
          font-size: 0.85rem; color: var(--text-light);
        }
        .fav-btn {
          background: none; border: none; cursor: pointer;
          font-size: 1.3rem; padding: 4px;
        }
        .fav-btn:hover { transform: scale(1.2); }
        .sayings-load-more { text-align: center; margin-top: 20px; }
        @media (max-width: 600px) {
          .sayings-grid { grid-template-columns: 1fr; }
          .sayings-controls { flex-direction: column; }
        }
      </style>
    `;
  }

  function filterAndRender(query, category, showFavs) {
    let filtered = allSayings;

    if (showFavs) {
      filtered = filtered.filter(s => favorites.includes(s.quote));
    }

    if (category) {
      filtered = filtered.filter(s => s.category === category);
    }

    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(s =>
        s.quote.toLowerCase().includes(q) ||
        (s.theme && s.theme.toLowerCase().includes(q)) ||
        (s.videoTitle && s.videoTitle.toLowerCase().includes(q))
      );
    }

    const grid = document.getElementById('sayings-grid');
    if (grid) {
      grid.innerHTML = filtered.length > 0
        ? filtered.slice(0, displayCount).map(renderCard).join('')
        : '<p class="seva-empty-state">No sayings found.</p>';
    }

    const loadMore = document.getElementById('sayings-load-more');
    if (loadMore) {
      if (filtered.length > displayCount) {
        loadMore.textContent = `Load More (showing ${Math.min(displayCount, filtered.length)} of ${filtered.length})`;
        loadMore.style.display = '';
      } else {
        loadMore.style.display = 'none';
      }
    }
  }

  function initListeners() {
    let showingFavs = false;

    const search = document.getElementById('sayings-search');
    const cat = document.getElementById('sayings-category');
    const favBtn = document.getElementById('sayings-show-favs');
    const loadMore = document.getElementById('sayings-load-more');

    if (search) {
      search.addEventListener('input', () => {
        filterAndRender(search.value, cat?.value || '', showingFavs);
      });
    }

    if (cat) {
      cat.addEventListener('change', () => {
        filterAndRender(search?.value || '', cat.value, showingFavs);
      });
    }

    if (favBtn) {
      favBtn.addEventListener('click', () => {
        showingFavs = !showingFavs;
        favBtn.textContent = showingFavs ? 'Show All' : `Show Favorites (${favorites.length})`;
        filterAndRender(search?.value || '', cat?.value || '', showingFavs);
      });
    }

    if (loadMore) {
      loadMore.addEventListener('click', () => {
        displayCount += 20;
        filterAndRender(search?.value || '', cat?.value || '', showingFavs);
      });
    }

    // Favorite toggle (delegated)
    document.getElementById('seva-module-container')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-fav-quote]');
      if (!btn) return;
      const quote = btn.dataset.favQuote;
      const idx = favorites.indexOf(quote);
      if (idx > -1) {
        favorites.splice(idx, 1);
      } else {
        favorites.push(quote);
      }
      saveFavorites();
      btn.innerHTML = favorites.includes(quote) ? '❤️' : '🤍';
      btn.classList.toggle('favorited', favorites.includes(quote));
      if (favBtn) favBtn.textContent = showingFavs ? 'Show All' : `Show Favorites (${favorites.length})`;
    });
  }

  // Register with SevaRegistry
  if (window.SevaRegistry) {
    favorites = loadFavorites();
    fetchData().then(() => {
      SevaRegistry.register('sayings', {
        name: 'Sacred Sayings',
        emoji: '📿',
        order: 10,
        render,
        init: initListeners,
      });
    });
  }
})();
