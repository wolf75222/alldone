"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/lib/types/database.types";

type TaskRelation = Database["public"]["Tables"]["task_relations"]["Row"];

export function useTaskRelations(workspaceId: string | undefined) {
  const [relations, setRelations] = useState<TaskRelation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) {
      setRelations([]);
      setLoading(false);
      return;
    }

    const supabase = createClient();

    async function fetchRelations() {
      try {
        // Get all relations for tasks in this workspace
        const { data: tasksData } = await supabase
          .from("tasks")
          .select("id")
          .eq("workspace_id", workspaceId);

        if (!tasksData || tasksData.length === 0) {
          setRelations([]);
          return;
        }

        const taskIds = tasksData.map((t) => t.id);

        const { data, error } = await supabase
          .from("task_relations")
          .select("*")
          .or(
            `source_task_id.in.(${taskIds.join(",")}),target_task_id.in.(${taskIds.join(",")})`,
          );

        if (error) throw error;
        setRelations(data || []);
      } catch (error) {
        console.error("Error fetching task relations:", error);
        setRelations([]);
      } finally {
        setLoading(false);
      }
    }

    fetchRelations();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`task_relations:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_relations",
        },
        () => {
          fetchRelations();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [workspaceId]);

  return { relations, loading };
}

// Helper function to get relation warnings for a task
export function getTaskRelationWarnings(
  taskId: string,
  taskStatus: string,
  relations: TaskRelation[],
  allTasks: Array<{ id: string; status: string; title: string }>,
): Array<{ type: "error" | "warning" | "info"; message: string }> {
  const warnings: Array<{
    type: "error" | "warning" | "info";
    message: string;
  }> = [];

  // Check if task is blocked by incomplete tasks
  const blockedBy = relations.filter(
    (r) => r.target_task_id === taskId && r.relation_type === "blocks",
  );
  for (const rel of blockedBy) {
    const blockingTask = allTasks.find((t) => t.id === rel.source_task_id);
    if (
      blockingTask &&
      blockingTask.status !== "done" &&
      (taskStatus === "in_progress" || taskStatus === "done")
    ) {
      warnings.push({
        type: "error",
        message: `Blocked by "${blockingTask.title}" (${blockingTask.status})`,
      });
    }
  }

  // Check if task blocks others but is not done
  const blocks = relations.filter(
    (r) => r.source_task_id === taskId && r.relation_type === "blocks",
  );
  for (const rel of blocks) {
    const blockedTask = allTasks.find((t) => t.id === rel.target_task_id);
    if (
      blockedTask &&
      (blockedTask.status === "in_progress" || blockedTask.status === "done") &&
      taskStatus !== "done"
    ) {
      warnings.push({
        type: "warning",
        message: `Blocks "${blockedTask.title}" which is already ${blockedTask.status}`,
      });
    }
  }

  // Check dependencies
  const dependsOn = relations.filter(
    (r) => r.source_task_id === taskId && r.relation_type === "depends",
  );
  for (const rel of dependsOn) {
    const dependencyTask = allTasks.find((t) => t.id === rel.target_task_id);
    if (
      dependencyTask &&
      dependencyTask.status !== "done" &&
      taskStatus === "done"
    ) {
      warnings.push({
        type: "warning",
        message: `Depends on "${dependencyTask.title}" (${dependencyTask.status})`,
      });
    }
  }

  return warnings;
}
