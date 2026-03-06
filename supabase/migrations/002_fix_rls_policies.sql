-- ============================================================
-- RLS Policy Fix — Run this in Supabase SQL Editor
-- This ensures all policies are in place after partial migration
-- ============================================================

-- 1. Create the helper function (if it doesn't exist)
CREATE OR REPLACE FUNCTION public.tenant_id() RETURNS UUID AS $$
  SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 2. Drop any existing policies to avoid conflicts
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename FROM pg_policies 
        WHERE schemaname = 'public' 
        AND policyname LIKE 'tenant_%' OR policyname LIKE 'users_%' OR policyname LIKE 'global_%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 3. Ensure RLS is enabled on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulated_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_rules ENABLE ROW LEVEL SECURITY;

-- 4. Create all policies

-- user_profiles: users can read their OWN row (breaks circular dependency)
CREATE POLICY "users_read_own" ON user_profiles FOR SELECT
  USING (id = auth.uid());
CREATE POLICY "users_tenant_write" ON user_profiles FOR INSERT
  USING (id = auth.uid());
CREATE POLICY "users_tenant_update" ON user_profiles FOR UPDATE
  USING (id = auth.uid());

-- tenants: users can see their own tenant
CREATE POLICY "tenant_own" ON tenants FOR SELECT
  USING (id = public.tenant_id());

-- leads
CREATE POLICY "tenant_leads" ON leads FOR ALL
  USING (tenant_id = public.tenant_id());

-- messages (via lead's tenant)
CREATE POLICY "tenant_messages" ON messages FOR ALL
  USING (lead_id IN (SELECT id FROM leads WHERE tenant_id = public.tenant_id()));

-- training_feedback
CREATE POLICY "tenant_feedback" ON training_feedback FOR ALL
  USING (tenant_id = public.tenant_id());

-- knowledge_vectors
CREATE POLICY "tenant_knowledge" ON knowledge_vectors FOR ALL
  USING (tenant_id = public.tenant_id());

-- system_rules
CREATE POLICY "tenant_rules" ON system_rules FOR ALL
  USING (tenant_id = public.tenant_id());

-- ai_config
CREATE POLICY "tenant_config" ON ai_config FOR ALL
  USING (tenant_id = public.tenant_id());

-- simulated_scenarios
CREATE POLICY "tenant_scenarios" ON simulated_scenarios FOR ALL
  USING (tenant_id = public.tenant_id());

-- api_keys
CREATE POLICY "tenant_apikeys" ON api_keys FOR ALL
  USING (tenant_id = public.tenant_id());

-- global_rules: readable by all authenticated, writable by super_admin
CREATE POLICY "global_rules_read" ON global_rules FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 5. Verify: Check tenant and profile exist
-- ============================================================
SELECT t.id as tenant_id, t.slug, t.name, up.id as user_id, up.role 
FROM tenants t 
LEFT JOIN user_profiles up ON up.tenant_id = t.id
WHERE t.slug = 'edge-talent';
