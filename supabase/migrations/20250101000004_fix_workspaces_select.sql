-- ============================================
-- FIX WORKSPACES SELECT POLICY
-- ============================================

-- Create helper function to check if user is member of workspace (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_workspace_member(workspace_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
    SELECT EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = workspace_uuid
        AND user_id = user_uuid
    );
$$;

-- Drop and recreate workspaces SELECT policy
DROP POLICY IF EXISTS "workspaces_select" ON workspaces;
CREATE POLICY "workspaces_select" ON workspaces
    FOR SELECT USING (
        public.is_workspace_member(id, auth.uid())
    );

-- Also fix workspaces UPDATE policy to use helper function
DROP POLICY IF EXISTS "workspaces_update" ON workspaces;
CREATE POLICY "workspaces_update" ON workspaces
    FOR UPDATE USING (
        public.is_workspace_owner_or_admin(id, auth.uid())
    );
