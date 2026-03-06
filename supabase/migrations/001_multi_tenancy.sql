-- ============================================================
-- SalesBot Multi-Tenancy Migration
-- Phase 1: Schema + RLS + Edge Talent Backfill
-- ============================================================

-- 1. CREATE TENANTS TABLE
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  brand_color TEXT DEFAULT '#0066FF',
  twilio_sid TEXT,
  twilio_auth_token TEXT,
  twilio_phone TEXT,
  system_prompt TEXT,
  plan TEXT DEFAULT 'pro',
  is_active BOOLEAN DEFAULT true
);

-- 2. CREATE USER PROFILES TABLE (links auth.users to tenants)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  role TEXT NOT NULL DEFAULT 'owner',
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. CREATE API KEYS TABLE
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

-- 4. CREATE GLOBAL RULES TABLE (platform-wide, super admin only)
CREATE TABLE IF NOT EXISTS global_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'safety',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. INSERT EDGE TALENT AS TENANT #1
-- ============================================================
INSERT INTO tenants (slug, name, brand_color, plan)
VALUES ('edge-talent', 'Edge Talent', '#0066FF', 'enterprise')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 6. ADD tenant_id TO EXISTING TABLES
-- ============================================================

-- 6a. leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE leads SET tenant_id = (SELECT id FROM tenants WHERE slug = 'edge-talent') WHERE tenant_id IS NULL;
ALTER TABLE leads ALTER COLUMN tenant_id SET NOT NULL;

-- 6b. training_feedback
ALTER TABLE training_feedback ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE training_feedback SET tenant_id = (SELECT id FROM tenants WHERE slug = 'edge-talent') WHERE tenant_id IS NULL;
ALTER TABLE training_feedback ALTER COLUMN tenant_id SET NOT NULL;

-- 6c. knowledge_vectors
ALTER TABLE knowledge_vectors ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE knowledge_vectors SET tenant_id = (SELECT id FROM tenants WHERE slug = 'edge-talent') WHERE tenant_id IS NULL;
ALTER TABLE knowledge_vectors ALTER COLUMN tenant_id SET NOT NULL;

-- 6d. system_rules
ALTER TABLE system_rules ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE system_rules SET tenant_id = (SELECT id FROM tenants WHERE slug = 'edge-talent') WHERE tenant_id IS NULL;
ALTER TABLE system_rules ALTER COLUMN tenant_id SET NOT NULL;

-- 6e. ai_config
ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE ai_config SET tenant_id = (SELECT id FROM tenants WHERE slug = 'edge-talent') WHERE tenant_id IS NULL;
ALTER TABLE ai_config ALTER COLUMN tenant_id SET NOT NULL;

-- 6f. simulated_scenarios
ALTER TABLE simulated_scenarios ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE simulated_scenarios SET tenant_id = (SELECT id FROM tenants WHERE slug = 'edge-talent') WHERE tenant_id IS NULL;
ALTER TABLE simulated_scenarios ALTER COLUMN tenant_id SET NOT NULL;

-- ============================================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_training_feedback_tenant ON training_feedback(tenant_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_vectors_tenant ON knowledge_vectors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_system_rules_tenant ON system_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_config_tenant ON ai_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_simulated_scenarios_tenant ON simulated_scenarios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant ON user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);

-- ============================================================
-- 8. ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Helper function: get current user's tenant_id
-- NOTE: Must be in 'public' schema — Supabase restricts the 'auth' schema
CREATE OR REPLACE FUNCTION public.tenant_id() RETURNS UUID AS $$
  SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 8a. tenants — users can only see their own tenant
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_own" ON tenants FOR ALL
  USING (id = public.tenant_id());

-- 8b. user_profiles — users can only see profiles in their tenant
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON user_profiles FOR ALL
  USING (tenant_id = public.tenant_id());

-- 8c. leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON leads FOR ALL
  USING (tenant_id = public.tenant_id());

-- 8d. messages — isolated via lead's tenant
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON messages FOR ALL
  USING (lead_id IN (SELECT id FROM leads WHERE tenant_id = public.tenant_id()));

-- 8e. training_feedback
ALTER TABLE training_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON training_feedback FOR ALL
  USING (tenant_id = public.tenant_id());

-- 8f. knowledge_vectors
ALTER TABLE knowledge_vectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON knowledge_vectors FOR ALL
  USING (tenant_id = public.tenant_id());

-- 8g. system_rules
ALTER TABLE system_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON system_rules FOR ALL
  USING (tenant_id = public.tenant_id());

-- 8h. ai_config
ALTER TABLE ai_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON ai_config FOR ALL
  USING (tenant_id = public.tenant_id());

-- 8i. simulated_scenarios
ALTER TABLE simulated_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON simulated_scenarios FOR ALL
  USING (tenant_id = public.tenant_id());

-- 8j. api_keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON api_keys FOR ALL
  USING (tenant_id = public.tenant_id());

-- 8k. global_rules — readable by all authenticated users, writable only by super_admin
ALTER TABLE global_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "global_rules_read" ON global_rules FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "global_rules_write" ON global_rules FOR ALL
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'super_admin'
  );

-- ============================================================
-- 9. SERVICE ROLE BYPASS (for API routes using service key)
-- Supabase service_role key bypasses RLS automatically.
-- API routes that need cross-tenant access (webhooks, cron)
-- should use the service_role key, not anon key.
-- ============================================================
