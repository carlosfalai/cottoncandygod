-- ============================================
-- SIDDHANATH ASHRAM SANGHA - Database Schema
-- Shared Supabase project: gbxksgxezbljwlnlpkpz
-- All tables prefixed with ashram_
-- ============================================

-- 1. MEMBERS (registered via Telegram or app)
CREATE TABLE IF NOT EXISTS ashram_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE,
  name VARCHAR(100) NOT NULL,
  mode VARCHAR(10) DEFAULT 'remote' CHECK (mode IN ('physical', 'remote')),
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ashram_members_telegram ON ashram_members(telegram_id);

-- 2. POSTS (feed items: photos, satsangs, food prayer, meditations, trainings)
CREATE TABLE IF NOT EXISTS ashram_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES ashram_members(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN ('meditation', 'training', 'photo', 'satsang', 'food_prayer', 'broadcast')),
  content TEXT,
  photo_url TEXT,
  video_url TEXT,
  location VARCHAR(100),
  duration_minutes INTEGER,
  is_live BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ashram_posts_created ON ashram_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ashram_posts_type ON ashram_posts(type);
CREATE INDEX IF NOT EXISTS idx_ashram_posts_member ON ashram_posts(member_id);

-- 3. SEVA CHECK-INS
CREATE TABLE IF NOT EXISTS ashram_seva (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES ashram_members(id) ON DELETE CASCADE,
  seva_type VARCHAR(30) NOT NULL CHECK (seva_type IN ('bhojan', 'saucha', 'garden', 'puja', 'reception', 'laundry', 'maintenance', 'gurubhai', 'admin', 'rakhwali')),
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  checked_out_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_ashram_seva_member ON ashram_seva(member_id);
CREATE INDEX IF NOT EXISTS idx_ashram_seva_date ON ashram_seva(checked_in_at DESC);

-- 4. REACTIONS (heart/prayer on posts, unique per member per post)
CREATE TABLE IF NOT EXISTS ashram_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES ashram_posts(id) ON DELETE CASCADE,
  member_id UUID REFERENCES ashram_members(id) ON DELETE CASCADE,
  type VARCHAR(10) DEFAULT 'heart' CHECK (type IN ('heart', 'prayer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_ashram_reactions_post ON ashram_reactions(post_id);

-- 5. COMMENTS on posts
CREATE TABLE IF NOT EXISTS ashram_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES ashram_posts(id) ON DELETE CASCADE,
  member_id UUID REFERENCES ashram_members(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ashram_comments_post ON ashram_comments(post_id);

-- 6. ALERTS (global notifications)
CREATE TABLE IF NOT EXISTS ashram_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by UUID REFERENCES ashram_members(id),
  type VARCHAR(30) NOT NULL CHECK (type IN ('satsang', 'food_prayer', 'meditation', 'special')),
  title VARCHAR(200) NOT NULL,
  message TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ashram_alerts_created ON ashram_alerts(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE ashram_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ashram_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ashram_seva ENABLE ROW LEVEL SECURITY;
ALTER TABLE ashram_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ashram_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ashram_alerts ENABLE ROW LEVEL SECURITY;

-- Public read access (anon key) for all tables
CREATE POLICY "Public read ashram_members" ON ashram_members FOR SELECT USING (true);
CREATE POLICY "Public read ashram_posts" ON ashram_posts FOR SELECT USING (true);
CREATE POLICY "Public read ashram_seva" ON ashram_seva FOR SELECT USING (true);
CREATE POLICY "Public read ashram_reactions" ON ashram_reactions FOR SELECT USING (true);
CREATE POLICY "Public read ashram_comments" ON ashram_comments FOR SELECT USING (true);
CREATE POLICY "Public read ashram_alerts" ON ashram_alerts FOR SELECT USING (true);

-- Service role has full access by default (bypasses RLS)
-- All writes go through backend with service_role key

-- ============================================
-- SUPABASE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE ashram_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE ashram_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE ashram_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE ashram_comments;
