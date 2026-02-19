/**
 * Seva Services — Language Learning Bots
 * Learn Hindi and Sanskrit via AI coaching bots.
 * $17/month subscription via Stripe.
 */

(function() {
  const STRIPE_KEY = 'pk_live_51RIw72FpJAvVCZQIsyvnhNEIzecCvWRQda9bekbkpE4gxHzzELUiRGGDbLPJHL1SSQGnnoT92njBcw9aYvWckfgM00TO3wXZXs';
  // Only show services that are actually live
  const SERVICES = [
    {
      id: 'hindi',
      name: 'Conversational Hindi',
      emoji: '🇮🇳',
      desc: 'Learn everyday Hindi through real conversations with an AI coach. Designed for Hamsas visiting the ashram in India.',
      features: ['20-chapter curriculum', 'Daily conversation practice', 'Ashram vocabulary', 'Progress tracking'],
      telegramBot: 'Squire_siddhanath_bot',
      telegramLink: 'https://t.me/Squire_siddhanath_bot',
      color: '#FF9933',
    },
    {
      id: 'gurunath',
      name: "Gurunath's Teachings",
      emoji: '🪷',
      desc: "Study Yogiraj Gurunath Siddhanath's recorded teachings via AI. Ask questions, explore Kriya Yoga philosophy and spiritual wisdom.",
      features: ['4,973 verbatim teachings', 'Q&A with AI guide', 'Kriya Yoga philosophy', 'Science & spirituality'],
      telegramBot: 'gurunath_teachings_bot',
      telegramLink: 'https://t.me/gurunath_teachings_bot',
      color: '#C9A227',
    },
    // Sanskrit bot coming when ready
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
          <a href="${esc(svc.telegramLink)}" target="_blank" class="seva-btn seva-btn-primary">
            Open on Telegram @${esc(svc.telegramBot)} →
          </a>
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
