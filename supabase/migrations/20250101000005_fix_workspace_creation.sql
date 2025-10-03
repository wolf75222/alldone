-- ============================================
-- FIX WORKSPACE CREATION (chicken-egg problem)
-- ============================================

-- Add created_by column to workspaces table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workspaces'
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE workspaces ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Drop and recreate workspaces INSERT policy to set created_by
DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
CREATE POLICY "workspaces_insert" ON workspaces
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND created_by = auth.uid()
    );

-- Drop and recreate workspaces SELECT policy to allow viewing own workspaces
-- Either user is member OR user created it (temporary until they add themselves as member)
DROP POLICY IF EXISTS "workspaces_select" ON workspaces;
CREATE POLICY "workspaces_select" ON workspaces
    FOR SELECT USING (
        public.is_workspace_member(id, auth.uid())
        OR created_by = auth.uid()
    );
