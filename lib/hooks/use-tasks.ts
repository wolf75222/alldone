"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Database } from "@/lib/types/database.types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];
type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

export function useTasks(workspaceId?: string, projectId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    async function fetchTasks() {
      try {
        let query = supabase
          .from("tasks")
          .select("*")
          .eq("workspace_id", workspaceId);

        if (projectId) {
          query = query.eq("project_id", projectId);
        }

        const { data, error } = await query.order("created_at", {
          ascending: false,
        });

        if (error) throw error;
        setTasks(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchTasks();

    // Subscribe to realtime changes
    const channelName = projectId
      ? `tasks:${workspaceId}:${projectId}`
      : `tasks:${workspaceId}`;

    const filter = projectId
      ? `workspace_id=eq.${workspaceId}&project_id=eq.${projectId}`
      : `workspace_id=eq.${workspaceId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTasks((prev) => [payload.new as Task, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === payload.new.id ? (payload.new as Task) : t,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, projectId]);

  return { tasks, loading, error, setTasks };
}

export function useTask(taskId?: string) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!taskId) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    async function fetchTask() {
      try {
        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("id", taskId)
          .single();

        if (error) throw error;
        setTask(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchTask();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`task:${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tasks",
          filter: `id=eq.${taskId}`,
        },
        (payload) => {
          setTask(payload.new as Task);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId]);

  return { task, loading, error };
}

// CRUD operations
export async function createTask(task: TaskInsert) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert(task)
    .select()
    .single();

  if (error) {
    // Check if error is related to missing start_date column
    if (
      error.message?.includes("start_date") ||
      error.message?.includes("column") ||
      error.code === "42703"
    ) {
      throw new Error(
        "Database migration required: Please run the migration to add start_date column. See RUN_MIGRATION.md for instructions.",
      );
    }
    throw error;
  }
  return data;
}

export async function updateTask(id: string, updates: TaskUpdate) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTask(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) throw error;
}
