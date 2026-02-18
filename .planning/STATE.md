# Project State

## Current Position
- **Milestone:** 1 — MVP Live
- **Current Phase:** 1 — Infrastructure & Auth
- **Status:** In Progress
- **Last Action:** DNS A records added to GoDaddy (185.199.108/109/110/111.153)

## What's Done
- [x] Site deployed to GitHub Pages (carlosfalai/cottoncandygod)
- [x] cottoncandygod.com domain configured on GitHub Pages
- [x] DNS updated: 4 A records + www CNAME → carlosfalai.github.io
- [x] Google login code deployed (Supabase OAuth)
- [x] Security fixes deployed (XSS, CORS, clickjacking)
- [x] All 12 features built and passing smoke tests (12/12)

## Blocking Issues
- Supabase Google OAuth: needs Google provider enabled at supabase.com → project → Auth → Providers
- Backend (siddhanath-ashram-sangha.onrender.com): needs verification it's running with AI API key

## Key Decisions
- Domain: cottoncandygod.com (Carlos's GoDaddy)
- Hosting: GitHub Pages (free, auto-deploy)
- Auth: Supabase Google OAuth (already in stack)
- Payments: Stripe (to be wired in Phase 2)
- Extensions pattern: extensions.js adds features without touching app.js

## Credentials Needed
- GODADDY_API_KEY / GODADDY_API_SECRET: real keys needed in .env
- STRIPE_PUBLIC_KEY: needed for Phase 2
- SUPABASE_GOOGLE_CLIENT_ID: needed to enable Google OAuth

---
*Updated: 2026-02-18*
