import type { TaskRelation } from "@/lib/types/database.types";

interface Task {
  id: string;
  title: string;
  start_date: string | null;
  due_date: string | null;
  status: string;
}

interface TaskNode {
  id: string;
  duration: number; // in days
  earliestStart: number;
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  slack: number;
  dependencies: string[];
}

/**
 * Calculate the critical path for tasks with dependencies
 * Returns an array of task IDs that are on the critical path
 */
export function calculateCriticalPath(
  tasks: Task[],
  relations: TaskRelation[],
): string[] {
  // Filter tasks with dates
  const tasksWithDates = tasks.filter((t) => t.start_date && t.due_date);
  if (tasksWithDates.length === 0) return [];

  // Build task nodes with durations
  const taskNodes = new Map<string, TaskNode>();

  tasksWithDates.forEach((task) => {
    const start = new Date(task.start_date!);
    const end = new Date(task.due_date!);
    const duration = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Find dependencies (tasks that this task depends on or is blocked by)
    const dependencies = relations
      .filter(
        (r) =>
          r.target_task_id === task.id &&
          (r.relation_type === "blocks" || r.relation_type === "depends"),
      )
      .map((r) => r.source_task_id)
      .filter((id) => tasksWithDates.some((t) => t.id === id));

    taskNodes.set(task.id, {
      id: task.id,
      duration: Math.max(duration, 1), // minimum 1 day
      earliestStart: 0,
      earliestFinish: 0,
      latestStart: 0,
      latestFinish: 0,
      slack: 0,
      dependencies,
    });
  });

  // Forward pass - calculate earliest start and finish
  const processed = new Set<string>();
  const queue = Array.from(taskNodes.values()).filter(
    (node) => node.dependencies.length === 0,
  );

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (processed.has(node.id)) continue;

    // Calculate earliest start based on dependencies
    if (node.dependencies.length > 0) {
      node.earliestStart = Math.max(
        ...node.dependencies.map((depId) => {
          const depNode = taskNodes.get(depId);
          return depNode ? depNode.earliestFinish : 0;
        }),
      );
    }

    node.earliestFinish = node.earliestStart + node.duration;
    processed.add(node.id);

    // Add tasks that depend on this one to the queue
    Array.from(taskNodes.values()).forEach((n) => {
      if (n.dependencies.includes(node.id) && !processed.has(n.id)) {
        queue.push(n);
      }
    });
  }

  // Find project completion time (maximum earliest finish)
  const projectDuration = Math.max(
    ...Array.from(taskNodes.values()).map((node) => node.earliestFinish),
    0,
  );

  // Backward pass - calculate latest start and finish
  const processedBackward = new Set<string>();
  const backwardQueue = Array.from(taskNodes.values()).filter((node) => {
    // Find tasks that nothing depends on (end tasks)
    const hasDependents = Array.from(taskNodes.values()).some((n) =>
      n.dependencies.includes(node.id),
    );
    return !hasDependents;
  });

  // Initialize end tasks
  backwardQueue.forEach((node) => {
    node.latestFinish = projectDuration;
    node.latestStart = node.latestFinish - node.duration;
  });

  while (backwardQueue.length > 0) {
    const node = backwardQueue.shift()!;
    if (processedBackward.has(node.id)) continue;

    processedBackward.add(node.id);

    // Update tasks that this task depends on
    node.dependencies.forEach((depId) => {
      const depNode = taskNodes.get(depId);
      if (!depNode) return;

      if (depNode.latestFinish === 0 || node.latestStart < depNode.latestFinish) {
        depNode.latestFinish = node.latestStart;
        depNode.latestStart = depNode.latestFinish - depNode.duration;
        backwardQueue.push(depNode);
      }
    });
  }

  // Calculate slack and identify critical path
  const criticalPath: string[] = [];

  taskNodes.forEach((node) => {
    node.slack = node.latestStart - node.earliestStart;

    // Tasks with zero or near-zero slack are on the critical path
    if (node.slack <= 0.01) {
      criticalPath.push(node.id);
    }
  });

  return criticalPath;
}

/**
 * Get dependency connections for visualization
 */
export function getDependencyConnections(
  tasks: Task[],
  relations: TaskRelation[],
): Array<{
  from: string;
  to: string;
  type: "blocks" | "depends";
}> {
  const connections: Array<{
    from: string;
    to: string;
    type: "blocks" | "depends";
  }> = [];

  const taskIds = new Set(tasks.map((t) => t.id));

  relations.forEach((relation) => {
    if (
      (relation.relation_type === "blocks" ||
        relation.relation_type === "depends") &&
      taskIds.has(relation.source_task_id) &&
      taskIds.has(relation.target_task_id)
    ) {
      connections.push({
        from: relation.source_task_id,
        to: relation.target_task_id,
        type: relation.relation_type,
      });
    }
  });

  return connections;
}
