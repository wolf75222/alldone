-- ============================================
-- CLEAN SLATE: DROP ALL POLICIES AND RECREATE PROPERLY
-- ============================================

-- Drop ALL existing policies on workspace_members
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Owners and admins can add members" ON workspace_members;
DROP POLICY IF EXISTS "Owners and admins can update members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can remove members" ON workspace_members;
DROP POLICY IF EXISTS "Allow workspace member insertion" ON workspace_members;
DROP POLICY IF EXISTS "Allow workspace member updates" ON workspace_members;

-- Drop existing helper functions if they exist
DROP FUNCTION IF EXISTS public.is_workspace_owner_or_admin(UUID, UUID);
DROP FUNCTION IF EXISTS public.workspace_has_members(UUID);

-- Create helper functions with SECURITY DEFINER to bypass RLS
-- These functions run with the privileges of the function owner (postgres)
-- and are not subject to RLS policies
CREATE OR REPLACE FUNCTION public.is_workspace_owner_or_admin(workspace_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
    SELECT EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = workspace_uuid
        AND user_id = user_uuid
        AND role IN ('owner', 'admin')
    );
$$;

CREATE OR REPLACE FUNCTION public.workspace_has_members(workspace_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
    SELECT EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = workspace_uuid
        LIMIT 1
    );
$$;

-- Workspace Members Policies (using helper functions to avoid recursion)

-- SELECT: Users can see members of workspaces they belong to
CREATE POLICY "workspace_members_select" ON workspace_members
    FOR SELECT USING (
        public.is_workspace_owner_or_admin(workspace_id, auth.uid())
        OR user_id = auth.uid()
    );

-- INSERT: First member can add themselves, or existing owner/admin can add others
CREATE POLICY "workspace_members_insert" ON workspace_members
    FOR INSERT WITH CHECK (
        NOT public.workspace_has_members(workspace_id)
        OR public.is_workspace_owner_or_admin(workspace_id, auth.uid())
    );

-- UPDATE: Only owners/admins can update member roles
CREATE POLICY "workspace_members_update" ON workspace_members
    FOR UPDATE USING (
        public.is_workspace_owner_or_admin(workspace_id, auth.uid())
    );

-- DELETE: Only owners can remove members (use helper function)
CREATE POLICY "workspace_members_delete" ON workspace_members
    FOR DELETE USING (
        public.is_workspace_owner_or_admin(workspace_id, auth.uid())
    );

-- Users table policies (if not already exists)
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
CREATE POLICY "users_insert" ON users
    FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "users_select" ON users
    FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "users_update" ON users
    FOR UPDATE USING (id = auth.uid());

-- Workspaces policies
DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON workspaces;
CREATE POLICY "workspaces_insert" ON workspaces
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view their workspace" ON workspaces;
CREATE POLICY "workspaces_select" ON workspaces
    FOR SELECT USING (
        id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Owners can update workspaces" ON workspaces;
CREATE POLICY "workspaces_update" ON workspaces
    FOR UPDATE USING (
        id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = auth.uid()
            AND role = 'owner'
        )
    );
