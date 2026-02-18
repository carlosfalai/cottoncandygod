# Siddhanath Kriya Yoga — MVP Completion Roadmap

## Milestone 1: MVP Live at cottoncandygod.com

### Phase 1: Infrastructure & Auth (PRIORITY 1)
**Goal:** cottoncandygod.com is fully live with working Google login and real-time data

Requirements:
- [ ] INFRA-01: cottoncandygod.com resolves to the site (DNS propagated)
- [ ] AUTH-01: Google "Sign in" button works end-to-end
- [ ] AUTH-02: User profile saved to Supabase on first login
- [ ] BACKEND-01: AI chat responds (Render backend live with API key)
- [ ] BACKEND-02: Sangha feed posts load from Supabase

Success criteria:
1. User navigates to cottoncandygod.com and sees the site
2. User clicks "Sign in with Google", completes OAuth, sees their avatar
3. User posts to the sangha feed and sees it appear
4. User asks AI chat a question about Gurunath and gets a response

### Phase 2: Revenue — Stripe Payment Integration (PRIORITY 2)
**Goal:** Hamsas can subscribe to learning modules; revenue flows to ashram

Requirements:
- [ ] PAY-01: Hindi learning module ($17/mo) has working Stripe checkout
- [ ] PAY-02: Sanskrit/Gita module ($17/mo) has working Stripe checkout
- [ ] PAY-03: Gurunath teachings module ($17/mo) has working Stripe checkout
- [ ] PAY-04: Ashram Nature Guide ($10/mo) has working Stripe checkout
- [ ] PAY-05: Subscribed users see unlocked content
- [ ] PAY-06: Amazon affiliate links open with correct tag (siddhanath-21)

Success criteria:
1. User clicks "Start Learning — $17/month" → Stripe checkout opens
2. Test payment completes → user sees module content unlocked
3. Clicking Amazon products opens Amazon with affiliate tag in URL

### Phase 3: Community Features (PRIORITY 3)
**Goal:** Full community engagement — forum, profiles, seva tracking

Requirements:
- [ ] COMM-01: Forum tab — Hamsas post ideas/requests for the platform
- [ ] COMM-02: Hamsa profiles visible to other Hamsas (skills, WhatsApp if public)
- [ ] COMM-03: Gurumata's Will tasks can be claimed with name
- [ ] COMM-04: Satsang alerts send Telegram notification when Gurunath gathers
- [ ] COMM-05: Volunteer week signups visible

Success criteria:
1. User posts in forum, other users see the post
2. User adds profile with skills, toggles WhatsApp public/private
3. User claims a Gurumata's Will task, name shows as claimed
4. Admin posts satsang alert → Telegram notification sent

### Phase 4: Quality & Security (PRIORITY 4)
**Goal:** Production-ready, secure, performant

Requirements:
- [ ] SEC-01: All XSS fixes committed and deployed (from security audit)
- [ ] SEC-02: Cloudflare Worker has CORS locked to cottoncandygod.com
- [ ] SEC-03: Rate limiting on feedback endpoint
- [ ] PERF-01: Site loads under 3 seconds on mobile
- [ ] QUAL-01: All 12 features render without blank screens
- [ ] QUAL-02: GoDaddy API keys stored in .env for autonomous DNS management

Success criteria:
1. Security audit passes with no HIGH/CRITICAL issues
2. Site loads in < 3s on mobile (measured with browser DevTools)
3. All 12 nav sections load content without errors

---

## Phase Sequence
1 → 2 → 3 → 4

Start with Phase 1 (infrastructure) as it's required for everything else.

---
*Created: 2026-02-18 | Status: Phase 1 in progress*
