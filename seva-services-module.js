/**
 * Seva Services — Language Learning Bots
 * Learn Hindi and Sanskrit via AI coaching bots.
 * $17/month subscription via Stripe.
 */

(function() {
  const STRIPE_KEY = 'pk_live_51RIw72FpJAvVCZQIsyvnhNEIzecCvWRQda9bekbkpE4gxHzzELUiRGGDbLPJHL1SSQGnnoT92njBcw9aYvWckfgM00TO3wXZXs';
  const SQUIRE_HINDI_URL = 'https://squire-siddhanath.onrender.com';
  const PRICE_MONTHLY = 'Free';

  // Only show services that are actually live
  const SERVICES = [
    {
      id: 'hindi',
      name: 'Conversational Hindi',
      emoji: '🇮🇳',
      desc: 'Learn everyday Hindi through real conversations. Designed for Hamsas who visit the ashram in India. Practice greetings, daily phrases, and spiritual vocabulary.',
      features: ['Daily conversation practice', 'Ashram-specific vocabulary', 'Spiritual vocabulary', 'Progress tracking'],
      price: PRICE_MONTHLY,
      bot: SQUIRE_HINDI_URL,
      color: '#FF9933',
    },
    // Sanskrit & Gurunath bots coming when ready
  ];

  function esc(s) { return SevaUtils ? SevaUtils.escapeHtml(String(s || '')) : String(s || ''); }

  function isSubscribed(serviceId) {
    try {
      const subs = JSON.parse(localStorage.getItem('seva-subscriptions') || '{}');
      return !!subs[serviceId];
    } catch (e) { return false; }
  }

  function renderServiceCard(svc) {
    const subscribed = isSubscribed(svc.id);
    return `
      <div class="service-card seva-card">
        <div class="service-header" style="border-left: 4px solid ${svc.color}">
          <span class="service-emoji">${svc.emoji}</span>
          <div>
            <h3 class="service-name">${esc(svc.name)}</h3>
            <span class="service-price" style="color:${svc.color}">${esc(svc.price)}</span>
          </div>
          ${subscribed ? '<span class="service-active-badge">✓ Active</span>' : ''}
        </div>
        <p class="service-desc">${esc(svc.desc)}</p>
        <ul class="service-features">
          ${svc.features.map(f => `<li>${esc(f)}</li>`).join('')}
        </ul>
        <div class="service-actions">
          ${svc.bot
            ? `<a href="${esc(svc.bot)}" target="_blank" class="seva-btn seva-btn-primary">Open ${esc(svc.name)} Bot →</a>`
            : `<button class="seva-btn seva-btn-ghost" disabled>Coming Soon</button>`
          }
        </div>
      </div>
    `;
  }

  function render() {
    const container = document.getElementById('seva-module-container');
    if (!container) return;

    const user = SevaAuth.user;
    if (!user) {
      container.innerHTML = `<div class="empty-state">🙏 Sign in to access learning services.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="services-module">
        <div class="services-header">
          <h2 class="infra-main-title">📚 Learning Services</h2>
          <p class="infra-main-desc">AI-powered language and teachings study. Free for Hamsas.</p>
        </div>
        <div class="services-grid">
          ${SERVICES.map(renderServiceCard).join('')}
        </div>
        <div class="services-note">
          <p>🕉️ All subscription revenue goes directly to ashram development and maintenance.</p>
        </div>
      </div>
    `;
  }

  window._services = {
    subscribe(serviceId, serviceName) {
      const user = SevaAuth.user;
      if (!user) { alert('Please sign in first.'); return; }

      // For now: show a Stripe checkout link or payment intent
      // TODO: wire to real Stripe checkout session via backend
      const confirmed = confirm(`Subscribe to ${serviceName} for $17/month?\n\nThis will open payment setup. Revenue supports the ashram.`);
      if (confirmed) {
        // Mark as subscribed locally for demo (replace with Stripe webhook)
        try {
          const subs = JSON.parse(localStorage.getItem('seva-subscriptions') || '{}');
          subs[serviceId] = { since: new Date().toISOString(), user: user.email };
          localStorage.setItem('seva-subscriptions', JSON.stringify(subs));
        } catch (e) {}
        render();
      }
    }
  };

  SevaRegistry.register('services', {
    name: 'Learn',
    emoji: '📚',
    order: 10,
    render() { return '<div class="seva-empty-state">Loading services...</div>'; },
    init() { render(); },
    destroy() {}
  });

})();
