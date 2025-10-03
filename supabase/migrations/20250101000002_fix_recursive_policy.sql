-- ============================================
-- FIX RECURSIVE RLS POLICY
-- ============================================

-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "Owners and admins can add members" ON workspace_members;
DROP POLICY IF EXISTS "Owners and admins can update members" ON workspace_members;

-- Create a helper function to check if user is owner/admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_workspace_owner_or_admin(workspace_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = workspace_uuid
        AND user_id = user_uuid
        AND role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a helper function to check if workspace has any members (bypasses RLS)
CREATE OR REPLACE FUNCTION public.workspace_has_members(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = workspace_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow inserting members if: first member OR user is owner/admin
CREATE POLICY "Allow workspace member insertion" ON workspace_members
    FOR INSERT WITH CHECK (
        NOT public.workspace_has_members(workspace_id)
        OR
        public.is_workspace_owner_or_admin(workspace_id, auth.uid())
    );

-- Allow updating members if user is owner/admin
CREATE POLICY "Allow workspace member updates" ON workspace_members
    FOR UPDATE USING (
        public.is_workspace_owner_or_admin(workspace_id, auth.uid())
    );
