# Siddhanath Kriya Yoga — Community Platform

## What This Is

Community platform for the Hamsa Yoga Sangha (followers of Yogiraj Siddhanath / Gurunath).
Live at **cottoncandygod.com** — a single website covering spiritual learning, ashram management,
community networking, and revenue generation for the ashram.

## Core Value

**ONE thing that must work:** Hamsas worldwide can connect, contribute seva, support the ashram financially, and deepen their practice — all from one place.

## Current State (Brownfield)

### Validated (already live)
- ✓ Sacred Sayings — 4,941 quotes from Gurunath's teachings
- ✓ AI Chat — back-and-forth AI assistant (backend at siddhanath-ashram-sangha.onrender.com)
- ✓ Sangha feed — community posts with real-time Supabase
- ✓ Ashram clock — live India time
- ✓ Events calendar — auto-updates from siddhanath.org
- ✓ Feedback SMS — Twilio → Carlos's phone
- ✓ Billboard — scrolling community messages
- ✓ Google Sign-In — Supabase OAuth (code deployed, needs Supabase config)
- ✓ Gurumata's Will — 6 sacred seva tasks (with claim system)
- ✓ Amazon Affiliate Store — 16 products, revenue to ashram
- ✓ AI Learning Modules — Hindi $17/mo, Sanskrit/Gita $17/mo, Gurunath $17/mo (UI done, payment pending)
- ✓ Ashram Nature Guide — $10/mo (free preview live)
- ✓ Shivraj Private Section — password-protected workspace
- ✓ DNS configured — cottoncandygod.com → GitHub Pages (30-60 min propagation)
- ✓ Security fixes — XSS escaping, CORS, clickjacking headers
- ✓ GitHub deployment — carlosfalai/cottoncandygod auto-deploys on push

### Pending MVP
- ⏳ Supabase Google OAuth — needs Google provider enabled in Supabase dashboard
- ⏳ Stripe payment integration — for $17/mo and $10/mo learning modules
- ⏳ Backend verification — confirm Render service is live with AI key
- ⏳ GoDaddy API credentials — store real keys for autonomous DNS management
- ⏳ Forum tab — dedicated community forum section

## Tech Stack
- **Frontend:** Vanilla JS, HTML5, CSS3 (static site)
- **Hosting:** GitHub Pages (carlosfalai/cottoncandygod) → cottoncandygod.com
- **Backend API:** Node.js/Express on Render (siddhanath-ashram-sangha)
- **Database:** Supabase (gbxksgxezbljwlnlpkpz) — sangha posts, alerts, hamsa profiles
- **Auth:** Supabase Google OAuth
- **Payments:** Stripe (to be wired)
- **Notifications:** Twilio (SMS feedback), Telegram bot
- **Worker:** Cloudflare Worker (feedback SMS relay)

## Key Decisions
| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single vanilla JS site | No build step, instant deploys, mobile-friendly | ✓ Deployed |
| GitHub Pages hosting | Free, fast CDN, auto-deploy on push | ✓ Active |
| Supabase for auth + DB | Already in stack, Google OAuth built-in | Pending config |
| Extensions.js pattern | Adds features without touching core app.js | ✓ Working |
| cottoncandygod.com domain | Carlos's existing GoDaddy domain | ✓ DNS configured |

---
*Last updated: 2026-02-18 after brownfield initialization*
