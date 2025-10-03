-- Add parent_project_id to projects table for sub-projects
ALTER TABLE projects ADD COLUMN parent_project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Add parent_task_id to tasks table for sub-tasks
ALTER TABLE tasks ADD COLUMN parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

-- Create index for better performance on hierarchical queries
CREATE INDEX idx_projects_parent_project_id ON projects(parent_project_id);
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id);

-- Add check constraints to prevent circular references (basic level)
-- Note: More complex circular reference detection would need triggers
ALTER TABLE projects ADD CONSTRAINT projects_no_self_reference CHECK (id != parent_project_id);
ALTER TABLE tasks ADD CONSTRAINT tasks_no_self_reference CHECK (id != parent_task_id);

-- Update RLS policies to handle hierarchical permissions
-- Projects can be viewed if user has access to the workspace
DROP POLICY IF EXISTS "projects_select" ON projects;
CREATE POLICY "projects_select" ON projects
    FOR SELECT USING (
        public.is_workspace_member(workspace_id, auth.uid())
    );

-- Tasks can be viewed if user has access to the workspace
DROP POLICY IF EXISTS "tasks_select" ON tasks;
CREATE POLICY "tasks_select" ON tasks
    FOR SELECT USING (
        public.is_workspace_member(workspace_id, auth.uid())
    );

-- Projects can be inserted if user is workspace member
DROP POLICY IF EXISTS "projects_insert" ON projects;
CREATE POLICY "projects_insert" ON projects
    FOR INSERT WITH CHECK (
        public.is_workspace_member(workspace_id, auth.uid())
    );

-- Tasks can be inserted if user is workspace member
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
CREATE POLICY "tasks_insert" ON tasks
    FOR INSERT WITH CHECK (
        public.is_workspace_member(workspace_id, auth.uid())
    );

-- Projects can be updated by workspace members
DROP POLICY IF EXISTS "projects_update" ON projects;
CREATE POLICY "projects_update" ON projects
    FOR UPDATE USING (
        public.is_workspace_member(workspace_id, auth.uid())
    );

-- Tasks can be updated by workspace members
DROP POLICY IF EXISTS "tasks_update" ON tasks;
CREATE POLICY "tasks_update" ON tasks
    FOR UPDATE USING (
        public.is_workspace_member(workspace_id, auth.uid())
    );

-- Projects can be deleted by workspace members
DROP POLICY IF EXISTS "projects_delete" ON projects;
CREATE POLICY "projects_delete" ON projects
    FOR DELETE USING (
        public.is_workspace_member(workspace_id, auth.uid())
    );

-- Tasks can be deleted by workspace members
DROP POLICY IF EXISTS "tasks_delete" ON tasks;
CREATE POLICY "tasks_delete" ON tasks
    FOR DELETE USING (
        public.is_workspace_member(workspace_id, auth.uid())
    );
