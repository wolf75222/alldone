-- Migration: Add start_date to tasks table for Gantt View (Epic 5)
-- Created: 2025-10-02

-- Add start_date column to tasks table
ALTER TABLE tasks
ADD COLUMN start_date TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN tasks.start_date IS 'Task start date for Gantt view timeline scheduling';

-- Optional: Add index for performance when querying by date range
CREATE INDEX idx_tasks_start_date ON tasks(start_date) WHERE start_date IS NOT NULL;

-- Optional: Add check constraint to ensure start_date is before due_date when both are set
ALTER TABLE tasks
ADD CONSTRAINT chk_tasks_dates CHECK (
  start_date IS NULL OR
  due_date IS NULL OR
  start_date <= due_date
);
