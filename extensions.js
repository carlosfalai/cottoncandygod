/**
 * Siddhanath Kriya Yoga — Extensions
 * Adds: Gurumata's Will, Amazon Store, Learning Modules, Nature Guide, Shivraj Section
 * Injected AFTER app.js initializes.
 */

// Wait for the main app to initialize, then inject new sections
document.addEventListener('DOMContentLoaded', () => {
  let attempts = 0;
  const waitForApp = setInterval(() => {
    const app = document.querySelector('.yoga-marathon-app');
    if (app || attempts++ > 30) {
      clearInterval(waitForApp);
      if (app) injectExtensions();
    }
  }, 300);
});

function injectExtensions() {
  const mainApp = document.querySelector('.yoga-marathon-app');
  if (!mainApp) return;

  // Create extensions container and append before footer
  const footer = mainApp.querySelector('.app-footer');
  const container = document.createElement('div');
  container.id = 'sk-extensions';
  container.innerHTML = renderAllExtensions();

  if (footer) {
    mainApp.insertBefore(container, footer);
  } else {
    mainApp.appendChild(container);
  }

  // Wire up event listeners for extension interactions
  setupExtensionListeners();
}

// ══════════════════════════════════════════════════════
// RENDER ALL EXTENSIONS
// ══════════════════════════════════════════════════════
function renderAllExtensions() {
  return `
    ${renderExtNav()}
    <div id="ext-section-gurumata" class="ext-section">${renderGurumataWill()}</div>
    <div id="ext-section-store" class="ext-section" style="display:none">${renderAffiliateStore()}</div>
    <div id="ext-section-learn" class="ext-section" style="display:none">${renderLearningModules()}</div>
    <div id="ext-section-nature" class="ext-section" style="display:none">${renderNatureGuide()}</div>
    <div id="ext-section-shivraj" class="ext-section" style="display:none">${renderShivrajSection()}</div>
    ${renderExtStyles()}
  `;
}

// ══════════════════════════════════════════════════════
// EXTENSION NAVIGATION BAR
// ══════════════════════════════════════════════════════
function renderExtNav() {
  const tabs = [
    { id: 'gurumata', emoji: '💛', label: "Gurumata's Will" },
    { id: 'store',    emoji: '🛒', label: 'Community Store' },
    { id: 'learn',    emoji: '📚', label: 'AI Learning' },
    { id: 'nature',   emoji: '🌿', label: 'Ashram Nature' },
    { id: 'shivraj',  emoji: '🔒', label: 'Shivraj' },
  ];
  return `
    <div class="ext-nav" id="ext-nav">
      <h3 class="ext-nav-title">🕉️ Community Features</h3>
      <div class="ext-nav-tabs">
        ${tabs.map((t, i) => `
          <button class="ext-tab-btn ${i === 0 ? 'active' : ''}" data-ext-tab="${t.id}">
            ${t.emoji} ${t.label}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════════════════
// GURUMATA'S WILL 💛
// ══════════════════════════════════════════════════════
const GURUMATA_TASKS = [
  {
    id: 'gm1',
    title: '🪬 Blessed Bangles for the Ladies',
    category: 'Sacred Gift',
    priority: 'high',
    description: `Gurumata's wish: Bangles are to be collected, blessed by Gurunath during his next available darshan, and then personally given to each of the ladies in the sangha. This is a sacred act of grace and love. The bangles should be simple, beautiful, and appropriate for daily wear. Ensure every lady receives one.`,
    seva_type: 'Sacred Service',
    status: 'pending',
    assigned_to: '',
  },
  {
    id: 'gm2',
    title: '🌸 Comfort & Happiness of the Ladies',
    category: 'Wellbeing',
    priority: 'high',
    description: `Gurunath does not want the ladies to be slacking or uncomfortable. Gurumata's spirit asks us to ensure all ladies in the ashram and in the community feel cared for, supported, and at ease during retreats and seva periods. Check in with them regularly. Assign comfortable seva tasks. Ensure they have everything they need.`,
    seva_type: 'Pastoral Care',
    status: 'pending',
    assigned_to: '',
  },
  {
    id: 'gm3',
    title: '🕯️ Daily Prayer Lamp (Diya) at Gurumata\'s Shrine',
    category: 'Sacred Ritual',
    priority: 'high',
    description: `A diya (oil lamp) should be lit every morning and evening at Gurumata's memorial shrine in the ashram. This is a continuous seva that should be assigned to a dedicated volunteer during each retreat season. The lamp is never to go out during retreat season.`,
    seva_type: 'Ritual Seva',
    status: 'pending',
    assigned_to: '',
  },
  {
    id: 'gm4',
    title: '📿 Malas Distributed to New Initiates',
    category: 'Sacred Gift',
    priority: 'medium',
    description: `Gurumata wished for all new initiates to receive a mala (prayer beads) at the time of their initiation. A stock of malas should be maintained at the ashram. A trusted Hamsa should be responsible for sourcing and blessing these before distribution.`,
    seva_type: 'Sacred Service',
    status: 'pending',
    assigned_to: '',
  },
  {
    id: 'gm5',
    title: '🌺 Fresh Flowers at Temple Daily',
    category: 'Sacred Ritual',
    priority: 'medium',
    description: `Fresh flowers at the temple altar every day during retreat season. Gurumata loved flowers and believed their presence in the temple kept the energy bright. Assign to a willing volunteer who enjoys this gentle seva.`,
    seva_type: 'Temple Seva',
    status: 'pending',
    assigned_to: '',
  },
  {
    id: 'gm6',
    title: '📖 Gurumata\'s Teachings Archive',
    category: 'Documentation',
    priority: 'medium',
    description: `Collect all available recordings, notes, and written teachings from Gurumata Shivangini. Digitize and archive them so future generations of Hamsas can access her wisdom. A tech-savvy volunteer should lead this project.`,
    seva_type: 'Admin Seva',
    status: 'pending',
    assigned_to: '',
  },
];

function renderGurumataWill() {
  const tasksHtml = GURUMATA_TASKS.map(t => `
    <div class="gm-task" id="gm-task-${t.id}">
      <div class="gm-task-header">
        <div>
          <h4 class="gm-task-title">${escapeHtml(t.title)}</h4>
          <div class="gm-task-meta">
            <span class="gm-badge gm-badge-${t.priority}">${t.priority}</span>
            <span class="gm-badge gm-badge-type">${escapeHtml(t.seva_type)}</span>
            <span class="gm-badge gm-badge-${t.status}">${t.status}</span>
          </div>
        </div>
      </div>
      <p class="gm-task-desc">${escapeHtml(t.description)}</p>
      <div class="gm-task-actions">
        <input class="gm-claim-input" id="claim-input-${t.id}" placeholder="Your Hamsa name to claim this seva..." />
        <button class="gm-claim-btn" data-gm-claim="${t.id}">🙏 Claim This Seva</button>
      </div>
    </div>
  `).join('');

  return `
    <div class="ext-content">
      <div class="ext-header">
        <span class="ext-icon">💛</span>
        <div>
          <h2 class="ext-title">Gurumata's Will — Sacred Tasks</h2>
          <p class="ext-subtitle">These are the wishes of Gurumata Shivangini. Honor her memory by completing them.</p>
        </div>
      </div>

      <div class="gm-tribute">
        <div class="gm-tribute-text">
          <em>"She is the beacon of support for the Hamsa Yoga Sangha. She is the one who teaches love through support. Koti koti pranam Guruma Shivangini."</em>
        </div>
      </div>

      <div class="gm-alert">
        ⚠️ Gurunath's instruction: <strong>The ladies must be comfortable and happy. They must not feel neglected or burdened.</strong> This is Gurumata's dearest wish.
      </div>

      <div class="gm-tasks">
        ${tasksHtml}
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════════════════
// AMAZON AFFILIATE STORE 🛒
// ══════════════════════════════════════════════════════
const AFFILIATE_TAG = 'siddhanath-21';

const STORE_ITEMS = [
  { name: 'Neem Soap Pack', cat: 'Bath', emoji: '🧼', kw: 'neem soap herbal ayurvedic 6 pack' },
  { name: 'Coconut Oil 500ml', cat: 'Bath', emoji: '🥥', kw: 'virgin coconut oil 500ml cold pressed' },
  { name: 'Herbal Toothpaste', cat: 'Bath', emoji: '🦷', kw: 'herbal toothpaste neem clove ayurvedic' },
  { name: 'Organic Ghee 500g', cat: 'Kitchen', emoji: '🍯', kw: 'a2 cow ghee organic 500g' },
  { name: 'Water Bottle 1L', cat: 'Kitchen', emoji: '💧', kw: 'stainless steel insulated water bottle 1 litre' },
  { name: 'Himalayan Salt 1kg', cat: 'Kitchen', emoji: '🧂', kw: 'himalayan pink salt 1kg natural' },
  { name: 'Toilet Paper ×10', cat: 'Home', emoji: '🧻', kw: 'toilet paper soft 10 pack' },
  { name: 'Jute Bags ×3', cat: 'Home', emoji: '🛍️', kw: 'jute shopping bags reusable 3 pack' },
  { name: 'Beeswax Candles', cat: 'Home', emoji: '🕯️', kw: 'beeswax candles natural 12 pack' },
  { name: 'Rudraksha Mala', cat: 'Spiritual', emoji: '📿', kw: '5 mukhi rudraksha mala 108 beads authentic' },
  { name: 'Incense Sampler', cat: 'Spiritual', emoji: '🌿', kw: 'incense sticks sandalwood rose nag champa variety' },
  { name: 'Puja Thali Set', cat: 'Spiritual', emoji: '🪔', kw: 'brass puja thali set diya plate ritual' },
  { name: 'Copper Tongue Scraper', cat: 'Health', emoji: '✨', kw: 'copper tongue scraper ayurvedic' },
  { name: 'Ashwagandha Caps', cat: 'Health', emoji: '💊', kw: 'ashwagandha ksm-66 organic capsules 500mg' },
  { name: 'Neti Pot Ceramic', cat: 'Health', emoji: '🫙', kw: 'ceramic neti pot nasal irrigation jala neti' },
  { name: 'Meditation Cushion', cat: 'Spiritual', emoji: '🧘', kw: 'meditation cushion zafu buckwheat cotton' },
];

function renderAffiliateStore() {
  const categories = ['All', 'Bath', 'Kitchen', 'Home', 'Spiritual', 'Health'];
  const items = STORE_ITEMS.map(p => {
    const url = `https://www.amazon.in/s?k=${encodeURIComponent(p.kw)}&tag=${AFFILIATE_TAG}`;
    return `
      <div class="store-card" data-cat="${p.cat}">
        <div class="store-emoji">${p.emoji}</div>
        <div class="store-name">${escapeHtml(p.name)}</div>
        <div class="store-cat">${p.cat}</div>
        <a class="store-btn" href="${url}" target="_blank" rel="noopener noreferrer">Buy on Amazon →</a>
      </div>
    `;
  }).join('');

  return `
    <div class="ext-content">
      <div class="ext-header">
        <span class="ext-icon">🛒</span>
        <div>
          <h2 class="ext-title">Community Store — Support the Ashram</h2>
          <p class="ext-subtitle">Buy daily essentials through our Amazon affiliate links. Commission goes directly to the ashram — at no extra cost to you.</p>
        </div>
      </div>
      <div class="store-info">
        💡 <strong>How it works:</strong> Click any product → buy normally on Amazon → 2-5% goes to the ashram. Hamsas buy together, ashram benefits automatically.
      </div>
      <div class="store-filters" id="store-filters">
        ${categories.map((c, i) => `<button class="store-filter-btn ${i===0?'active':''}" data-store-cat="${c}">${c}</button>`).join('')}
      </div>
      <div class="store-grid" id="store-grid">${items}</div>
      <div class="store-footer">Affiliate ID: ${AFFILIATE_TAG} · Amazon India Associates Program</div>
    </div>
  `;
}

// ══════════════════════════════════════════════════════
// AI LEARNING MODULES 📚
// ══════════════════════════════════════════════════════
const MODULES = [
  {
    id: 'hindi',
    emoji: '🇮🇳',
    title: 'Conversational Hindi',
    subtitle: 'Learn real daily Hindi used in India',
    price: '$17/month',
    color: '#FF9933',
    description: 'AI-powered Hindi tutor trained on everyday conversational phrases. Practice speaking, listening, and reading Hindi as it\'s actually spoken in India — not textbook Hindi.',
    features: ['Daily conversation practice', 'Pronunciation guidance', 'Common phrases used in the ashram', 'Devanagari script basics', 'Progress tracking'],
    sample: [
      { q: 'How do you say "I would like some chai"?', a: 'मुझे चाय चाहिए (Mujhe chai chahiye)' },
      { q: 'What does "seva" mean?', a: 'सेवा (Seva) = selfless service, done with love and devotion' },
    ],
  },
  {
    id: 'sanskrit',
    emoji: '🕉️',
    title: 'Bhagavad Gita Sanskrit',
    subtitle: 'Learn Sanskrit through sacred scripture',
    price: '$17/month',
    color: '#117743',
    description: 'Learn Sanskrit using the Bhagavad Gita as your textbook. Understand the shlokas in their original form, learn grammar through sacred context, and discover the deeper meanings of Gurunath\'s teachings.',
    features: ['Gita shloka breakdown', 'Sanskrit grammar through context', 'Word-by-word translation', 'Pronunciation with audio', 'Gurunath\'s commentary integration'],
    sample: [
      { q: 'What is the first shloka of the Gita?', a: '"Dharma-kshetre Kuru-kshetre samavetaa yuyutsavah..." — Field of Dharma, field of Kuru — the battle of life begins.' },
      { q: 'What does "Yoga" mean in Sanskrit?', a: 'यog (Yoga) = union, from root "yuj" — to join, to yoke. Union of individual self with cosmic consciousness.' },
    ],
  },
  {
    id: 'gurunath',
    emoji: '🌅',
    title: 'Gurunath\'s Teachings',
    subtitle: 'AI companion for Yogiraj Siddhanath\'s wisdom',
    price: '$17/month',
    color: '#c41e3a',
    description: 'An AI companion trained on Gurunath\'s teachings, books, and sacred sayings. Ask questions about Kriya Yoga, consciousness, spiritual evolution, and daily life guidance — answered in the spirit of Yogiraj Siddhanath.',
    features: ['4,941 sacred sayings searchable', '280 teaching sessions cross-referenced', 'Kriya Yoga technique guidance', 'Spiritual Q&A', 'Daily wisdom doses'],
    sample: [
      { q: 'What is Gurunath\'s teaching on inner peace?', a: '"Earth peace through self peace." Peace begins within. When you are at peace, you radiate peace to those around you.' },
      { q: 'What is the purpose of Kriya Yoga?', a: 'Kriya Yoga is the science of selfing into the Self — returning individual consciousness to its cosmic source.' },
    ],
  },
  {
    id: 'nature',
    emoji: '🌿',
    title: 'Ashram Nature Guide',
    subtitle: 'Flora, fauna & wildlife of Gurunath\'s ashram region',
    price: '$10/month',
    color: '#2d7d32',
    description: 'Discover the incredible natural world of the ashram region in Maharashtra, India. Learn about the trees, flowers, fruits, birds, and animals you encounter during your visits.',
    features: ['50+ local tree species', 'Ashram fruit trees identified', 'Bird species with calls', 'Medicinal plants guide', 'Monsoon ecosystem guide'],
    sample: [
      { q: 'What is the large tree near the temple?', a: 'Likely a Peepal (Ficus religiosa) — sacred in Hindu tradition, Buddhat attained enlightenment under one. Look for heart-shaped leaves with a long drip-tip.' },
      { q: 'What birds can I hear at dawn in the ashram?', a: 'Likely: Indian Paradise Flycatcher (long white tail), Asian Koel (loud melodic call), Common Myna, Spotted Owlet, and perhaps a Shikra hawk.' },
    ],
  },
];

function renderLearningModules() {
  const cards = MODULES.slice(0, 3).map(m => renderModuleCard(m)).join('');
  return `
    <div class="ext-content">
      <div class="ext-header">
        <span class="ext-icon">📚</span>
        <div>
          <h2 class="ext-title">AI Learning Modules</h2>
          <p class="ext-subtitle">Learn Hindi, Sanskrit, and Gurunath's teachings with AI. Revenue supports the ashram.</p>
        </div>
      </div>
      <div class="modules-grid">${cards}</div>
    </div>
  `;
}

function renderNatureGuide() {
  const mod = MODULES[3]; // nature guide
  const natureContent = renderNatureGuideContent();
  return `
    <div class="ext-content">
      <div class="ext-header">
        <span class="ext-icon">🌿</span>
        <div>
          <h2 class="ext-title">Ashram Nature Guide — ${mod.price}</h2>
          <p class="ext-subtitle">Discover the flora, fauna & wildlife of Gurunath's ashram region in Maharashtra, India</p>
        </div>
      </div>
      ${natureContent}
    </div>
  `;
}

function renderModuleCard(m) {
  const samples = m.sample.map(s => `
    <div class="module-sample">
      <div class="module-q">Q: ${escapeHtml(s.q)}</div>
      <div class="module-a">A: ${escapeHtml(s.a)}</div>
    </div>
  `).join('');

  return `
    <div class="module-card" style="border-top: 4px solid ${m.color}">
      <div class="module-emoji">${m.emoji}</div>
      <h3 class="module-title">${escapeHtml(m.title)}</h3>
      <div class="module-subtitle">${escapeHtml(m.subtitle)}</div>
      <div class="module-price" style="color:${m.color}">${m.price}</div>
      <p class="module-desc">${escapeHtml(m.description)}</p>
      <ul class="module-features">
        ${m.features.map(f => `<li>✓ ${escapeHtml(f)}</li>`).join('')}
      </ul>
      <div class="module-demo">
        <div class="module-demo-label">Sample lesson:</div>
        ${samples}
      </div>
      <button class="module-btn" style="background:${m.color}" data-module-id="${m.id}">
        Start Learning — ${m.price}
      </button>
    </div>
  `;
}

function renderNatureGuideContent() {
  const trees = [
    { name: 'Peepal (Sacred Fig)', latin: 'Ficus religiosa', emoji: '🌳', desc: 'Sacred tree under which Buddha attained enlightenment. Heart-shaped leaves, massive canopy. Found near temples.', use: 'Sacred, shade, oxygen' },
    { name: 'Banyan Tree', latin: 'Ficus benghalensis', emoji: '🌲', desc: 'India\'s national tree. Sends aerial roots that become new trunks. Can live thousands of years. Ancient symbol of immortality.', use: 'Sacred, meditation seat' },
    { name: 'Neem', latin: 'Azadirachta indica', emoji: '🌿', desc: 'Bitter leaves used for ayurvedic medicine, tooth cleaning, pest control. Produces small white flowers and olive-like fruits.', use: 'Medicine, purification' },
    { name: 'Mango', latin: 'Mangifera indica', emoji: '🥭', desc: 'India\'s national fruit. Ashrams often have mango groves. Sweet seasonal fruit in summer (April-June). Leaves used in Hindu rituals.', use: 'Food, ritual, shade' },
    { name: 'Coconut Palm', latin: 'Cocos nucifera', emoji: '🌴', desc: 'Provides coconut water, oil, and fiber. Essential in Hindu rituals and puja. Tall, unmistakable silhouette.', use: 'Food, ritual, oil' },
    { name: 'Bel Tree', latin: 'Aegle marmelos', emoji: '🍋', desc: 'Sacred to Lord Shiva. Three-leaflet leaves offered in puja. Fruits are used medicinally for digestion. Found near Shiva temples.', use: 'Sacred to Shiva, medicine' },
  ];

  const flowers = [
    { name: 'Lotus', emoji: '🌸', desc: 'Symbol of spiritual purity — grows in mud but blooms beautifully. Sacred to Brahma, Vishnu, and Lakshmi. White and pink varieties.' },
    { name: 'Jasmine (Mogra)', emoji: '🌼', desc: 'Intensely fragrant white flowers used in puja and offered to deities. Strung into garlands for abishek ceremonies.' },
    { name: 'Marigold (Genda)', emoji: '🌻', desc: 'Bright orange/yellow flowers used extensively in Hindu worship. Temple garlands, rangoli borders, and festival decorations.' },
    { name: 'Hibiscus (Jaswand)', emoji: '🌺', desc: 'Red hibiscus is sacred to Goddess Kali and Ganesha. Used in puja offerings.' },
  ];

  const birds = [
    { name: 'Indian Paradise Flycatcher', emoji: '🐦', desc: 'Male has spectacular long white tail (up to 30cm). Calls: sharp "tchwei tchwei". Found in wooded areas. Sacred bird of Maharashtra.' },
    { name: 'Asian Koel', emoji: '🎵', desc: 'Famous for its melodious rising call. Male is all-black, female is brown-spotted. Arrives with monsoon. Symbol of spring.' },
    { name: 'Spotted Owlet', emoji: '🦉', desc: 'Small brown owl with white spots, active at dusk. Often seen near old buildings. Considered auspicious in Hindu culture.' },
    { name: 'Common Myna', emoji: '🐦', desc: 'Bold brown bird with yellow beak and eye patches. Excellent mimic. Lives near humans. Pairs for life — symbol of fidelity.' },
    { name: 'Green Bee-eater', emoji: '💚', desc: 'Brilliant green with a long tail and blue throat. Often perches on wires in the sun. Catches insects in mid-air.' },
  ];

  const animals = [
    { name: 'Langur Monkey', emoji: '🐒', desc: 'Sacred grey langurs (Hanuman Langurs) are common near ashrams. Considered sacred as they are associated with Hanuman. Treat with respect.' },
    { name: 'Indian Cobra', emoji: '🐍', desc: 'Sacred to Lord Shiva (worn around neck in iconography). Present in rural Maharashtra. Give space, never disturb. Symbol of kundalini energy.' },
    { name: 'Indian Peacock', emoji: '🦚', desc: 'National bird of India. Sacred to Lord Murugan and Saraswati. Displays stunning tail feathers during monsoon mating season.' },
    { name: 'Mongoose', emoji: '🦡', desc: 'Small brown mammal, excellent at catching snakes. Associated with Kubera (wealth). Seen darting through garden undergrowth.' },
  ];

  return `
    <div class="nature-teaser">
      <div class="nature-teaser-badge">Free Preview</div>
      <div class="nature-tabs" id="nature-tabs">
        <button class="nature-tab active" data-nature-tab="trees">🌳 Trees</button>
        <button class="nature-tab" data-nature-tab="flowers">🌸 Flowers</button>
        <button class="nature-tab" data-nature-tab="birds">🐦 Birds</button>
        <button class="nature-tab" data-nature-tab="animals">🐒 Animals</button>
      </div>
      <div id="nature-tab-trees" class="nature-tab-content">
        ${trees.map(t => `
          <div class="nature-card">
            <div class="nature-emoji">${t.emoji}</div>
            <div class="nature-info">
              <div class="nature-name">${escapeHtml(t.name)}</div>
              <div class="nature-latin">${escapeHtml(t.latin)}</div>
              <div class="nature-desc">${escapeHtml(t.desc)}</div>
              <div class="nature-use">Use: ${escapeHtml(t.use)}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div id="nature-tab-flowers" class="nature-tab-content" style="display:none">
        ${flowers.map(f => `
          <div class="nature-card">
            <div class="nature-emoji">${f.emoji}</div>
            <div class="nature-info">
              <div class="nature-name">${escapeHtml(f.name)}</div>
              <div class="nature-desc">${escapeHtml(f.desc)}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div id="nature-tab-birds" class="nature-tab-content" style="display:none">
        ${birds.map(b => `
          <div class="nature-card">
            <div class="nature-emoji">${b.emoji}</div>
            <div class="nature-info">
              <div class="nature-name">${escapeHtml(b.name)}</div>
              <div class="nature-desc">${escapeHtml(b.desc)}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div id="nature-tab-animals" class="nature-tab-content" style="display:none">
        ${animals.map(a => `
          <div class="nature-card">
            <div class="nature-emoji">${a.emoji}</div>
            <div class="nature-info">
              <div class="nature-name">${escapeHtml(a.name)}</div>
              <div class="nature-desc">${escapeHtml(a.desc)}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="nature-cta">
        <div class="nature-cta-text">📚 Full guide includes 50+ trees, 40+ birds, medicinal plants, monsoon guide, and AI identification tool</div>
        <button class="module-btn" style="background:#2d7d32">Access Full Nature Guide — $10/month</button>
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════════════════
// SHIVRAJ PRIVATE SECTION 🔒
// ══════════════════════════════════════════════════════
let shivrajUnlocked = false;
const SHIVRAJ_CODE = 'shivraj2026';

function renderShivrajSection() {
  return `
    <div class="ext-content">
      <div id="shivraj-lock" class="shivraj-lock">
        <div class="lock-icon">🔒</div>
        <h2>Shivraj Sitole — Private Workspace</h2>
        <p>This section is restricted. Enter your access code to continue.</p>
        <div class="lock-form">
          <input type="password" id="shivraj-code-input" placeholder="Enter access code" />
          <button id="shivraj-unlock-btn" class="gm-claim-btn">Unlock</button>
        </div>
        <div id="shivraj-error" class="shivraj-error" style="display:none">Incorrect code. Contact Shivraj for access.</div>
      </div>
      <div id="shivraj-content" style="display:none">
        <h2>🔓 Welcome, Shivraj</h2>
        <div class="shivraj-notes">
          <div class="shivraj-note">
            <h3>⚡ Electrical Design Recommendations</h3>
            <ul>
              <li>Exposed wiring in main hall — URGENT safety hazard</li>
              <li>Full electrical audit needed before retreat season</li>
              <li>Volunteers can supervise only, not do live wiring</li>
              <li>Rewiring estimate for guest rooms: ₹80,000-1,20,000</li>
              <li>Ground all circuits properly — earth leakage is a real risk</li>
            </ul>
          </div>
          <div class="shivraj-note">
            <h3>🏗️ Civil Works Priority</h3>
            <ul>
              <li>Drainage redesign: French drains, trenching, soakaways</li>
              <li>Water tank float valve automation: ₹5,000/tank</li>
              <li>Estimated drainage project total: ₹2-3 crore</li>
              <li>Must fix drainage BEFORE solar panels or landscaping</li>
              <li>Monsoon habitability is currently impossible without this</li>
            </ul>
          </div>
          <div class="shivraj-note">
            <h3>📋 Project Tier Framework</h3>
            <p>Tier 1 (Volunteer Safe): Painting, gardening, cleaning, carpentry<br>
            Tier 2 (Expert Supervised): Tile work, basic plumbing fixtures<br>
            Tier 3 (Professional Only): Structural, live wiring, drainage design</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════════════════
// EVENT LISTENERS
// ══════════════════════════════════════════════════════
function setupExtensionListeners() {
  document.addEventListener('click', (e) => {
    // Extension tab switching
    if (e.target.matches('[data-ext-tab]')) {
      const tab = e.target.dataset.extTab;
      switchExtTab(tab);
    }

    // Store category filter
    if (e.target.matches('[data-store-cat]')) {
      const cat = e.target.dataset.storeCat;
      filterStore(cat, e.target);
    }

    // Nature tab switching
    if (e.target.matches('[data-nature-tab]')) {
      const tab = e.target.dataset.natureTab;
      switchNatureTab(tab, e.target);
    }

    // Gurumata claim
    if (e.target.matches('[data-gm-claim]')) {
      const taskId = e.target.dataset.gmClaim;
      claimGurumataTask(taskId);
    }

    // Shivraj unlock
    if (e.target.id === 'shivraj-unlock-btn') {
      unlockShivraj();
    }

    // Module buttons
    if (e.target.matches('[data-module-id]')) {
      const id = e.target.dataset.moduleId;
      alert(`🌟 ${id.charAt(0).toUpperCase() + id.slice(1)} module coming soon!\n\nPayment integration and AI backend will be wired up. Check back next release.`);
    }
  });

  // Shivraj code input enter key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.activeElement?.id === 'shivraj-code-input') {
      unlockShivraj();
    }
  });
}

function switchExtTab(tabId) {
  // Update buttons
  document.querySelectorAll('.ext-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.extTab === tabId);
  });
  // Show/hide sections
  document.querySelectorAll('.ext-section').forEach(sec => {
    sec.style.display = sec.id === `ext-section-${tabId}` ? '' : 'none';
  });
}

function filterStore(cat, btn) {
  document.querySelectorAll('.store-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.store-card').forEach(card => {
    card.style.display = (cat === 'All' || card.dataset.cat === cat) ? '' : 'none';
  });
}

function switchNatureTab(tab, btn) {
  document.querySelectorAll('.nature-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.nature-tab-content').forEach(c => {
    c.style.display = c.id === `nature-tab-${tab}` ? '' : 'none';
  });
}

function claimGurumataTask(taskId) {
  const input = document.getElementById(`claim-input-${taskId}`);
  if (!input || !input.value.trim()) {
    alert('Please enter your Hamsa name to claim this seva.');
    return;
  }
  const name = input.value.trim();
  const taskCard = document.getElementById(`gm-task-${taskId}`);
  if (taskCard) {
    const actionsDiv = taskCard.querySelector('.gm-task-actions');
    if (actionsDiv) {
      actionsDiv.innerHTML = `<div class="gm-claimed">🙏 Claimed by <strong>${escapeHtml(name)}</strong> — Jai Gurunath!</div>`;
    }
    const statusBadge = taskCard.querySelector('.gm-badge-pending');
    if (statusBadge) { statusBadge.textContent = 'claimed'; statusBadge.className = 'gm-badge gm-badge-claimed'; }
  }
}

function unlockShivraj() {
  const input = document.getElementById('shivraj-code-input');
  if (!input) return;
  if (input.value === SHIVRAJ_CODE) {
    document.getElementById('shivraj-lock').style.display = 'none';
    document.getElementById('shivraj-content').style.display = '';
  } else {
    document.getElementById('shivraj-error').style.display = '';
    input.value = '';
  }
}

// ══════════════════════════════════════════════════════
// UTILITY
// ══════════════════════════════════════════════════════
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ══════════════════════════════════════════════════════
// STYLES (injected inline to avoid extra CSS file)
// ══════════════════════════════════════════════════════
function renderExtStyles() {
  return `<style>
/* ── Extension Container ── */
#sk-extensions { margin-top: 2rem; }

/* ── Extension Nav ── */
.ext-nav { background: rgba(255,255,238,0.95); border: 1px solid #d9bfb7; padding: 1.2rem; margin-bottom: 0; }
.ext-nav-title { font-size: 0.8rem; font-weight: 700; color: #34345c; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.75rem; }
.ext-nav-tabs { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.ext-tab-btn { padding: 0.5rem 1rem; font-size: 0.75rem; border: 1px solid #d9bfb7; background: #ffffee; color: #34345c; cursor: pointer; border-radius: 20px; transition: all 0.2s; }
.ext-tab-btn.active, .ext-tab-btn:hover { background: #34345c; color: white; border-color: #34345c; }

/* ── Ext Section ── */
.ext-section { background: #ffffee; border: 1px solid #d9bfb7; padding: 1.5rem; }
.ext-content { max-width: 900px; margin: 0 auto; }
.ext-header { display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem; }
.ext-icon { font-size: 2.5rem; line-height: 1; }
.ext-title { font-size: 1.4rem; font-weight: 700; color: #34345c; margin: 0 0 0.25rem; }
.ext-subtitle { font-size: 0.85rem; color: #34345c99; margin: 0; }

/* ── Gurumata's Will ── */
.gm-tribute { background: #f0e0d6; border-left: 4px solid #c41e3a; padding: 1rem 1.5rem; margin-bottom: 1rem; font-style: italic; color: #34345c; }
.gm-tribute-text { font-size: 0.9rem; }
.gm-alert { background: #fff3cd; border: 1px solid #ffc107; padding: 0.75rem 1rem; border-radius: 4px; font-size: 0.85rem; color: #856404; margin-bottom: 1.5rem; }
.gm-tasks { display: flex; flex-direction: column; gap: 1rem; }
.gm-task { background: #f0e0d6; border: 1px solid #d9bfb7; padding: 1.25rem; }
.gm-task-title { font-size: 1rem; font-weight: 700; color: #34345c; margin: 0 0 0.5rem; }
.gm-task-meta { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.75rem; }
.gm-badge { font-size: 0.7rem; padding: 0.2rem 0.6rem; border-radius: 10px; font-weight: 600; text-transform: uppercase; }
.gm-badge-high { background: #c41e3a22; color: #c41e3a; border: 1px solid #c41e3a55; }
.gm-badge-medium { background: #ffa50022; color: #cc7700; border: 1px solid #ffa50055; }
.gm-badge-type { background: #34345c22; color: #34345c; border: 1px solid #34345c55; }
.gm-badge-pending { background: #d6daf0; color: #34345c; border: 1px solid #b7c5d9; }
.gm-badge-claimed { background: #11774322; color: #117743; border: 1px solid #11774355; }
.gm-task-desc { font-size: 0.85rem; color: #34345c; line-height: 1.6; margin-bottom: 1rem; }
.gm-task-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.gm-claim-input { flex: 1; min-width: 200px; padding: 0.5rem 0.75rem; font-size: 0.8rem; border: 1px solid #d9bfb7; background: #ffffee; color: #34345c; }
.gm-claim-btn { padding: 0.5rem 1rem; font-size: 0.8rem; background: #d6daf0; border: 1px solid #b7c5d9; color: #34345c; cursor: pointer; white-space: nowrap; }
.gm-claim-btn:hover { background: #eef2ff; }
.gm-claimed { font-size: 0.85rem; color: #117743; font-style: italic; padding: 0.5rem 0; }

/* ── Store ── */
.store-info { background: #f0e0d6; border: 1px solid #d9bfb7; padding: 0.75rem 1rem; font-size: 0.8rem; color: #34345c; margin-bottom: 1rem; }
.store-filters { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1rem; }
.store-filter-btn { padding: 0.35rem 0.9rem; font-size: 0.75rem; border: 1px solid #d9bfb7; background: #ffffee; color: #34345c; cursor: pointer; border-radius: 20px; }
.store-filter-btn.active { background: #34345c; color: white; border-color: #34345c; }
.store-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }
.store-card { background: #f0e0d6; border: 1px solid #d9bfb7; padding: 1rem; text-align: center; display: flex; flex-direction: column; gap: 0.3rem; }
.store-emoji { font-size: 2rem; }
.store-name { font-size: 0.8rem; font-weight: 600; color: #34345c; }
.store-cat { font-size: 0.65rem; color: #34345c88; text-transform: uppercase; }
.store-btn { display: block; margin-top: auto; padding: 0.5rem; background: #FF9900; color: white; font-size: 0.75rem; font-weight: 700; text-decoration: none; cursor: pointer; }
.store-btn:hover { background: #e88800; }
.store-footer { text-align: center; font-size: 0.7rem; color: #34345c88; margin-top: 0.5rem; }

/* ── Learning Modules ── */
.modules-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
.module-card { background: #f0e0d6; border: 1px solid #d9bfb7; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; }
.module-emoji { font-size: 2.5rem; }
.module-title { font-size: 1.1rem; font-weight: 700; color: #34345c; margin: 0; }
.module-subtitle { font-size: 0.8rem; color: #34345c99; }
.module-price { font-size: 1.2rem; font-weight: 700; }
.module-desc { font-size: 0.82rem; color: #34345c; line-height: 1.5; }
.module-features { list-style: none; padding: 0; margin: 0; font-size: 0.78rem; color: #34345c; }
.module-features li { padding: 0.15rem 0; }
.module-demo { background: #ffffee; border: 1px solid #d9bfb7; padding: 0.75rem; margin-top: 0.25rem; }
.module-demo-label { font-size: 0.7rem; font-weight: 700; color: #34345c88; text-transform: uppercase; margin-bottom: 0.5rem; }
.module-q { font-size: 0.78rem; color: #34345c; font-weight: 600; }
.module-a { font-size: 0.78rem; color: #117743; font-style: italic; margin-bottom: 0.5rem; }
.module-btn { padding: 0.75rem; color: white; font-size: 0.85rem; font-weight: 700; border: none; cursor: pointer; margin-top: auto; }
.module-btn:hover { opacity: 0.9; }

/* ── Nature Guide ── */
.nature-teaser { position: relative; }
.nature-teaser-badge { display: inline-block; background: #117743; color: white; font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.7rem; border-radius: 10px; margin-bottom: 0.75rem; text-transform: uppercase; }
.nature-tabs { display: flex; gap: 0.4rem; margin-bottom: 1rem; flex-wrap: wrap; }
.nature-tab { padding: 0.5rem 1rem; font-size: 0.8rem; border: 1px solid #d9bfb7; background: #ffffee; color: #34345c; cursor: pointer; border-radius: 20px; }
.nature-tab.active { background: #117743; color: white; border-color: #117743; }
.nature-tab-content { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem; }
.nature-card { display: flex; gap: 1rem; background: #f0e0d6; border: 1px solid #d9bfb7; padding: 0.75rem; align-items: flex-start; }
.nature-emoji { font-size: 2rem; flex-shrink: 0; }
.nature-name { font-weight: 700; font-size: 0.9rem; color: #34345c; }
.nature-latin { font-size: 0.75rem; color: #34345c88; font-style: italic; margin-bottom: 0.25rem; }
.nature-desc { font-size: 0.8rem; color: #34345c; line-height: 1.5; }
.nature-use { font-size: 0.75rem; color: #117743; margin-top: 0.2rem; }
.nature-cta { background: #1177431a; border: 1px solid #117743; padding: 1rem; text-align: center; margin-top: 1rem; }
.nature-cta-text { font-size: 0.85rem; color: #34345c; margin-bottom: 0.75rem; }

/* ── Shivraj ── */
.shivraj-lock { text-align: center; padding: 3rem 1rem; }
.lock-icon { font-size: 3rem; margin-bottom: 1rem; }
.lock-form { display: flex; gap: 0.5rem; justify-content: center; margin: 1rem 0; flex-wrap: wrap; }
.lock-form input { padding: 0.6rem 1rem; font-size: 0.9rem; border: 1px solid #d9bfb7; background: #ffffee; color: #34345c; }
.shivraj-error { color: #c41e3a; font-size: 0.85rem; }
.shivraj-notes { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; }
.shivraj-note { background: #f0e0d6; border: 1px solid #d9bfb7; padding: 1rem; }
.shivraj-note h3 { font-size: 0.95rem; color: #34345c; margin-bottom: 0.5rem; }
.shivraj-note ul { font-size: 0.85rem; color: #34345c; padding-left: 1.5rem; line-height: 1.8; }
  </style>`;
}
