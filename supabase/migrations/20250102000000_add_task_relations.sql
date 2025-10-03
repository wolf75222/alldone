-- Migration: Add Task Relations
-- Epic 2 - Task Relations: blocks, depends, duplicates, relates

-- Create task_relations table
CREATE TABLE IF NOT EXISTS task_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  target_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('blocks', 'depends', 'duplicates', 'relates')),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id),
  UNIQUE(source_task_id, target_task_id, relation_type)
);

-- Add indexes for performance
CREATE INDEX idx_task_relations_source ON task_relations(source_task_id);
CREATE INDEX idx_task_relations_target ON task_relations(target_task_id);
CREATE INDEX idx_task_relations_type ON task_relations(relation_type);

-- Prevent self-reference
ALTER TABLE task_relations
  ADD CONSTRAINT task_relations_no_self_reference
  CHECK (source_task_id != target_task_id);

-- RLS Policies for task_relations
ALTER TABLE task_relations ENABLE ROW LEVEL SECURITY;

-- Users can view relations for tasks they have access to
CREATE POLICY "Users can view task relations in their workspaces"
  ON task_relations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
      WHERE t.id = task_relations.source_task_id
        AND wm.user_id = auth.uid()
    )
  );

-- Users can create relations for tasks in their workspaces
CREATE POLICY "Users can create task relations in their workspaces"
  ON task_relations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
      WHERE t.id = source_task_id
        AND wm.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM tasks t
      JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
      WHERE t.id = target_task_id
        AND wm.user_id = auth.uid()
    )
  );

-- Users can delete relations for tasks in their workspaces
CREATE POLICY "Users can delete task relations in their workspaces"
  ON task_relations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
      WHERE t.id = task_relations.source_task_id
        AND wm.user_id = auth.uid()
    )
  );

-- Function to check for circular dependencies in 'blocks' and 'depends' relations
-- This prevents creating circular dependency chains
CREATE OR REPLACE FUNCTION check_task_relation_cycles()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check for blocks and depends relations
  IF NEW.relation_type IN ('blocks', 'depends') THEN
    -- Check if adding this relation would create a cycle
    -- We use a recursive CTE to traverse the relation graph
    IF EXISTS (
      WITH RECURSIVE relation_chain AS (
        -- Start from the target task
        SELECT target_task_id AS task_id, 1 AS depth
        FROM task_relations
        WHERE id = NEW.id

        UNION ALL

        -- Follow the chain of relations
        SELECT tr.target_task_id, rc.depth + 1
        FROM task_relations tr
        INNER JOIN relation_chain rc ON rc.task_id = tr.source_task_id
        WHERE tr.relation_type IN ('blocks', 'depends')
          AND rc.depth < 100 -- Prevent infinite loops
      )
      SELECT 1 FROM relation_chain
      WHERE task_id = NEW.source_task_id
    ) THEN
      RAISE EXCEPTION 'Cannot create relation: would create a circular dependency';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate relations before insert
CREATE TRIGGER validate_task_relation_before_insert
  BEFORE INSERT ON task_relations
  FOR EACH ROW
  EXECUTE FUNCTION check_task_relation_cycles();

-- Comments
COMMENT ON TABLE task_relations IS 'Relations between tasks: blocks, depends, duplicates, relates';
COMMENT ON COLUMN task_relations.source_task_id IS 'The task that has the relation (e.g., Task A blocks Task B - A is source)';
COMMENT ON COLUMN task_relations.target_task_id IS 'The task being related to (e.g., Task A blocks Task B - B is target)';
COMMENT ON COLUMN task_relations.relation_type IS 'Type of relation: blocks (A blocks B), depends (A depends on B), duplicates (A duplicates B), relates (A relates to B)';
