"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Database } from "@/lib/types/database.types";

type Label = Database["public"]["Tables"]["labels"]["Row"];
type LabelInsert = Database["public"]["Tables"]["labels"]["Insert"];
type LabelUpdate = Database["public"]["Tables"]["labels"]["Update"];

export function useLabels(workspaceId?: string) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    async function fetchLabels() {
      try {
        const { data, error } = await supabase
          .from("labels")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("name", { ascending: true });

        if (error) throw error;
        setLabels(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchLabels();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`labels:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "labels",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setLabels((prev) => [...prev, payload.new as Label]);
          } else if (payload.eventType === "UPDATE") {
            setLabels((prev) =>
              prev.map((l) =>
                l.id === payload.new.id ? (payload.new as Label) : l,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            setLabels((prev) => prev.filter((l) => l.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId]);

  return { labels, loading, error, setLabels };
}

// CRUD operations
export async function createLabel(label: LabelInsert) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("labels")
    .insert(label)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLabel(id: string, updates: LabelUpdate) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("labels")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteLabel(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("labels").delete().eq("id", id);

  if (error) throw error;
}

// Task Labels operations
export async function addLabelToTask(taskId: string, labelId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("task_labels")
    .insert({ task_id: taskId, label_id: labelId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeLabelFromTask(taskId: string, labelId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("task_labels")
    .delete()
    .eq("task_id", taskId)
    .eq("label_id", labelId);

  if (error) throw error;
}

export async function getTaskLabels(taskId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("task_labels")
    .select("label_id, labels(*)")
    .eq("task_id", taskId);

  if (error) throw error;
  return data;
}
