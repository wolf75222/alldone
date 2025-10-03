-- ============================================
-- FIX RLS POLICIES
-- ============================================

-- Users: Allow insert for new users (fallback if trigger fails)
CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (id = auth.uid());

-- Workspaces: Allow authenticated users to create workspaces
CREATE POLICY "Authenticated users can create workspaces" ON workspaces
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Workspaces: Allow owners to update their workspaces
CREATE POLICY "Owners can update workspaces" ON workspaces
    FOR UPDATE USING (
        id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = auth.uid()
            AND role = 'owner'
        )
    );

-- Workspace Members: Allow owners/admins to add members
CREATE POLICY "Owners and admins can add members" ON workspace_members
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
        OR
        -- Allow first member (creator) to add themselves
        NOT EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = workspace_members.workspace_id
        )
    );

-- Workspace Members: Allow owners/admins to update member roles
CREATE POLICY "Owners and admins can update members" ON workspace_members
    FOR UPDATE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- Workspace Members: Allow owners to remove members
CREATE POLICY "Owners can remove members" ON workspace_members
    FOR DELETE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = auth.uid()
            AND role = 'owner'
        )
    );
