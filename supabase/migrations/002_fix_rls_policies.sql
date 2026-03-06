-- ============================================================
-- RLS Policy Fix — Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create the helper function
CREATE OR REPLACE FUNCTION public.tenant_id() RETURNS UUID AS $$
  SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 2. Drop ALL existing custom policies to start clean
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 3. Ensure RLS is enabled
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

-- 4. user_profiles (SELECT uses USING, INSERT uses WITH CHECK)
CREATE POLICY "users_read_own" ON user_profiles FOR SELECT
  USING (id = auth.uid());
CREATE POLICY "users_insert_own" ON user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());
CREATE POLICY "users_update_own" ON user_profiles FOR UPDATE
  USING (id = auth.uid());

-- 5. tenants
CREATE POLICY "tenant_own_select" ON tenants FOR SELECT
  USING (id = public.tenant_id());

-- 6. leads (USING for SELECT/UPDATE/DELETE, WITH CHECK for INSERT)
CREATE POLICY "tenant_leads_select" ON leads FOR SELECT
  USING (tenant_id = public.tenant_id());
CREATE POLICY "tenant_leads_insert" ON leads FOR INSERT
  WITH CHECK (tenant_id = public.tenant_id());
CREATE POLICY "tenant_leads_update" ON leads FOR UPDATE
  USING (tenant_id = public.tenant_id());
CREATE POLICY "tenant_leads_delete" ON leads FOR DELETE
  USING (tenant_id = public.tenant_id());

-- 7. messages (via lead's tenant)
CREATE POLICY "tenant_messages_select" ON messages FOR SELECT
  USING (lead_id IN (SELECT id FROM leads WHERE tenant_id = public.tenant_id()));
CREATE POLICY "tenant_messages_insert" ON messages FOR INSERT
  WITH CHECK (lead_id IN (SELECT id FROM leads WHERE tenant_id = public.tenant_id()));
CREATE POLICY "tenant_messages_update" ON messages FOR UPDATE
  USING (lead_id IN (SELECT id FROM leads WHERE tenant_id = public.tenant_id()));
CREATE POLICY "tenant_messages_delete" ON messages FOR DELETE
  USING (lead_id IN (SELECT id FROM leads WHERE tenant_id = public.tenant_id()));

-- 8. training_feedback
CREATE POLICY "tenant_feedback_select" ON training_feedback FOR SELECT
  USING (tenant_id = public.tenant_id());
CREATE POLICY "tenant_feedback_insert" ON training_feedback FOR INSERT
  WITH CHECK (tenant_id = public.tenant_id());
CREATE POLICY "tenant_feedback_update" ON training_feedback FOR UPDATE
  USING (tenant_id = public.tenant_id());
CREATE POLICY "tenant_feedback_delete" ON training_feedback FOR DELETE
  USING (tenant_id = public.tenant_id());

-- 9. knowledge_vectors
CREATE POLICY "tenant_knowledge_select" ON knowledge_vectors FOR SELECT
  USING (tenant_id = public.tenant_id());
CREATE POLICY "tenant_knowledge_insert" ON knowledge_vectors FOR INSERT
  WITH CHECK (tenant_id = public.tenant_id());
CREATE POLICY "tenant_knowledge_update" ON knowledge_vectors FOR UPDATE
  USING (tenant_id = public.tenant_id());
CREATE POLICY "tenant_knowledge_delete" ON knowledge_vectors FOR DELETE
  USING (tenant_id = public.tenant_id());

-- 10. system_rules
CREATE POLICY "tenant_rules_select" ON system_rules FOR SELECT
  USING (tenant_id = public.tenant_id());
CREATE POLICY "tenant_rules_insert" ON system_rules FOR INSERT
  WITH CHECK (tenant_id = public.tenant_id());
CREATE POLICY "tenant_rules_update" ON system_rules FOR UPDATE
  USING (tenant_id = public.tenant_id());
CREATE POLICY "tenant_rules_delete" ON system_rules FOR DELETE
  USING (tenant_id = public.tenant_id());

-- 11. ai_config
CREATE POLICY "tenant_config_select" ON ai_config FOR SELECT
  USING (tenant_id = public.tenant_id());
CREATE POLICY "tenant_config_insert" ON ai_config FOR INSERT
  WITH CHECK (tenant_id = public.tenant_id());
CREATE POLICY "tenant_config_update" ON ai_config FOR UPDATE
  USING (tenant_id = public.tenant_id());

-- 12. simulated_scenarios
CREATE POLICY "tenant_scenarios_select" ON simulated_scenarios FOR SELECT
  USING (tenant_id = public.tenant_id());
CREATE POLICY "tenant_scenarios_insert" ON simulated_scenarios FOR INSERT
  WITH CHECK (tenant_id = public.tenant_id());
CREATE POLICY "tenant_scenarios_update" ON simulated_scenarios FOR UPDATE
  USING (tenant_id = public.tenant_id());
CREATE POLICY "tenant_scenarios_delete" ON simulated_scenarios FOR DELETE
  USING (tenant_id = public.tenant_id());

-- 13. api_keys
CREATE POLICY "tenant_apikeys_select" ON api_keys FOR SELECT
  USING (tenant_id = public.tenant_id());
CREATE POLICY "tenant_apikeys_insert" ON api_keys FOR INSERT
  WITH CHECK (tenant_id = public.tenant_id());
CREATE POLICY "tenant_apikeys_delete" ON api_keys FOR DELETE
  USING (tenant_id = public.tenant_id());

-- 14. global_rules (readable by all authenticated)
CREATE POLICY "global_rules_read" ON global_rules FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 15. Verify
-- ============================================================
SELECT t.id as tenant_id, t.slug, t.name, up.id as user_id, up.role 
FROM tenants t 
LEFT JOIN user_profiles up ON up.tenant_id = t.id
WHERE t.slug = 'edge-talent';
